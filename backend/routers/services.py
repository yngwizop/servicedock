"""Services CRUD router"""
from typing import Any, List
from fastapi import APIRouter, HTTPException, Depends, Body, Request
from fastapi.concurrency import run_in_threadpool

from models.service import Service
from models.reorder import ReorderRequest
from models.responses import ServiceResponse
from dependencies.auth import require_role
from config.database import get_db
from core.logging import logger
from core.limiter import limiter

router = APIRouter(prefix="/api/services", tags=["services"])

@router.get("", response_model=List[ServiceResponse])
@limiter.limit("60/minute")  # Read operations - generous limit
async def get_services(request: Request, dashboard_id: int = 1, db = Depends(get_db)) -> List[ServiceResponse]:
    """Get all services for a specific dashboard (default: 1)"""
    def _get_services_sync():
        cur = db.cursor()
        try:
            cur.execute(
                "SELECT id, name, description, url, icon, position, COALESCE(is_favorite, FALSE) FROM services WHERE dashboard_id = %s ORDER BY position ASC, id ASC;",
                (dashboard_id,)
            )
            rows = cur.fetchall()
            return [
                {"id": r[0], "name": r[1], "description": r[2], "url": r[3], "icon": r[4], "position": r[5], "is_favorite": r[6]}
                for r in rows
            ]
        finally:
            cur.close()
    
    return await run_in_threadpool(_get_services_sync)

@router.post("")
@limiter.limit("10/minute")  # Create operations - prevent spam
async def add_service(request: Request, service: Service, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    def _add_service_sync():
        cur = db.cursor()
        try:
            dashboard_id = service.dashboard_id or 1
            # Validate dashboard exists
            cur.execute("SELECT id FROM dashboards WHERE id = %s;", (dashboard_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=400, detail=f"Dashboard {dashboard_id} not found")
            cur.execute(
                "INSERT INTO services (name, description, url, icon, position, is_favorite, dashboard_id) VALUES (%s, %s, %s, %s, (SELECT COALESCE(MAX(position),0)+1 FROM services WHERE dashboard_id = %s), %s, %s) RETURNING id, position;",
                (service.name, service.description, service.url, service.icon, dashboard_id, service.is_favorite or False, dashboard_id)
            )
            row = cur.fetchone()
            new_id = row[0]
            new_pos = row[1]
            db.commit()
            return {"id": new_id, "position": new_pos, **service.dict()}
        finally:
            cur.close()
    
    return await run_in_threadpool(_add_service_sync)

# ✅ MOVE THIS BEFORE THE /{service_id} ROUTES!
@router.put("/reorder", tags=["admin"])
@limiter.limit("20/minute")  # Reorder operations - moderate limit
async def reorder_services(request: Request, reorder_request: ReorderRequest, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    """Reorder services"""
    def _reorder_services_sync():
        cur = db.cursor()
        try:
            for idx, service_id in enumerate(reorder_request.newOrder):
                cur.execute(
                    "UPDATE services SET position = %s WHERE id = %s;",
                    (idx, service_id)
                )
            db.commit()
            return {"message": "Services reordered successfully"}
        except Exception as e:
            db.rollback()
            logger.error(f"Reorder services failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to reorder services")
        finally:
            cur.close()
    
    return await run_in_threadpool(_reorder_services_sync)

@router.put("/{service_id}")
@limiter.limit("20/minute")  # Update operations - moderate limit
async def update_service(request: Request, service_id: int, service: Service, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    def _update_service_sync():
        cur = db.cursor()
        try:
            cur.execute(
                "UPDATE services SET name=%s, description=%s, url=%s, icon=%s, is_favorite=%s WHERE id=%s RETURNING id;",
                (service.name, service.description, service.url, service.icon, service.is_favorite or False, service_id)
            )
            updated = cur.fetchone()
            db.commit()
            if not updated:
                raise HTTPException(status_code=404, detail="Service not found")
            return {"message": "updated", "id": service_id, **service.dict()}
        finally:
            cur.close()
    
    return await run_in_threadpool(_update_service_sync)

@router.delete("/{service_id}")
@limiter.limit("10/minute")  # Delete operations - prevent abuse
async def delete_service(request: Request, service_id: int, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    def _delete_service_sync():
        cur = db.cursor()
        try:
            cur.execute(
                "DELETE FROM services WHERE id = %s RETURNING id;", (service_id,)
            )
            deleted = cur.fetchone()
            db.commit()
            if not deleted:
                raise HTTPException(status_code=404, detail="Service not found")
            return {"message": "deleted"}
        finally:
            cur.close()
    
    return await run_in_threadpool(_delete_service_sync)
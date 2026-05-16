"""Shortcuts CRUD router"""
from typing import Any, List
from fastapi import APIRouter, HTTPException, Depends, Body, Request
from fastapi.concurrency import run_in_threadpool

from models.shortcut import Shortcut
from models.reorder import ReorderRequest
from models.responses import ShortcutResponse
from dependencies.auth import require_role, require_any_role
from config.database import get_db
from core.logging import logger
from core.limiter import limiter

router = APIRouter(prefix="/api/shortcuts", tags=["shortcuts"])

@router.get("", response_model=List[ShortcutResponse])
@limiter.limit("60/minute")  # Read operations - generous limit
async def get_shortcuts(request: Request, dashboard_id: int = 1, db = Depends(get_db), _admin = Depends(require_any_role("admin", "viewer"))) -> List[ShortcutResponse]:
    """Get all shortcuts for a specific dashboard (default: 1)"""
    def _get_shortcuts_sync():
        cur = db.cursor()
        try:
            cur.execute(
                "SELECT id, name, url, icon, position FROM shortcuts WHERE dashboard_id = %s ORDER BY position ASC, id ASC;",
                (dashboard_id,)
            )
            rows = cur.fetchall()
            return [{"id": r[0], "name": r[1], "url": r[2], "icon": r[3], "position": r[4]} for r in rows]
        finally:
            cur.close()
    
    return await run_in_threadpool(_get_shortcuts_sync)

@router.post("")
@limiter.limit("10/minute")  # Create operations - prevent spam
async def add_shortcut(request: Request, shortcut: Shortcut, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    def _add_shortcut_sync():
        cur = db.cursor()
        try:
            dashboard_id = shortcut.dashboard_id or 1
            # Validate dashboard exists
            cur.execute("SELECT id FROM dashboards WHERE id = %s;", (dashboard_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=400, detail=f"Dashboard {dashboard_id} not found")
            cur.execute(
                "INSERT INTO shortcuts (name, url, icon, position, dashboard_id) VALUES (%s, %s, %s, (SELECT COALESCE(MAX(position),0)+1 FROM shortcuts WHERE dashboard_id = %s), %s) RETURNING id, position;",
                (shortcut.name, shortcut.url, shortcut.icon, dashboard_id, dashboard_id)
            )
            row = cur.fetchone()
            new_id = row[0]
            new_pos = row[1]
            db.commit()
            return {"id": new_id, "position": new_pos, **shortcut.dict()}
        finally:
            cur.close()
    
    return await run_in_threadpool(_add_shortcut_sync)

@router.put("/reorder", tags=["admin"])
@limiter.limit("20/minute")  # Reorder operations - moderate limit
async def reorder_shortcuts(request: Request, reorder_request: ReorderRequest, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    """Reorder shortcuts"""
    def _reorder_shortcuts_sync():
        cur = db.cursor()
        try:
            dashboard_id = reorder_request.dashboard_id
            for idx, shortcut_id in enumerate(reorder_request.newOrder):
                cur.execute(
                    "UPDATE shortcuts SET position = %s WHERE id = %s AND dashboard_id = %s;",
                    (idx, shortcut_id, dashboard_id)
                )
            db.commit()
            return {"message": "Shortcuts reordered successfully"}
        except Exception as e:
            db.rollback()
            logger.error(f"Reorder shortcuts failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to reorder shortcuts")
        finally:
            cur.close()
    
    return await run_in_threadpool(_reorder_shortcuts_sync)

@router.put("/{shortcut_id}")
@limiter.limit("20/minute")  # Update operations - moderate limit
async def update_shortcut(request: Request, shortcut_id: int, shortcut: Shortcut, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    def _update_shortcut_sync():
        cur = db.cursor()
        try:
            dashboard_id = shortcut.dashboard_id or 1
            cur.execute(
                "UPDATE shortcuts SET name=%s, url=%s, icon=%s WHERE id=%s AND dashboard_id=%s RETURNING id;",
                (shortcut.name, shortcut.url, shortcut.icon, shortcut_id, dashboard_id)
            )
            updated = cur.fetchone()
            db.commit()
            if not updated:
                raise HTTPException(status_code=404, detail="Shortcut not found")
            return {"message": "updated", "id": shortcut_id, **shortcut.dict()}
        finally:
            cur.close()
    
    return await run_in_threadpool(_update_shortcut_sync)

@router.delete("/{shortcut_id}")
@limiter.limit("10/minute")  # Delete operations - prevent abuse
async def delete_shortcut(
    request: Request,
    shortcut_id: int,
    dashboard_id: int = 1,
    token: dict = Depends(require_role("admin")),
    db = Depends(get_db),
):
    def _delete_shortcut_sync():
        cur = db.cursor()
        try:
            cur.execute(
                "DELETE FROM shortcuts WHERE id = %s AND dashboard_id = %s RETURNING id;",
                (shortcut_id, dashboard_id),
            )
            deleted = cur.fetchone()
            db.commit()
            if not deleted:
                raise HTTPException(status_code=404, detail="Shortcut not found")
            return {"message": "deleted"}
        finally:
            cur.close()
    
    return await run_in_threadpool(_delete_shortcut_sync)

"""Dashboard routes"""
from fastapi import APIRouter, Depends, HTTPException, Request
from dependencies.auth import require_role
from config.database import get_db
from models.dashboard import Dashboard, DashboardCreate, DashboardResponse
from core.limiter import limiter
from core.logging import logger
from typing import List
from concurrent.futures import ThreadPoolExecutor
from starlette.concurrency import run_in_threadpool

router = APIRouter(prefix="/api/dashboards", tags=["dashboards"])

@router.get("", response_model=List[DashboardResponse])
@limiter.limit("60/minute")
async def get_dashboards(request: Request, db = Depends(get_db)) -> List[DashboardResponse]:
    """Get all dashboards with counts"""
    def _get_dashboards_sync():
        cur = db.cursor()
        try:
            query = """
                SELECT 
                    d.id, d.name, d.description, d.type, d.is_active,
                    COUNT(DISTINCT s.id) as service_count,
                    COUNT(DISTINCT sh.id) as shortcut_count
                FROM dashboards d
                LEFT JOIN services s ON s.dashboard_id = d.id
                LEFT JOIN shortcuts sh ON sh.dashboard_id = d.id
                GROUP BY d.id, d.name, d.description, d.type, d.is_active
                ORDER BY d.id ASC;
            """
            cur.execute(query)
            rows = cur.fetchall()
            return [
                {
                    "id": r[0],
                    "name": r[1],
                    "description": r[2],
                    "type": r[3],
                    "is_active": r[4],
                    "service_count": r[5],
                    "shortcut_count": r[6]
                }
                for r in rows
            ]
        finally:
            cur.close()
    
    return await run_in_threadpool(_get_dashboards_sync)

@router.post("", response_model=DashboardResponse)
@limiter.limit("10/minute")
async def create_dashboard(
    request: Request,
    dashboard: DashboardCreate,
    token: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """Create a new dashboard"""
    def _create_dashboard_sync():
        cur = db.cursor()
        try:
            cur.execute(
                "INSERT INTO dashboards (name, description, type, is_active) VALUES (%s, %s, %s, TRUE) RETURNING id;",
                (dashboard.name, dashboard.description, dashboard.type)
            )
            new_id = cur.fetchone()[0]
            db.commit()
            
            # Return created dashboard
            cur.execute(
                """
                SELECT 
                    d.id, d.name, d.description, d.type, d.is_active,
                    COUNT(DISTINCT s.id) as service_count,
                    COUNT(DISTINCT sh.id) as shortcut_count
                FROM dashboards d
                LEFT JOIN services s ON s.dashboard_id = d.id
                LEFT JOIN shortcuts sh ON sh.dashboard_id = d.id
                WHERE d.id = %s
                GROUP BY d.id, d.name, d.description, d.type, d.is_active;
                """,
                (new_id,)
            )
            row = cur.fetchone()
            return {
                "id": row[0],
                "name": row[1],
                "description": row[2],
                "type": row[3],
                "is_active": row[4],
                "service_count": row[5],
                "shortcut_count": row[6]
            }
        except Exception as e:
            db.rollback()
            logger.error(f"Create dashboard failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to create dashboard")
        finally:
            cur.close()
    
    return await run_in_threadpool(_create_dashboard_sync)

@router.put("/{dashboard_id}")
@limiter.limit("20/minute")
async def update_dashboard(
    request: Request,
    dashboard_id: int,
    dashboard: Dashboard,
    token: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """Update a dashboard"""
    def _update_dashboard_sync():
        cur = db.cursor()
        try:
            cur.execute(
                "UPDATE dashboards SET name=%s, description=%s, type=%s, is_active=%s WHERE id=%s RETURNING id;",
                (dashboard.name, dashboard.description, dashboard.type, dashboard.is_active, dashboard_id)
            )
            updated = cur.fetchone()
            db.commit()
            if not updated:
                raise HTTPException(status_code=404, detail="Dashboard not found")
            return {"message": "Dashboard updated", "id": dashboard_id}
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Update dashboard failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to update dashboard")
        finally:
            cur.close()
    
    return await run_in_threadpool(_update_dashboard_sync)

@router.delete("/{dashboard_id}")
@limiter.limit("10/minute")
async def delete_dashboard(
    request: Request,
    dashboard_id: int,
    token: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """Delete a dashboard (and all its services/shortcuts via CASCADE)"""
    if dashboard_id == 1:
        raise HTTPException(status_code=400, detail="Cannot delete default dashboard")
    
    def _delete_dashboard_sync():
        cur = db.cursor()
        try:
            cur.execute("DELETE FROM dashboards WHERE id = %s RETURNING id;", (dashboard_id,))
            deleted = cur.fetchone()
            db.commit()
            if not deleted:
                raise HTTPException(status_code=404, detail="Dashboard not found")
            return {"message": "Dashboard deleted"}
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Delete dashboard failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to delete dashboard")
        finally:
            cur.close()
    
    return await run_in_threadpool(_delete_dashboard_sync)

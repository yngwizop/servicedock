"""Dashboard routes"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from dependencies.auth import require_role, require_any_role
from config.database import get_db
from models.dashboard import Dashboard, DashboardCreate, DashboardResponse
from core.limiter import limiter
from core.logging import logger
from typing import List
from concurrent.futures import ThreadPoolExecutor
from starlette.concurrency import run_in_threadpool
import json

router = APIRouter(prefix="/api/dashboards", tags=["dashboards"])

@router.get("", response_model=List[DashboardResponse])
@limiter.limit("60/minute")
async def get_dashboards(
    request: Request,
    limit: int = Query(500, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db=Depends(get_db),
    _admin=Depends(require_any_role("admin", "viewer")),
) -> List[DashboardResponse]:
    """Get all dashboards with counts"""
    def _get_dashboards_sync():
        cur = db.cursor()
        try:
            query = """
                SELECT 
                    d.id, d.name, d.description, d.type, d.is_active, d.show_proxmox,
                    d.updated_at,
                    COUNT(DISTINCT s.id) as service_count,
                    COUNT(DISTINCT sh.id) as shortcut_count
                FROM dashboards d
                LEFT JOIN services s ON s.dashboard_id = d.id
                LEFT JOIN shortcuts sh ON sh.dashboard_id = d.id
                GROUP BY d.id, d.name, d.description, d.type, d.is_active, d.show_proxmox, d.updated_at
                ORDER BY d.id ASC
                LIMIT %s OFFSET %s;
            """
            cur.execute(query, (limit, offset))
            rows = cur.fetchall()
            return [
                {
                    "id": r[0],
                    "name": r[1],
                    "description": r[2],
                    "type": r[3],
                    "is_active": r[4],
                    "show_proxmox": r[5] if r[5] is not None else True,
                    "updated_at": r[6],
                    "service_count": r[7],
                    "shortcut_count": r[8],
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
                "INSERT INTO dashboards (name, description, type, is_active, show_proxmox) VALUES (%s, %s, %s, TRUE, %s) RETURNING id;",
                (dashboard.name, dashboard.description, dashboard.type, dashboard.show_proxmox)
            )
            new_id = cur.fetchone()[0]
            db.commit()
            
            # Return created dashboard
            cur.execute(
                """
                SELECT 
                    d.id, d.name, d.description, d.type, d.is_active, d.show_proxmox,
                    d.updated_at,
                    COUNT(DISTINCT s.id) as service_count,
                    COUNT(DISTINCT sh.id) as shortcut_count
                FROM dashboards d
                LEFT JOIN services s ON s.dashboard_id = d.id
                LEFT JOIN shortcuts sh ON sh.dashboard_id = d.id
                WHERE d.id = %s
                GROUP BY d.id, d.name, d.description, d.type, d.is_active, d.show_proxmox, d.updated_at;
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
                "show_proxmox": row[5] if row[5] is not None else True,
                "updated_at": row[6],
                "service_count": row[7],
                "shortcut_count": row[8],
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
                "UPDATE dashboards SET name=%s, description=%s, type=%s, is_active=%s, show_proxmox=%s, updated_at=NOW() WHERE id=%s RETURNING id;",
                (dashboard.name, dashboard.description, dashboard.type, dashboard.is_active, dashboard.show_proxmox, dashboard_id)
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
    def _delete_dashboard_sync():
        cur = db.cursor()
        try:
            # Atomic delete — only succeeds if more than 1 dashboard exists
            cur.execute(
                "DELETE FROM dashboards WHERE id = %s AND (SELECT COUNT(*) FROM dashboards) > 1 RETURNING id;",
                (dashboard_id,)
            )
            deleted = cur.fetchone()
            if not deleted:
                # Determine reason: not found or last dashboard
                cur.execute("SELECT COUNT(*) FROM dashboards WHERE id = %s;", (dashboard_id,))
                exists = cur.fetchone()[0]
                db.rollback()
                if exists == 0:
                    raise HTTPException(status_code=404, detail="Dashboard not found")
                else:
                    raise HTTPException(status_code=400, detail="Cannot delete the last dashboard")
            db.commit()
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

# Proxmox Layout Routes
@router.get("/{dashboard_id}/proxmox-layout")
@limiter.limit("60/minute")
async def get_proxmox_layout(
    request: Request,
    dashboard_id: int,
    db = Depends(get_db),
    _admin = Depends(require_any_role("admin", "viewer"))
):
    def _get_layout_sync():
        cur = db.cursor()
        try:
            cur.execute(
                "SELECT layout, updated_at FROM proxmox_dashboard_layouts WHERE dashboard_id = %s;",
                (dashboard_id,)
            )
            row = cur.fetchone()
            if row:
                ts = row[1]
                return {
                    "layout": row[0],
                    "updated_at": ts.isoformat() if ts else None,
                }
            return {"layout": None, "updated_at": None}
        finally:
            cur.close()
    
    return await run_in_threadpool(_get_layout_sync)

@router.put("/{dashboard_id}/proxmox-layout")
@limiter.limit("20/minute")
async def save_proxmox_layout(
    request: Request,
    dashboard_id: int,
    token: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """Save Proxmox dashboard layout"""
    # Parse and validate JSON body
    try:
        layout = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    # Validate layout structure and size
    layout_str = json.dumps(layout)
    if len(layout_str) > 100_000:  # Max 100KB
        raise HTTPException(status_code=400, detail="Layout data too large (max 100KB)")
    
    if not isinstance(layout, (dict, list)):
        raise HTTPException(status_code=400, detail="Layout must be a JSON object or array")
    
    def _save_layout_sync():
        cur = db.cursor()
        try:
            # Upsert: Insert or Update
            cur.execute(
                """
                INSERT INTO proxmox_dashboard_layouts (dashboard_id, layout, updated_at)
                VALUES (%s, %s, NOW())
                ON CONFLICT (dashboard_id) 
                DO UPDATE SET layout = EXCLUDED.layout, updated_at = NOW();
                """,
                (dashboard_id, json.dumps(layout))
            )
            db.commit()
            return {"message": "Layout saved"}
        except Exception as e:
            db.rollback()
            logger.error(f"Save layout failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to save layout")
        finally:
            cur.close()
    
    return await run_in_threadpool(_save_layout_sync)

@router.delete("/{dashboard_id}/proxmox-layout")
@limiter.limit("20/minute")
async def reset_proxmox_layout(
    request: Request,
    dashboard_id: int,
    token: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """Reset Proxmox dashboard layout to default"""
    def _reset_layout_sync():
        cur = db.cursor()
        try:
            cur.execute(
                "DELETE FROM proxmox_dashboard_layouts WHERE dashboard_id = %s;",
                (dashboard_id,)
            )
            db.commit()
            return {"message": "Layout reset"}
        except Exception as e:
            db.rollback()
            logger.error(f"Reset layout failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to reset layout")
        finally:
            cur.close()
    
    return await run_in_threadpool(_reset_layout_sync)


# Proxmox Visible Cards Routes
@router.get("/{dashboard_id}/proxmox-visible-cards")
@limiter.limit("60/minute")
async def get_proxmox_visible_cards(
    request: Request,
    dashboard_id: int,
    db = Depends(get_db),
    _admin = Depends(require_any_role("admin", "viewer"))
):
    """Get saved visible cards configuration"""
    def _get_sync():
        cur = db.cursor()
        try:
            cur.execute(
                "SELECT visible_cards FROM proxmox_dashboard_layouts WHERE dashboard_id = %s;",
                (dashboard_id,)
            )
            row = cur.fetchone()
            if row and row[0]:
                return {"visible_cards": row[0]}
            return {"visible_cards": None}
        finally:
            cur.close()

    return await run_in_threadpool(_get_sync)

@router.put("/{dashboard_id}/proxmox-visible-cards")
@limiter.limit("20/minute")
async def save_proxmox_visible_cards(
    request: Request,
    dashboard_id: int,
    token: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """Save visible cards configuration"""
    try:
        cards = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    if not isinstance(cards, list):
        raise HTTPException(status_code=400, detail="Body must be a JSON array of card IDs")

    if len(cards) > 50:
        raise HTTPException(status_code=400, detail="Too many card entries")

    def _save_sync():
        cur = db.cursor()
        try:
            # Upsert: row may or may not exist yet
            cur.execute(
                """
                INSERT INTO proxmox_dashboard_layouts (dashboard_id, layout, visible_cards, updated_at)
                VALUES (%s, '[]'::jsonb, %s, NOW())
                ON CONFLICT (dashboard_id)
                DO UPDATE SET visible_cards = EXCLUDED.visible_cards, updated_at = NOW();
                """,
                (dashboard_id, json.dumps(cards))
            )
            db.commit()
            return {"message": "Visible cards saved"}
        except Exception as e:
            db.rollback()
            logger.error(f"Save visible cards failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to save visible cards")
        finally:
            cur.close()

    return await run_in_threadpool(_save_sync)

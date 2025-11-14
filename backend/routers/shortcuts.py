"""Shortcuts CRUD router"""
from typing import Any
from fastapi import APIRouter, HTTPException, Depends, Body, Request

from models.shortcut import Shortcut
from models.reorder import ReorderRequest
from dependencies.auth import require_role
from config.database import get_db
from core.logging import logger
from core.limiter import limiter

router = APIRouter(prefix="/api/shortcuts", tags=["shortcuts"])

@router.get("")
@limiter.limit("60/minute")  # Read operations - generous limit
def get_shortcuts(request: Request, db = Depends(get_db)):
    cur = db.cursor()
    cur.execute("SELECT id, name, url, icon, position FROM shortcuts ORDER BY position ASC, id ASC;")
    rows = cur.fetchall()
    return [{"id": r[0], "name": r[1], "url": r[2], "icon": r[3], "position": r[4]} for r in rows]

@router.post("")
@limiter.limit("10/minute")  # Create operations - prevent spam
def add_shortcut(request: Request, shortcut: Shortcut, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    cur = db.cursor()
    cur.execute(
        "INSERT INTO shortcuts (name, url, icon, position) VALUES (%s, %s, %s, (SELECT COALESCE(MAX(position),0)+1 FROM shortcuts)) RETURNING id, position;",
        (shortcut.name, shortcut.url, shortcut.icon)
    )
    row = cur.fetchone()
    new_id = row[0]
    new_pos = row[1]
    db.commit()
    return {"id": new_id, "position": new_pos, **shortcut.dict()}

@router.put("/{shortcut_id}")
@limiter.limit("20/minute")  # Update operations - moderate limit
def update_shortcut(request: Request, shortcut_id: int, shortcut: Shortcut, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    cur = db.cursor()
    cur.execute(
        "UPDATE shortcuts SET name=%s, url=%s, icon=%s WHERE id=%s RETURNING id;",
        (shortcut.name, shortcut.url, shortcut.icon, shortcut_id)
    )
    updated = cur.fetchone()
    db.commit()
    if not updated:
        raise HTTPException(status_code=404, detail="Shortcut not found")
    return {"message": "updated", "id": shortcut_id, **shortcut.dict()}

@router.delete("/{shortcut_id}")
@limiter.limit("10/minute")  # Delete operations - prevent abuse
def delete_shortcut(request: Request, shortcut_id: int, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    cur = db.cursor()
    cur.execute(
        "DELETE FROM shortcuts WHERE id = %s RETURNING id;", (shortcut_id,)
    )
    deleted = cur.fetchone()
    db.commit()
    if not deleted:
        raise HTTPException(status_code=404, detail="Shortcut not found")
    return {"message": "deleted"}

@router.put("/reorder", tags=["admin"])
@limiter.limit("20/minute")  # Reorder operations - moderate limit
def reorder_shortcuts(request: Request, reorder_request: ReorderRequest, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    """Reorder shortcuts"""
    cur = db.cursor()
    try:
        for idx, shortcut_id in enumerate(reorder_request.newOrder):
            cur.execute(
                "UPDATE shortcuts SET position = %s WHERE id = %s;",
                (idx, shortcut_id)
            )
        db.commit()
        return {"message": "Shortcuts reordered successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Reorder shortcuts failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to reorder shortcuts")

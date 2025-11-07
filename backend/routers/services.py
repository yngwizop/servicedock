"""Services CRUD router"""
from typing import Any
from fastapi import APIRouter, HTTPException, Depends, Body

from models.service import Service
from models.reorder import ReorderRequest
from dependencies.auth import require_role
from config.database import get_db
from core.logging import logger

router = APIRouter(prefix="/api/services", tags=["services"])

@router.get("")
def get_services(db = Depends(get_db)):
    cur = db.cursor()
    cur.execute("SELECT id, name, description, url, icon, position FROM services ORDER BY position ASC, id ASC;")
    rows = cur.fetchall()
    return [
        {"id": r[0], "name": r[1], "description": r[2], "url": r[3], "icon": r[4], "position": r[5]}
        for r in rows
    ]

@router.post("")
def add_service(service: Service, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    cur = db.cursor()
    cur.execute(
        "INSERT INTO services (name, description, url, icon, position) VALUES (%s, %s, %s, %s, (SELECT COALESCE(MAX(position),0)+1 FROM services)) RETURNING id, position;",
        (service.name, service.description, service.url, service.icon)
    )
    row = cur.fetchone()
    new_id = row[0]
    new_pos = row[1]
    db.commit()
    return {"id": new_id, "position": new_pos, **service.dict()}

@router.put("/{service_id}")
def update_service(service_id: int, service: Service, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    cur = db.cursor()
    cur.execute(
        "UPDATE services SET name=%s, description=%s, url=%s, icon=%s WHERE id=%s RETURNING id;",
        (service.name, service.description, service.url, service.icon, service_id)
    )
    updated = cur.fetchone()
    db.commit()
    if not updated:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "updated", "id": service_id, **service.dict()}

@router.delete("/{service_id}")
def delete_service(service_id: int, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    cur = db.cursor()
    cur.execute(
        "DELETE FROM services WHERE id = %s RETURNING id;", (service_id,)
    )
    deleted = cur.fetchone()
    db.commit()
    if not deleted:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "deleted"}

@router.put("/reorder", tags=["admin"])
def reorder_services(request: ReorderRequest, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    """Reorder services"""
    cur = db.cursor()
    try:
        for idx, service_id in enumerate(request.newOrder):
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

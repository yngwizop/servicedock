"""Services CRUD router"""
from fastapi import APIRouter, HTTPException, Depends

from models.service import Service
from dependencies.auth import require_role
from config.database import get_db

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

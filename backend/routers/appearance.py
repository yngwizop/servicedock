"""Appearance settings router"""
import json
from fastapi import APIRouter, HTTPException, Depends, Request

from models.appearance import Appearance
from dependencies.auth import require_role
from config.database import get_db
from core.limiter import limiter

router = APIRouter(prefix="/api/appearance", tags=["appearance"])

@router.get("")
@limiter.limit("60/minute")  # Read operations - generous limit
def get_appearance(request: Request, db = Depends(get_db)):
    cur = db.cursor()
    cur.execute("SELECT bg_color, bg_image_url, bg_opacity, shortcut_cols, service_cols, text_color_light, text_color_dark, clock_format, weather_city, weather_fields FROM appearance WHERE id = 1;")
    row = cur.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Appearance settings not found")
    
    return {
        "bg_color": row[0], 
        "bg_image_url": row[1], 
        "bg_opacity": float(row[2]),
        "shortcut_cols": row[3],
        "service_cols": row[4],
        "text_color_light": row[5] if row[5] else "#1f2937",
        "text_color_dark": row[6] if row[6] else "#e5e7eb",
        "clock_format": row[7] if row[7] else "24h",
        "weather_city": row[8] if row[8] else "Berlin",
        "weather_fields": row[9] if row[9] else ["temperature", "humidity"]
    }

@router.put("")
@limiter.limit("20/minute")  # Update operations - moderate limit (prevent UI spam)
def update_appearance(request: Request, appearance: Appearance, token: dict = Depends(require_role("admin")), db = Depends(get_db)):
    cur = db.cursor()
    
    updates = []
    params = []
    
    if appearance.bg_color is not None:
        updates.append("bg_color = %s")
        params.append(appearance.bg_color)
    if appearance.bg_image_url is not None:
        updates.append("bg_image_url = %s")
        params.append(appearance.bg_image_url)
    if appearance.bg_opacity is not None:
        updates.append("bg_opacity = %s")
        params.append(appearance.bg_opacity)
    if appearance.shortcut_cols is not None:
        updates.append("shortcut_cols = %s")
        params.append(appearance.shortcut_cols)
    if appearance.service_cols is not None:
        updates.append("service_cols = %s")
        params.append(appearance.service_cols)
    if appearance.text_color_light is not None:
        updates.append("text_color_light = %s")
        params.append(appearance.text_color_light)
    if appearance.text_color_dark is not None:
        updates.append("text_color_dark = %s")
        params.append(appearance.text_color_dark)
    if appearance.clock_format is not None:
        updates.append("clock_format = %s")
        params.append(appearance.clock_format)
    if appearance.weather_city is not None:
        updates.append("weather_city = %s")
        params.append(appearance.weather_city)
    if appearance.weather_fields is not None:
        updates.append("weather_fields = %s")
        params.append(json.dumps(appearance.weather_fields))

    if not updates:
        return {"message": "No changes provided"}

    params.append(1)
    query = f"UPDATE appearance SET {', '.join(updates)} WHERE id = %s RETURNING id;"
    
    cur.execute(query, tuple(params))
    updated = cur.fetchone()
    db.commit()

    if not updated:
        raise HTTPException(status_code=404, detail="Appearance settings (id=1) not found")

    return {"message": "Appearance updated"}

"""Config Import/Export router"""
from typing import Any
from fastapi import APIRouter, HTTPException, Depends, Request, Body
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from datetime import datetime
import json

from models.config import ConfigExport, ConfigImport, DashboardExport, ServiceExport, ShortcutExport, AppearanceExport
from dependencies.auth import require_role
from config.database import get_db
from core.logging import logger
from core.limiter import limiter

router = APIRouter(prefix="/api/config", tags=["config"])

@router.get("/export")
@limiter.limit("10/minute")
async def export_config(
    request: Request,
    token: dict = Depends(require_role("admin")),
    db = Depends(get_db)
) -> ConfigExport:
    """
    Export complete dashboard configuration as JSON.
    Excludes: Proxmox tokens, Spotify tokens, audit logs.
    """
    def _export_config_sync():
        cur = db.cursor()
        try:
            # 1. Get all dashboards
            cur.execute("""
                SELECT id, name, description, type, is_active, show_proxmox
                FROM dashboards
                ORDER BY id ASC;
            """)
            dashboard_rows = cur.fetchall()
            
            dashboards = []
            for d_row in dashboard_rows:
                dashboard_id = d_row[0]
                
                # Get services for this dashboard
                cur.execute("""
                    SELECT name, description, url, icon, position, is_favorite
                    FROM services
                    WHERE dashboard_id = %s
                    ORDER BY position ASC;
                """, (dashboard_id,))
                service_rows = cur.fetchall()
                services = [
                    ServiceExport(
                        name=s[0],
                        description=s[1],
                        url=s[2],
                        icon=s[3],
                        position=s[4],
                        is_favorite=s[5]
                    )
                    for s in service_rows
                ]
                
                # Get shortcuts for this dashboard
                cur.execute("""
                    SELECT name, url, icon, position
                    FROM shortcuts
                    WHERE dashboard_id = %s
                    ORDER BY position ASC;
                """, (dashboard_id,))
                shortcut_rows = cur.fetchall()
                shortcuts = [
                    ShortcutExport(
                        name=sh[0],
                        url=sh[1],
                        icon=sh[2],
                        position=sh[3]
                    )
                    for sh in shortcut_rows
                ]
                
                dashboards.append(DashboardExport(
                    name=d_row[1],
                    description=d_row[2],
                    type=d_row[3],
                    is_active=d_row[4],
                    show_proxmox=d_row[5] if d_row[5] is not None else True,
                    services=services,
                    shortcuts=shortcuts
                ))
            
            # 2. Get appearance settings
            cur.execute("""
                SELECT bg_color, bg_image_url, bg_opacity, shortcut_cols, service_cols,
                       text_color_light, text_color_dark, clock_format, weather_city,
                       weather_fields, show_spotify, show_weather, show_clock
                FROM appearance
                WHERE id = 1;
            """)
            app_row = cur.fetchone()
            
            if not app_row:
                raise HTTPException(status_code=404, detail="Appearance settings not found")
            
            appearance = AppearanceExport(
                bg_color=app_row[0],
                bg_image_url=app_row[1],
                bg_opacity=float(app_row[2]),
                shortcut_cols=app_row[3],
                service_cols=app_row[4],
                text_color_light=app_row[5],
                text_color_dark=app_row[6],
                clock_format=app_row[7],
                weather_city=app_row[8],
                weather_fields=app_row[9],
                show_spotify=app_row[10],
                show_weather=app_row[11],
                show_clock=app_row[12]
            )
            
            # 3. Build export object
            return ConfigExport(
                version="1.0",
                exported_at=datetime.utcnow().isoformat() + "Z",
                dashboards=dashboards,
                appearance=appearance
            )
        
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Config export failed: {e}")
            raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")
        finally:
            cur.close()
    
    return await run_in_threadpool(_export_config_sync)


@router.post("/import")
@limiter.limit("5/minute")
async def import_config(
    request: Request,
    config: ConfigImport,
    mode: str = "append",
    token: dict = Depends(require_role("admin")),
    db = Depends(get_db)
):
    """
    Import dashboard configuration from JSON.
    
    Modes:
    - append (default): Add imported dashboards/services/shortcuts without deleting existing ones.
                       IDs are reassigned. Appearance is overwritten.
    - replace: Delete all existing dashboards/services/shortcuts, then import.
              WARNING: This deletes all data!
    """
    def _import_config_sync():
        cur = db.cursor()
        try:
            # Validate mode
            if mode not in ["append", "replace"]:
                raise HTTPException(status_code=400, detail="Invalid mode. Use 'append' or 'replace'")
            
            # MODE: REPLACE - Delete all existing data
            if mode == "replace":
                logger.info("Config import mode: REPLACE - Deleting all existing data")
                cur.execute("DELETE FROM services;")
                cur.execute("DELETE FROM shortcuts;")
                cur.execute("DELETE FROM dashboards;")  # Delete ALL dashboards including dashboard 1
                # Reset sequences
                cur.execute("SELECT setval('dashboards_id_seq', 1, false);")
                cur.execute("SELECT setval('services_id_seq', 1, false);")
                cur.execute("SELECT setval('shortcuts_id_seq', 1, false);")
            
            # Import dashboards
            imported_dashboard_count = 0
            imported_service_count = 0
            imported_shortcut_count = 0
            
            for dashboard in config.dashboards:
                # Insert dashboard (ID will be auto-assigned by SERIAL)
                cur.execute("""
                    INSERT INTO dashboards (name, description, type, is_active, show_proxmox)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id;
                """, (
                    dashboard.name,
                    dashboard.description,
                    dashboard.type,
                    dashboard.is_active,
                    dashboard.show_proxmox
                ))
                new_dashboard_id = cur.fetchone()[0]
                imported_dashboard_count += 1
                
                # Insert services for this dashboard
                for service in dashboard.services:
                    cur.execute("""
                        INSERT INTO services (name, description, url, icon, position, is_favorite, dashboard_id)
                        VALUES (%s, %s, %s, %s, %s, %s, %s);
                    """, (
                        service.name,
                        service.description,
                        service.url,
                        service.icon,
                        service.position,
                        service.is_favorite,
                        new_dashboard_id
                    ))
                    imported_service_count += 1
                
                # Insert shortcuts for this dashboard
                for shortcut in dashboard.shortcuts:
                    cur.execute("""
                        INSERT INTO shortcuts (name, url, icon, position, dashboard_id)
                        VALUES (%s, %s, %s, %s, %s);
                    """, (
                        shortcut.name,
                        shortcut.url,
                        shortcut.icon,
                        shortcut.position,
                        new_dashboard_id
                    ))
                    imported_shortcut_count += 1
            
            # Update appearance settings (always overwrite)
            app = config.appearance
            cur.execute("""
                UPDATE appearance SET
                    bg_color = %s,
                    bg_image_url = %s,
                    bg_opacity = %s,
                    shortcut_cols = %s,
                    service_cols = %s,
                    text_color_light = %s,
                    text_color_dark = %s,
                    clock_format = %s,
                    weather_city = %s,
                    weather_fields = %s,
                    show_spotify = %s,
                    show_weather = %s,
                    show_clock = %s
                WHERE id = 1;
            """, (
                app.bg_color,
                app.bg_image_url,
                app.bg_opacity,
                app.shortcut_cols,
                app.service_cols,
                app.text_color_light,
                app.text_color_dark,
                app.clock_format,
                app.weather_city,
                json.dumps(app.weather_fields),
                app.show_spotify,
                app.show_weather,
                app.show_clock
            ))
            
            db.commit()
            
            logger.info(f"Config import successful: {imported_dashboard_count} dashboards, "
                       f"{imported_service_count} services, {imported_shortcut_count} shortcuts")
            
            return {
                "message": "Config imported successfully",
                "mode": mode,
                "imported": {
                    "dashboards": imported_dashboard_count,
                    "services": imported_service_count,
                    "shortcuts": imported_shortcut_count
                }
            }
        
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Config import failed: {e}")
            raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")
        finally:
            cur.close()
    
    return await run_in_threadpool(_import_config_sync)


@router.post("/validate")
@limiter.limit("20/minute")
async def validate_config(
    request: Request,
    config: ConfigImport,
    token: dict = Depends(require_role("admin"))
):
    """
    Validate a config file before importing.
    Returns statistics about what would be imported.
    """
    try:
        dashboard_count = len(config.dashboards)
        service_count = sum(len(d.services) for d in config.dashboards)
        shortcut_count = sum(len(d.shortcuts) for d in config.dashboards)
        
        return {
            "valid": True,
            "version": config.version,
            "exported_at": config.exported_at,
            "statistics": {
                "dashboards": dashboard_count,
                "services": service_count,
                "shortcuts": shortcut_count
            },
            "preview": {
                "dashboard_names": [d.name for d in config.dashboards],
                "appearance": {
                    "bg_color": config.appearance.bg_color,
                    "clock_format": config.appearance.clock_format,
                    "weather_city": config.appearance.weather_city
                }
            }
        }
    except Exception as e:
        return {
            "valid": False,
            "error": str(e)
        }

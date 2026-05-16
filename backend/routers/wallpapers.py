"""Wallpaper upload & serving router"""
import io
import os
import hashlib
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.concurrency import run_in_threadpool

from dependencies.auth import require_role, require_any_role
from core.limiter import limiter
from core import logger

router = APIRouter(prefix="/api/wallpapers", tags=["wallpapers"])

# Upload-Verzeichnis (Docker Volume)
UPLOAD_DIR = Path("/app/uploads/wallpapers")

def _ensure_upload_dir():
    """Upload-Verzeichnis erstellen, falls nicht vorhanden (lazy, für read_only Container)"""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Erlaubte Dateiformate und Größenlimit
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload")
@limiter.limit("10/minute")
async def upload_wallpaper(
    request: Request,
    file: UploadFile = File(...),
    _admin: dict = Depends(require_role("admin"))
):
    """Upload eines eigenen Wallpapers (max 10MB, JPG/PNG/WEBP)"""
    _ensure_upload_dir()
    
    # MIME-Type prüfen
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Allowed: JPG, PNG, WEBP"
        )
    
    # Dateiendung prüfen
    original_name = file.filename or "upload.jpg"
    ext = Path(original_name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file extension: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Datei lesen und Größe prüfen
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large: {len(content) / 1024 / 1024:.1f}MB. Maximum: {MAX_FILE_SIZE / 1024 / 1024:.0f}MB"
        )
    
    if len(content) < 1024:
        raise HTTPException(
            status_code=400,
            detail="File too small — does not appear to be a valid image"
        )

    # Magic-byte validation (Pillow)
    try:
        from PIL import Image

        img = Image.open(io.BytesIO(content))
        img.verify()
        if img.format and img.format.upper() not in ("JPEG", "PNG", "WEBP"):
            raise HTTPException(status_code=400, detail="Unsupported image format")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="File is not a valid image (magic-byte check failed)",
        )

    # Einzigartigen Dateinamen generieren (Hash-basiert, verhindert Duplikate)
    file_hash = hashlib.md5(content).hexdigest()[:12]
    safe_name = f"custom-{file_hash}{ext}"
    file_path = UPLOAD_DIR / safe_name
    
    # Datei speichern
    def _save_file():
        with open(file_path, "wb") as f:
            f.write(content)
        logger.info(f"Wallpaper uploaded: {safe_name} ({len(content) / 1024:.0f}KB)")
    
    await run_in_threadpool(_save_file)
    
    return {
        "filename": safe_name,
        "url": f"/api/wallpapers/{safe_name}",
        "size": len(content),
        "message": "Wallpaper uploaded successfully"
    }


@router.get("")
@limiter.limit("30/minute")
async def list_uploaded_wallpapers(
    request: Request,
    _user: dict = Depends(require_any_role("admin", "viewer"))
):
    """Liste aller hochgeladenen Custom-Wallpapers"""
    _ensure_upload_dir()
    def _list_files():
        wallpapers = []
        if UPLOAD_DIR.exists():
            for f in sorted(UPLOAD_DIR.iterdir()):
                if f.is_file() and f.suffix.lower() in ALLOWED_EXTENSIONS:
                    wallpapers.append({
                        "filename": f.name,
                        "url": f"/api/wallpapers/{f.name}",
                        "size": f.stat().st_size
                    })
        return wallpapers
    
    return await run_in_threadpool(_list_files)


@router.get("/{filename}")
@limiter.limit("120/minute")
async def serve_wallpaper(request: Request, filename: str):
    """Wallpaper-Datei ausliefern (Public — kein Auth nötig, für Login-Screen)"""
    # Path Traversal verhindern
    safe_name = Path(filename).name
    if safe_name != filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    file_path = UPLOAD_DIR / safe_name
    
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Wallpaper not found")
    
    # MIME-Type aus Extension ableiten
    ext = file_path.suffix.lower()
    media_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp"
    }
    media_type = media_types.get(ext, "application/octet-stream")
    
    return FileResponse(
        file_path,
        media_type=media_type,
        headers={
            "Cache-Control": "public, max-age=86400",  # 24h Cache
            "X-Content-Type-Options": "nosniff"
        }
    )


@router.delete("/{filename}")
@limiter.limit("10/minute")
async def delete_wallpaper(
    request: Request,
    filename: str,
    _admin: dict = Depends(require_role("admin"))
):
    """Custom-Wallpaper löschen"""
    safe_name = Path(filename).name
    if safe_name != filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    file_path = UPLOAD_DIR / safe_name
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Wallpaper not found")
    
    def _delete_file():
        os.remove(file_path)
        logger.info(f"Wallpaper deleted: {safe_name}")
    
    await run_in_threadpool(_delete_file)
    
    return {"message": f"Wallpaper '{safe_name}' deleted"}

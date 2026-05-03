"""Local user accounts CRUD (admin-only)."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request

from core.audit import log_audit
from core.limiter import limiter
from core.logging import logger
from core.ldap_auth import is_ldap_signin_enabled
from core.security import get_password_hash
from core.local_users import (
    count_enabled_admins,
    delete_local_user,
    get_user_by_id,
    get_user_by_username,
    insert_local_user,
    list_local_users,
    update_local_user,
)
from dependencies.auth import get_client_ip, require_role
from models.users import LocalUserCreate, LocalUserResponse, LocalUserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


def _reject_if_ldap_signin_enabled() -> None:
    """Schreibzugriffe auf lokale Konten sind mit aktivem AD/LDAP-Login sinnlos und verwirrend — API wie UI sperren."""
    if is_ldap_signin_enabled():
        raise HTTPException(
            status_code=403,
            detail="Local user management is disabled while AD/LDAP sign-in is enabled.",
        )


def _to_response(row: dict) -> LocalUserResponse:
    ca = row.get("created_at")
    ua = row.get("updated_at")
    return LocalUserResponse(
        id=row["id"],
        username=row["username"],
        role=row["role"],
        display_name=row.get("display_name"),
        enabled=bool(row["enabled"]),
        force_change=bool(row["force_change"]),
        created_at=ca.isoformat() if hasattr(ca, "isoformat") else ca,
        updated_at=ua.isoformat() if hasattr(ua, "isoformat") else ua,
    )


@router.get("", response_model=List[LocalUserResponse])
@limiter.limit("60/minute")
def list_users(
    request: Request,
    token: dict = Depends(require_role("admin")),
):
    rows = list_local_users()
    return [_to_response(r) for r in rows]


@router.post("", response_model=LocalUserResponse)
@limiter.limit("10/minute")
def create_user(
    request: Request,
    body: LocalUserCreate,
    token: dict = Depends(require_role("admin")),
):
    _reject_if_ldap_signin_enabled()
    if get_user_by_username(body.username):
        raise HTTPException(status_code=409, detail="Username already exists")

    client_ip = get_client_ip(request)
    try:
        new_id = insert_local_user(
            body.username,
            get_password_hash(body.password),
            body.role,
            display_name=body.display_name,
            force_change=False,
        )
    except Exception as e:
        logger.error(f"create_user failed: {e}")
        raise HTTPException(status_code=500, detail="Could not create user") from e

    row = get_user_by_id(new_id)
    log_audit(
        action="LOCAL_USER_CREATED",
        status="success",
        user_type="admin",
        ip_address=client_ip,
        details={"username": body.username, "role": body.role},
    )
    return _to_response(row)


@router.put("/{user_id}", response_model=LocalUserResponse)
@limiter.limit("20/minute")
def update_user(
    request: Request,
    user_id: int,
    body: LocalUserUpdate,
    token: dict = Depends(require_role("admin")),
):
    _reject_if_ldap_signin_enabled()
    u = get_user_by_id(user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    if (
        body.role is None
        and body.enabled is None
        and body.display_name is None
        and not body.new_password
    ):
        raise HTTPException(status_code=400, detail="No fields to update")

    sub = token.get("sub")
    if sub and sub.lower() == u["username"].lower() and body.enabled is False:
        raise HTTPException(status_code=400, detail="You cannot disable your own account")

    new_role = body.role if body.role is not None else u["role"]
    new_enabled = u["enabled"] if body.enabled is None else body.enabled

    if u["role"] == "admin" and (new_role == "viewer" or new_enabled is False):
        others = count_enabled_admins(exclude_user_id=user_id)
        if others < 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot remove or disable the last active admin",
            )

    pwd_hash = None
    if body.new_password:
        pwd_hash = get_password_hash(body.new_password)

    fc = False if pwd_hash else None
    update_local_user(
        user_id,
        role=body.role,
        enabled=body.enabled,
        display_name=body.display_name,
        password_hash=pwd_hash,
        force_change=fc,
    )

    if u["username"].lower() == "admin" and pwd_hash:
        from core.local_users import sync_admin_auth_from_local_admin

        sync_admin_auth_from_local_admin()

    row = get_user_by_id(user_id)
    log_audit(
        action="LOCAL_USER_UPDATED",
        status="success",
        user_type="admin",
        ip_address=get_client_ip(request),
        details={"target_id": user_id, "username": u["username"]},
    )
    return _to_response(row)


@router.delete("/{user_id}")
@limiter.limit("10/minute")
def delete_user(
    request: Request,
    user_id: int,
    token: dict = Depends(require_role("admin")),
):
    _reject_if_ldap_signin_enabled()
    u = get_user_by_id(user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    sub = token.get("sub")
    if sub and sub.lower() == u["username"].lower():
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    if u["role"] == "admin" and u["enabled"]:
        others = count_enabled_admins(exclude_user_id=user_id)
        if others < 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete the last active admin",
            )

    delete_local_user(user_id)
    log_audit(
        action="LOCAL_USER_DELETED",
        status="success",
        user_type="admin",
        ip_address=get_client_ip(request),
        details={"target_id": user_id, "username": u["username"]},
    )
    return {"message": "User deleted", "id": user_id}

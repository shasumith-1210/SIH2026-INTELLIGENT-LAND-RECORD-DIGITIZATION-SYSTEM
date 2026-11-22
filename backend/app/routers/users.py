from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from .. import db
from ..security import require

router = APIRouter(prefix="/users", tags=["users"])
ROLES = {"officer", "admin"}

class NewUser(BaseModel):
    username: str
    password: str
    role: str

class Patch(BaseModel):
    role: str | None = None
    active: bool | None = None
    password: str | None = None

@router.get("")
def list_users(_: dict = Depends(require("admin"))):
    return db.list_users()

@router.post("")
def create(body: NewUser, admin: dict = Depends(require("admin"))):
    if body.role not in ROLES or len(body.password) < 10 or not body.username.strip():
        raise HTTPException(422, "Role must be officer or admin, and the password at least 10 characters")
    if not db.create_user(body.username.strip(), body.password, body.role):
        raise HTTPException(409, "User already exists")
    db.log(admin["sub"], "User Created", body.username, None, body.role)
    return {"created": True}

@router.patch("/{username}")
def patch(username: str, body: Patch, admin: dict = Depends(require("admin"))):
    if username == admin["sub"] and (body.active is False or (body.role and body.role != "admin")):
        raise HTTPException(400, "You cannot disable or demote your own account")
    if body.role and body.role not in ROLES or (body.password is not None and len(body.password) < 10):
        raise HTTPException(422, "Invalid role or password too short")
    before = db.get_user(username)
    if not before or not db.update_user(username, body.role, body.active, body.password):
        raise HTTPException(404, "User not found")
    if body.role: db.log(admin["sub"], "Role Changed", username, before["role"], body.role)
    if body.active is not None: db.log(admin["sub"], "User Enabled" if body.active else "User Disabled", username)
    if body.password: db.log(admin["sub"], "Password Reset", username)
    return {"updated": True}

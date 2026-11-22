import os, time
from datetime import timezone
from fastapi import APIRouter, HTTPException
from .. import db
from pydantic import BaseModel
import jwt
from ..security import SECRET, issue, issue_mfa, verify_totp, current_user
from fastapi import Depends

router = APIRouter(prefix="/auth", tags=["auth"])

class Login(BaseModel):
    username: str
    password: str

class OtpRequest(BaseModel):
    phone: str

class OtpVerify(BaseModel):
    phone: str
    code: str

_hits: dict[str, list[float]] = {}

@router.post("/otp/request")
def otp_request(body: OtpRequest):
    t = time.time()
    recent = [x for x in _hits.get(body.phone, []) if t - x < 600]
    if len(recent) >= 5:
        raise HTTPException(429, "Too many code requests; try again later")
    _hits[body.phone] = recent + [t]
    if not SECRET:
        raise HTTPException(503, "Server not configured")
    code = db.create_otp(body.phone)
    if os.environ.get("DEV_OTP_LOG") == "1":
        print(f"[DEV ONLY] OTP for {body.phone}: {code}", flush=True)  # development only; no SMS provider is integrated
    else:
        raise HTTPException(503, "SMS provider not configured")
    return {"sent": True}

@router.post("/otp/verify")
def otp_verify(body: OtpVerify):
    uid = db.check_otp(body.phone, body.code)
    if not uid:
        raise HTTPException(401, "Invalid or expired code")
    return {"access_token": issue(uid, "landowner"), "role": "landowner"}

@router.post("/token")
def token(body: Login):
    u = db.get_user(body.username)
    if u and u["locked_until"] and u["locked_until"].replace(tzinfo=timezone.utc) > db.now():
        raise HTTPException(429, "Account temporarily locked after repeated failures; try again in a few minutes")
    good = bool(SECRET and u and u["active"] and db.check_password(body.password, u["pw_hash"]))
    if not u:
        db.check_password(body.password, db.hash_password("x"))   # same work for unknown users, so timing does not reveal valid usernames
    if not good:
        db.note_login(body.username, False)
        raise HTTPException(401, "Invalid credentials")
    db.note_login(body.username, True)
    if u.get("totp_secret"):
        return {"mfa_required": True, "mfa_token": issue_mfa(u["username"]), "role": u["role"]}
    return {"access_token": issue(u["username"], u["role"]), "role": u["role"], "mfa_required": False}

class Mfa(BaseModel):
    mfa_token: str
    code: str

@router.post("/mfa")
def mfa(body: Mfa):
    try:
        claims = jwt.decode(body.mfa_token, SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired sign-in step")
    u = db.get_user(claims.get("sub", ""))
    if claims.get("purpose") != "mfa" or not u or not u["active"] or not u.get("totp_secret") or not verify_totp(u["username"], u["totp_secret"], body.code):
        raise HTTPException(401, "Invalid code")
    return {"access_token": issue(u["username"], u["role"]), "role": u["role"]}


class PasswordChange(BaseModel):
    old: str
    new: str

@router.post("/password")
def change_password(body: PasswordChange, claims: dict = Depends(current_user)):
    u = db.get_user(claims["sub"])
    if not u or not db.check_password(body.old, u["pw_hash"]):
        raise HTTPException(401, "Current password is incorrect")
    if len(body.new) < 10:
        raise HTTPException(422, "New password must be at least 10 characters")
    db.update_user(claims["sub"], password=body.new)
    db.log(claims["sub"], "Password Changed", "-")
    return {"changed": True}

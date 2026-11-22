import base64, hashlib, hmac, json, os, struct, time
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

SECRET = os.environ.get("JWT_SECRET", "")
USERS = {u["username"]: u for u in json.loads(os.environ.get("USERS_JSON", "[]"))}  # configured by the deployer; none by default
bearer = HTTPBearer()
_used_steps: dict[str, int] = {}
_mfa_fails: dict[str, list[float]] = {}

def totp_at(secret: str, step: int) -> str:
    key = base64.b32decode(secret.replace(" ", "").upper() + "=" * (-len(secret.replace(" ", "")) % 8))
    h = hmac.new(key, struct.pack(">Q", step), hashlib.sha1).digest()
    o = h[-1] & 15
    return f"{(struct.unpack('>I', h[o:o + 4])[0] & 0x7FFFFFFF) % 10**6:06d}"

def verify_totp(user: str, secret: str, code: str) -> bool:
    now = time.time()
    fails = [t for t in _mfa_fails.get(user, []) if now - t < 300]
    if len(fails) >= 5:
        return False
    step = int(now // 30)
    for s in (step - 1, step, step + 1):
        if hmac.compare_digest(totp_at(secret, s), code) and _used_steps.get(user, -1) < s:
            _used_steps[user] = s  # a code can be used only once
            return True
    _mfa_fails[user] = fails + [now]
    return False

def issue_mfa(username: str) -> str:
    return jwt.encode({"sub": username, "purpose": "mfa", "exp": int(time.time()) + 300}, SECRET, algorithm="HS256")

def issue(username: str, role: str) -> str:
    return jwt.encode({"sub": username, "role": role, "exp": int(time.time()) + 3600}, SECRET, algorithm="HS256")

def current_user(cred: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    try:
        return jwt.decode(cred.credentials, SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")

def require(*roles: str):
    def dep(user: dict = Depends(current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(403, "Role not permitted")
        return user
    return dep

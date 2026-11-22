"""Repository layer (SQLAlchemy). DATABASE_URL=postgresql+psycopg2://... for PostgreSQL; defaults to local SQLite for development."""
import hashlib, os, secrets, uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String, create_engine, select, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, Session

engine = create_engine(os.environ.get("DATABASE_URL", "sqlite:///./intelliland.db"))

def now() -> datetime:
    return datetime.now(timezone.utc)

class Base(DeclarativeBase):
    pass

class Document(Base):
    __tablename__ = "documents"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    status: Mapped[str] = mapped_column(String(32))
    data: Mapped[dict] = mapped_column(JSON)

class Audit(Base):
    __tablename__ = "audit"
    n: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    user: Mapped[str] = mapped_column(String(64))
    action: Mapped[str] = mapped_column(String(128))
    record: Mapped[str] = mapped_column(String(32))
    previous: Mapped[str | None] = mapped_column(String(256), nullable=True)
    updated: Mapped[str | None] = mapped_column(String(256), nullable=True)
    prev_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    hash: Mapped[str | None] = mapped_column(String(64), nullable=True)

class User(Base):
    __tablename__ = "users"
    username: Mapped[str] = mapped_column(String(64), primary_key=True)
    pw_hash: Mapped[str] = mapped_column(String(256))
    role: Mapped[str] = mapped_column(String(16))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    totp_secret: Mapped[str | None] = mapped_column(String(64), nullable=True)
    failed: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Parcel(Base):
    __tablename__ = "parcels"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    survey: Mapped[str] = mapped_column(String(64))
    district: Mapped[str] = mapped_column(String(64))
    record_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    geometry: Mapped[dict] = mapped_column(JSON)   # GeoJSON Polygon; swap for a PostGIS geometry column when PostGIS is enabled
    area_sqm: Mapped[float] = mapped_column(Float)
    kind: Mapped[str] = mapped_column(String(16), default="parcel", server_default="parcel")      # parcel | village | district
    history: Mapped[list] = mapped_column(JSON, default=list, server_default="[]")           # earlier geometries, newest last (for before/after overlay)

class Otp(Base):
    __tablename__ = "otp"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)  # hash of phone; raw numbers are not stored
    code_hash: Mapped[str] = mapped_column(String(64))
    expires: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0)

if os.environ.get("DB_AUTO_CREATE", "1") == "1":   # set to 0 in production and run `alembic upgrade head`
    Base.metadata.create_all(engine)

def _h(v: str) -> str:
    return hashlib.sha256((os.environ.get("JWT_SECRET", "") + v).encode()).hexdigest()

def _ts(dt: datetime) -> str:
    dt = dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.%f")

def _chain(prev: str, t: str, user: str, action: str, record: str, previous: str | None, updated: str | None) -> str:
    return hashlib.sha256("|".join([prev, t, user, action, record, previous or "", updated or ""]).encode()).hexdigest()

def log(user: str, action: str, record: str, prev: str | None = None, new: str | None = None) -> None:
    """Append-only audit entry. Each entry hashes the previous one, so edits or deletions of past rows are detectable (verify_chain)."""
    with Session(engine) as s:
        last = s.scalars(select(Audit).where(Audit.hash.is_not(None)).order_by(Audit.n.desc()).limit(1)).first()
        t = now()
        ph = last.hash if last else ""
        s.add(Audit(time=t, user=user, action=action, record=record, previous=prev, updated=new, prev_hash=ph, hash=_chain(ph, _ts(t), user, action, record, prev, new)))
        s.commit()

def audit_list(limit: int = 500, offset: int = 0) -> list[dict]:
    with Session(engine) as s:
        rows = s.scalars(select(Audit).order_by(Audit.n.desc()).limit(limit).offset(offset)).all()
        return [{"id": f"AUD-{r.n:05d}", "time": r.time.isoformat(), "user": r.user, "action": r.action, "record": r.record, "previous": r.previous, "updated": r.updated} for r in rows]

def verify_chain() -> dict:
    with Session(engine) as s:
        prev, n = "", 0
        for r in s.scalars(select(Audit).where(Audit.hash.is_not(None)).order_by(Audit.n)):
            if r.prev_hash != prev or r.hash != _chain(prev, _ts(r.time), r.user, r.action, r.record, r.previous, r.updated):
                return {"ok": False, "checked": n, "first_bad": f"AUD-{r.n:05d}"}
            prev, n = r.hash, n + 1
        return {"ok": True, "checked": n, "first_bad": None}

# ---- users and passwords (PBKDF2-SHA256; plaintext passwords are never stored)
ITER = 200_000

def hash_password(pw: str) -> str:
    salt = secrets.token_hex(16)
    return f"pbkdf2_sha256${ITER}${salt}${hashlib.pbkdf2_hmac('sha256', pw.encode(), salt.encode(), ITER).hex()}"

def check_password(pw: str, stored: str) -> bool:
    try:
        _, it, salt, h = stored.split("$")
        return secrets.compare_digest(hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), int(it)).hex(), h)
    except ValueError:
        return False

def seed_users(users_json: str) -> None:
    """Creates accounts listed in USERS_JSON that do not exist yet (first-run bootstrap). Later changes are made through the admin API."""
    import json
    with Session(engine) as s:
        for u in json.loads(users_json or "[]"):
            if not s.get(User, u["username"]):
                s.add(User(username=u["username"], pw_hash=hash_password(u["password"]), role=u["role"], totp_secret=u.get("totp_secret")))
        s.commit()

def user_dict(u: User) -> dict:
    return {"username": u.username, "role": u.role, "active": u.active, "has_2fa": bool(u.totp_secret), "locked": bool(u.locked_until and u.locked_until.replace(tzinfo=timezone.utc) > now())}

def get_user(username: str) -> dict | None:
    with Session(engine) as s:
        u = s.get(User, username)
        return None if not u else {**user_dict(u), "pw_hash": u.pw_hash, "totp_secret": u.totp_secret, "locked_until": u.locked_until}

def list_users() -> list[dict]:
    with Session(engine) as s:
        return [user_dict(u) for u in s.scalars(select(User).order_by(User.username))]

def create_user(username: str, password: str, role: str, totp_secret: str | None = None) -> bool:
    with Session(engine) as s:
        if s.get(User, username):
            return False
        s.add(User(username=username, pw_hash=hash_password(password), role=role, totp_secret=totp_secret))
        s.commit()
        return True

def update_user(username: str, role: str | None = None, active: bool | None = None, password: str | None = None) -> bool:
    with Session(engine) as s:
        u = s.get(User, username)
        if not u:
            return False
        if role: u.role = role
        if active is not None: u.active = active
        if password:
            u.pw_hash, u.failed, u.locked_until = hash_password(password), 0, None
        s.commit()
        return True

def note_login(username: str, ok: bool) -> None:
    with Session(engine) as s:
        u = s.get(User, username)
        if not u:
            return
        if ok:
            u.failed, u.locked_until = 0, None
        else:
            u.failed += 1
            if u.failed >= 5:   # lock for 5 minutes after 5 consecutive failures
                u.locked_until, u.failed = now() + timedelta(minutes=5), 0
        s.commit()

def add_document(data: dict) -> dict:
    doc_id = f"APP-{uuid.uuid4().hex[:8].upper()}"
    rec = {**data, "id": doc_id, "uploaded": now().isoformat(), "status": "submitted"}
    with Session(engine) as s:
        s.add(Document(id=doc_id, status="submitted", data=rec))
        s.commit()
    return rec

def get_document(doc_id: str) -> dict | None:
    with Session(engine) as s:
        d = s.get(Document, doc_id)
        return {**d.data, "status": d.status} if d else None

def update_data(doc_id: str, **kv) -> None:
    with Session(engine) as s:
        d = s.get(Document, doc_id)
        d.data = {**d.data, **kv}
        s.commit()

def list_documents() -> list[dict]:
    with Session(engine) as s:
        return [{**d.data, "status": d.status} for d in s.scalars(select(Document)).all()]

def set_status(doc_id: str, status: str) -> None:
    with Session(engine) as s:
        d = s.get(Document, doc_id)
        d.status = status
        s.commit()

def add_parcel(survey: str, district: str, record_id: str | None, geometry: dict, area_sqm: float, kind: str = "parcel") -> dict:
    pid = f"PCL-{uuid.uuid4().hex[:8].upper()}"
    with Session(engine) as s:
        s.add(Parcel(id=pid, survey=survey, district=district, record_id=record_id, geometry=geometry, area_sqm=area_sqm, kind=kind, history=[]))
        s.commit()
    return {"id": pid, "survey": survey, "district": district, "record_id": record_id, "area_sqm": area_sqm, "kind": kind}

def list_parcels(owner_sub: str | None = None) -> list[dict]:
    with Session(engine) as s:
        status = {d.id: (d.status, d.data.get("owner_sub")) for d in s.scalars(select(Document)).all()}
        out = []
        for p in s.scalars(select(Parcel)).all():
            st, osub = status.get(p.record_id, (None, None))
            if owner_sub and osub != owner_sub:
                continue
            out.append({"type": "Feature", "id": p.id, "geometry": p.geometry, "properties": {"survey": p.survey, "district": p.district, "record_id": p.record_id, "area_sqm": p.area_sqm, "kind": p.kind or "parcel", "status": st, "history": p.history or []}})
        return out

def update_parcel_geometry(pid: str, geometry: dict, area_sqm: float) -> bool:
    with Session(engine) as s:
        p = s.get(Parcel, pid)
        if not p:
            return False
        p.history = (p.history or []) + [{"geometry": p.geometry, "area_sqm": p.area_sqm, "replaced": now().isoformat()}]
        p.geometry, p.area_sqm = geometry, area_sqm
        s.commit()
        return True

def find_parcel(survey: str, district: str) -> dict | None:
    with Session(engine) as s:
        for p in s.scalars(select(Parcel)).all():
            if p.survey.lower() == survey.lower() and p.district.lower() == district.lower():
                return {"id": p.id, "area_sqm": p.area_sqm}
    return None

def create_otp(phone: str) -> str:
    code = f"{secrets.randbelow(10**6):06d}"
    with Session(engine) as s:
        s.merge(Otp(key=_h(phone), code_hash=_h(code), expires=now() + timedelta(minutes=5), attempts=0))
        s.commit()
    return code

def check_otp(phone: str, code: str) -> str | None:
    """Returns a stable pseudonymous user id on success."""
    with Session(engine) as s:
        o = s.get(Otp, _h(phone))
        if not o or o.expires.replace(tzinfo=timezone.utc) < now() or o.attempts >= 5:
            return None
        o.attempts += 1
        ok = secrets.compare_digest(o.code_hash, _h(code))
        if ok:
            s.delete(o)
        s.commit()
        return f"ph:{_h(phone)[:12]}" if ok else None

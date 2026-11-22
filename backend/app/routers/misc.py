import math
from .validation import validate_document
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from .. import db
from ..security import require

audit = APIRouter(prefix="/audit", tags=["audit"])
gis = APIRouter(prefix="/gis", tags=["gis"])
reports = APIRouter(prefix="/reports", tags=["reports"])

@audit.get("")
def entries(_: dict = Depends(require("officer", "admin"))):
    return db.audit_list()

class ParcelIn(BaseModel):
    survey: str
    district: str
    record_id: str | None = None
    geometry: dict
    kind: str = "parcel"

def polygon_area_sqm(geom: dict) -> float:
    """Local equirectangular projection + shoelace on the outer ring: adequate for single parcels, not a survey-grade calculation."""
    if geom.get("type") != "Polygon" or not geom.get("coordinates"):
        raise ValueError("geometry must be a GeoJSON Polygon")
    ring = geom["coordinates"][0]
    if len(ring) < 4 or ring[0] != ring[-1]:
        raise ValueError("polygon ring must have at least 4 points and be closed")
    if any(not (-180 <= x <= 180 and -90 <= y <= 90) for x, y in ring):
        raise ValueError("coordinates out of range (expected [lon, lat])")
    lat0 = math.radians(sum(y for _, y in ring) / len(ring))
    pts = [(math.radians(x) * 6371008.8 * math.cos(lat0), math.radians(y) * 6371008.8) for x, y in ring]
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(pts, pts[1:]))) / 2

@gis.post("/parcels")
def add_parcel(body: ParcelIn, user: dict = Depends(require("officer", "admin"))):
    try:
        area = polygon_area_sqm(body.geometry)
    except ValueError as e:
        raise HTTPException(422, str(e))
    if body.kind not in ("parcel", "village", "district"):
        raise HTTPException(422, "kind must be parcel, village or district")
    p = db.add_parcel(body.survey, body.district, body.record_id, body.geometry, area, body.kind)
    db.log(user["sub"], "Parcel Geometry Added", body.record_id or p["id"], None, f"{body.survey}, {body.district}")
    return p

class GeometryIn(BaseModel):
    geometry: dict

@gis.put("/parcels/{pid}")
def update_parcel(pid: str, body: GeometryIn, user: dict = Depends(require("officer", "admin"))):
    try:
        area = polygon_area_sqm(body.geometry)
    except ValueError as e:
        raise HTTPException(422, str(e))
    if not db.update_parcel_geometry(pid, body.geometry, area):
        raise HTTPException(404, "Parcel not found")
    db.log(user["sub"], "Parcel Geometry Updated", pid, None, f"area {area:.0f} m2 (previous geometry kept)")
    return {"updated": True, "area_sqm": area}

@gis.get("/parcels/mine")
def my_parcels(user: dict = Depends(require("landowner"))):
    return {"type": "FeatureCollection", "features": db.list_parcels(owner_sub=user["sub"])}

@gis.get("/parcels")
def parcels(_: dict = Depends(require("officer", "admin"))):
    return {"type": "FeatureCollection", "features": db.list_parcels()}

@reports.get("/summary")
def summary(_: dict = Depends(require("admin", "officer"))):
    docs = db.list_documents()
    by_status: dict[str, int] = {}
    by_district: dict[str, int] = {}
    confs = []
    for d in docs:
        by_status[d["status"]] = by_status.get(d["status"], 0) + 1
        by_district[d.get("district", "?")] = by_district.get(d.get("district", "?"), 0) + 1
        fs = d.get("result", {}).get("fields", [])
        if fs:
            confs.append(sum(f["confidence"] for f in fs) / len(fs))
    officers: dict[str, int] = {}
    corrections = 0
    for e in db.audit_list():
        if e["action"].startswith(("Approved", "Rejected", "Corrected")):
            officers[e["user"]] = officers.get(e["user"], 0) + 1
        corrections += e["action"].startswith("Corrected")
    field_conf: dict[str, list[int]] = {}
    findings: dict[str, int] = {}
    per_day: dict[str, int] = {}
    routes = {"first_pass_eligible": 0, "officer_queue": 0}
    total_fields = 0
    done = [d for d in docs if d.get("result")]
    for d in docs:
        per_day[d["uploaded"][:10]] = per_day.get(d["uploaded"][:10], 0) + 1
    for d in done:
        for f in d["result"]["fields"]:
            field_conf.setdefault(f["name"], []).append(f["confidence"])
            total_fields += 1
        routes[d["result"].get("route", "officer_queue")] = routes.get(d["result"].get("route", "officer_queue"), 0) + 1
        for chk in validate_document(d, [o for o in done if o["id"] != d["id"]]):
            if chk["status"] in ("warning", "failed"):
                findings[chk["category"]] = findings.get(chk["category"], 0) + 1
    return {"by_status": by_status, "field_confidence": {k: round(sum(v) / len(v)) for k, v in field_conf.items()}, "findings": findings,
            "per_day": dict(sorted(per_day.items())[-14:]), "routes": routes,
            "correction_rate": round(corrections / total_fields, 3) if total_fields else None, "fields_total": total_fields,
            "received": len(docs), "officer_verified": by_status.get("officer_verified", 0), "rejected": by_status.get("rejected", 0),
            "processed": by_status.get("processed", 0), "submitted": by_status.get("submitted", 0),
            "pending": by_status.get("processed", 0) + by_status.get("submitted", 0), "by_district": by_district,
            "avg_confidence": round(sum(confs) / len(confs)) if confs else None, "officer_actions": officers, "corrections": corrections}


@audit.get("/verify")
def verify(_: dict = Depends(require("admin"))):
    return db.verify_chain()

@reports.get("/feedback.jsonl")
def feedback(_: dict = Depends(require("officer", "admin"))):
    """Officer corrections as labelled examples (OCR value vs corrected value, with page and region) for future model training."""
    import json
    from fastapi.responses import PlainTextResponse
    lines = []
    for d in db.list_documents():
        for f in d.get("result", {}).get("fields", []):
            if f.get("corrected"):
                lines.append(json.dumps({"document": d["id"], "field": f["name"], "ocr_value": f["original"], "corrected_value": f["value"], "ocr_confidence": f["confidence"], "page": f["page"], "region": f["region"]}, ensure_ascii=False))
    return PlainTextResponse("\n".join(lines), media_type="application/x-ndjson")

import difflib, re
from fastapi import APIRouter, Depends, HTTPException
from .. import db
from ..security import require

router = APIRouter(tags=["validation"])
REQUIRED = ["owner_name", "survey_number", "village", "district", "area"]

def run_checks(fields: dict[str, str]) -> list[dict]:
    """Rule checks only. Results are potential inconsistencies for authorised review, never legal findings."""
    out = [{"check": f"{k} present", "status": "passed" if fields.get(k) else "failed"} for k in REQUIRED]
    try:
        ok = float(str(fields.get("area", "")).split()[0]) > 0
    except (ValueError, IndexError):
        ok = False
    out.append({"check": "area is a positive number", "status": "passed" if ok else "warning"})
    return out

def _flt(v: str) -> float | None:
    try:
        return float(str(v).split()[0])
    except (ValueError, IndexError):
        return None

def validate_document(doc: dict, others: list[dict]) -> list[dict]:
    """Rule + cross-record checks over stored OCR fields. Findings are potential inconsistencies for authorised review, never legal conclusions."""
    fields = {f["name"]: f for f in doc.get("result", {}).get("fields", [])}
    out: list[dict] = []
    def add(category, title, status, field=None, why=None):
        out.append({"id": f"V-{len(out) + 1:02d}", "category": category, "title": title, "status": status, "field": field, "explanation": why})
    for name in ["survey_number", "owner_name", "village", "district", "area"]:
        pretty = name.replace("_", " ")
        if name in fields:
            add("Missing fields", f"{pretty} present", "passed")
        else:
            add("Missing fields", f"{pretty} present", "failed", name, "Not extracted from the scan. Request a clearer scan or have an officer enter it manually.")
    for f in fields.values():
        if f["confidence"] < 60:
            add("Invalid or incomplete data", f"{f['name'].replace('_', ' ')} read with low confidence", "warning", f["name"], f"OCR confidence is {f['confidence']}%. Compare against the original scan.")
    if "survey_number" in fields:
        ok = bool(re.fullmatch(r"\d+[A-Za-z]?(?:[/-]\w+)?", fields["survey_number"]["value"]))
        add("Survey number", "Survey number format", "passed" if ok else "warning", None if ok else "survey_number", None if ok else "Unusual format, possibly an OCR misread. Needs officer comparison with the scan.")
    if "area" in fields:
        a = _flt(fields["area"]["value"])
        add("Area", "Area is a positive number", "passed" if a and a > 0 else "warning", None if a and a > 0 else "area", None if a and a > 0 else "Could not parse a positive area value.")
    survey = fields.get("survey_number", {}).get("value", "").lower()
    owner = fields.get("owner_name", {}).get("value", "").lower()
    dups, conflicts, similar = [], [], []
    for o in others:
        of = {f["name"]: f for f in o.get("result", {}).get("fields", [])}
        if survey and of.get("survey_number", {}).get("value", "").lower() == survey and o.get("district", "").lower() == doc.get("district", "").lower():
            pass
        elif survey and o.get("district", "").lower() == doc.get("district", "").lower() and of.get("survey_number") and difflib.SequenceMatcher(None, re.sub(r"\W", "", survey), re.sub(r"\W", "", of["survey_number"]["value"].lower())).ratio() >= 0.8:
            similar.append(o["id"])
        if survey and of.get("survey_number", {}).get("value", "").lower() == survey and o.get("district", "").lower() == doc.get("district", "").lower():
            (conflicts if owner and of.get("owner_name", {}).get("value", "").lower() not in ("", owner) else dups).append(o["id"])
    add("Duplicates", "No other record with the same survey number and district", "warning" if dups else "passed", "survey_number" if dups else None,
        f"Possible duplicate of {', '.join(dups)}. Flagged for authorised review, not a conclusion." if dups else None)
    add("Duplicates", "No near-identical survey numbers in the same district", "warning" if similar else "passed", "survey_number" if similar else None,
        f"Survey number is very similar to a record in {', '.join(similar)}. May be a misread or a related parcel; compare against the scans." if similar else None)
    add("Ownership", "Owner name consistent with other records for this survey number", "warning" if conflicts else "passed", "owner_name" if conflicts else None,
        f"{', '.join(conflicts)} lists a different owner for the same survey number. This is a potential inconsistency requiring authorised review, not a legal finding." if conflicts else None)
    p = db.find_parcel(fields["survey_number"]["value"], doc.get("district", "")) if "survey_number" in fields else None
    unit = fields.get("area", {}).get("value", "").lower()
    factor = 10000 if "hectare" in unit or unit.endswith(" ha") else 4046.8564224 if "acre" in unit else 1 if "sq" in unit else None
    area = _flt(fields.get("area", {}).get("value", ""))
    if not p:
        add("GIS / spatial", "Parcel geometry available for this survey number", "pending", None, "No parcel geometry has been uploaded for this survey number and district.")
    elif factor is None or area is None:
        add("GIS / spatial", "Documented area vs. parcel area", "pending", "area", "The area unit (for example bigha) has no configured conversion, because its size varies by state. Compare manually.")
    else:
        diff = abs(area * factor - p["area_sqm"]) / p["area_sqm"]
        add("GIS / spatial", "Documented area vs. parcel area", "passed" if diff <= 0.10 else "warning", None if diff <= 0.10 else "area",
            None if diff <= 0.10 else f"Documented area differs from the uploaded parcel geometry by {diff:.0%}. Potential inconsistency for authorised review.")
    return out

@router.get("/documents/{doc_id}/validation")
def validation(doc_id: str, _: dict = Depends(require("officer", "admin"))):
    doc = db.get_document(doc_id)
    if not doc or "result" not in doc:
        raise HTTPException(404, "No OCR result to validate")
    return validate_document(doc, [d for d in db.list_documents() if d["id"] != doc_id])

@router.post("/documents/{doc_id}/validate")
def validate(doc_id: str, fields: dict[str, str], _: dict = Depends(require("officer", "admin"))):
    return {"document": doc_id, "checks": run_checks(fields)}

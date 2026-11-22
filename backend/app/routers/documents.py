from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from .. import db
from ..security import require

router = APIRouter(prefix="/documents", tags=["documents"])

class SubmissionIn(BaseModel):
    owner: str
    survey: str
    district: str
    tehsil: str = ""
    docType: str
    fileCount: int

@router.post("")
def submit(body: SubmissionIn, user: dict = Depends(require("landowner", "officer"))):
    rec = db.add_document({**body.model_dump(), "owner_sub": user["sub"]})
    db.log(user["sub"], "Uploaded Document", rec["id"], None, body.docType)
    return rec

def _summarise(docs: list[dict]) -> list[dict]:
    out = []
    for d in docs:
        fs = d.get("result", {}).get("fields", [])
        d = {k: v for k, v in d.items() if k != "result"}
        d["confidence"] = round(sum(f["confidence"] for f in fs) / len(fs)) if fs else 0
        d["flagged"] = sum(f["status"] != "high" for f in fs)
        d["extracted"] = {x["name"]: x["value"] for x in fs}
        d["route"] = d.get("result", {}).get("route")
        out.append(d)
    return out

@router.get("")
def list_documents(limit: int = 200, offset: int = 0, user: dict = Depends(require("officer", "admin"))):
    return _summarise(db.list_documents())[offset: offset + min(limit, 500)]

@router.get("/{doc_id}/export")
def export_record(doc_id: str, user: dict = Depends(require("officer", "admin"))):
    """Authorised export of an officer-verified record with provenance, validation findings and its audit history."""
    d = db.get_document(doc_id)
    if not d:
        raise HTTPException(404, "Record not found")
    if d["status"] != "officer_verified":
        raise HTTPException(409, "Only officer-verified records can be exported")
    from .validation import validate_document
    others = [o for o in db.list_documents() if o["id"] != doc_id and o.get("result")]
    db.log(user["sub"], "Record Exported", doc_id)
    return {"record_id": doc_id, "status": d["status"], "district": d.get("district"), "doc_type": d.get("docType"),
            "fields": d.get("result", {}).get("fields", []), "validation": validate_document(d, others),
            "audit": [e for e in db.audit_list() if e["record"] == doc_id], "note": "Officer-verified by this system; not an official government record."}

@router.get("/mine")
def my_documents(user: dict = Depends(require("landowner"))):
    return [{k: v for k, v in d.items() if k != "owner_sub"} for d in _summarise([d for d in db.list_documents() if d.get("owner_sub") == user["sub"]])]

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from .. import db
from ..security import require

router = APIRouter(prefix="/records", tags=["verification"])

class Approve(BaseModel):
    officer: str | None = None

class Correction(BaseModel):
    field: str
    previous: str
    updated: str

@router.post("/{rec_id}/approve")
def approve(rec_id: str, _: Approve, user: dict = Depends(require("officer"))):
    if not db.get_document(rec_id):
        raise HTTPException(404, "Record not found")
    db.set_status(rec_id, "officer_verified")
    db.log(user["sub"], "Approved Record", rec_id)
    return db.get_document(rec_id)

class FieldDecision(BaseModel):
    field: str
    approved: bool

@router.post("/{rec_id}/field-decision")
def field_decision(rec_id: str, d: FieldDecision, user: dict = Depends(require("officer"))):
    if not db.get_document(rec_id):
        raise HTTPException(404, "Record not found")
    db.log(user["sub"], f"{'Approved' if d.approved else 'Rejected'} Field {d.field}", rec_id)
    return {"recorded": True}

class Note(BaseModel):
    message: str

def _status_note(rec_id: str, status: str, action: str, message: str, user: dict):
    if not db.get_document(rec_id):
        raise HTTPException(404, "Record not found")
    db.set_status(rec_id, status)
    db.update_data(rec_id, note=message)
    db.log(user["sub"], action, rec_id, None, message[:200])
    return db.get_document(rec_id)

@router.post("/{rec_id}/request-info")
def request_info(rec_id: str, n: Note, user: dict = Depends(require("officer"))):
    return _status_note(rec_id, "info_requested", "Requested Information", n.message, user)

@router.post("/{rec_id}/send-back")
def send_back(rec_id: str, n: Note, user: dict = Depends(require("officer"))):
    return _status_note(rec_id, "correction_required", "Sent Back For Correction", n.message, user)

@router.post("/{rec_id}/reject")
def reject(rec_id: str, user: dict = Depends(require("officer"))):
    if not db.get_document(rec_id):
        raise HTTPException(404, "Record not found")
    db.set_status(rec_id, "rejected")
    db.log(user["sub"], "Rejected Record", rec_id)
    return db.get_document(rec_id)

@router.post("/{rec_id}/corrections")
def correct(rec_id: str, c: Correction, user: dict = Depends(require("officer"))):
    doc = db.get_document(rec_id)
    if not doc:
        raise HTTPException(404, "Record not found")
    res, key = doc.get("result"), c.field.lower().replace(" ", "_")
    if res:
        for f in res["fields"]:
            if f["name"] == key or f["name"].replace("_number", "") == key.replace("total_", "").replace("_number", ""):
                f.setdefault("original", f["value"])
                f["value"], f["corrected"] = c.updated, True
        db.update_data(rec_id, result=res)
    db.log(user["sub"], f"Corrected {c.field}", rec_id, c.previous, c.updated)  # also labelled feedback for future training
    return {"recorded": True}

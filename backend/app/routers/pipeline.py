import os, shutil
import cv2
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from .. import db, pipeline
from ..security import require

router = APIRouter(prefix="/documents", tags=["pipeline"])
STORAGE = os.environ.get("STORAGE_DIR", "./storage")
MAGIC = {b"%PDF": ".pdf", b"\x89PNG": ".png", b"\xff\xd8\xff": ".jpg"}
MAX_BYTES, MAX_FILES = 10 * 1024 * 1024, 5

def _dir(doc_id: str) -> str:
    return os.path.join(STORAGE, doc_id)

@router.post("/{doc_id}/files")
async def upload(doc_id: str, files: list[UploadFile] = File(...), user: dict = Depends(require("landowner", "officer"))):
    doc = db.get_document(doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    existing = doc.get("files", [])
    if len(existing) + len(files) > MAX_FILES:
        raise HTTPException(400, f"At most {MAX_FILES} files per application")
    os.makedirs(_dir(doc_id), exist_ok=True)
    saved = []
    for f in files:
        blob = await f.read(MAX_BYTES + 1)
        if len(blob) > MAX_BYTES:
            raise HTTPException(413, f"{f.filename} exceeds 10MB")
        ext = next((e for m, e in MAGIC.items() if blob.startswith(m)), None)  # trust content, not the client filename or MIME type
        if not ext:
            raise HTTPException(415, f"{f.filename}: only PDF, JPG and PNG are accepted")
        name = f"file{len(existing) + len(saved) + 1}{ext}"
        with open(os.path.join(_dir(doc_id), name), "wb") as out:
            out.write(blob)
        saved.append(name)
    db.update_data(doc_id, files=existing + saved)
    db.log(user["sub"], "Files Uploaded", doc_id, None, ", ".join(saved))
    return {"files": existing + saved}

@router.post("/{doc_id}/process")
def process(doc_id: str, background: BackgroundTasks, wait: bool = False, user: dict = Depends(require("officer", "admin", "landowner"))):
    """Starts OCR in the background (status becomes 'processing', then 'processed' or 'failed'). Pass wait=true to run inline and get the result."""
    doc = db.get_document(doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    if not doc.get("files"):
        raise HTTPException(409, "No files uploaded for this document")
    if doc["status"] == "processing":
        raise HTTPException(409, "Already processing")
    if wait:
        return _run(doc_id, user["sub"])
    db.set_status(doc_id, "processing")
    background.add_task(_run_safe, doc_id, user["sub"])
    return {"status": "processing"}

def _run_safe(doc_id: str, sub: str) -> None:
    try:
        _run(doc_id, sub)
    except Exception as e:  # keep the failure visible instead of leaving the document stuck in 'processing'
        db.update_data(doc_id, error=str(e)[:200])
        db.set_status(doc_id, "failed")
        db.log(sub, "OCR Failed", doc_id, None, str(e)[:120])

def _run(doc_id: str, sub: str) -> dict:
    doc = db.get_document(doc_id)
    user = {"sub": sub}
    pages, fields, offset = [], [], 0
    for name in doc["files"]:
        p, f, originals, enhanced = pipeline.run_full(os.path.join(_dir(doc_id), name))
        for i, img in enumerate(originals, 1):
            cv2.imwrite(os.path.join(_dir(doc_id), f"page{offset + i}.png"), img)
            cv2.imwrite(os.path.join(_dir(doc_id), f"page{offset + i}_enhanced.png"), enhanced[i - 1])
        for x in p:
            x["page"] += offset
        for x in f:
            x["page"] += offset
        pages += p; fields += f; offset += len(p)
    # Routing rule (configurable): a record is eligible for first-pass review when all five core fields were read with high confidence.
    core = {"survey_number", "khata_number", "area", "village", "owner_name"} | {"khasra_number"}
    got = {f["name"]: f for f in fields}
    eligible = len([k for k in core if k in got]) >= 5 and all(f["confidence"] >= 90 for f in fields)
    result = {"engine": "tesseract", "pages": pages, "fields": fields, "route": "first_pass_eligible" if eligible else "officer_queue"}
    db.update_data(doc_id, result=result)
    db.set_status(doc_id, "processed")
    db.log(user["sub"], "OCR Processed", doc_id, None, f"{len(fields)} fields extracted")
    return result

@router.get("/{doc_id}/result")
def result(doc_id: str, _: dict = Depends(require("officer", "admin"))):
    doc = db.get_document(doc_id)
    if not doc or "result" not in doc:
        raise HTTPException(404, "No result yet")
    return doc["result"]

@router.get("/{doc_id}/pages/{n}/image")
def page_image(doc_id: str, n: int, variant: str = "original", _: dict = Depends(require("officer", "admin"))):
    path = os.path.join(_dir(doc_id), f"page{int(n)}{'_enhanced' if variant == 'enhanced' else ''}.png")
    if not os.path.isfile(path):
        raise HTTPException(404, "Page not found")
    return FileResponse(path, media_type="image/png")

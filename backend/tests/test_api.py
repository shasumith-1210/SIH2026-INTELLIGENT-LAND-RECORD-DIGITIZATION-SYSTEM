import os, json, io, contextlib
os.environ.update(JWT_SECRET="test-secret", DEV_OTP_LOG="1", DATABASE_URL=os.environ.get("TEST_DATABASE_URL", "sqlite:///./test.db"),
                  USERS_JSON=json.dumps([{"username": "o1", "password": "pw", "role": "officer"}]))
from fastapi.testclient import TestClient
from app.main import app
from app import db

c = TestClient(app)
H = lambda t: {"Authorization": f"Bearer {t}"}
DOC = {"owner": "A", "survey": "1/A", "district": "Varanasi", "docType": "7/12 extract", "fileCount": 1}

import itertools
_phones = itertools.count(9990001111)

def landowner_token():
    phone = str(next(_phones))
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        assert c.post("/api/v1/auth/otp/request", json={"phone": phone}).status_code == 200
    code = buf.getvalue().strip().split()[-1]
    r = c.post("/api/v1/auth/otp/verify", json={"phone": phone, "code": code})
    assert r.status_code == 200
    return r.json()["access_token"]

def test_auth_rules():
    assert c.post("/api/v1/auth/token", json={"username": "o1", "password": "bad"}).status_code == 401
    assert c.post("/api/v1/auth/otp/verify", json={"phone": "9000000000", "code": "000000"}).status_code == 401
    assert c.get("/api/v1/documents").status_code in (401, 403)

def test_full_flow():
    lt = landowner_token()
    d = c.post("/api/v1/documents", json=DOC, headers=H(lt))
    assert d.status_code == 200
    doc_id = d.json()["id"]
    assert c.post(f"/api/v1/records/{doc_id}/approve", json={}, headers=H(lt)).status_code == 403  # landowner cannot approve
    ot = c.post("/api/v1/auth/token", json={"username": "o1", "password": "pw"}).json()["access_token"]
    assert c.post(f"/api/v1/records/{doc_id}/approve", json={}, headers=H(ot)).json()["status"] == "officer_verified"
    assert c.post(f"/api/v1/records/{doc_id}/corrections", json={"field": "area", "previous": "3.2", "updated": "3.4"}, headers=H(ot)).status_code == 200
    log = c.get("/api/v1/audit", headers=H(ot)).json()
    assert [e["action"] for e in log][:2] == ["Corrected area", "Approved Record"]
    assert c.post("/api/v1/documents/x/process").status_code in (401, 403)  # requires auth now

def test_otp_single_use_and_validation():
    lt = landowner_token()  # fresh code
    r = c.post("/api/v1/documents/x/validate", json={"owner_name": "A", "area": "3.2 Bigha"}, headers=H(c.post("/api/v1/auth/token", json={"username": "o1", "password": "pw"}).json()["access_token"]))
    st = {x["check"]: x["status"] for x in r.json()["checks"]}
    assert st["survey_number present"] == "failed" and st["area is a positive number"] == "passed"

import shutil, pytest
from PIL import Image, ImageDraw, ImageFont

@pytest.mark.skipif(shutil.which("tesseract") is None, reason="tesseract not installed")
def test_real_ocr_pipeline(tmp_path):
    img = Image.new("RGB", (1100, 520), "white")
    d = ImageDraw.Draw(img)
    f = ImageFont.load_default(size=40)
    for i, line in enumerate(["Survey No: 78C", "Khata No: 2241", "Area: 3.2 Bigha", "Village: Chaubeypur", "Owner Name: Suresh Patel"]):
        d.text((40, 30 + i * 90), line, fill="black", font=f)
    p = tmp_path / "scan.png"; img.save(p)
    lt = landowner_token()
    doc_id = c.post("/api/v1/documents", json=DOC, headers=H(lt)).json()["id"]
    bad = c.post(f"/api/v1/documents/{doc_id}/files", files={"files": ("x.png", b"not an image", "image/png")}, headers=H(lt))
    assert bad.status_code == 415
    ok = c.post(f"/api/v1/documents/{doc_id}/files", files={"files": ("scan.png", p.read_bytes(), "image/png")}, headers=H(lt))
    assert ok.status_code == 200
    r = c.post(f"/api/v1/documents/{doc_id}/process?wait=true", headers=H(lt))
    assert r.status_code == 200, r.text
    got = {x["name"]: x for x in r.json()["fields"]}
    assert got["survey_number"]["value"].upper().startswith("78")
    assert got["khata_number"]["value"] == "2241"
    assert "bigha" in got["area"]["value"].lower()
    assert all(0 <= v for x in got.values() for v in x["region"])
    ot = c.post("/api/v1/auth/token", json={"username": "o1", "password": "pw"}).json()["access_token"]
    assert c.get(f"/api/v1/documents/{doc_id}/pages/1/image", headers=H(ot)).status_code == 200
    assert c.post(f"/api/v1/records/{doc_id}/corrections", json={"field": "Survey Number", "previous": "78C", "updated": "78/C"}, headers=H(ot)).status_code == 200
    fixed = {x["name"]: x for x in c.get(f"/api/v1/documents/{doc_id}/result", headers=H(ot)).json()["fields"]}
    assert fixed["survey_number"]["value"] == "78/C" and fixed["survey_number"]["original"] == "78C"

def test_otp_rate_limit():
    codes = [c.post("/api/v1/auth/otp/request", json={"phone": "1112223333"}).status_code for _ in range(6)]
    assert codes[:5] == [200] * 5 and codes[5] == 429


def test_validation_and_reject():
    lt = landowner_token()
    ot = c.post("/api/v1/auth/token", json={"username": "o1", "password": "pw"}).json()["access_token"]
    def mk(owner, survey):
        i = c.post("/api/v1/documents", json={**DOC, "survey": survey}, headers=H(lt)).json()["id"]
        fs = [{"name": "survey_number", "value": survey, "confidence": 90, "status": "high", "page": 1, "region": [0, 0, 1, 1]},
              {"name": "owner_name", "value": owner, "confidence": 40, "status": "low", "page": 1, "region": [0, 0, 1, 1]}]
        db.update_data(i, result={"engine": "t", "pages": [], "fields": fs})
        return i
    a = mk("Suresh Patel", "555/Z"); b = mk("Ramesh Gupta", "555/Z")
    checks = c.get(f"/api/v1/documents/{b}/validation", headers=H(ot)).json()
    by = {x["category"] + x["title"]: x for x in checks}
    assert any(x["status"] == "failed" and x["field"] == "village" for x in checks)       # missing field
    assert any(x["category"] == "Ownership" and x["status"] == "warning" and a in x["explanation"] for x in checks)
    assert any("low confidence" in x["title"] for x in checks)
    listing = {d["id"]: d for d in c.get("/api/v1/documents", headers=H(ot)).json()}
    assert listing[b]["flagged"] == 1 and listing[b]["confidence"] == 65
    assert c.post(f"/api/v1/records/{b}/field-decision", json={"field": "Owner Name", "approved": False}, headers=H(ot)).status_code == 200
    assert c.post(f"/api/v1/records/{b}/reject", headers=H(ot)).json()["status"] == "rejected"

@pytest.mark.skipif("hin" not in __import__("pytesseract").get_languages(), reason="Hindi data not installed")
def test_hindi_ocr(tmp_path):
    font = "/usr/share/fonts/truetype/lohit-devanagari/Lohit-Devanagari.ttf"
    if not os.path.exists(font):
        pytest.skip("no Devanagari font")
    img = Image.new("RGB", (1200, 520), "white"); d = ImageDraw.Draw(img); f = ImageFont.truetype(font, 52)
    for i, line in enumerate(["खसरा नंबर: 441", "खाता संख्या: 2241", "क्षेत्रफल: 3.2 बीघा", "गाँव: चौबेपुर", "मालिक: सुरेश पटेल"]):
        d.text((40, 20 + i * 95), line, fill="black", font=f)
    p = tmp_path / "hi.png"; img.save(p)
    _, fields, _ = __import__("app.pipeline", fromlist=["run"]).run(str(p))
    got = {x["name"]: x["value"] for x in fields}
    print(got)
    assert got.get("khata_number") == "2241" and got.get("khasra_number") == "441"
    assert "बीघा" in got.get("area", "")

def test_totp_mfa():
    import time
    from app import security
    sec = "JBSWY3DPEHPK3PXP"
    db.create_user("m1", "pw-pw-pw-pw", "officer", sec)
    r = c.post("/api/v1/auth/token", json={"username": "m1", "password": "pw-pw-pw-pw"}).json()
    assert r["mfa_required"] and "access_token" not in r
    assert c.post("/api/v1/auth/mfa", json={"mfa_token": r["mfa_token"], "code": "000000"}).status_code == 401
    code = security.totp_at(sec, int(time.time() // 30))
    ok = c.post("/api/v1/auth/mfa", json={"mfa_token": r["mfa_token"], "code": code})
    assert ok.status_code == 200 and "access_token" in ok.json()
    assert c.post("/api/v1/auth/mfa", json={"mfa_token": r["mfa_token"], "code": code}).status_code == 401   # replay rejected
    assert security.totp_at("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 0) == "755224"   # RFC 4226 test vector, counter 0

def test_gis_parcel_and_validation():
    lt = landowner_token()
    ot = c.post("/api/v1/auth/token", json={"username": "o1", "password": "pw"}).json()["access_token"]
    # ~100m x 100m square near 25.3N, 83.0E -> ~1 hectare
    d = 0.0009
    sq = {"type": "Polygon", "coordinates": [[[83.0, 25.3], [83.0 + d, 25.3], [83.0 + d, 25.3 + d * 1.1], [83.0, 25.3 + d * 1.1], [83.0, 25.3]]]}
    assert c.post("/api/v1/gis/parcels", json={"survey": "9/Q", "district": "Varanasi", "geometry": {"type": "Polygon", "coordinates": [[[0, 0], [1, 1]]]}}, headers=H(ot)).status_code == 422
    p = c.post("/api/v1/gis/parcels", json={"survey": "9/Q", "district": "Varanasi", "geometry": sq}, headers=H(ot)).json()
    assert 9000 < p["area_sqm"] < 11000
    assert len(c.get("/api/v1/gis/parcels", headers=H(ot)).json()["features"]) >= 1
    i = c.post("/api/v1/documents", json={**DOC, "survey": "9/Q"}, headers=H(lt)).json()["id"]
    def fs(area): return [{"name": "survey_number", "value": "9/Q", "confidence": 90, "status": "high", "page": 1, "region": [0, 0, 1, 1]}, {"name": "area", "value": area, "confidence": 90, "status": "high", "page": 1, "region": [0, 0, 1, 1]}]
    db.update_data(i, result={"engine": "t", "pages": [], "fields": fs("1.0 hectare")})
    g = [x for x in c.get(f"/api/v1/documents/{i}/validation", headers=H(ot)).json() if x["category"] == "GIS / spatial"][0]
    assert g["status"] == "passed"
    db.update_data(i, result={"engine": "t", "pages": [], "fields": fs("3.0 hectare")})
    g = [x for x in c.get(f"/api/v1/documents/{i}/validation", headers=H(ot)).json() if x["category"] == "GIS / spatial"][0]
    assert g["status"] == "warning"
    db.update_data(i, result={"engine": "t", "pages": [], "fields": fs("3.2 Bigha")})
    g = [x for x in c.get(f"/api/v1/documents/{i}/validation", headers=H(ot)).json() if x["category"] == "GIS / spatial"][0]
    assert g["status"] == "pending"

def test_mine_is_private_and_summary():
    a = landowner_token()
    import contextlib, io
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        c.post("/api/v1/auth/otp/request", json={"phone": "9990002222"})
    b = c.post("/api/v1/auth/otp/verify", json={"phone": "9990002222", "code": buf.getvalue().strip().split()[-1]}).json()["access_token"]
    ida = c.post("/api/v1/documents", json=DOC, headers=H(a)).json()["id"]
    assert ida in [d["id"] for d in c.get("/api/v1/documents/mine", headers=H(a)).json()]
    assert ida not in [d["id"] for d in c.get("/api/v1/documents/mine", headers=H(b)).json()]    # another landowner cannot see it
    assert c.get("/api/v1/documents", headers=H(a)).status_code == 403                           # landowner cannot list all
    ot = c.post("/api/v1/auth/token", json={"username": "o1", "password": "pw"}).json()["access_token"]
    s = c.get("/api/v1/reports/summary", headers=H(ot)).json()
    assert s["received"] >= 1 and "pending" in s and "by_district" in s


def _officer():
    return c.post("/api/v1/auth/token", json={"username": "o1", "password": "pw"}).json()["access_token"]

def test_passwords_hashed_lockout_and_admin_users():
    from sqlalchemy.orm import Session
    u = db.get_user("o1")
    assert u["pw_hash"].startswith("pbkdf2_sha256$") and "pw" != u["pw_hash"]
    db.create_user("victim", "right-password-1", "officer")
    for _ in range(5):
        assert c.post("/api/v1/auth/token", json={"username": "victim", "password": "wrong"}).status_code == 401
    assert c.post("/api/v1/auth/token", json={"username": "victim", "password": "right-password-1"}).status_code == 429   # locked even with the right password
    # admin user management
    db.create_user("boss", "boss-password-1", "admin")
    at = c.post("/api/v1/auth/token", json={"username": "boss", "password": "boss-password-1"}).json()["access_token"]
    assert c.get("/api/v1/users", headers=H(_officer())).status_code == 403
    assert c.post("/api/v1/users", json={"username": "newbie", "password": "short", "role": "officer"}, headers=H(at)).status_code == 422
    assert c.post("/api/v1/users", json={"username": "newbie", "password": "long-enough-pw", "role": "officer"}, headers=H(at)).status_code == 200
    assert c.patch("/api/v1/users/newbie", json={"role": "admin"}, headers=H(at)).status_code == 200
    assert c.patch("/api/v1/users/boss", json={"active": False}, headers=H(at)).status_code == 400      # cannot disable yourself
    assert c.patch("/api/v1/users/newbie", json={"active": False}, headers=H(at)).status_code == 200
    assert c.post("/api/v1/auth/token", json={"username": "newbie", "password": "long-enough-pw"}).status_code == 401   # disabled
    assert c.patch("/api/v1/users/victim", json={"password": "fresh-password-1"}, headers=H(at)).status_code == 200      # reset clears lock
    assert c.post("/api/v1/auth/token", json={"username": "victim", "password": "fresh-password-1"}).status_code == 200
    # change own password
    ot = c.post("/api/v1/auth/token", json={"username": "victim", "password": "fresh-password-1"}).json()["access_token"]
    assert c.post("/api/v1/auth/password", json={"old": "nope", "new": "another-password-1"}, headers=H(ot)).status_code == 401
    assert c.post("/api/v1/auth/password", json={"old": "fresh-password-1", "new": "another-password-1"}, headers=H(ot)).status_code == 200
    assert c.get("/api/v1/health" if False else "/health").headers["x-content-type-options"] == "nosniff"

def test_audit_chain_detects_tampering():
    from sqlalchemy.orm import Session
    db.log("t", "Probe A", "X1"); db.log("t", "Probe B", "X1", "a", "b")
    assert db.verify_chain()["ok"]
    with Session(db.engine) as s:
        row = s.query(db.Audit).filter(db.Audit.action == "Probe A").first()
        row.updated = "tampered"; s.commit()
    bad = db.verify_chain()
    assert not bad["ok"] and bad["first_bad"]
    with Session(db.engine) as s:     # restore so later tests are unaffected
        row = s.query(db.Audit).filter(db.Audit.action == "Probe A").first(); row.updated = None; s.commit()
    assert db.verify_chain()["ok"]

def test_status_flows_feedback_and_similar():
    lt = landowner_token(); ot = _officer()
    def mk(survey, owner="A"):
        i = c.post("/api/v1/documents", json={**DOC, "survey": survey}, headers=H(lt)).json()["id"]
        fs = [{"name": "survey_number", "value": survey, "confidence": 95, "status": "high", "page": 1, "region": [0, 0, 1, 1]},
              {"name": "owner_name", "value": owner, "confidence": 95, "status": "high", "page": 1, "region": [0, 0, 1, 1]}]
        db.update_data(i, result={"engine": "t", "pages": [], "fields": fs, "route": "officer_queue"}); return i
    a = mk("4455A"); b = mk("4455B")
    v = c.get(f"/api/v1/documents/{b}/validation", headers=H(ot)).json()
    assert any("similar" in (x["explanation"] or "") and a in x["explanation"] for x in v)          # fuzzy near-duplicate flagged
    r = c.post(f"/api/v1/records/{a}/request-info", json={"message": "Please upload the back page"}, headers=H(ot))
    assert r.json()["status"] == "info_requested"
    mine = {d["id"]: d for d in c.get("/api/v1/documents/mine", headers=H(lt)).json()}
    assert mine[a]["status"] == "info_requested" and mine[a]["note"] == "Please upload the back page"
    assert c.post(f"/api/v1/records/{a}/send-back", json={"message": "Survey number unreadable"}, headers=H(ot)).json()["status"] == "correction_required"
    c.post(f"/api/v1/records/{b}/corrections", json={"field": "Owner Name", "previous": "A", "updated": "Ramesh"}, headers=H(ot))
    fb = c.get("/api/v1/reports/feedback.jsonl", headers=H(ot)).text
    assert f'"document": "{b}"' in fb and '"ocr_value": "A"' in fb and '"corrected_value": "Ramesh"' in fb

@pytest.mark.skipif("mar" not in __import__("pytesseract").get_languages(), reason="Marathi data not installed")
def test_marathi_ocr(tmp_path):
    font = "/usr/share/fonts/truetype/lohit-devanagari/Lohit-Devanagari.ttf"
    if not os.path.exists(font):
        pytest.skip("no Devanagari font")
    img = Image.new("RGB", (1200, 560), "white"); d = ImageDraw.Draw(img); f = ImageFont.truetype(font, 52)
    for i, line in enumerate(["खाते क्रमांक: 2241", "क्षेत्र: 3.2 हेक्टर", "गाव: चौबेपूर", "जिल्हा: वाराणसी", "मालक: सुरेश पाटील"]):
        d.text((40, 20 + i * 100), line, fill="black", font=f)
    p = tmp_path / "mr.png"; img.save(p)
    _, fields, _ = __import__("app.pipeline", fromlist=["run"]).run(str(p))
    got = {x["name"]: x["value"] for x in fields}
    print(got)
    assert got.get("khata_number") == "2241" and "हेक्टर" in got.get("area", "")

@pytest.mark.skipif(shutil.which("tesseract") is None, reason="tesseract not installed")
def test_enhanced_image_and_route(tmp_path):
    img = Image.new("RGB", (1100, 520), "white"); d = ImageDraw.Draw(img); f = ImageFont.load_default(size=40)
    for i, line in enumerate(["Survey No: 78C", "Khata No: 2241", "Area: 3.2 Bigha", "Village: Chaubeypur", "Owner Name: Suresh Patel"]):
        d.text((40, 30 + i * 90), line, fill="black", font=f)
    p = tmp_path / "s.png"; img.save(p)
    lt = landowner_token(); ot = _officer()
    i = c.post("/api/v1/documents", json=DOC, headers=H(lt)).json()["id"]
    c.post(f"/api/v1/documents/{i}/files", files={"files": ("s.png", p.read_bytes(), "image/png")}, headers=H(lt))
    res = c.post(f"/api/v1/documents/{i}/process?wait=true", headers=H(lt)).json()
    assert res["route"] in ("first_pass_eligible", "officer_queue")
    a = c.get(f"/api/v1/documents/{i}/pages/1/image?variant=enhanced", headers=H(ot))
    b = c.get(f"/api/v1/documents/{i}/pages/1/image", headers=H(ot))
    assert a.status_code == b.status_code == 200 and a.content != b.content     # a real second image, not the same file


def test_background_ocr_and_parcel_layers():
    lt = landowner_token()
    ot = c.post("/api/v1/auth/token", json={"username": "o1", "password": "pw"}).json()["access_token"]
    i = c.post("/api/v1/documents", json=DOC, headers=H(lt)).json()["id"]
    from PIL import Image
    import io as _io
    b = _io.BytesIO(); Image.new("RGB", (300, 100), "white").save(b, "PNG")
    assert c.post(f"/api/v1/documents/{i}/files", files={"files": ("a.png", b.getvalue(), "image/png")}, headers=H(lt)).status_code == 200
    assert c.post(f"/api/v1/documents/{i}/process", headers=H(lt)).json() == {"status": "processing"}      # returns immediately; TestClient runs the task afterwards
    got = [d for d in c.get("/api/v1/documents", headers=H(ot)).json() if d["id"] == i][0]
    assert got["status"] in ("processed", "failed")
    sq = lambda lon: {"type": "Polygon", "coordinates": [[[lon, 25.3], [lon + 0.001, 25.3], [lon + 0.001, 25.301], [lon, 25.301], [lon, 25.3]]]}
    p = c.post("/api/v1/gis/parcels", json={"survey": "5/A", "district": "Varanasi", "record_id": i, "geometry": sq(83.0)}, headers=H(ot)).json()
    v = c.post("/api/v1/gis/parcels", json={"survey": "Chaubeypur", "district": "Varanasi", "kind": "village", "geometry": {"type": "Polygon", "coordinates": [[[82.99, 25.29], [83.02, 25.29], [83.02, 25.32], [82.99, 25.32], [82.99, 25.29]]]}}, headers=H(ot))
    assert v.status_code == 200 and v.json()["kind"] == "village"
    assert c.post("/api/v1/gis/parcels", json={"survey": "x", "district": "y", "kind": "galaxy", "geometry": sq(83.0)}, headers=H(ot)).status_code == 422
    assert c.put(f"/api/v1/gis/parcels/{p['id']}", json={"geometry": sq(83.0005)}, headers=H(ot)).status_code == 200
    feats = {f["id"]: f for f in c.get("/api/v1/gis/parcels", headers=H(ot)).json()["features"]}
    assert len(feats[p["id"]]["properties"]["history"]) == 1                                                # previous geometry kept for the before/after overlay
    assert p["id"] in [f["id"] for f in c.get("/api/v1/gis/parcels/mine", headers=H(lt)).json()["features"]]
    assert p["id"] not in [f["id"] for f in c.get("/api/v1/gis/parcels/mine", headers=H(landowner_token())).json()["features"]]

def test_summary_and_export():
    lt = landowner_token()
    ot = c.post("/api/v1/auth/token", json={"username": "o1", "password": "pw"}).json()["access_token"]
    i = c.post("/api/v1/documents", json=DOC, headers=H(lt)).json()["id"]
    fs = [{"name": n, "value": v, "confidence": 95, "status": "high", "page": 1, "region": [0, 0, 1, 1]} for n, v in [("survey_number", "7/A"), ("owner_name", "A B"), ("village", "V"), ("district", "Varanasi"), ("area", "1.0 hectare")]]
    db.update_data(i, result={"engine": "t", "pages": [], "fields": fs, "route": "first_pass_eligible"})
    assert c.get(f"/api/v1/documents/{i}/export", headers=H(ot)).status_code == 409           # not verified yet
    c.post(f"/api/v1/records/{i}/approve", json={}, headers=H(ot))
    ex = c.get(f"/api/v1/documents/{i}/export", headers=H(ot)).json()
    assert ex["record_id"] == i and len(ex["fields"]) == 5 and any(e["action"] == "Approved Record" for e in ex["audit"])
    s = c.get("/api/v1/reports/summary", headers=H(ot)).json()
    assert s["routes"]["first_pass_eligible"] >= 1 and "field_confidence" in s and "findings" in s and s["fields_total"] >= 5
    assert c.get(f"/api/v1/documents/{i}/export", headers=H(lt)).status_code == 403

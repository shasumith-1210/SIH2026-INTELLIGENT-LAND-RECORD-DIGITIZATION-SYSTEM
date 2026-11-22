"""Seeds the running backend over HTTP: a landowner submits a document, uploads a scan and OCR runs. Prints JSON for the UI tests."""
import io, json, os, re, sys, time, urllib.request as u
from PIL import Image, ImageDraw, ImageFont

B = os.environ.get("API", "http://localhost:8000") + "/api/v1"
LOG = os.environ["OTP_LOG"]
PHONE = sys.argv[1] if len(sys.argv) > 1 else "9811111111"

def req(path, data=None, tok=None, ctype="application/json", method=None):
    h = {"Content-Type": ctype} if data is not None else {}
    if tok: h["Authorization"] = f"Bearer {tok}"
    body = data if isinstance(data, (bytes, type(None))) else json.dumps(data).encode()
    return json.loads(u.urlopen(u.Request(B + path, body, h, method=method)).read())

req("/auth/otp/request", {"phone": PHONE}); time.sleep(0.3)
code = re.findall(rf"{PHONE}: (\d+)", open(LOG).read())[-1]
tok = req("/auth/otp/verify", {"phone": PHONE, "code": code})["access_token"]
doc = req("/documents", {"owner": "Seed Owner", "survey": "78/C", "district": "Varanasi", "tehsil": "Pindra", "docType": "7/12 extract", "fileCount": 1}, tok)
img = Image.new("RGB", (1100, 520), "white"); d = ImageDraw.Draw(img); f = ImageFont.load_default(size=40)
for i, l in enumerate(["Survey No: 78C", "Khata No: 2241", "Area: 3.2 Bigha", "Village: Chaubeypur", "Owner Name: Suresh Patel"]):
    d.text((40, 30 + i * 90), l, fill="black", font=f)
buf = io.BytesIO(); img.save(buf, "PNG")
bd = "BND"; body = (f'--{bd}\r\nContent-Disposition: form-data; name="files"; filename="scan.png"\r\nContent-Type: image/png\r\n\r\n').encode() + buf.getvalue() + f"\r\n--{bd}--\r\n".encode()
req(f"/documents/{doc['id']}/files", body, tok, f"multipart/form-data; boundary={bd}")
req(f"/documents/{doc['id']}/process?wait=true", b"", tok, method="POST")
print(json.dumps({"doc": doc["id"], "phone": PHONE}))

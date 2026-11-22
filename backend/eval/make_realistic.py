"""Generates SYNTHETIC but land-record-LIKE test pages (form layout, table borders, stamp, paper texture, scan skew/noise, phone-photo perspective).
Still computer-generated: useful for demos and for finding pipeline weaknesses, not a substitute for real scans."""
import json, os, random, sys
import cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont

HI_FONT = "/usr/share/fonts/truetype/lohit-devanagari/Lohit-Devanagari.ttf"
OWN = ["Suresh Patel", "Meera Devi", "Ramesh Yadav", "Kavita Rani", "Hari Om", "Anil Verma"]
VIL = ["Chaubeypur", "Kakori", "Mathura", "Sarnath", "Bindki"]
OWN_HI = ["सुरेश पटेल", "मीरा देवी", "रमेश यादव", "कविता रानी"]
VIL_HI = ["चौबेपुर", "काकोरी", "सारनाथ"]

def page(lang, layout, v, rng):
    hi = lang == "hi"
    f = ImageFont.truetype(HI_FONT, 34) if hi else ImageFont.load_default(size=30)
    fb = ImageFont.truetype(HI_FONT, 44) if hi else ImageFont.load_default(size=40)
    rows = ([("खसरा नंबर", v["khasra"]), ("खाता संख्या", v["khata"]), ("क्षेत्रफल", f"{v['area']} बीघा"), ("गाँव", v["village"]), ("मालिक", v["owner"])] if hi else
            [("Survey No", v["survey"]), ("Khata No", v["khata"]), ("Area", f"{v['area']} Bigha"), ("Village", v["village"]), ("Owner Name", v["owner"])])
    img = Image.new("RGB", (1240, 1000), (247, 243, 232)); d = ImageDraw.Draw(img)
    d.rectangle([30, 30, 1210, 970], outline=(60, 60, 60), width=3)
    d.text((620, 60), "भू-अभिलेख कार्यालय" if hi else "LAND RECORD OFFICE", fill=(20, 20, 20), font=fb, anchor="mt")
    d.text((620, 125), "गाँव नमूना 7/12 उतारा" if hi else "Village Form VII-XII  Extract of Rights", fill=(40, 40, 40), font=f, anchor="mt")
    d.line([60, 180, 1180, 180], fill=(60, 60, 60), width=2)
    y = 220
    if layout == "table":
        for lab, val in rows:
            d.rectangle([80, y, 1160, y + 90], outline=(70, 70, 70), width=2); d.line([480, y, 480, y + 90], fill=(70, 70, 70), width=2)
            d.text((100, y + 25), f"{lab} :", fill=(30, 30, 30), font=f); d.text((510, y + 25), val, fill=(10, 10, 60), font=f)
            y += 90
    else:  # inline: two fields per line, like many typed extracts
        for a, b in zip(rows[0::2], rows[1::2] + [None]):
            d.text((90, y), f"{a[0]} : {a[1]}" + (f"      {b[0]} : {b[1]}" if b else ""), fill=(30, 30, 60), font=f)
            y += 110
    d.ellipse([850, 760, 1100, 910], outline=(150, 40, 40), width=5)
    d.text((975, 835), "SEAL / मुहर", fill=(150, 40, 40), font=f, anchor="mm")
    d.text((90, 920), "This is a computer generated extract." if not hi else "यह कंप्यूटर निर्मित उतारा है।", fill=(90, 90, 90), font=f)
    return img

def scan_effects(img, kind, rng):
    a = np.array(img)
    h, w = a.shape[:2]
    if kind == "photo":   # phone photo: perspective + uneven lighting
        s = rng.randint(30, 60)
        src = np.float32([[0, 0], [w, 0], [w, h], [0, h]]); dst = np.float32([[s, 10], [w - 10, s // 2], [w - s, h - 10], [15, h - s]])
        a = cv2.warpPerspective(a, cv2.getPerspectiveTransform(src, dst), (w, h), borderValue=(200, 200, 200))
        a = (a * np.tile(np.linspace(0.78, 1.0, w)[None, :, None], (h, 1, 1))).astype(np.uint8)
    else:                 # flatbed scan: slight skew
        M = cv2.getRotationMatrix2D((w / 2, h / 2), rng.uniform(-2.5, 2.5), 1.0)
        a = cv2.warpAffine(a, M, (w, h), borderValue=(240, 240, 235))
    a = np.clip(a.astype(np.int16) + np.random.default_rng(rng.randint(0, 9999)).normal(0, 9, a.shape).astype(np.int16), 0, 255).astype(np.uint8)
    if kind == "photo":
        a = cv2.GaussianBlur(a, (3, 3), 0)
    return a

def make(out, n=10, seed=11):
    rng = random.Random(seed); os.makedirs(out, exist_ok=True); labels = {}
    have_hi = os.path.exists(HI_FONT)
    for i in range(n * (3 if have_hi else 2)):
        lang = "hi" if have_hi and i % 3 == 2 else "en"
        layout = "table" if i % 2 == 0 else "inline"
        kind = "photo" if (i // 2) % 2 else "scan"
        v = {"survey": f"{rng.randint(10, 400)}{rng.choice('ABC')}", "khasra": str(rng.randint(100, 900)), "khata": str(rng.randint(1000, 9999)),
             "area": f"{rng.randint(1, 9)}.{rng.randint(0, 9)}", "village": rng.choice(VIL_HI if lang == "hi" else VIL), "owner": rng.choice(OWN_HI if lang == "hi" else OWN)}
        img = scan_effects(page(lang, layout, v, rng), kind, rng)
        name = f"{lang}_{kind}_{layout}_{i:02d}.jpg"
        cv2.imwrite(os.path.join(out, name), cv2.cvtColor(img, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 70])
        labels[name] = ({"khasra_number": v["khasra"]} if lang == "hi" else {"survey_number": v["survey"]}) | {"khata_number": v["khata"], "area": f"{v['area']} {'बीघा' if lang == 'hi' else 'Bigha'}", "village": v["village"], "owner_name": v["owner"]}
    json.dump(labels, open(os.path.join(out, "labels.json"), "w"), ensure_ascii=False, indent=1)
    print(f"wrote {len(labels)} pages to {out}")

if __name__ == "__main__":
    make(sys.argv[1] if len(sys.argv) > 1 else "eval/realistic")

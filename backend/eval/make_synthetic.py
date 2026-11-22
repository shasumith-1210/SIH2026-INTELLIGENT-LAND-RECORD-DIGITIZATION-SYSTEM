"""Generates SYNTHETIC test scans with known answers (clean, noisy+rotated, blurry; English and Hindi).
Use only to exercise the evaluator. Synthetic accuracy is NOT a claim about real land records: replace with real or realistic samples."""
import json, os, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FONT_EN = None  # PIL default (scalable) font
FONT_HI = "/usr/share/fonts/truetype/lohit-devanagari/Lohit-Devanagari.ttf"
EN = {"owners": ["Suresh Patel", "Meera Devi", "Ramesh Yadav", "Kavita Rani", "Hari Om"], "villages": ["Chaubeypur", "Kakori", "Mathura", "Sarnath"]}
HI = {"owners": ["सुरेश पटेल", "मीरा देवी", "रमेश यादव", "कविता रानी"], "villages": ["चौबेपुर", "काकोरी", "सारनाथ"]}

def degrade(img: Image.Image, mode: str, rng: random.Random) -> Image.Image:
    if mode == "noisy":
        img = img.rotate(rng.uniform(-4, 4), expand=True, fillcolor="white", resample=Image.BICUBIC)
        a = np.array(img).astype(np.int16) + np.random.default_rng(rng.randint(0, 9999)).normal(0, 28, (img.height, img.width, 3)).astype(np.int16)
        img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    elif mode == "blurry":
        img = img.resize((img.width // 2, img.height // 2)).filter(ImageFilter.GaussianBlur(1.1)).resize((img.width, img.height))
    return img

def make(out: str, n: int = 8, seed: int = 7) -> None:
    rng = random.Random(seed)
    os.makedirs(out, exist_ok=True)
    labels = {}
    have_hi = os.path.exists(FONT_HI)
    for i in range(n * 3 * (2 if have_hi else 1)):
        lang = "hi" if have_hi and i % 2 else "en"
        mode = ["clean", "noisy", "blurry"][(i // 2) % 3]
        d = HI if lang == "hi" else EN
        survey, khata = f"{rng.randint(10, 400)}{rng.choice('ABC')}", str(rng.randint(1000, 9999))
        area = f"{rng.randint(1, 9)}.{rng.randint(0, 9)}"
        owner, village = rng.choice(d["owners"]), rng.choice(d["villages"])
        if lang == "en":
            lines = [f"Survey No: {survey}", f"Khata No: {khata}", f"Area: {area} Bigha", f"Village: {village}", f"Owner Name: {owner}"]
            font = ImageFont.load_default(size=40); unit = "Bigha"
        else:
            lines = [f"खाता संख्या: {khata}", f"क्षेत्रफल: {area} बीघा", f"गाँव: {village}", f"मालिक: {owner}"]
            font = ImageFont.truetype(FONT_HI, 52); unit = "बीघा"
        img = Image.new("RGB", (1200, 100 + 95 * len(lines)), "white"); dr = ImageDraw.Draw(img)
        for k, l in enumerate(lines):
            dr.text((40, 20 + k * 95), l, fill="black", font=font)
        name = f"{lang}_{mode}_{i:03d}.png"
        degrade(img, mode, rng).save(os.path.join(out, name))
        truth = {"khata_number": khata, "area": f"{area} {unit}", "village": village, "owner_name": owner}
        if lang == "en":
            truth["survey_number"] = survey
        labels[name] = truth
    json.dump(labels, open(os.path.join(out, "labels.json"), "w"), ensure_ascii=False, indent=1)
    print(f"wrote {len(labels)} synthetic samples to {out}")

if __name__ == "__main__":
    make(sys.argv[1] if len(sys.argv) > 1 else "eval/samples")

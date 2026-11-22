"""Real pipeline: OpenCV preprocessing -> Tesseract OCR -> rule-based field extraction.
OCR engine is Tesseract (set OCR_LANGS e.g. 'eng+hin' if the language data is installed). PaddleOCR/TrOCR can replace `ocr()` later.
Confidence = mean OCR word confidence for the words the value came from. Rule-based extraction is a first pass, not NLP/NER."""
import os, re
import cv2, numpy as np, pytesseract
import pypdfium2 as pdfium

# Windows: the Tesseract installer does not add itself to PATH. Set TESSERACT_CMD, or the default install location is used.
import shutil
_cmd = os.environ.get("TESSERACT_CMD") or (None if shutil.which("tesseract") else next((c for c in (r"C:\Program Files\Tesseract-OCR\tesseract.exe", r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe") if os.path.exists(c)), None))
if _cmd:
    pytesseract.pytesseract.tesseract_cmd = _cmd

try:
    _AVAILABLE = pytesseract.get_languages()
except Exception:
    _AVAILABLE = ["eng"]
LANGS = os.environ.get("OCR_LANGS") or ("eng+hin" if "hin" in _AVAILABLE else "eng")

def load_pages(path: str, max_pages: int = 5) -> list[np.ndarray]:
    if path.lower().endswith(".pdf"):
        pdf = pdfium.PdfDocument(path)
        return [cv2.cvtColor(np.array(pdf[i].render(scale=2).to_pil().convert("RGB")), cv2.COLOR_RGB2BGR) for i in range(min(len(pdf), max_pages))]
    img = cv2.imread(path)
    if img is None:
        raise ValueError("Unreadable image")
    return [img]

# Perspective correction is OFF by default: on our test pages it lowered accuracy (recall 0.85 -> 0.79). Enable with ENABLE_RECTIFY=1 and re-evaluate on your own photos.
RECTIFY = os.environ.get("ENABLE_RECTIFY") == "1"

def rectify(img: np.ndarray) -> np.ndarray:
    """If a four-cornered page covering most of the frame is found (phone photo), warp it flat. Otherwise return the image unchanged."""
    h, w = img.shape[:2]
    g = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), (5, 5), 0)
    mask = cv2.threshold(g, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cnts:
        return img
    c = max(cnts, key=cv2.contourArea)
    if cv2.contourArea(c) < 0.5 * w * h:
        return img
    approx = cv2.approxPolyDP(c, 0.02 * cv2.arcLength(c, True), True)
    if len(approx) != 4:
        return img
    pts = approx.reshape(4, 2).astype(np.float32)
    s_, d_ = pts.sum(axis=1), np.diff(pts, axis=1).ravel()
    src = np.float32([pts[np.argmin(s_)], pts[np.argmin(d_)], pts[np.argmax(s_)], pts[np.argmax(d_)]])  # tl, tr, br, bl
    if cv2.contourArea(src) < 0.5 * w * h:
        return img
    dst = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    return cv2.warpPerspective(img, cv2.getPerspectiveTransform(src, dst), (w, h), borderValue=(255, 255, 255))

def preprocess(img: np.ndarray) -> tuple[dict[str, np.ndarray], list[str]]:
    steps = ["grayscale"]
    raw = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    g = cv2.fastNlMeansDenoising(raw, h=10)
    steps.append("denoise")
    inv = cv2.threshold(g, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]
    pts = np.column_stack(np.where(inv > 0))
    if len(pts) > 100:
        angle = cv2.minAreaRect(pts[:, ::-1].astype(np.float32))[-1]
        angle = angle - 90 if angle > 45 else angle
        if 0.5 < abs(angle) < 15:
            h, w = g.shape
            g = cv2.warpAffine(g, cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0), (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
            steps.append(f"deskew({angle:.1f}deg)")
    # Hard binarisation can erase coloured or faint text, so keep both variants and let run() pick the one that reads better.
    thr = cv2.adaptiveThreshold(g, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 15)
    flat = cv2.divide(raw, cv2.GaussianBlur(raw, (0, 0), max(raw.shape) / 25), scale=255)  # removes uneven lighting from photos
    steps.append("flat-field")
    return {"raw-gray": raw, "flat-field": flat, "enhanced-gray": g, "adaptive-threshold": thr}, steps

def ocr(img: np.ndarray, lang: str | None = None) -> list[dict]:
    h, w = img.shape[:2]
    d = pytesseract.image_to_data(img, lang=lang or LANGS, output_type=pytesseract.Output.DICT)
    words = []
    for i, t in enumerate(d["text"]):
        if t.strip() and float(d["conf"][i]) >= 0:
            words.append({"text": t, "conf": float(d["conf"][i]), "line": (d["block_num"][i], d["par_num"][i], d["line_num"][i]),
                          "bbox": [d["left"][i] / w, d["top"][i] / h, d["width"][i] / w, d["height"][i] / h]})
    return words

_DEV = "\u0900-\u097F"
_NUM = r"(?:no\.?|number|नंबर|संख्या|क्रमांक)?"
_ID = r"([\w/.\-]*\d[\w/.\-]*)"   # identifiers must contain a digit, so headings like "Survey Form" are not read as values
_NEXT = r"(?=\s+(?:village|survey|khasra|khata|area|owner|district|गाँव|गांव|गाव|खसरा|खाता|खाते|क्षेत्रफल|क्षेत्र|मालिक|मालक|जिला|जिल्हा)\b|\s*$)"  # stop a name at the next label on the same line
PATTERNS = {
    "survey_number": rf"(?:survey|सर्वे|सर्व्हे|गट)\s*{_NUM}\s*[:\-]?\s*{_ID}",
    "khasra_number": rf"(?:khasra|खसरा)\s*{_NUM}\s*[:\-]?\s*{_ID}",
    "khata_number": rf"(?:khata|खाता|खाते)\s*{_NUM}\s*[:\-]?\s*{_ID}",
    "area": r"(?:area|क्षेत्रफल|क्षेत्रफळ|क्षेत्र)\s*[:\-]?\s*(\d+(?:\.\d+)?\s*(?:bigha|acres?|hectare|ha|sq\.?\s?m|बीघा|एकड़|एकर|हेक्टेयर|हेक्टर))",
    "owner_name": rf"(?:owner(?:\s*name)?|मालिक|मालक|स्वामी)\s*[:\-]\s*([A-Za-z{_DEV} .]+?){_NEXT}",
    "village": rf"(?:village|गाँव|गांव|गाव|ग्राम)\s*[:\-]\s*([A-Za-z{_DEV}]+)",
    "district": rf"(?:district|जिला|जिल्हा)\s*[:\-]\s*([A-Za-z{_DEV}]+)",
}
CANDIDATES = list(dict.fromkeys(l for l in ["eng", LANGS, "eng+mar"] if all(x in _AVAILABLE for x in l.split("+"))))   # English first, then Hindi, then Marathi, only if installed
_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")

def _rows(words: list[dict]) -> list[list[dict]]:
    """Group words into visual rows by vertical position, so a label and its value in separate table cells end up on one row."""
    rows: list[list[dict]] = []
    for wd in sorted(words, key=lambda w: w["bbox"][1] + w["bbox"][3] / 2):
        cy, h = wd["bbox"][1] + wd["bbox"][3] / 2, wd["bbox"][3]
        if rows:
            last = rows[-1]
            mean_cy = sum(x["bbox"][1] + x["bbox"][3] / 2 for x in last) / len(last)
            if abs(cy - mean_cy) < 0.6 * max(h, last[0]["bbox"][3]):
                last.append(wd)
                continue
        rows.append([wd])
    return [sorted(r, key=lambda w: w["bbox"][0]) for r in rows]

def extract(words: list[dict], page: int) -> list[dict]:
    lines = dict(enumerate(_rows(words)))
    out = []
    for ws in lines.values():
        text, spans = "", []
        for wd in ws:
            spans.append((len(text), len(text) + len(wd["text"]), wd))
            text += wd["text"].translate(_DIGITS) + " "
        for name, pat in PATTERNS.items():
            m = re.search(pat, text, re.I)
            if not m or any(f["name"] == name for f in out):
                continue
            hit = [wd for a, b, wd in spans if a < m.end(1) and b > m.start(1)]
            if not hit:
                continue
            x0 = min(h["bbox"][0] for h in hit); y0 = min(h["bbox"][1] for h in hit)
            x1 = max(h["bbox"][0] + h["bbox"][2] for h in hit); y1 = max(h["bbox"][1] + h["bbox"][3] for h in hit)
            conf = round(sum(h["conf"] for h in hit) / len(hit))
            out.append({"name": name, "value": m.group(1).strip().strip("._,;:|-"), "confidence": conf,
                        "status": "high" if conf >= 85 else "mid" if conf >= 60 else "low",
                        "page": page, "region": [x0, y0, x1 - x0, y1 - y0]})
    return out

def run_full(path: str) -> tuple[list[dict], list[dict], list[np.ndarray], list[np.ndarray]]:
    pages, fields, enhanced, originals = [], [], [], [rectify(i) if RECTIFY else i for i in load_pages(path)]
    for n, img in enumerate(originals, 1):
        variants, steps = preprocess(img)
        best = None
        # Mixed-language models can hurt single-language pages, so try English alone first and add Hindi only if needed.
        for lang in CANDIDATES:
            for vname, proc in variants.items():
                words = ocr(proc, lang)
                fs = extract(words, n)
                score = (len(fs), sum(f["confidence"] for f in fs) / len(fs) if fs else 0)
                if best is None or score > best[0]:
                    best = (score, f"{vname}/{lang}", words, fs, proc)
                if len(fs) >= 5 or (len(fs) >= 4 and score[1] >= 85):  # stop early once the page is read well enough
                    break
            else:
                continue
            break
        _, vname, words, fs, proc = best
        enhanced.append(proc)
        pages.append({"page": n, "height": img.shape[0], "width": img.shape[1], "steps": steps + [f"ocr-input:{vname}"], "word_count": len(words)})
        fields += fs
    return pages, fields, originals, enhanced

def run(path: str):
    return run_full(path)[:3]

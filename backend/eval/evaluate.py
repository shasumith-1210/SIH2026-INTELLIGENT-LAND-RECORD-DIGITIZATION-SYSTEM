"""Field-level accuracy report for the OCR + extraction pipeline.
Usage: python -m eval.evaluate <folder with images and labels.json> [--out report.json]
labels.json: {"scan1.png": {"survey_number": "78/C", "khata_number": "2241", "area": "3.2 Bigha", "owner_name": "...", "village": "..."}, ...}
Only fields present in labels are scored. Group results by the filename prefix (e.g. en_clean, hi_blurry) to see where it breaks."""
import json, os, re, sys
from collections import defaultdict
from app import pipeline

HIGH = 85  # same threshold as the high-confidence routing rule

def norm(name: str, v: str) -> str:
    v = v.translate(pipeline._DIGITS).lower().strip()
    if name == "area":
        m = re.match(r"([\d.]+)\s*(\S+)", v)
        return f"{float(m.group(1)):g} {m.group(2)}" if m else v
    return re.sub(r"[\s.\-]+", "", v) if name in ("owner_name", "village") else v.replace(" ", "")

def run(folder: str) -> dict:
    labels = json.load(open(os.path.join(folder, "labels.json")))
    rows = []
    for fn, truth in labels.items():
        try:
            _, fields, _ = pipeline.run(os.path.join(folder, fn))
        except Exception as e:  # an unreadable file counts as all fields missed
            fields = []; print(f"{fn}: pipeline error {e}", file=sys.stderr)
        got = {f["name"]: f for f in fields}
        for name, want in truth.items():
            g = got.get(name)
            rows.append({"file": fn, "group": "_".join(fn.split("_")[:2]), "field": name, "want": want, "got": g["value"] if g else None,
                         "conf": g["confidence"] if g else None, "ok": bool(g and norm(name, g["value"]) == norm(name, want))})
    return {"rows": rows}

def summarise(rows: list[dict]) -> dict:
    def stats(rs):
        ext = [r for r in rs if r["got"] is not None]; ok = [r for r in rs if r["ok"]]
        hi = [r for r in ext if r["conf"] >= HIGH]
        mean = lambda xs: round(sum(xs) / len(xs), 1) if xs else None
        return {"labelled": len(rs), "extracted": len(ext), "recall": round(len(ok) / len(rs), 3) if rs else None,
                "precision": round(len([r for r in ext if r["ok"]]) / len(ext), 3) if ext else None,
                "mean_conf_correct": mean([r["conf"] for r in ext if r["ok"]]), "mean_conf_wrong": mean([r["conf"] for r in ext if not r["ok"]]),
                "high_conf_share": round(len(hi) / len(ext), 3) if ext else None,
                "high_conf_accuracy": round(len([r for r in hi if r["ok"]]) / len(hi), 3) if hi else None}
    by = lambda key: {k: stats([r for r in rows if r[key] == k]) for k in sorted({r[key] for r in rows})}
    return {"overall": stats(rows), "by_field": by("field"), "by_group": by("group")}

def show(title: str, d: dict) -> None:
    print(f"\n{title}\n{'':14}{'n':>5}{'recall':>8}{'prec':>7}{'confOK':>8}{'confBad':>8}{'hi-share':>9}{'hi-acc':>8}")
    for k, s in d.items():
        f = lambda v: "-" if v is None else v
        print(f"{k:14}{s['labelled']:>5}{f(s['recall']):>8}{f(s['precision']):>7}{f(s['mean_conf_correct']):>8}{f(s['mean_conf_wrong']):>8}{f(s['high_conf_share']):>9}{f(s['high_conf_accuracy']):>8}")

if __name__ == "__main__":
    folder = sys.argv[1]
    res = run(folder); rep = summarise(res["rows"])
    show("OVERALL", {"all": rep["overall"]}); show("BY FIELD", rep["by_field"]); show("BY CONDITION", rep["by_group"])
    print("\nMisses (first 15):")
    for r in [r for r in res["rows"] if not r["ok"]][:15]:
        print(f"  {r['file']:24}{r['field']:15} want={r['want']!r} got={r['got']!r} conf={r['conf']}")
    out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else os.path.join(folder, "report.json")
    json.dump({"summary": rep, "rows": res["rows"]}, open(out, "w"), ensure_ascii=False, indent=1)
    print(f"\nfull report: {out}")

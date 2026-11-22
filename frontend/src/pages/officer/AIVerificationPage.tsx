import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Page } from "../../types";
import { ExtractedField } from "../../types";
import { useAudit } from "../../store";

interface Props {
  navigate: (p: Page) => void;
}

const extractedFields: ExtractedField[] = [
  { label: "Owner Name", value: "Suresh Ramesh Patel", confidence: 96, status: "high" },
  { label: "Survey Number", value: "78/C", confidence: 98, status: "high" },
  { label: "Khasra Number", value: "KH-441", confidence: 89, status: "high" },
  { label: "Khata Number", value: "2241", confidence: 82, status: "high" },
  { label: "Total Area", value: "3.2 Bigha", confidence: 91, status: "high" },
  { label: "Village", value: "Chaubeypur", confidence: 94, status: "high" },
  { label: "Tehsil", value: "Varanasi Sadar", confidence: 87, status: "high" },
  { label: "District", value: "Varanasi", confidence: 99, status: "high" },
  { label: "State", value: "Uttar Pradesh", confidence: 99, status: "high" },
  { label: "Land Classification", value: "Agr/Irrigated", confidence: 74, status: "mid" },
  { label: "Registration Date", value: "14/03/1998", confidence: 61, status: "mid" },
  { label: "Boundary North", value: "Ramesh Singh (S.78/B)", confidence: 58, status: "mid" },
  { label: "Boundary South", value: "??ndra Pd. ??arma", confidence: 34, status: "low" },
  { label: "Deed Number", value: "D-4?1/98", confidence: 28, status: "low" },
];

// DEMONSTRATION provenance: field label -> source page/region on the sample scan.
const src: Record<string, string> = {
  "Khata Number": "P1 · R2", "Survey Number": "P1 · R2", "Khasra Number": "P1 · R2", Village: "P1 · R2",
  "Owner Name": "P1 · R3", "Total Area": "P1 · R4", "Land Classification": "P1 · R4",
  "Boundary North": "P1 · R5", "Boundary South": "P1 · R5", "Deed Number": "P1 · R6", "Registration Date": "P1 · R6",
  Tehsil: "P1 · R1", District: "P1 · R1", State: "P1 · R1",
};

const statusIcon = (s: ExtractedField["status"]) =>
  s === "high" ? "🟢" : s === "mid" ? "🟡" : "🔴";

const statusClass = (s: ExtractedField["status"]) =>
  s === "high" ? "border-green-200 bg-green-50/50" : s === "mid" ? "border-amber-200 bg-amber-50/50" : "border-red-200 bg-red-50/50";

const confBarColor = (s: ExtractedField["status"]) =>
  s === "high" ? "bg-green-500" : s === "mid" ? "bg-amber-500" : "bg-red-500";

export default function AIVerificationPage({ navigate }: Props) {
  const { log, approveRecord, focus, setFocus } = useAudit();
  const real = api.enabled;
  const [fields, setFields] = useState<ExtractedField[]>(real ? [] : extractedFields);
  const [docs, setDocs] = useState<string[]>([]);
  const [docId, setDocId] = useState<string | null>(null);
  const [realImg, setRealImg] = useState("");
  const [regions, setRegions] = useState<Record<string, number[]>>({});
  const [resultFields, setResultFields] = useState<{ name: string; page: number; region: number[] }[]>([]);
  const [numPages, setNumPages] = useState(1);
  const [pageNo, setPageNo] = useState(1);
  const recId = docId ?? "REC-2024-0441";
  const fv = (l: string) => fields.find((f) => f.label === l)?.value ?? "—";
  const pretty = (n: string) => n.replace("area", "total_area").split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  useEffect(() => {
    if (real) api.listDocuments().then((d) => setDocs(d.filter((x) => x.status !== "submitted").map((x) => x.id))).catch(() => {});
  }, [real]);
  const [warns, setWarns] = useState<Record<string, string[]>>({});
  const loadWarns = (id: string) =>
    api.getValidation(id).then((cs) => {
      const w: Record<string, string[]> = {};
      cs.filter((c) => c.field && (c.status === "warning" || c.status === "failed")).forEach((c) => {
        const k = pretty(c.field as string);
        (w[k] = w[k] ?? []).push(`${c.title}${c.explanation ? `: ${c.explanation}` : ""}`);
      });
      setWarns(w);
    }).catch(() => setWarns({}));
  useEffect(() => {
    if (real && focus) {
      loadDoc(focus.docId).then(() => focus.field && setActive(pretty(focus.field)));
      setFocus(null);
    }
  }, []);
  const loadDoc = async (id: string) => {
    try {
      const r = await api.getResult(id);
      setFields(r.fields.map((f) => ({ label: pretty(f.name), value: f.value, confidence: f.confidence, status: f.status })));
      setResultFields(r.fields);
      setNumPages(r.pages.length || 1);
      setPageNo(1);
      setRealImg(await api.pageImage(id, 1));
      setApproved({});
      setDocId(id);
      loadWarns(id);
    } catch {
      alert("Could not load the OCR result for this document.");
    }
  };
  const [zoom, setZoom] = useState(100);
  const [approved, setApproved] = useState<Record<number, boolean | null>>({});
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [view, setView] = useState<"original" | "enhanced">("original");
  useEffect(() => {
    setRegions(Object.fromEntries(resultFields.filter((f) => f.page === pageNo).map((f) => [pretty(f.name), f.region])));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultFields, pageNo]);
  useEffect(() => {
    if (real && docId) api.pageImage(docId, pageNo, view).then(setRealImg).catch(() => {});   // real preprocessed image for "enhanced"
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, pageNo, view]);
  const hl = (l: string | string[]) => ((Array.isArray(l) ? l : [l]).includes(active ?? "") ? "ring-2 ring-blue-500 bg-blue-200/60 rounded px-0.5" : "");

  const overallConf = fields.length ? Math.round(fields.reduce((a, f) => a + f.confidence, 0) / fields.length) : 0;

  const approve = (i: number, val: boolean) => {
    log({ action: val ? "Approved Field" : "Rejected Field", record: recId, detail: `${fields[i].label}: '${fields[i].value}'`, type: val ? "verify" : "reject" });
    if (api.enabled && docId) api.fieldDecision(docId, fields[i].label, val).catch((e) => alert(`Decision not saved on server: ${e.message}`));
    setApproved((prev) => ({ ...prev, [i]: val }));
  };

  const startEdit = (i: number) => {
    setEditIdx(i);
    setEditVal(fields[i].value);
  };

  const saveEdit = () => {
    if (editIdx === null) return;
    log({ action: "Edited Field", record: recId, detail: `${fields[editIdx].label}: '${fields[editIdx].value}' → '${editVal}' (stored as correction feedback)`, type: "edit" });
    if (api.enabled && docId) api.recordCorrection(docId, fields[editIdx].label, fields[editIdx].value, editVal).then(() => loadWarns(docId)).catch((e) => alert(`Correction not saved on server: ${e.message}`));
    const updated = [...fields];
    updated[editIdx] = { ...updated[editIdx], value: editVal, confidence: 100, status: "high" };
    setFields(updated);
    setApproved((prev) => ({ ...prev, [editIdx]: true }));
    setEditIdx(null);
  };

  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F0F4FA] p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center max-w-md animate-fadeIn">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✅</div>
          <h2 className="text-2xl font-bold text-[#0B2545] mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>Verification Submitted</h2>
          <p className="text-gray-500 text-sm mb-4">Record {recId} has been verified and forwarded for certification.</p>
          {!real && <p className="mono text-sm text-blue-600 bg-blue-50 rounded-lg px-4 py-2 mb-6">Audit ID: AUD-2024-0441-AK</p>}
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate("officer-queue")} className="bg-[#0B2545] text-white px-5 py-2.5 rounded-xl text-sm font-semibold">Back to Queue</button>
            <button onClick={() => setSubmitted(false)} className="border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-semibold">Next Record</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden bg-[#F0F4FA] flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Record · {real ? <span className="text-green-700 normal-case">Live OCR</span> : <span className="text-amber-600 normal-case">Demo data</span>}</p>
            {real ? (
              <select value={docId ?? ""} onChange={(e) => e.target.value && loadDoc(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-sm mono">
                <option value="">Select processed document…</option>
                {docs.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            ) : (
              <p className="font-bold text-[#0B2545] mono text-sm">REC-2024-0441</p>
            )}
          </div>
          <div className="h-8 w-px bg-gray-100"></div>
          <div>
            <p className="text-xs text-gray-400">Owner</p>
            <p className="text-sm font-semibold text-[#0B2545]">{real ? `${fv("Owner Name")} · Survey ${fv("Survey Number")} · ${fv("District")}` : "Suresh Patel · Survey 78/C · Varanasi"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
            overallConf >= 85 ? "bg-green-100 text-green-700" : overallConf >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
          }`}>
            <span>{overallConf >= 85 ? "🟢" : overallConf >= 60 ? "🟡" : "🔴"}</span>
            <span className="mono">{overallConf}%</span>
            <span className="text-xs font-normal">overall confidence</span>
          </div>
          <button onClick={() => navigate("officer-queue")} className="border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50">
            ← Queue
          </button>
        </div>
      </div>

      {/* Split screen */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Document viewer */}
        <div className="w-1/2 border-r border-gray-200 bg-gray-800 flex flex-col overflow-hidden">
          <div className="bg-gray-900 px-4 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {real && numPages > 1 && <button onClick={() => setPageNo(Math.max(1, pageNo - 1))} className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">‹</button>}
              <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">Page {real ? pageNo : 1} / {real ? numPages : 1}</span>
              {real && numPages > 1 && <button onClick={() => setPageNo(Math.min(numPages, pageNo + 1))} className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">›</button>}
              {(["original", "enhanced"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`text-xs px-2 py-0.5 rounded ${view === v ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}>{v === "original" ? "Original" : "Enhanced (preview)"}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="text-gray-400 hover:text-white text-sm w-6 h-6 flex items-center justify-center rounded bg-gray-700">−</button>
              <span className="text-gray-400 text-xs mono">{zoom}%</span>
              <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="text-gray-400 hover:text-white text-sm w-6 h-6 flex items-center justify-center rounded bg-gray-700">+</button>
            </div>
          </div>
          <div className="flex-1 overflow-auto flex items-start justify-center p-4">
            {real ? (
              <div className="relative shadow-xl bg-white" style={{ width: `${zoom * 4.8}px` }}>
                {realImg ? <img src={realImg} alt="Scanned page" className="w-full block" /> : <p className="p-6 text-sm text-gray-500">Select a processed document above.</p>}
                {Object.entries(regions).map(([label, r]) => (
                  <div key={label} className="absolute pointer-events-none" style={{ left: `${r[0] * 100}%`, top: `${r[1] * 100}%`, width: `${r[2] * 100}%`, height: `${r[3] * 100}%`, border: `2px solid ${active === label ? "#2563EB" : "#9CA3AF"}`, background: active === label ? "#2563EB33" : "transparent" }} />
                ))}
              </div>
            ) : (<div
              className="bg-amber-50 border border-gray-300 shadow-xl transition-all origin-top"
              style={{ width: `${zoom * 4.8}px`, minHeight: "600px", transform: `scale(${zoom/100})`, transformOrigin: "top center", filter: view === "enhanced" ? "grayscale(1) contrast(1.3) brightness(1.05)" : "none" }}
            >
              {/* Simulated document */}
              <div className="p-6 space-y-4 text-sm" style={{ fontFamily: "serif" }}>
                <div className="text-center border-b-2 border-double border-gray-700 pb-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-700">भू-अभिलेख कार्यालय</p>
                  <p className="font-bold text-base">LAND RECORD OFFICE</p>
                  <p className={`text-xs text-gray-600 ${hl(["District", "State", "Tehsil"])}`}>Varanasi District, Uttar Pradesh</p>
                </div>
                <div className="border border-gray-300 p-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className={hl("Khata Number")}><span className="text-gray-500">Khata No.:</span> <span className="font-medium">2241</span></div>
                  <div className={hl("Survey Number")}><span className="text-gray-500">Survey No.:</span> <span className="font-medium">78/C</span></div>
                  <div className={hl("Khasra Number")}><span className="text-gray-500">Khasra No.:</span> <span className="font-medium">KH-441</span></div>
                  <div className={hl("Village")}><span className="text-gray-500">Village:</span> <span className="font-medium">Chaubeypur</span></div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">खातेदार का नाम / Owner Name:</p>
                  <p className={`font-bold text-base ${hl("Owner Name")}`} style={{ fontFamily: "cursive" }}>Suresh Ramesh Patel</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`border border-gray-300 p-2 ${hl("Total Area")}`}>
                    <p className="text-xs text-gray-500">Area (क्षेत्रफल):</p>
                    <p className="font-medium">3.2 Bigha</p>
                  </div>
                  <div className={`border border-gray-300 p-2 ${hl("Land Classification")}`}>
                    <p className="text-xs text-gray-500">Classification:</p>
                    <p className="font-medium">Agr/Irrigated</p>
                  </div>
                </div>
                <div className="border border-gray-300 p-2">
                  <p className="text-xs text-gray-500 mb-1">Boundaries (सीमा):</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className={hl("Boundary North")}>North: Ramesh Singh (S.78/B)</div>
                    <div className={hl("Boundary South")}>South: <span className="text-gray-400 italic" style={{ fontFamily: "cursive" }}>??ndra Pd. ??arma</span></div>
                    <div>East: Canal Road</div>
                    <div>West: Vacant Land</div>
                  </div>
                </div>
                <div className="border border-gray-300 p-2 text-xs">
                  <div className="flex justify-between">
                    <span className={hl("Deed Number")}>Deed No.: <span className="text-gray-400 italic">D-4?1/98</span></span>
                    <span className={hl("Registration Date")}>Date: 14/03/1998</span>
                  </div>
                </div>

                {/* Highlight overlays */}
                <div className="relative bg-white border border-dashed border-amber-400 p-2 text-xs text-amber-600">
                  ⚠ Handwritten section — low legibility detected
                </div>
              </div>
            </div>)}
          </div>
        </div>

        {/* RIGHT: Extracted data */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between shrink-0">
            <span className="text-gray-600 text-xs font-semibold uppercase tracking-wide">AI-Extracted Data · Review &amp; Edit</span>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">🟢 <span className="text-gray-500">High ≥85%</span></span>
              <span className="flex items-center gap-1">🟡 <span className="text-gray-500">Review 60–84%</span></span>
              <span className="flex items-center gap-1">🔴 <span className="text-gray-500">Error &lt;60%</span></span>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-2">
            {Object.entries(warns).filter(([l]) => !fields.some((f) => f.label === l)).map(([l, ws]) => (
              <div key={l} className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <p className="font-semibold">{l}: not extracted</p>
                {ws.map((w, k) => <p key={k}>{w}</p>)}
              </div>
            ))}
            {fields.map((f, i) => (
              <div
                key={i}
                onClick={() => setActive(f.label)}
                className={`cursor-pointer border rounded-xl p-3 transition-all ${active === f.label ? "ring-2 ring-blue-500" : ""} ${statusClass(f.status)} ${approved[i] === true ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs">{statusIcon(f.status)}</span>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{f.label}</p>
                      <span className="mono text-[10px] text-gray-400 ml-1">Source: {real ? (regions[f.label] ? `P1 · [${regions[f.label].map((v) => (v * 100).toFixed(0)).join(", ")}]%` : "—") : src[f.label] ?? "—"}</span>
                    </div>
                    {warns[f.label]?.map((w, k) => (
                      <p key={k} className="text-[11px] text-amber-700 bg-amber-50 rounded px-2 py-1 mb-1">⚠ {w}</p>
                    ))}
                    {editIdx === i ? (
                      <div className="flex gap-2">
                        <input
                          value={editVal}
                          onChange={(e) => setEditVal(e.target.value)}
                          autoFocus
                          className="flex-1 border border-blue-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <button onClick={saveEdit} className="bg-blue-600 text-white text-xs px-3 py-1 rounded-lg">Save</button>
                        <button onClick={() => setEditIdx(null)} className="text-gray-400 text-xs px-2">✕</button>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-[#0B2545] truncate">{f.value}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full ${confBarColor(f.status)} rounded-full transition-all`} style={{ width: `${f.confidence}%` }}></div>
                      </div>
                      <span className={`mono text-xs font-bold ${f.status === "high" ? "confidence-high" : f.status === "mid" ? "confidence-mid" : "confidence-low"}`}>
                        {f.confidence}%
                      </span>
                    </div>
                  </div>
                  {editIdx !== i && (
                    <div className="flex gap-1 shrink-0">
                      {approved[i] === true ? (
                        <span className="text-xs text-green-600 font-medium">✓ OK</span>
                      ) : approved[i] === false ? (
                        <span className="text-xs text-red-600 font-medium">✗ Rejected</span>
                      ) : (
                        <>
                          <button onClick={() => startEdit(i)} className="text-xs text-gray-400 hover:text-blue-600 px-1.5 py-1 rounded border border-gray-200 hover:border-blue-300 transition-colors" title="Edit">✏</button>
                          <button onClick={() => approve(i, true)} className="text-xs text-gray-400 hover:text-green-600 px-1.5 py-1 rounded border border-gray-200 hover:border-green-300 transition-colors" title="Approve">✓</button>
                          <button onClick={() => approve(i, false)} className="text-xs text-gray-400 hover:text-red-600 px-1.5 py-1 rounded border border-gray-200 hover:border-red-300 transition-colors" title="Reject">✕</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action bar */}
          <div className="bg-white border-t border-gray-100 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="text-xs text-gray-500">
              <span className="font-medium text-green-600">{Object.values(approved).filter(Boolean).length} approved</span>
              {" · "}
              <span className="font-medium text-red-500">{Object.values(approved).filter((v) => v === false).length} rejected</span>
              {" · "}
              <span>{fields.length - Object.keys(approved).length} pending</span>
            </div>
            <div className="flex gap-2">
              {real && docId && (
                <>
                  <button onClick={() => { const m = prompt("What information is needed from the landowner?"); if (m) api.requestInfo(docId, m).then(() => navigate("officer-queue")).catch((e) => alert(e.message)); }} className="border border-amber-300 text-amber-700 px-4 py-2.5 rounded-xl text-sm font-semibold">Request information</button>
                  <button onClick={() => { const m = prompt("What must be corrected before resubmission?"); if (m) api.sendBack(docId, m).then(() => navigate("officer-queue")).catch((e) => alert(e.message)); }} className="border border-amber-300 text-amber-700 px-4 py-2.5 rounded-xl text-sm font-semibold">Send back for correction</button>
                </>
              )}
              <button
                onClick={() => { if (Object.keys(approved).length === 0) return alert("Please review at least one field before rejecting."); log({ action: "Rejected Record", record: recId, detail: "Record rejected by officer", type: "reject" }); if (api.enabled && docId) api.rejectRecord(docId).catch((e) => alert(`Rejection not saved on server: ${e.message}`)); navigate("officer-queue"); }}
                className="border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                ✕ Reject Record
              </button>
              <button
                onClick={() => { log({ action: "Approved Record", record: recId, detail: "Complete record approved by officer after field review", type: "verify" }); approveRecord(recId, real ? { owner: fv("Owner Name"), survey: fv("Survey Number"), village: fv("Village"), district: fv("District"), area: parseFloat(fv("Total Area")) || 0 } : undefined); setSubmitted(true); }}
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                ✓ Submit Verified
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

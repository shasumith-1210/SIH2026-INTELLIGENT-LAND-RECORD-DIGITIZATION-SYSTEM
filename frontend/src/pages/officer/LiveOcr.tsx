import { useEffect, useState } from "react";
import { api, BackendDoc, OcrResult } from "../../services/api";

const color = { high: "#16A34A", mid: "#D97706", low: "#DC2626" };

// Shows REAL backend output (OpenCV + Tesseract). Nothing here is demo data.
export default function LiveOcr() {
  const [docs, setDocs] = useState<BackendDoc[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [img, setImg] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const load = () => api.listDocuments().then(setDocs).catch((e) => setMsg(`Could not load documents: ${e.message}`));
  useEffect(() => { if (api.enabled) load(); }, []);

  const open = async (id: string) => {
    setSel(id); setResult(null); setImg(""); setMsg("");
    try {
      setResult(await api.getResult(id));
      setImg(await api.pageImage(id, 1));
    } catch {
      setMsg("No OCR result for this document yet.");
    }
  };

  if (!api.enabled) {
    return <div className="flex-1 p-8 bg-[#F0F4FA]"><div className="bg-white rounded-xl border p-6 text-sm text-gray-600">Backend not connected. Set <span className="mono">VITE_API_BASE</span> and restart to see real OCR output.</div></div>;
  }

  const fields = (result?.fields ?? []).filter((f) => f.page === 1);
  return (
    <div className="flex-1 overflow-auto bg-[#F0F4FA] p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-[#0B2545] mb-1">Live OCR Results</h1>
        <p className="text-sm text-gray-500 mb-5">Real output from the backend pipeline. Rule-based extraction is a first pass and every value needs officer verification.</p>
        <div className="flex gap-6">
          <div className="w-64 bg-white rounded-xl border border-gray-100 p-3 h-fit">
            <div className="flex justify-between items-center mb-2"><p className="text-xs font-semibold text-gray-500">Documents</p><button onClick={load} className="text-xs text-blue-600">Refresh</button></div>
            {docs.map((d) => (
              <button key={d.id} onClick={() => open(d.id)} className={`w-full text-left p-2 rounded-lg text-sm mb-1 ${sel === d.id ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                <span className="mono text-xs">{d.id}</span><br /><span className="text-xs text-gray-500">{d.docType} · {d.status}</span>
              </button>
            ))}
            {docs.length === 0 && <p className="text-xs text-gray-400">No documents yet.</p>}
          </div>
          <div className="flex-1">
            {msg && <p className="text-sm text-gray-500 mb-3">{msg}</p>}
            {result && (
              <div className="grid grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border border-gray-100 p-3">
                  <p className="text-xs text-gray-400 mb-2">Page 1 · preprocessing: {result.pages[0]?.steps.join(" → ")}</p>
                  <div className="relative">
                    {img && <img src={img} alt="Scanned page" className="w-full block" />}
                    {fields.map((f) => (
                      <div key={f.name} onClick={() => setActive(f.name)} className="absolute cursor-pointer" style={{ left: `${f.region[0] * 100}%`, top: `${f.region[1] * 100}%`, width: `${f.region[2] * 100}%`, height: `${f.region[3] * 100}%`, border: `2px solid ${color[f.status]}`, background: active === f.name ? `${color[f.status]}44` : "transparent" }} />
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-2 h-fit">
                  {result.fields.length === 0 && <p className="text-sm text-gray-500">No fields matched the extraction rules.</p>}
                  {result.fields.map((f) => (
                    <div key={f.name} onClick={() => setActive(f.name)} className={`border rounded-lg p-2.5 cursor-pointer ${active === f.name ? "ring-2 ring-blue-500" : ""}`}>
                      <div className="flex justify-between text-xs text-gray-400"><span className="uppercase">{f.name.replace("_", " ")}</span><span style={{ color: color[f.status] }}>{f.confidence}% · {f.status}</span></div>
                      <p className="text-sm font-medium text-[#0B2545]">{f.value}</p>
                      <p className="mono text-[10px] text-gray-400">Source: page {f.page}, region [{f.region.map((v) => (v * 100).toFixed(0)).join(", ")}]%</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

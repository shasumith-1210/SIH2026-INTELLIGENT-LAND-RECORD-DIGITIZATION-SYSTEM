import { useState } from "react";
import { api } from "../../services/api";
import { useLoad } from "../../hooks";
import MapView from "../../components/MapView";
import { Page } from "../../types";

interface Props {
  navigate: (p: Page) => void;
}

function DemoGis({ navigate: _navigate }: Props) {
  const [selected, setSelected] = useState<number | null>(0);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [overlay, setOverlay] = useState(false);
  const [village, setVillage] = useState(true);
  const [district, setDistrict] = useState(false);

  const parcels = [
    { id: 0, label: "Survey 142/A", area: "2.4 Bigha", status: "verified", color: "#16A34A", doc: "REC-2024-0437 · 7/12 extract · officer-verified" },
    { id: 1, label: "Khasra 87", area: "1.1 Bigha", status: "processing", color: "#2563EB", doc: "LR-2024-002 · Mutation record · OCR in progress" },
    { id: 2, label: "Survey 35/B", area: "3.7 Bigha", status: "verification", color: "#D97706", doc: "LR-2024-003 · Property card · awaiting officer review" },
  ];
  const op = (i: number) => ((statusF === "all" || parcels[i].status === statusF) && parcels[i].label.toLowerCase().includes(q.toLowerCase()) ? 1 : 0.15);

  return (
    <div className="flex-1 overflow-auto bg-[#F0F4FA] p-8">
      <div className="max-w-5xl mx-auto animate-fadeIn">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0B2545]" style={{ fontFamily: "'DM Sans', sans-serif" }}>GIS / Cadastral Map</h1>
          <p className="text-gray-500 text-sm mt-1">View your property parcels on the digital cadastral map.</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2 mb-4">
          Sample map data for demonstration. Parcel shapes and coordinates are illustrative and are not real cadastral or government land data.
        </div>
        <div className="flex gap-3 mb-4 items-center">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by survey / khasra number" className="flex-1 border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm" />
          <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm">
            <option value="all">All statuses</option>
            <option value="verified">Verified</option>
            <option value="processing">Processing</option>
            <option value="verification">Under review</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={overlay} onChange={(e) => setOverlay(e.target.checked)} /> Show previous boundary overlay</label>
          <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={village} onChange={(e) => setVillage(e.target.checked)} /> Village</label>
          <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={district} onChange={(e) => setDistrict(e.target.checked)} /> District</label>
        </div>
        <div className="flex gap-6">
          {/* Parcel List */}
          <div className="w-64 shrink-0 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">My Parcels</p>
            {parcels.filter((p) => op(p.id) === 1).map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`w-full text-left bg-white border rounded-xl p-4 transition-all ${selected === p.id ? "border-blue-500 shadow-md" : "border-gray-100 hover:border-gray-200"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-sm" style={{ background: p.color }}></div>
                  <p className="text-sm font-semibold text-[#0B2545]">{p.label}</p>
                </div>
                <p className="text-xs text-gray-400">{p.area}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-2 inline-block ${
                  p.status === "verified" ? "badge-verified" : p.status === "processing" ? "badge-processing" : "badge-pending"
                }`}>
                  {p.status === "verified" ? "✓ Verified" : p.status === "processing" ? "⟳ Processing" : "⏳ Review"}
                </span>
              </button>
            ))}
          </div>

          {/* Map Area */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Map Header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-base">🗺️</span>
                  <span className="font-medium">Lucknow District · Cadastral Map</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs hover:bg-gray-50">Satellite</button>
                  <button className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-blue-50 text-blue-700 border-blue-200">Cadastral</button>
                </div>
              </div>

              {/* Map SVG placeholder */}
              <div className="relative bg-[#E8F0E3] h-96">
                {/* Grid lines */}
                <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#9CA3AF" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>

                {/* Road */}
                <div className="absolute top-1/3 left-0 right-0 h-4 bg-gray-300/50"></div>
                <div className="absolute left-1/3 top-0 bottom-0 w-3 bg-gray-300/50"></div>

                {/* Parcel 1 - Verified */}
                <div
                  onClick={() => setSelected(0)}
                  className={`absolute cursor-pointer transition-all ${selected === 0 ? "ring-2 ring-green-500 ring-offset-2" : ""}`}
                  style={{ opacity: op(0), top: "20%", left: "15%", width: "22%", height: "28%", background: "#16A34A40", border: "2px solid #16A34A" }}
                >
                  <div className="p-1">
                    <p className="text-xs font-bold text-green-800">142/A</p>
                    <p className="text-xs text-green-700">2.4 Bigha</p>
                  </div>
                </div>

                {/* Parcel 2 - Processing */}
                <div
                  onClick={() => setSelected(1)}
                  className={`absolute cursor-pointer transition-all ${selected === 1 ? "ring-2 ring-blue-500 ring-offset-2" : ""}`}
                  style={{ opacity: op(1), top: "55%", left: "40%", width: "18%", height: "22%", background: "#2563EB30", border: "2px solid #2563EB" }}
                >
                  <div className="p-1">
                    <p className="text-xs font-bold text-blue-800">K-87</p>
                    <p className="text-xs text-blue-700">1.1 Bigha</p>
                  </div>
                </div>

                {/* Parcel 3 - Verification */}
                <div
                  onClick={() => setSelected(2)}
                  className={`absolute cursor-pointer transition-all ${selected === 2 ? "ring-2 ring-amber-500 ring-offset-2" : ""}`}
                  style={{ opacity: op(2), top: "15%", left: "55%", width: "28%", height: "35%", background: "#D9770630", border: "2px dashed #D97706" }}
                >
                  <div className="p-1">
                    <p className="text-xs font-bold text-amber-800">35/B</p>
                    <p className="text-xs text-amber-700">3.7 Bigha</p>
                  </div>
                </div>

                {overlay && (
                  <>
                    <div className="absolute pointer-events-none" style={{ top: "23%", left: "13%", width: "22%", height: "28%", border: "2px dashed #6B7280" }}>
                      <span className="text-[10px] text-gray-500 bg-white/80 px-1 absolute -bottom-4 left-0">Previous boundary (sample)</span>
                    </div>
                    <div className="absolute pointer-events-none" style={{ top: "13%", left: "57%", width: "28%", height: "35%", border: "2px dashed #6B7280" }}></div>
                  </>
                )}

                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {district && <rect x="2" y="3" width="96" height="94" fill="none" stroke="#0B2545" strokeWidth="0.8" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 3 }} />}
                  {village && <path d="M6 8 L62 6 L94 14 L90 52 L58 94 L10 88 Z" fill="none" stroke="#7C3AED" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 2 }} />}
                </svg>
                {district && <span className="absolute top-1 left-2 text-[10px] font-semibold text-[#0B2545] bg-white/80 px-1">Sample district boundary</span>}
                {village && <span className="absolute bottom-6 right-4 text-[10px] font-semibold text-purple-700 bg-white/80 px-1">Sample village boundary</span>}

                {/* Compass */}
                <div className="absolute top-3 right-3 bg-white rounded-lg shadow p-2 text-xs text-center">
                  <div className="text-base">🧭</div>
                  <div className="text-gray-500">N</div>
                </div>

                {/* Scale */}
                <div className="absolute bottom-3 left-3 bg-white rounded px-2 py-1 text-xs text-gray-500 flex items-center gap-1">
                  <div className="w-10 h-1 bg-gray-700"></div>
                  <span>50m</span>
                </div>
              </div>

              {/* Parcel detail */}
              {selected !== null && (
                <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Selected Parcel</p>
                      <p className="font-bold text-[#0B2545]">{parcels[selected].label} · {parcels[selected].area}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Sample location · illustrative geometry only</p>
                      <p className="text-xs text-blue-700 mt-1">Linked document: <span className="mono">{parcels[selected].doc}</span></p>
                    </div>
                    <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                      parcels[selected].status === "verified" ? "badge-verified" : parcels[selected].status === "processing" ? "badge-processing" : "badge-pending"
                    }`}>
                      {parcels[selected].status === "verified" ? "✓ Verified" : parcels[selected].status === "processing" ? "⟳ Processing" : "⏳ Review"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mt-3 text-xs text-gray-500">
              {[
                { color: "#16A34A", label: "Verified" },
                { color: "#2563EB", label: "Processing" },
                { color: "#D97706", label: "Under Review" },
                { color: "#7C3AED", label: "Village (sample)" },
                { color: "#0B2545", label: "District (sample)" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: l.color }}></div>
                  {l.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveGis() {
  const { data, error } = useLoad(() => api.myParcels());
  const [sel, setSel] = useState<string | null>(null);
  const [hist, setHist] = useState(false);
  const [q, setQ] = useState("");
  const fs = (data ?? []).filter((f) => f.properties.survey.toLowerCase().includes(q.toLowerCase()));
  const chosen = fs.find((f) => f.id === sel);
  return (
    <div className="flex-1 overflow-auto bg-[#F0F4FA] p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-[#0B2545] mb-1">My land on the map</h1>
        <p className="text-sm text-gray-500 mb-4">Parcel outlines that officers have linked to your records. Outlines are for reference and are not official cadastral boundaries.</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 mb-3"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by survey number" className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm" /><label className="text-sm text-gray-600 flex gap-1 items-center"><input type="checkbox" checked={hist} onChange={(e) => setHist(e.target.checked)} /> Show previous boundary</label></div>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-3"><MapView features={fs} selected={sel} onSelect={setSel} showHistory={hist} showBoundaries /></div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-sm">
            {chosen ? (<><p className="font-semibold text-[#0B2545]">{chosen.properties.survey}, {chosen.properties.district}</p><p className="text-gray-500 mt-1">{(chosen.properties.area_sqm / 10000).toFixed(2)} ha · linked record <span className="mono text-xs">{chosen.properties.record_id}</span></p><p className="mt-1">Status: {chosen.properties.status ?? "none"}</p></>) : <p className="text-gray-400">{fs.length ? "Click a parcel." : "No parcels are linked to your records yet."}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GISMapView(props: Props) {
  return api.enabled ? <LiveGis /> : <DemoGis {...props} />;
}

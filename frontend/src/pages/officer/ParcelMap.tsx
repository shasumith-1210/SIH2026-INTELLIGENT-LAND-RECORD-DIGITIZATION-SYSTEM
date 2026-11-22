import { useEffect, useState } from "react";
import { api, ParcelFeature } from "../../services/api";
import MapView from "../../components/MapView";

// Draws parcel outlines stored in the backend. Sample parcels are labelled as such: they are not real cadastral data.
export default function ParcelMap() {
  const [features, setFeatures] = useState<ParcelFeature[]>([]);
  const [docs, setDocs] = useState<string[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState({ survey: "", district: "", record: "", geo: "" });
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [history, setHistory] = useState(false);
  const [bounds, setBounds] = useState(true);
  const [kind, setKind] = useState("parcel");

  const load = () => api.listParcels().then(setFeatures).catch((e) => setMsg(`Could not load parcels: ${e.message}`));
  useEffect(() => {
    if (!api.enabled) return;
    load();
    api.listDocuments().then((d) => setDocs(d.map((x) => x.id))).catch(() => {});
  }, []);

  if (!api.enabled) {
    return <div className="flex-1 p-8 bg-[#F0F4FA]"><div className="bg-white rounded-xl border p-6 text-sm text-gray-600">Backend not connected. Set <span className="mono">VITE_API_BASE</span> to store and view parcel outlines.</div></div>;
  }

  const shown = features.filter((f) => f.properties.kind !== "parcel" || ((statusF === "all" || (f.properties.status ?? "none") === statusF) && f.properties.survey.toLowerCase().includes(q.toLowerCase())));
  const chosen = features.find((f) => f.id === sel);

  const sample = () => {
    const d = 0.0009, o = features.length * 0.0013;
    const lon = 83.0 + o;
    setForm({ ...form, geo: JSON.stringify({ type: "Polygon", coordinates: [[[lon, 25.3], [lon + d, 25.3], [lon + d, 25.3 + d * 1.1], [lon, 25.3 + d * 1.1], [lon, 25.3]]] }) });
  };
  const save = async () => {
    setMsg("");
    try {
      await api.addParcel({ survey: form.survey, district: form.district, record_id: form.record || undefined, geometry: JSON.parse(form.geo), kind });
      setForm({ survey: "", district: "", record: "", geo: "" });
      load();
    } catch (e) {
      setMsg(`Not saved: ${(e as Error).message}`);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-[#F0F4FA] p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-[#0B2545] mb-1">Parcel Map</h1>
        <p className="text-sm text-gray-500 mb-5">Parcel outlines stored in the backend and linked to records. Area is computed on the server and compared with the documented area during validation. Sample outlines are for demonstration only.</p>
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by survey number" className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm" />
          <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm">
            <option value="all">All statuses</option><option value="officer_verified">Verified</option><option value="processed">Awaiting officer</option><option value="submitted">Submitted</option><option value="rejected">Rejected</option><option value="none">No linked record</option>
          </select>
          <label className="text-sm text-gray-600 flex gap-1"><input type="checkbox" checked={history} onChange={(e) => setHistory(e.target.checked)} /> Previous boundaries</label>
          <label className="text-sm text-gray-600 flex gap-1"><input type="checkbox" checked={bounds} onChange={(e) => setBounds(e.target.checked)} /> Village / district</label>
        </div>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-3">
            <MapView features={shown} selected={sel} onSelect={setSel} showHistory={history} showBoundaries={bounds} />
            <div className="flex gap-4 text-xs text-gray-500 mt-2"><span>■ <span className="text-green-600">linked to a record</span></span><span>■ <span className="text-gray-500">no linked record</span></span></div>
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">Selected parcel</p>
              {chosen ? (
                <dl className="text-sm space-y-1">
                  <div><dt className="text-xs text-gray-400">Survey / district</dt><dd className="font-medium">{chosen.properties.survey}, {chosen.properties.district}</dd></div>
                  <div><dt className="text-xs text-gray-400">Computed area</dt><dd>{chosen.properties.area_sqm.toFixed(0)} m² · {(chosen.properties.area_sqm / 10000).toFixed(2)} ha · {(chosen.properties.area_sqm / 4046.8564).toFixed(2)} acres</dd></div>
                  <div><dt className="text-xs text-gray-400">Linked record</dt><dd className="mono text-xs">{chosen.properties.record_id ?? "none"}</dd></div>
                </dl>
              ) : <p className="text-sm text-gray-400">Click a parcel on the map.</p>}
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500">Add parcel outline</p>
              <input value={form.survey} onChange={(e) => setForm({ ...form, survey: e.target.value })} placeholder="Survey number (as on the record)" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
              <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="District" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
              <select value={form.record} onChange={(e) => setForm({ ...form, record: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
                <option value="">Link to record (optional)</option>
                {docs.map((d) => <option key={d}>{d}</option>)}
              </select>
              <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"><option value="parcel">Parcel</option><option value="village">Village boundary</option><option value="district">District boundary</option></select>
              <textarea value={form.geo} onChange={(e) => setForm({ ...form, geo: e.target.value })} rows={4} placeholder='GeoJSON Polygon, [lon, lat] points' className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs mono" />
              <div className="flex gap-2">
                <button onClick={sample} className="border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold">Insert sample square (about 1 ha)</button>
                <button onClick={save} className="bg-[#0B2545] text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Save</button>
                {chosen && <button onClick={async () => { try { await api.updateParcel(chosen.id, JSON.parse(form.geo)); load(); } catch (e) { setMsg(`Not updated: ${(e as Error).message}`); } }} className="border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold">Replace selected outline</button>}
              </div>
              {msg && <p className="text-xs text-red-600">{msg}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

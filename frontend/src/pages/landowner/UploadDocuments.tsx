import { useState } from "react";
import { useAudit } from "../../store";
import { Page } from "../../types";

interface Props {
  navigate: (p: Page) => void;
}

const states = ["Uttar Pradesh", "Maharashtra", "Rajasthan", "Madhya Pradesh", "Bihar", "Gujarat", "Karnataka", "Tamil Nadu"];

export default function UploadDocuments({ navigate }: Props) {
  const { submitDocument } = useAudit();
  const [form, setForm] = useState({ state: "", district: "", tehsil: "", village: "", docType: "", survey: "", propId: "" });
  const [files, setFiles] = useState<string[]>([]);
  const [fileObjs, setFileObjs] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState(0);
  const [err, setErr] = useState("");
  const next = () => {
    if (step === 0 && (!form.state || !form.district || !form.village || !form.docType)) return setErr("Please complete state, district, village and document type.");
    if (step === 1 && files.length === 0) return setErr("Please add at least one document.");
    setErr("");
    setStep(step + 1);
  };

  const [previews, setPreviews] = useState<Record<string, { url: string; image: boolean; kb: number }>>({});
  const [refId, setRefId] = useState("");
  const addFiles = (list: File[]) => {
    const ok = ["application/pdf", "image/jpeg", "image/png"];
    const bad = list.filter((f) => !ok.includes(f.type) || f.size > 10 * 1024 * 1024);
    let good = list.filter((f) => !bad.includes(f) && !files.includes(f.name));
    const room = 5 - files.length;
    const overflow = good.length > room;
    good = good.slice(0, Math.max(room, 0));
    setErr(bad.length ? `Rejected ${bad.map((f) => f.name).join(", ")}: only PDF, JPG or PNG up to 10MB are allowed.` : overflow ? "A maximum of 5 files is allowed." : "");
    setFiles((prev) => [...prev, ...good.map((f) => f.name)]);
    setFileObjs((prev) => [...prev, ...good]);
    setPreviews((prev) => ({ ...prev, ...Object.fromEntries(good.map((f) => [f.name, { url: URL.createObjectURL(f), image: f.type.startsWith("image/"), kb: Math.round(f.size / 1024) }])) }));
  };

  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F0F4FA] p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center max-w-md animate-fadeIn">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✅</div>
          <h2 className="text-2xl font-bold text-[#0B2545] mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>Submitted Successfully</h2>
          <p className="text-gray-500 text-sm mb-2">Your application reference number is:</p>
          <p className="mono text-lg font-bold text-blue-700 bg-blue-50 rounded-lg px-4 py-2 inline-block mb-6">{refId || "—"}</p>
          <p className="text-gray-500 text-sm mb-6">AI processing will begin within 30 minutes. You'll receive an SMS update on each status change.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate("landowner-track")} className="bg-[#0B2545] text-white px-5 py-2.5 rounded-xl text-sm font-semibold">Track Status</button>
            <button onClick={() => { setSubmitted(false); setFiles([]); setFileObjs([]); setPreviews({}); }} className="border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-semibold">Upload More</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-[#F0F4FA] p-8">
      <div className="max-w-3xl mx-auto animate-fadeIn">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0B2545]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Upload Land Documents</h1>
          <p className="text-gray-500 text-sm mt-1">Upload your land ownership documents for AI-powered digitization and verification.</p>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-0 mb-8">
          {["Location Details", "Document Upload", "Review & Submit"].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < step ? "bg-green-600 text-white" : i === step ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}>{i + 1}</div>
                <span className={`text-xs font-medium ${i === step ? "text-blue-700" : "text-gray-400"}`}>{s}</span>
              </div>
              {i < 2 && <div className="w-12 h-0.5 bg-gray-200 mx-3"></div>}
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {step === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-[#0B2545] mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>📍 Property Location</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">State *</label>
                <select
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select State</option>
                  {states.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">District *</label>
                <input
                  type="text"
                  placeholder="e.g. Lucknow"
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Tehsil *</label>
                <input
                  type="text"
                  placeholder="e.g. Kakori"
                  value={form.tehsil}
                  onChange={(e) => setForm({ ...form, tehsil: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Village *</label>
                <input
                  type="text"
                  placeholder="e.g. Mohanlalganj"
                  value={form.village}
                  onChange={(e) => setForm({ ...form, village: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Document Type *</label>
              <div className="grid grid-cols-3 gap-2">
                {["Khasra / Khatauni", "Sale Deed", "Jamabandi", "Mutation Order", "Patta", "Other"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm({ ...form, docType: t })}
                    className={`border rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                      form.docType === t ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-blue-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          )}
          {step === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-[#0B2545] mb-4">Property identification</h3>
              <div className="grid grid-cols-2 gap-4">
                <input value={form.survey} onChange={(e) => setForm({ ...form, survey: e.target.value })} placeholder="Survey number (if known)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input value={form.propId} onChange={(e) => setForm({ ...form, propId: e.target.value })} placeholder="Property ID (optional)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          )}
          {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-[#0B2545] mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>📎 Upload Documents</h3>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                addFiles(Array.from(e.dataTransfer.files));
              }}
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${dragging ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"}`}
            >
              <div className="text-4xl mb-3">📤</div>
              <p className="font-semibold text-[#0B2545] mb-1">Drag & drop files here</p>
              <p className="text-gray-400 text-sm mb-4">PDF, JPG, PNG · Max 10MB per file · Up to 5 files</p>
              <label className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors inline-block">
                Browse Files
                <input type="file" className="hidden" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { addFiles(Array.from(e.target.files || [])); e.target.value = ""; }} />
              </label>
            </div>

            {files.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-4">
                {files.map((f) => (
                  <div key={f} className="w-28 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 text-center">
                    {previews[f]?.image ? <img src={previews[f].url} alt={f} className="h-20 w-full object-cover" /> : <a href={previews[f]?.url} target="_blank" rel="noreferrer" className="h-20 flex items-center justify-center text-2xl">📄</a>}
                    <p className="text-[10px] text-gray-500 truncate px-1">{previews[f]?.kb} KB</p>
                  </div>
                ))}
              </div>
            )}
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-green-50 border border-green-100 rounded-lg px-4 py-2.5">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">📄</span>
                      <span className="text-green-800 font-medium">{f}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-green-600 text-xs">✓ Ready</span>
                      <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
          {step === 2 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-[#0B2545] mb-4">Review your submission</h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[["Document type", form.docType], ["State", form.state], ["District", form.district], ["Tehsil", form.tehsil || "—"], ["Village", form.village], ["Survey number", form.survey || "Not provided"], ["Property ID (optional)", form.propId || "—"]].map(([k, v]) => (
                  <div key={k}><dt className="text-xs text-gray-400">{k}</dt><dd className="font-medium text-[#0B2545]">{v}</dd></div>
                ))}
              </dl>
              <p className="text-xs text-gray-400 mt-5 mb-1">Files ({files.length})</p>
              <ul className="text-sm text-gray-600 space-y-1">{files.map((f, i) => <li key={i}>📄 {f}</li>)}</ul>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 mt-5">
                Submitting queues the document for processing and officer verification. Results stay unverified until an officer approves them.
              </div>
            </div>
          )}
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex justify-between">
            <button disabled={step === 0} onClick={() => { setErr(""); setStep(step - 1); }} className="border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-30">← Back</button>
            {step < 2 ? (
              <button onClick={next} className="bg-[#0B2545] text-white px-6 py-2.5 rounded-xl text-sm font-semibold">Continue →</button>
            ) : (
              <button onClick={() => { submitDocument({ owner: "R. Sharma", survey: form.survey || "Pending OCR", district: form.district, tehsil: form.tehsil, docType: form.docType, fileCount: files.length }, fileObjs.filter((f) => files.includes(f.name))).then((id) => setRefId(id)); setSubmitted(true); setStep(0); }} className="bg-green-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">Confirm and submit</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

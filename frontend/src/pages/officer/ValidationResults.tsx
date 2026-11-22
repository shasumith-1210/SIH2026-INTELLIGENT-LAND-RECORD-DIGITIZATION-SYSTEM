import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Page } from "../../types";
import { useAudit } from "../../store";

interface Check {
  id: string;
  category: string;
  title: string;
  status: "passed" | "failed" | "warning" | "pending";
  field?: string;
  explanation?: string;
}

// DEMONSTRATION DATA - to be replaced by the validation module (FastAPI) output.
const seed: Check[] = [
  { id: "V-01", category: "Missing fields", title: "Mandatory fields present", status: "passed" },
  { id: "V-02", category: "Missing fields", title: "Deed number complete", status: "failed", field: "Deed Number", explanation: "Value D-4?1/98 contains an unreadable character, so the deed number cannot be matched against registration data. Request a clearer scan or manual entry." },
  { id: "V-03", category: "Survey number", title: "Survey number format (78/C)", status: "passed" },
  { id: "V-04", category: "Survey number", title: "Survey number consistent with neighbouring record S.78/B", status: "warning", field: "Boundary North", explanation: "Northern boundary cites S.78/B at 58% extraction confidence. Possible inconsistency; needs officer comparison against the scan." },
  { id: "V-05", category: "Area", title: "Stated area vs. sum of sub-parcels", status: "warning", field: "Total Area", explanation: "Stated 3.2 Bigha differs from the sub-parcel sum by about 0.1 Bigha in the sample data. May be a rounding or unit-conversion issue." },
  { id: "V-06", category: "Duplicates", title: "Possible duplicate of REC-2024-0291", status: "warning", field: "Khata Number", explanation: "Khata 2241 and owner name resemble another record. Flagged as a potential duplicate for authorised review, not a conclusion." },
  { id: "V-07", category: "Ownership", title: "Ownership continuity across mutations", status: "warning", field: "Owner Name", explanation: "A mutation entry lists a different owner spelling. This is a potential inconsistency requiring authorised review, not a legal finding." },
  { id: "V-08", category: "Invalid data", title: "Registration date is a valid date", status: "passed" },
  { id: "V-09", category: "GIS / spatial", title: "Parcel geometry matches survey number", status: "pending", explanation: "Waiting for sample geospatial layer." },
  { id: "V-10", category: "GIS / spatial", title: "Parcel area vs. documented area", status: "pending", explanation: "Waiting for sample geospatial layer." },
];

const badge: Record<Check["status"], string> = {
  passed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  pending: "bg-gray-100 text-gray-600",
};

export default function ValidationResults({ navigate }: { navigate: (p: Page) => void }) {
  const { log, setFocus } = useAudit();
  const real = api.enabled;
  const [checks, setChecks] = useState<Check[]>(real ? [] : seed);
  const [docs, setDocs] = useState<string[]>([]);
  const [docId, setDocId] = useState("");
  const recId = docId || "REC-2024-0441";
  useEffect(() => {
    if (real) api.listDocuments().then((d) => setDocs(d.filter((x) => x.status !== "submitted").map((x) => x.id))).catch(() => {});
  }, [real]);
  const loadChecks = (id: string) => {
    setDocId(id);
    api.getValidation(id).then((c) => setChecks(c.map((x) => ({ id: x.id, category: x.category, title: x.title, status: x.status, field: x.field ?? undefined, explanation: x.explanation ?? undefined })))).catch(() => setChecks([]));
  };
  const [open, setOpen] = useState<string | null>("V-02");
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});

  const count = (s: Check["status"]) => checks.filter((c) => c.status === s).length;
  const summary = [
    { label: "Total checks", value: checks.length, cls: "text-[#0B2545]" },
    { label: "Passed", value: count("passed"), cls: "text-green-600" },
    { label: "Failed", value: count("failed"), cls: "text-red-600" },
    { label: "Warnings", value: count("warning"), cls: "text-amber-600" },
    { label: "Pending", value: count("pending"), cls: "text-gray-500" },
  ];

  const investigate = (c: Check) => {
    log({ action: "Investigated Flag", record: recId, detail: `${c.id} (${c.field}) opened in review workspace`, type: "flag" });
    if (real && docId) setFocus({ docId, field: c.field });
    navigate("officer-verify");
  };
  const markReviewed = (c: Check) => {
    setReviewed((r) => ({ ...r, [c.id]: true }));
    log({ action: "Flag Reviewed", record: recId, detail: `${c.id} marked reviewed by officer; no ownership finding made`, type: "verify" });
  };

  return (
    <div className="flex-1 overflow-auto bg-[#F0F4FA] p-8">
      <div className="max-w-5xl mx-auto animate-fadeIn">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2545]">Validation and Error Detection</h1>
            <p className="text-sm text-gray-500 mt-1">{real ? (
              <select value={docId} onChange={(e) => e.target.value && loadChecks(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-sm mono mr-2">
                <option value="">Select processed document…</option>
                {docs.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            ) : "REC-2024-0441 · "}
            Results are potential inconsistencies for authorised review, not legal determinations.</p>
          </div>
          {real ? <span className="text-xs font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full">Live validation</span> : <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">Demonstration data</span>}
        </div>

        <div className="grid grid-cols-5 gap-4 mb-6">
          {summary.map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className={`text-3xl font-bold ${s.cls}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
          {checks.map((c) => (
            <div key={c.id} className="p-4">
              <button className="w-full flex items-center gap-3 text-left" onClick={() => setOpen(open === c.id ? null : c.id)}>
                <span className="mono text-xs text-gray-400 w-12">{c.id}</span>
                <span className="text-xs text-gray-400 w-32">{c.category}</span>
                <span className="flex-1 text-sm font-medium text-[#0B2545]">{c.title}</span>
                {reviewed[c.id] && <span className="text-xs text-green-600">Reviewed</span>}
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${badge[c.status]}`}>{c.status}</span>
              </button>
              {open === c.id && c.explanation && (
                <div className="mt-3 ml-12 pl-4 border-l-2 border-gray-200">
                  <p className="text-sm text-gray-600">{c.explanation}</p>
                  {c.field && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => investigate(c)} className="bg-[#0B2545] text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Investigate field: {c.field}</button>
                      {!reviewed[c.id] && <button onClick={() => markReviewed(c)} className="border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold">Mark reviewed</button>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

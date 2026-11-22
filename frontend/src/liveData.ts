import { AuditRow, DocRow } from "./services/api";

export const fmt = (iso: string) => {
  const d = new Date(iso);
  return isNaN(+d) ? iso : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const auditType = (a: string) =>
  /^Uploaded|^Files/.test(a) ? "upload" : /^OCR/.test(a) ? "ocr" : /^Corrected|^Edited|^Parcel/.test(a) ? "edit" : /^Approved/.test(a) ? "verify" : /^Rejected/.test(a) ? "reject" : "flag";

export const toAuditEntry = (r: AuditRow) => ({
  id: r.id, time: fmt(r.time), officer: r.user, action: r.action, record: r.record,
  detail: r.previous || r.updated ? `${r.previous ?? "—"} → ${r.updated ?? "—"}` : "", type: auditType(r.action),
});

/** Timeline for the landowner Track Status page, derived from the real document status. */
export const toTrack = (d: DocRow) => {
  const st = d.status;
  const step = st === "officer_verified" ? 4 : st === "rejected" ? 3 : st === "processed" ? 3 : 1;
  const names = ["Document Uploaded", "AI OCR Processing", "Data Validation", "Officer Verification", "Verified Record Issued"];
  return {
    id: d.id, title: d.docType, location: `${d.tehsil || "—"}, ${d.district}`, current: step,
    timeline: names.map((n, i) => ({
      step: n, date: i === 0 ? fmt(d.uploaded) : i < step || st === "officer_verified" ? "Done" : i === step ? (st === "rejected" ? "Rejected by officer" : "In progress") : "Pending",
      note: i === 1 && st === "submitted" ? "Queued: OCR has not run yet" : i === 3 && st === "rejected" ? "Sent back for correction" : "",
      done: i < step || st === "officer_verified", active: i === step && st !== "officer_verified",
    })),
  };
};

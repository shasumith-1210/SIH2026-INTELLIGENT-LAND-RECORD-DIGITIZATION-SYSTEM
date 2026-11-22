import { api, Submission } from "./services/api";
import { createContext, useContext, useState, ReactNode } from "react";

export interface AuditEntry {
  id: string;
  time: string;
  officer: string;
  action: string;
  record: string;
  detail: string;
  type: string;
}

type NewEntry = Omit<AuditEntry, "id" | "time" | "officer"> & { officer?: string };

interface Ctx {
  entries: AuditEntry[];
  log: (e: NewEntry) => void;
  submissions: Submission[];
  verified: string[];
  submitDocument: (s: Omit<Submission, "id" | "uploaded">, files?: File[]) => Promise<string>;
  focus: { docId: string; field?: string } | null;
  setFocus: (f: { docId: string; field?: string } | null) => void;
  verifiedMeta: Record<string, { owner: string; survey: string; village: string; district: string; area: number }>;
  approveRecord: (id: string, meta?: { owner: string; survey: string; village: string; district: string; area: number }) => void;
}

const AuditContext = createContext<Ctx>({ entries: [], log: () => {}, submissions: [], verified: [], focus: null, setFocus: () => {}, verifiedMeta: {}, submitDocument: async () => "", approveRecord: () => {} });

// Session-level audit store. Replace log() with a POST to the FastAPI audit module when the backend exists.
export function AuditProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [verified, setVerified] = useState<string[]>([]);
  const [focus, setFocus] = useState<Ctx["focus"]>(null);
  const [verifiedMeta, setVerifiedMeta] = useState<Ctx["verifiedMeta"]>({});
  const log = (e: NewEntry) =>
    setEntries((prev) => [
      {
        id: `AUD-LIVE-${String(prev.length + 1).padStart(3, "0")}`,
        time: new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        officer: e.officer ?? "Amitabh Kumar",
        action: e.action,
        record: e.record,
        detail: e.detail,
        type: e.type,
      },
      ...prev,
    ]);
  const submitDocument = async (s: Omit<Submission, "id" | "uploaded">, files?: File[]): Promise<string> => {
    let sub: Submission;
    try {
      sub = await api.submitDocument(s);
    } catch (e) {
      alert(`Backend rejected the submission: ${(e as Error).message}`);
      return "";
    }
    if (api.enabled && files?.length) {
      try {
        await api.uploadFiles(sub.id, files);
        await api.processDocument(sub.id);
        log({ action: "OCR Processed", record: sub.id, detail: "Server-side preprocessing and OCR completed", type: "ocr", officer: "System" });
      } catch (e) {
        alert(`Upload or OCR failed: ${(e as Error).message}`);
      }
    }
    setSubmissions((p) => [sub, ...p]);
    log({ action: "Uploaded Document", record: sub.id, detail: `${s.docType} · ${s.fileCount} file(s) · ${s.district}`, type: "upload", officer: "R. Sharma (Landowner)" });
    return sub.id;
  };
  const approveRecord: Ctx["approveRecord"] = (id, meta) => {
    if (meta) setVerifiedMeta((m) => ({ ...m, [id]: meta }));
    setVerified((p) => (p.includes(id) ? p : [id, ...p]));
    api.approveRecord(id, "Amitabh Kumar").catch((e) => console.warn("Backend approve failed (demo record may not exist there):", e.message));
  };
  return <AuditContext.Provider value={{ entries, log, submissions, verified, verifiedMeta, focus, setFocus, submitDocument, approveRecord }}>{children}</AuditContext.Provider>;
}

export const useAudit = () => useContext(AuditContext);

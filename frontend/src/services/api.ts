// API service layer. Pages should call `api`, never fetch() directly.
// Swap `demoApi` for `httpApi` once the FastAPI backend exists. Demo data is never presented as real.
export interface Submission {
  id: string;
  owner: string;
  survey: string;
  district: string;
  tehsil: string;
  docType: string;
  fileCount: number;
  uploaded: string;
}

export interface OcrField { name: string; value: string; confidence: number; status: "high" | "mid" | "low"; page: number; region: number[] }
export interface OcrResult { engine: string; pages: { page: number; width: number; height: number; steps: string[]; word_count: number }[]; fields: OcrField[] }
export interface BackendDoc extends Submission { status: string; confidence?: number; flagged?: number }
export interface ValidationCheck { id: string; category: string; title: string; status: "passed" | "failed" | "warning" | "pending"; field?: string | null; explanation?: string | null }

export interface ParcelFeature { id: string; geometry: { type: "Polygon"; coordinates: number[][][] }; properties: { survey: string; district: string; record_id: string | null; area_sqm: number; kind: "parcel" | "village" | "district"; status: string | null; history: { geometry: { type: "Polygon"; coordinates: number[][][] }; area_sqm: number; replaced: string }[] } }

export interface Session { sub: string; role: "landowner" | "officer" | "admin"; exp: number }
export interface AuditRow { id: string; time: string; user: string; action: string; record: string; previous: string | null; updated: string | null }
export interface Summary { received: number; officer_verified: number; rejected: number; processed: number; submitted: number; pending: number; by_district: Record<string, number>; avg_confidence: number | null; officer_actions: Record<string, number>; corrections: number; by_status: Record<string, number>; field_confidence: Record<string, number>; findings: Record<string, number>; per_day: Record<string, number>; routes: Record<string, number>; correction_rate: number | null; fields_total: number }
export interface UserRow { username: string; role: string; active: boolean; has_2fa?: boolean; locked?: boolean }
export type DocRow = BackendDoc & { extracted?: Record<string, string> };

export interface IntelliLandApi {
  mode: "backend" | "demo";
  session(): Session | null;
  health(): Promise<boolean>;
  myDocuments(): Promise<DocRow[]>;
  getAudit(): Promise<AuditRow[]>;
  getSummary(): Promise<Summary>;
  listParcels(): Promise<ParcelFeature[]>;
  myParcels(): Promise<ParcelFeature[]>;
  addParcel(p: { survey: string; district: string; record_id?: string; geometry: object; kind?: string }): Promise<void>;
  updateParcel(id: string, geometry: object): Promise<void>;
  listUsers(): Promise<UserRow[]>;
  createUser(u: { username: string; password: string; role: string }): Promise<void>;
  patchUser(username: string, p: { role?: string; active?: boolean; password?: string }): Promise<void>;
  verifyAuditChain(): Promise<{ ok: boolean; entries?: number; broken_at?: string | null }>;
  downloadFeedback(): Promise<string>;
  exportRecord(id: string): Promise<object>;
  requestInfo(id: string, message: string): Promise<void>;
  sendBack(id: string, message: string): Promise<void>;
  uploadFiles(id: string, files: File[]): Promise<void>;
  getValidation(id: string): Promise<ValidationCheck[]>;
  rejectRecord(id: string): Promise<void>;
  fieldDecision(id: string, field: string, approved: boolean): Promise<void>;
  recordCorrection(id: string, field: string, previous: string, updated: string): Promise<void>;
  processDocument(id: string): Promise<void>;
  listDocuments(): Promise<BackendDoc[]>;
  getResult(id: string): Promise<OcrResult>;
  pageImage(id: string, page: number, variant?: "original" | "enhanced"): Promise<string>;
  enabled: boolean;
  login(username: string, password: string): Promise<{ role: string; mfaRequired: boolean }>;
  verifyMfa(code: string): Promise<void>;
  requestOtp(phone: string): Promise<void>;
  verifyOtp(phone: string, code: string): Promise<void>;
  submitDocument(s: Omit<Submission, "id" | "uploaded">): Promise<Submission>;
  approveRecord(recordId: string, officer: string): Promise<void>;
}

// Set VITE_API_BASE (e.g. http://localhost:8000) to use the FastAPI backend; otherwise the app runs on demo data.
const ROOT: string = import.meta.env.VITE_API_BASE ?? "";
const BASE = `${ROOT}/api/v1`;
let mfaToken = "";
let token = sessionStorage.getItem("il_token") ?? "";
const setToken = (t: string) => { token = t; sessionStorage.setItem("il_token", t); };
export const clearToken = () => { token = ""; sessionStorage.removeItem("il_token"); };
const authOnly = () => ({ ...(token ? { Authorization: `Bearer ${token}` } : {}) });
const headers = () => ({ "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) });
function expired() {
  clearToken();
  window.dispatchEvent(new Event("il-auth-expired"));
}
async function call<T>(path: string, init: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { ...init, headers: headers() });
  if (r.status === 401 && token && !path.startsWith("/auth/")) expired();
  if (!r.ok) throw new Error(`${r.status} ${(await r.text().catch(() => "")).slice(0, 120)}`);
  return r.json();
}

export const httpApi: IntelliLandApi = {
  enabled: true,
  mode: "backend",
  session() {
    try {
      const p = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      return p.exp * 1000 > Date.now() && ["landowner", "officer", "admin"].includes(p.role) ? { sub: p.sub, role: p.role, exp: p.exp } : null;
    } catch {
      return null;
    }
  },
  async health() {
    try {
      return (await fetch(`${ROOT}/health`)).ok;
    } catch {
      return false;
    }
  },
  myDocuments: () => call("/documents/mine", { method: "GET" }),
  getAudit: () => call("/audit", { method: "GET" }),
  getSummary: () => call("/reports/summary", { method: "GET" }),
  async login(username, password) {
    const r = await call<{ access_token?: string; mfa_token?: string; mfa_required: boolean; role: string }>("/auth/token", { method: "POST", body: JSON.stringify({ username, password }) });
    if (r.mfa_required) mfaToken = r.mfa_token ?? "";
    else setToken(r.access_token ?? "");
    return { role: r.role, mfaRequired: r.mfa_required };
  },
  async verifyMfa(code) {
    const r = await call<{ access_token: string }>("/auth/mfa", { method: "POST", body: JSON.stringify({ mfa_token: mfaToken, code }) });
    setToken(r.access_token);
  },
  async requestOtp(phone) {
    await call("/auth/otp/request", { method: "POST", body: JSON.stringify({ phone }) });
  },
  async verifyOtp(phone, code) {
    const r = await call<{ access_token: string }>("/auth/otp/verify", { method: "POST", body: JSON.stringify({ phone, code }) });
    setToken(r.access_token);
  },
  async uploadFiles(id, files) {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    const r = await fetch(`${BASE}/documents/${id}/files`, { method: "POST", headers: authOnly(), body: fd });
    if (r.status === 401) expired();
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 120)}`);
  },
  async listParcels() {
    return (await call<{ features: ParcelFeature[] }>("/gis/parcels", { method: "GET" })).features;
  },
  async myParcels() {
    return (await call<{ features: ParcelFeature[] }>("/gis/parcels/mine", { method: "GET" })).features;
  },
  async addParcel(p) {
    await call("/gis/parcels", { method: "POST", body: JSON.stringify(p) });
  },
  async updateParcel(id, geometry) {
    await call(`/gis/parcels/${id}`, { method: "PUT", body: JSON.stringify({ geometry }) });
  },
  listUsers: () => call("/users", { method: "GET" }),
  async createUser(u) {
    await call("/users", { method: "POST", body: JSON.stringify(u) });
  },
  async patchUser(username, p) {
    await call(`/users/${encodeURIComponent(username)}`, { method: "PATCH", body: JSON.stringify(p) });
  },
  verifyAuditChain: () => call("/audit/verify", { method: "GET" }),
  async downloadFeedback() {
    const r = await fetch(`${BASE}/reports/feedback.jsonl`, { headers: authOnly() });
    if (r.status === 401) expired();
    if (!r.ok) throw new Error(String(r.status));
    return URL.createObjectURL(await r.blob());
  },
  exportRecord: (id) => call(`/documents/${id}/export`, { method: "GET" }),
  async requestInfo(id, message) {
    await call(`/records/${id}/request-info`, { method: "POST", body: JSON.stringify({ message }) });
  },
  async sendBack(id, message) {
    await call(`/records/${id}/send-back`, { method: "POST", body: JSON.stringify({ message }) });
  },
  getValidation: (id) => call(`/documents/${id}/validation`, { method: "GET" }),
  async rejectRecord(id) {
    await call(`/records/${id}/reject`, { method: "POST" });
  },
  async fieldDecision(id, field, approved) {
    await call(`/records/${id}/field-decision`, { method: "POST", body: JSON.stringify({ field, approved }) });
  },
  async recordCorrection(id, field, previous, updated) {
    await call(`/records/${id}/corrections`, { method: "POST", body: JSON.stringify({ field, previous, updated }) });
  },
  async processDocument(id) {
    await call(`/documents/${id}/process`, { method: "POST" });
  },
  listDocuments: () => call("/documents", { method: "GET" }),
  getResult: (id) => call(`/documents/${id}/result`, { method: "GET" }),
  async pageImage(id, page, variant) {
    const r = await fetch(`${BASE}/documents/${id}/pages/${page}/image?variant=${variant ?? "original"}`, { headers: authOnly() });
    if (r.status === 401) expired();
    if (!r.ok) throw new Error(String(r.status));
    return URL.createObjectURL(await r.blob());
  },
  submitDocument: (s) => call("/documents", { method: "POST", body: JSON.stringify(s) }),
  async approveRecord(recordId, officer) {
    await call(`/records/${recordId}/approve`, { method: "POST", body: JSON.stringify({ officer }) });
  },
};

let seq = 100;
export const demoApi: IntelliLandApi = {
  enabled: false,
  mode: "demo",
  session: () => null,
  health: async () => false,
  myDocuments: async () => [],
  getAudit: async () => [],
  getSummary: async () => { throw new Error("Backend not connected"); },
  async login() {
    return { role: "demo", mfaRequired: true };
  },
  async verifyMfa() {},
  async uploadFiles() {},
  async listParcels() {
    return [];
  },
  async myParcels() {
    return [];
  },
  async addParcel() {},
  async updateParcel() {},
  listUsers: async () => [],
  async createUser() {},
  async patchUser() {},
  verifyAuditChain: async () => ({ ok: true }),
  downloadFeedback: async () => "",
  exportRecord: async () => ({}),
  async requestInfo() {},
  async sendBack() {},
  async getValidation() {
    return [];
  },
  async rejectRecord() {},
  async fieldDecision() {},
  async recordCorrection() {},
  async processDocument() {},
  async listDocuments() {
    return [];
  },
  async getResult(): Promise<OcrResult> {
    throw new Error("Backend not connected");
  },
  async pageImage() {
    return "";
  },
  async requestOtp() {},
  async verifyOtp() {},
  async submitDocument(s) {
    seq += 1;
    return { ...s, id: `APP-2026-${seq}`, uploaded: new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) };
  },
  async approveRecord() {},
};

export const api: IntelliLandApi = import.meta.env.VITE_API_BASE ? httpApi : demoApi;

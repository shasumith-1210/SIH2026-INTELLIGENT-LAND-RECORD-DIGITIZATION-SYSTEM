export type Page =
  | "landing"
  | "landowner-login"
  | "landowner-dashboard"
  | "landowner-upload"
  | "landowner-track"
  | "landowner-record"
  | "landowner-map"
  | "officer-login"
  | "officer-2fa"
  | "officer-dashboard"
  | "officer-upload"
  | "officer-verify"
  | "officer-queue"
  | "officer-analytics"
  | "officer-audit"
  | "officer-validation"
  | "admin-dashboard"
  | "officer-records"
  | "officer-ocr"
  | "officer-gis";

export interface LandRecord {
  id: string;
  ownerName: string;
  surveyNo: string;
  khasraNo: string;
  khataNo: string;
  area: string;
  village: string;
  tehsil: string;
  district: string;
  state: string;
  classification: string;
  status: "pending" | "processing" | "verification" | "verified" | "rejected";
  uploadedAt: string;
  confidence?: number;
}

export interface ExtractedField {
  label: string;
  value: string;
  confidence: number;
  status: "high" | "mid" | "low";
}

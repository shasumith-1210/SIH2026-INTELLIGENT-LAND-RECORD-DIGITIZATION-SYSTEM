import { useEffect, useState } from "react";
import ModeBadge from "./components/ModeBadge";
import { AuditProvider } from "./store";
import { api, clearToken } from "./services/api";
import LiveOcr from "./pages/officer/LiveOcr";
import ParcelMap from "./pages/officer/ParcelMap";
import ValidationResults from "./pages/officer/ValidationResults";
import VerifiedRecords from "./pages/officer/VerifiedRecords";
import AdminDashboard from "./pages/admin/AdminDashboard";
import { Page } from "./types";

import LandingPage from "./pages/LandingPage";
import LandownerLogin from "./pages/landowner/LandownerLogin";
import LandownerDashboard from "./pages/landowner/LandownerDashboard";
import UploadDocuments from "./pages/landowner/UploadDocuments";
import TrackStatus from "./pages/landowner/TrackStatus";
import VerifiedRecord from "./pages/landowner/VerifiedRecord";
import GISMapView from "./pages/landowner/GISMapView";

import OfficerLogin from "./pages/officer/OfficerLogin";
import OfficerDashboard from "./pages/officer/OfficerDashboard";
import AIVerificationPage from "./pages/officer/AIVerificationPage";
import VerificationQueue from "./pages/officer/VerificationQueue";
import OfficerUpload from "./pages/officer/OfficerUpload";
import Analytics from "./pages/officer/Analytics";
import AuditTrail from "./pages/officer/AuditTrail";

import LandownerSidebar from "./components/LandownerSidebar";
import OfficerSidebar from "./components/OfficerSidebar";

const landownerPages: Page[] = ["landowner-dashboard", "landowner-upload", "landowner-track", "landowner-record", "landowner-map"];
const officerPages: Page[] = ["officer-dashboard", "officer-upload", "officer-verify", "officer-queue", "officer-analytics", "officer-audit", "officer-validation", "admin-dashboard", "officer-records", "officer-ocr", "officer-gis"];

export default function App() {
  return (
    <AuditProvider>
      <AppInner />
    </AuditProvider>
  );
}

function AppInner() {
  const [page, setPage] = useState<Page>(() => {
    const s = api.session();
    return s ? (s.role === "landowner" ? "landowner-dashboard" : s.role === "admin" ? "admin-dashboard" : "officer-dashboard") : "landing";
  });
  const [, force] = useState(0);

  const navigate = (p: Page) => setPage(p);
  const logout = () => { clearToken(); setPage("landing"); };
  useEffect(() => {
    const onExpired = () => { setPage("landing"); force((n) => n + 1); };
    window.addEventListener("il-auth-expired", onExpired);
    return () => window.removeEventListener("il-auth-expired", onExpired);
  }, []);

  // In backend mode every portal page needs a valid session with the right role; otherwise the login screen is shown instead.
  const s = api.session();
  const wantsLandowner = landownerPages.includes(page);
  const wantsOfficer = officerPages.includes(page);
  const allowed = !api.enabled || (wantsLandowner ? s?.role === "landowner" : wantsOfficer ? (page === "admin-dashboard" ? s?.role === "admin" : s?.role === "officer" || s?.role === "admin") : true);
  const shown: Page = allowed ? page : wantsLandowner ? "landowner-login" : "officer-login";
  const isLandowner = allowed && wantsLandowner;
  const isOfficer = allowed && wantsOfficer;

  if (isLandowner) {
    return (
      <div className="flex h-screen overflow-hidden">
        <ModeBadge />
        <LandownerSidebar current={page} navigate={navigate} onLogout={logout} />
        <div className="flex-1 overflow-hidden flex flex-col">
          <TopBar role="landowner" page={page} navigate={navigate} />
          <div className="flex-1 overflow-auto">
            {page === "landowner-dashboard" && <LandownerDashboard navigate={navigate} />}
            {page === "landowner-upload" && <UploadDocuments navigate={navigate} />}
            {page === "landowner-track" && <TrackStatus navigate={navigate} />}
            {page === "landowner-record" && <VerifiedRecord navigate={navigate} />}
            {page === "landowner-map" && <GISMapView navigate={navigate} />}
          </div>
        </div>
      </div>
    );
  }

  if (isOfficer) {
    return (
      <div className="flex h-full overflow-hidden">
        <ModeBadge />
        <OfficerSidebar current={page} navigate={navigate} onLogout={logout} />
        <div className="flex-1 overflow-hidden flex flex-col">
          <TopBar role="officer" page={page} navigate={navigate} />
          <div className="flex-1 overflow-auto flex flex-col">
            {page === "officer-dashboard" && <OfficerDashboard navigate={navigate} />}
            {page === "officer-upload" && <OfficerUpload navigate={navigate} />}
            {page === "officer-verify" && <AIVerificationPage navigate={navigate} />}
            {page === "officer-queue" && <VerificationQueue navigate={navigate} />}
            {page === "officer-analytics" && <Analytics navigate={navigate} />}
            {page === "officer-audit" && <AuditTrail navigate={navigate} />}
            {page === "officer-validation" && <ValidationResults navigate={navigate} />}
            {page === "officer-ocr" && <LiveOcr />}
            {page === "officer-gis" && <ParcelMap />}
            {page === "officer-records" && <VerifiedRecords navigate={navigate} />}
            {page === "admin-dashboard" && <AdminDashboard navigate={navigate} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {shown === "landing" && <LandingPage navigate={navigate} />}
      {shown === "landowner-login" && <LandownerLogin navigate={navigate} />}
      {shown === "officer-login" && <OfficerLogin navigate={navigate} />}
      {shown === "officer-2fa" && <OfficerLogin navigate={navigate} />}
      <ModeBadge />
    </div>
  );
}

function TopBar({ role, page, navigate }: { role: "landowner" | "officer"; page: Page; navigate: (p: Page) => void }) {
  const titles: Partial<Record<Page, string>> = {
    "landowner-dashboard": "Dashboard",
    "landowner-upload": "Upload Documents",
    "landowner-track": "Track Status",
    "landowner-record": "My Land Record",
    "landowner-map": "GIS Map View",
    "officer-dashboard": "Dashboard",
    "officer-upload": "Upload Historical Records",
    "officer-verify": "AI Verification",
    "officer-queue": "Verification Queue",
    "officer-analytics": "Analytics",
    "officer-audit": "Audit Trail",
    "officer-validation": "Validation",
    "admin-dashboard": "Administrator Dashboard",
    "officer-records": "Verified Records",
    "officer-ocr": "Live OCR Results",
    "officer-gis": "Parcel Map",
  };

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span>IntelliLand</span>
        <span className="text-gray-200">/</span>
        <span className={role === "officer" ? "text-amber-600 font-medium" : "text-blue-600 font-medium"}>{role === "officer" ? "Officer Portal" : "Landowner Portal"}</span>
        <span className="text-gray-200">/</span>
        <span className="text-[#0B2545] font-semibold">{titles[page]}</span>
      </div>
      <div className="flex items-center gap-3">
        {api.enabled && ["officer-analytics", "officer-upload", "landowner-record", "landowner-map"].includes(page) && (
          <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">Sample data: not connected to the backend</span>
        )}
        <button className="relative text-gray-400 hover:text-gray-600 transition-colors">
          <span className="text-lg">🔔</span>
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <div className="h-6 w-px bg-gray-100"></div>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${role === "officer" ? "bg-amber-500" : "bg-blue-600"}`}>
          {role === "officer" ? "AK" : "RS"}
        </div>
      </div>
    </header>
  );
}

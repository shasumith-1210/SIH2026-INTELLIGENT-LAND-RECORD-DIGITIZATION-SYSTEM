import { Page } from "../types";

interface Props {
  current: Page;
  navigate: (p: Page) => void;
  onLogout: () => void;
}

const navItems = [
  { page: "officer-dashboard" as Page, label: "Dashboard", icon: "⊞" },
  { page: "officer-upload" as Page, label: "Upload Records", icon: "↑" },
  { page: "officer-verify" as Page, label: "AI Verification", icon: "◈" },
  { page: "officer-queue" as Page, label: "Verification Queue", icon: "≡" },
  { page: "officer-ocr" as Page, label: "Live OCR (backend)", icon: "◎" },
  { page: "officer-gis" as Page, label: "Parcel Map (backend)", icon: "◫" },
  { page: "officer-records" as Page, label: "Verified Records", icon: "✓" },
  { page: "officer-validation" as Page, label: "Validation", icon: "⚑" },
  { page: "officer-analytics" as Page, label: "Analytics", icon: "⊿" },
  { page: "admin-dashboard" as Page, label: "Admin Dashboard", icon: "▣" },
  { page: "officer-audit" as Page, label: "Audit Trail", icon: "⊟" },
];

export default function OfficerSidebar({ current, navigate, onLogout }: Props) {
  return (
    <aside className="w-64 min-h-screen bg-[#0B2545] flex flex-col shrink-0">
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 bg-amber-500 rounded-md flex items-center justify-center text-white text-xs font-bold">IL</div>
          <span className="text-white font-bold text-base" style={{ fontFamily: "'DM Sans', sans-serif" }}>IntelliLand</span>
        </div>
        <span className="text-amber-400 text-xs font-medium uppercase tracking-widest">Officer Portal</span>
      </div>

      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-600 flex items-center justify-center text-white text-sm font-semibold">AK</div>
          <div>
            <p className="text-white text-sm font-medium">Amitabh Kumar</p>
            <p className="text-amber-300 text-xs">Digitization Officer · L2</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span className="text-green-400 text-xs">2FA Active</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.page}
            onClick={() => navigate(item.page)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm nav-item text-left ${
              current === item.page
                ? "bg-amber-600/90 text-white font-medium"
                : "text-blue-100/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
            {item.page === "officer-queue" && (
              <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">7</span>
            )}
          </button>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <div className="px-3 py-2">
          <p className="text-blue-300/60 text-xs uppercase tracking-widest mb-1">District</p>
          <p className="text-blue-100 text-sm font-medium">Lucknow, UP</p>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-blue-100/70 hover:bg-white/10 hover:text-white nav-item"
        >
          <span>⇤</span> Sign Out
        </button>
      </div>
    </aside>
  );
}

import { Page } from "../types";

interface Props {
  current: Page;
  navigate: (p: Page) => void;
  onLogout: () => void;
}

const navItems = [
  { page: "landowner-dashboard" as Page, label: "Dashboard", icon: "⊞" },
  { page: "landowner-upload" as Page, label: "Upload Documents", icon: "↑" },
  { page: "landowner-track" as Page, label: "Track Status", icon: "◎" },
  { page: "landowner-record" as Page, label: "My Land Record", icon: "☑" },
  { page: "landowner-map" as Page, label: "GIS Map View", icon: "⊙" },
];

export default function LandownerSidebar({ current, navigate, onLogout }: Props) {
  return (
    <aside className="w-64 h-screen sticky top-0 bg-[#0B2545] flex flex-col shrink-0">
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 bg-blue-500 rounded-md flex items-center justify-center text-white text-xs font-bold">IL</div>
          <span className="text-white font-bold text-base" style={{ fontFamily: "'DM Sans', sans-serif" }}>IntelliLand</span>
        </div>
        <span className="text-blue-300 text-xs font-medium uppercase tracking-widest">Landowner Portal</span>
      </div>

      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">RS</div>
          <div>
            <p className="text-white text-sm font-medium">Rajesh Sharma</p>
            <p className="text-blue-300 text-xs">ID: LO-2024-00441</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.page}
            onClick={() => navigate(item.page)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm nav-item text-left ${
              current === item.page
                ? "bg-blue-600 text-white font-medium"
                : "text-blue-100/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto px-3 py-4 border-t border-white/10">
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

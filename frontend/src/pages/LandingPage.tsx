import { Page } from "../types";

interface Props {
  navigate: (p: Page) => void;
}

export default function LandingPage({ navigate }: Props) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #0B2545 0%, #1A3A6B 50%, #0B2545 100%)" }}>
      {/* Header */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">IL</div>
          <div>
            <span className="text-white font-bold text-xl" style={{ fontFamily: "'DM Sans', sans-serif" }}>IntelliLand</span>
            <span className="text-blue-300 text-xs ml-3 font-medium">भूमि अभिलेख डिजिटलीकरण प्रणाली</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-blue-200">Ministry of Land Resources, GoI</span>
          <div className="h-4 w-px bg-white/20"></div>
          <span className="text-blue-300 text-xs">v2.4.1</span>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-16 animate-fadeIn">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-blue-600/30 border border-blue-400/30 rounded-full px-4 py-1.5 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-blue-200 text-xs font-medium uppercase tracking-widest">AI-Powered · OCR + GIS · Secure</span>
          </div>
          <h1 className="text-5xl font-extrabold text-white mb-4 leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Land Record Digitization
            <br />
            <span className="text-blue-300">&amp; Validation System</span>
          </h1>
          <p className="text-blue-200/80 text-lg max-w-2xl mx-auto leading-relaxed">
            Transforming India's land administration through AI-driven OCR, intelligent validation,
            and seamless GIS integration for transparent, tamper-proof land records.
          </p>
        </div>

        {/* Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
          {/* Landowner Card */}
          <button
            onClick={() => navigate("landowner-login")}
            className="group bg-white/10 hover:bg-white/15 border border-white/20 hover:border-blue-400/50 rounded-2xl p-8 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
          >
            <div className="w-14 h-14 bg-blue-500/30 border border-blue-400/40 rounded-xl flex items-center justify-center mb-5 group-hover:bg-blue-500/50 transition-colors">
              <span className="text-3xl">🏠</span>
            </div>
            <h2 className="text-white text-2xl font-bold mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>Landowner Portal</h2>
            <p className="text-blue-200/70 text-sm leading-relaxed mb-6">
              Upload your land documents, track verification status, and access your verified digital land records with GIS map view.
            </p>
            <div className="space-y-2 mb-6">
              {["Upload & Track Documents", "View Verification Status", "Download Certified Records", "GIS Property Map"].map((f) => (
                <div key={f} className="flex items-center gap-2 text-blue-200/80 text-sm">
                  <span className="text-green-400 text-xs">✓</span> {f}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-blue-300 text-sm font-medium group-hover:text-white transition-colors">
              <span>Enter Portal</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>

          {/* Officer Card */}
          <button
            onClick={() => navigate("officer-login")}
            className="group bg-white/10 hover:bg-white/15 border border-white/20 hover:border-amber-400/50 rounded-2xl p-8 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
          >
            <div className="w-14 h-14 bg-amber-500/30 border border-amber-400/40 rounded-xl flex items-center justify-center mb-5 group-hover:bg-amber-500/50 transition-colors">
              <span className="text-3xl">🛡️</span>
            </div>
            <h2 className="text-white text-2xl font-bold mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>Officer Portal</h2>
            <p className="text-blue-200/70 text-sm leading-relaxed mb-6">
              Digitize historical land records with AI-powered OCR, validate extracted data, manage verification queue, and generate reports.
            </p>
            <div className="space-y-2 mb-6">
              {["AI OCR + Data Extraction", "Confidence Score Review", "Duplicate Detection", "Analytics & Audit Trail"].map((f) => (
                <div key={f} className="flex items-center gap-2 text-blue-200/80 text-sm">
                  <span className="text-amber-400 text-xs">✓</span> {f}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-amber-300 text-sm font-medium group-hover:text-white transition-colors">
              <span>Secure Access</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>
        </div>

        {/* Stats Bar */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10">
          {[
            { label: "Records Digitized", value: "1.24 Cr" },
            { label: "States Covered", value: "28" },
            { label: "AI Accuracy", value: "97.3%" },
            { label: "Avg. Processing", value: "4.2 hrs" },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 px-8 py-5 text-center">
              <p className="text-white text-2xl font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>{s.value}</p>
              <p className="text-blue-300/70 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="px-8 py-4 text-center text-blue-400/50 text-xs border-t border-white/5">
        IntelliLand · National Land Records Modernisation Programme (NLRMP) · Government of India
      </footer>
    </div>
  );
}

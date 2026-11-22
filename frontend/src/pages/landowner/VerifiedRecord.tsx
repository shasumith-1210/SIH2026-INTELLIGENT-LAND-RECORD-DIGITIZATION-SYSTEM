import { Page } from "../../types";

interface Props {
  navigate: (p: Page) => void;
}

export default function VerifiedRecord({ navigate }: Props) {
  return (
    <div className="flex-1 overflow-auto bg-[#F0F4FA] p-8">
      <div className="max-w-3xl mx-auto animate-fadeIn">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2545]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Verified Land Record</h1>
            <p className="text-gray-500 text-sm mt-1">Government-certified digital land record with blockchain hash.</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 border border-gray-200 bg-white text-gray-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              📤 Share
            </button>
            <button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
              📥 Download PDF
            </button>
          </div>
        </div>

        {/* Certificate */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-green-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0B2545] to-[#1A3A6B] px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">IL</div>
              <div>
                <p className="text-white font-bold">IntelliLand · Digital Land Certificate</p>
                <p className="text-blue-300 text-xs">Government of Uttar Pradesh · NLRMP</p>
              </div>
            </div>
            <div className="text-right">
              <div className="badge-verified text-xs px-3 py-1.5 rounded-full font-bold">✓ VERIFIED & CERTIFIED</div>
              <p className="text-blue-200/60 text-xs mt-1">28 Aug 2024</p>
            </div>
          </div>

          {/* Watermark area */}
          <div className="relative px-8 py-6">
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
              <p className="text-9xl font-black text-green-600 rotate-[-30deg] uppercase tracking-widest">VERIFIED</p>
            </div>

            {/* Record fields */}
            <div className="relative z-10">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6">
                {[
                  { label: "Owner Name", value: "Rajesh Kumar Sharma" },
                  { label: "Survey Number", value: "142/A" },
                  { label: "Khasra Number", value: "87-K" },
                  { label: "Khata Number", value: "KH-2241" },
                  { label: "Total Area", value: "2.4 Bigha (0.48 Hectares)" },
                  { label: "Land Classification", value: "Agricultural · Irrigated" },
                  { label: "Village", value: "Mohanlalganj" },
                  { label: "Tehsil", value: "Sarojini Nagar" },
                  { label: "District", value: "Lucknow" },
                  { label: "State", value: "Uttar Pradesh" },
                ].map((f) => (
                  <div key={f.label} className="border-b border-gray-100 pb-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{f.label}</p>
                    <p className="text-sm font-semibold text-[#0B2545]">{f.value}</p>
                  </div>
                ))}
              </div>

              {/* Boundaries */}
              <div className="bg-blue-50 rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Property Boundaries</p>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { dir: "North", value: "Government Road" },
                    { dir: "South", value: "Survey No. 142/B" },
                    { dir: "East", value: "Canal (Sai Nadi)" },
                    { dir: "West", value: "Rajendra Singh (KH-2240)" },
                  ].map((b) => (
                    <div key={b.dir} className="text-center">
                      <p className="text-xs text-blue-500 font-medium">{b.dir}</p>
                      <p className="text-xs text-blue-800 mt-0.5">{b.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Blockchain hash */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Blockchain Verification Hash</p>
                    <p className="mono text-xs text-gray-600 break-all">0x4a3b2c1d...f8e7d6c5b4a3 · Block #14728491 · Ethereum Mainnet</p>
                  </div>
                  <div className="text-green-500 text-2xl ml-4">🔐</div>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-100">
                {[
                  { role: "Digitization Officer", name: "Amitabh Kumar", id: "DO-UP-0241" },
                  { role: "Tehsildar", name: "Priya Singh", id: "TSL-LKO-012" },
                  { role: "District Collector", name: "Suresh Yadav IAS", id: "DC-LKO-2024" },
                ].map((s) => (
                  <div key={s.role} className="text-center">
                    <div className="h-10 border-b border-gray-300 mb-1" style={{ fontFamily: "cursive" }}>
                      <span className="text-gray-400 text-lg">{s.name}</span>
                    </div>
                    <p className="text-xs font-semibold text-[#0B2545]">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.role}</p>
                    <p className="mono text-xs text-gray-300">{s.id}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button onClick={() => navigate("landowner-map")} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium">
            🗺️ View on GIS Map →
          </button>
          <p className="text-xs text-gray-400">Certificate ID: CERT-UP-LKO-2024-142A · Valid indefinitely</p>
        </div>
      </div>
    </div>
  );
}

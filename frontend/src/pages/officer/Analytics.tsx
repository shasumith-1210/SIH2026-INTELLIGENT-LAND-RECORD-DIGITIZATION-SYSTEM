import { Page } from "../../types";

interface Props {
  navigate: (p: Page) => void;
}

const weeklyData = [
  { day: "Mon", processed: 142, verified: 118, errors: 12 },
  { day: "Tue", processed: 167, verified: 141, errors: 8 },
  { day: "Wed", processed: 203, verified: 188, errors: 6 },
  { day: "Thu", processed: 178, verified: 161, errors: 14 },
  { day: "Fri", processed: 219, verified: 198, errors: 9 },
  { day: "Sat", processed: 98, verified: 87, errors: 5 },
  { day: "Sun", processed: 44, verified: 38, errors: 3 },
];

const maxVal = 250;
const barH = 120;

const districtData = [
  { name: "Lucknow", count: 342, pct: 85 },
  { name: "Varanasi", count: 287, pct: 72 },
  { name: "Agra", count: 241, pct: 60 },
  { name: "Kanpur", count: 198, pct: 50 },
  { name: "Allahabad", count: 176, pct: 44 },
  { name: "Mathura", count: 143, pct: 36 },
];

export default function Analytics({ navigate: _navigate }: Props) {
  return (
    <div className="flex-1 overflow-auto bg-[#F0F4FA] p-8">
      <div className="max-w-6xl mx-auto animate-fadeIn">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2545]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Analytics</h1>
            <p className="text-gray-500 text-sm mt-1">Processing performance and digitization metrics · Lucknow District</p>
          </div>
          <div className="flex gap-2">
            {["Week", "Month", "Quarter"].map((p) => (
              <button key={p} className={`px-3 py-1.5 text-xs rounded-lg border font-medium ${p === "Week" ? "bg-[#0B2545] text-white border-[#0B2545]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{p}</button>
            ))}
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Records Processed", value: "1,051", sub: "This week", icon: "📄", trend: "+12.4%", up: true },
            { label: "Verified", value: "931", sub: "88.6% of processed", icon: "✅", trend: "+8.1%", up: true },
            { label: "AI Accuracy", value: "97.3%", sub: "Avg confidence score", icon: "🤖", trend: "+0.4%", up: true },
            { label: "Errors / Rejected", value: "57", sub: "Needs re-digitization", icon: "⚠️", trend: "-6.2%", up: false },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl">{k.icon}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${k.up ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"}`}>{k.trend}</span>
              </div>
              <p className="text-2xl font-bold text-[#0B2545]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{k.value}</p>
              <p className="text-xs text-gray-400 mt-1">{k.label}</p>
              <p className="text-xs text-gray-300 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* Bar chart */}
          <div className="col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-[#0B2545]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Weekly Processing Volume</h3>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block"></span>Processed</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block"></span>Verified</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block"></span>Errors</span>
              </div>
            </div>
            <div className="flex items-end justify-around gap-2" style={{ height: `${barH + 20}px` }}>
              {weeklyData.map((d) => (
                <div key={d.day} className="flex flex-col items-center gap-1 flex-1">
                  <div className="flex items-end gap-0.5 justify-center" style={{ height: `${barH}px` }}>
                    <div className="w-4 bg-blue-600 rounded-t-sm transition-all hover:opacity-90" style={{ height: `${(d.processed / maxVal) * barH}px` }} title={`${d.processed}`}></div>
                    <div className="w-4 bg-green-500 rounded-t-sm transition-all hover:opacity-90" style={{ height: `${(d.verified / maxVal) * barH}px` }} title={`${d.verified}`}></div>
                    <div className="w-4 bg-red-400 rounded-t-sm transition-all hover:opacity-90" style={{ height: `${(d.errors / maxVal) * barH}px` }} title={`${d.errors}`}></div>
                  </div>
                  <span className="text-xs text-gray-400">{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Confidence distribution */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-[#0B2545] mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>AI Confidence Distribution</h3>
            <div className="space-y-3">
              {[
                { range: "≥ 90%", count: 614, pct: 58, color: "bg-green-500", label: "High" },
                { range: "75–89%", count: 288, pct: 27, color: "bg-blue-500", label: "Good" },
                { range: "60–74%", count: 96, pct: 9, color: "bg-amber-500", label: "Review" },
                { range: "< 60%", count: 53, pct: 5, color: "bg-red-500", label: "Error" },
              ].map((r) => (
                <div key={r.range}>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span className="font-medium">{r.range} <span className="text-gray-300">·</span> {r.label}</span>
                    <span className="font-semibold text-[#0B2545]">{r.count} <span className="text-gray-400 font-normal">({r.pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${r.color} rounded-full`} style={{ width: `${r.pct}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <p className="text-2xl font-bold text-green-600" style={{ fontFamily: "'DM Sans', sans-serif" }}>97.3%</p>
              <p className="text-xs text-gray-400">Average AI Accuracy</p>
            </div>
          </div>
        </div>

        {/* District breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-[#0B2545] mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>Digitization Progress by District</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {districtData.map((d) => (
              <div key={d.name}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-[#0B2545]">{d.name}</span>
                  <span className="text-gray-500">{d.count} records · <span className="font-semibold text-[#0B2545]">{d.pct}%</span></span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all" style={{ width: `${d.pct}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Page } from "../../types";

interface Props {
  navigate: (p: Page) => void;
}

export default function OfficerUpload({ navigate }: Props) {
  const [files, setFiles] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const handleUpload = () => {
    if (!files.length) return;
    setProcessing(true);
    let p = 0;
    const interval = setInterval(() => {
      p += 4;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setDone(true);
        setProcessing(false);
      }
    }, 80);
  };

  return (
    <div className="flex-1 overflow-auto bg-[#F0F4FA] p-8">
      <div className="max-w-3xl mx-auto animate-fadeIn">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0B2545]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Upload Historical Records</h1>
          <p className="text-gray-500 text-sm mt-1">Upload scanned historical/physical land records for AI-powered OCR and digitization.</p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-[#0B2545] mb-4">📋 Batch Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Batch Name</label>
                <input type="text" placeholder="e.g. Varanasi-Khasra-1990-Batch3" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Record Year Range</label>
                <input type="text" placeholder="e.g. 1980–1995" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">District</label>
                <input type="text" placeholder="e.g. Varanasi" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Record Type</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                  <option>Khasra Register</option>
                  <option>Khatauni Register</option>
                  <option>Jamabandi</option>
                  <option>Sale Deed</option>
                  <option>Mutation Register</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-[#0B2545] mb-4">📎 Upload Scanned Documents</h3>
            <div
              className="border-2 border-dashed border-gray-200 hover:border-amber-400 rounded-xl p-10 text-center transition-all"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); Array.from(e.dataTransfer.files).forEach((f) => setFiles(prev => [...prev, f.name])); }}
            >
              <div className="text-4xl mb-3">🗂️</div>
              <p className="font-semibold text-[#0B2545] mb-1">Drag & drop scanned records here</p>
              <p className="text-gray-400 text-sm mb-4">PDF, JPG, PNG, TIFF · Max 50MB per file · Batch upload supported</p>
              <div className="flex items-center gap-3 justify-center">
                <label className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors">
                  Browse Files
                  <input type="file" className="hidden" multiple onChange={(e) => Array.from(e.target.files || []).forEach((f) => setFiles(prev => [...prev, f.name]))} />
                </label>
                <button onClick={() => setFiles(["Varanasi_Khasra_Reg_1990_p1.pdf", "Varanasi_Khasra_Reg_1990_p2.pdf", "Varanasi_Khasra_Reg_1990_p3.pdf"])} className="border border-gray-200 text-gray-600 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Load Demo Files
                </button>
              </div>
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-4 py-2.5">
                    <div className="flex items-center gap-2 text-sm">
                      <span>📄</span>
                      <span className="text-[#0B2545] font-medium">{f}</span>
                    </div>
                    <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500 text-sm">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Settings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-[#0B2545] mb-4">🤖 AI Processing Options</h3>
            <div className="space-y-3">
              {[
                { id: "ocr", label: "Enable AI OCR + Handwriting Recognition", def: true },
                { id: "dup", label: "Run Duplicate Detection", def: true },
                { id: "validate", label: "Auto-validate extracted fields", def: true },
                { id: "map", label: "GIS Coordinate Mapping (if boundary data available)", def: false },
              ].map((opt) => (
                <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" defaultChecked={opt.def} className="w-4 h-4 accent-amber-500" />
                  <span className="text-sm text-gray-700 group-hover:text-[#0B2545]">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {processing && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 animate-fadeIn">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-blue-700">🤖 AI OCR Processing...</p>
                <span className="mono text-sm font-bold text-blue-700">{progress}%</span>
              </div>
              <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all duration-200" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="text-xs text-blue-500 mt-1">Extracting text from {files.length} documents...</p>
            </div>
          )}

          {done && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-green-700">✅ Processing Complete</p>
                  <p className="text-xs text-green-600 mt-0.5">{files.length} documents processed · Added to verification queue</p>
                </div>
                <button onClick={() => navigate("officer-queue")} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                  View Queue →
                </button>
              </div>
            </div>
          )}

          {!done && (
            <button
              onClick={handleUpload}
              disabled={files.length === 0 || processing}
              className="w-full bg-[#0B2545] hover:bg-[#1A3A6B] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-semibold text-sm transition-colors"
            >
              {processing ? "Processing..." : "Start AI OCR Processing →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

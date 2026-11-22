import { useState } from "react";
import { Page } from "../../types";
import { api } from "../../services/api";

interface Props {
  navigate: (p: Page) => void;
}

export default function OfficerLogin({ navigate }: Props) {
  const [step, setStep] = useState<"credentials" | "2fa">("credentials");
  const [creds, setCreds] = useState({ id: "", password: "" });
  const [role, setRole] = useState<"officer" | "admin">("officer");
  const [err, setErr] = useState("");
  const signIn = async () => {
    setErr("");
    try {
      const { role: r, mfaRequired } = await api.login(creds.id, creds.password);
      if (api.enabled && r !== (role === "admin" ? "admin" : "officer")) return setErr("This account does not have the selected role.");
      if (api.enabled && !mfaRequired) return navigate(role === "admin" ? "admin-dashboard" : "officer-dashboard");
      setStep("2fa");
    } catch {
      setErr("Sign-in failed. Check your credentials.");
    }
  };
  const [otp, setOtp] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);

  const handleDigit = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otpDigits];
    next[i] = val.slice(-1);
    setOtpDigits(next);
    if (val && i < 5) {
      const el = document.getElementById(`otp-${i + 1}`);
      el?.focus();
    }
  };

  if (step === "2fa") {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "linear-gradient(135deg, #0B2545 0%, #1A3A6B 60%, #0B2545 100%)" }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fadeIn">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">🛡️</div>
            <h2 className="text-2xl font-bold text-[#0B2545]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Two-Factor Authentication</h2>
            <p className="text-gray-500 text-sm mt-1">Enter the 6-digit code from your authenticator app</p>
          </div>

          <div className="flex gap-2 justify-center mb-6">
            {otpDigits.map((d, i) => (
              <input
                key={i}
                id={`otp-${i}`}
                type="text"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigit(i, e.target.value)}
                className="w-11 h-12 border-2 border-gray-200 rounded-lg text-center text-lg font-bold mono focus:outline-none focus:border-amber-500 transition-colors"
              />
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-6 text-sm text-amber-700 text-center">
            Officer ID: <span className="font-mono font-bold">AK-DO-UP-2241</span> · TOTP verified via Authenticator App
          </div>

          {err && <p className="text-sm text-red-300 mb-3">{err}</p>}
          {!api.enabled && <p className="text-xs text-blue-300 mb-3">Demo mode: any code is accepted.</p>}
          <button
            onClick={async () => {
              try {
                await api.verifyMfa(otpDigits.join(""));
                navigate(role === "admin" ? "admin-dashboard" : "officer-dashboard");
              } catch {
                setErr("Invalid authentication code.");
              }
            }}
            className="w-full bg-[#0B2545] hover:bg-[#1A3A6B] text-white py-3 rounded-xl font-semibold text-sm transition-colors"
          >
            Verify & Sign In
          </button>

          <button onClick={() => setStep("credentials")} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-3">
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #0B2545 0%, #1A3A6B 60%, #0B2545 100%)" }}>
      {/* Left */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-14 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-72 h-72 rounded-full border border-white"></div>
          <div className="absolute bottom-10 left-10 w-44 h-44 rounded-full border border-white"></div>
        </div>
        <div>
          <button onClick={() => navigate("landing")} className="flex items-center gap-2 text-blue-300 hover:text-white text-sm mb-14 transition-colors">← Back to Portal</button>
          <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white font-bold text-lg mb-4">IL</div>
          <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Secure Officer<br /><span className="text-amber-300">Access Portal</span>
          </h1>
          <p className="text-blue-200/70 text-base leading-relaxed">
            Government-grade secure access with mandatory 2FA for all digitization officers and administrators.
          </p>
        </div>
        <div className="space-y-3">
          {[
            { icon: "🔐", text: "Multi-factor authentication required" },
            { icon: "📋", text: "Full audit trail on all actions" },
            { icon: "⚡", text: "AI-assisted OCR and validation" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 text-blue-200/80 text-sm">
              <span>{item.icon}</span> {item.text}
            </div>
          ))}
          <div className="mt-4 p-3 bg-red-500/20 border border-red-400/30 rounded-xl">
            <p className="text-red-300 text-xs font-medium">⚠️ Restricted Access · Government Personnel Only</p>
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fadeIn">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">🛡️</div>
              <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">Officer Portal Login</span>
            </div>
            <h2 className="text-2xl font-bold text-[#0B2545]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Sign In</h2>
            <p className="text-gray-400 text-sm">Digitization & Verification Officer Access</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Officer ID / Employee Number</label>
              <input
                type="text"
                placeholder="e.g. AK-DO-UP-2241"
                value={creds.id}
                onChange={(e) => setCreds({ ...creds, id: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Password</label>
              <input
                type="password"
                placeholder="••••••••••"
                value={creds.password}
                onChange={(e) => setCreds({ ...creds, password: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
              <span className="text-xl">🔐</span>
              <div>
                <p className="text-xs font-semibold text-amber-800">2FA Required</p>
                <p className="text-xs text-amber-600">You'll need your authenticator app after login</p>
              </div>
            </div>

            {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
            <div className="flex gap-2 mb-4">
              {(["officer", "admin"] as const).map((r) => (
                <button key={r} type="button" onClick={() => setRole(r)} className={`flex-1 py-2 rounded-lg text-sm font-medium border ${role === r ? "bg-[#0B2545] text-white border-[#0B2545]" : "border-gray-200 text-gray-500"}`}>
                  {r === "officer" ? "Digitisation Officer" : "Administrator"}
                </button>
              ))}
            </div>
            <button
              onClick={signIn}
              className="w-full bg-[#0B2545] hover:bg-[#1A3A6B] text-white py-3 rounded-xl font-semibold text-sm transition-colors"
            >
              Continue to 2FA →
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-center text-gray-400">
              🔒 Session logged · IP recorded · Activity monitored<br />
              Unauthorized access is a criminal offense under IT Act 2000
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

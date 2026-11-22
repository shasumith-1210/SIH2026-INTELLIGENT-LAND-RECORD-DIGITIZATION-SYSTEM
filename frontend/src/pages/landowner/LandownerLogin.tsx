import { useState } from "react";
import { api } from "../../services/api";
import { Page } from "../../types";

interface Props {
  navigate: (p: Page) => void;
}

export default function LandownerLogin({ navigate }: Props) {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({ aadhaar: "", phone: "", otp: "", name: "", email: "" });
  const [otpSent, setOtpSent] = useState(false);
  const [err, setErr] = useState("");
  const sendOtp = async () => {
    setErr("");
    try {
      await api.requestOtp(form.phone);
      setOtpSent(true);
    } catch {
      setErr("Could not send the code. Check the phone number and try again.");
    }
  };
  const verify = async () => {
    setErr("");
    try {
      await api.verifyOtp(form.phone, form.otp);
      navigate("landowner-dashboard");
    } catch {
      setErr("Invalid or expired code.");
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #0B2545 0%, #1A3A6B 60%, #0B2545 100%)" }}>
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-14 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full border border-white"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full border border-white"></div>
          <div className="absolute top-1/2 left-1/3 w-20 h-20 rounded-full border border-white"></div>
        </div>
        <div>
          <button onClick={() => navigate("landing")} className="flex items-center gap-2 text-blue-300 hover:text-white text-sm mb-14 transition-colors">
            ← Back to Portal
          </button>
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-lg mb-4">IL</div>
          <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Your Land Records,<br />Secured & Verified
          </h1>
          <p className="text-blue-200/70 text-base leading-relaxed">
            Access your property documents online — verified by AI and certified by the government.
          </p>
        </div>
        <div className="space-y-4">
          {[
            { icon: "🔐", text: "Aadhaar-linked secure login" },
            { icon: "📄", text: "Upload and track land documents" },
            { icon: "✅", text: "Government-certified digital records" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 text-blue-200/80 text-sm">
              <span className="text-lg">{item.icon}</span> {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fadeIn">
          <div className="flex mb-6 bg-gray-100 rounded-xl p-1">
            {(api.enabled ? (["login"] as const) : (["login", "signup"] as const)).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t ? "bg-white text-[#0B2545] shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <h2 className="text-2xl font-bold text-[#0B2545] mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {tab === "login" ? "Welcome back" : "Create account"}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {tab === "login" ? "Sign in to access your land records" : "Register to upload and track your land documents"}
          </p>

          <div className="space-y-4">
            {tab === "signup" && (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Full Name</label>
                  <input
                    type="text"
                    placeholder="As per Aadhaar Card"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Email Address</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}

            {!api.enabled && (<div>
              <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Aadhaar Number</label>
              <input
                type="text"
                placeholder="XXXX XXXX XXXX"
                value={form.aadhaar}
                onChange={(e) => setForm({ ...form, aadhaar: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mono"
              />
            </div>)}

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Mobile Number</label>
              <div className="flex gap-2">
                <span className="border border-gray-200 rounded-lg px-3 py-3 text-sm text-gray-500 bg-gray-50">+91</span>
                <input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="flex-1 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {!otpSent && (
                  <button
                    onClick={sendOtp}
                    className="px-4 py-3 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
                  >
                    Get OTP
                  </button>
                )}
              </div>
            </div>

            {otpSent && (
              <div className="animate-fadeIn">
                <label className="text-xs font-medium text-gray-600 mb-1 block uppercase tracking-wide">Enter OTP</label>
                <input
                  type="text"
                  placeholder="6-digit OTP sent to your mobile"
                  value={form.otp}
                  onChange={(e) => setForm({ ...form, otp: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mono tracking-widest"
                  maxLength={6}
                />
                <p className="text-xs text-gray-400 mt-1">OTP valid for 5 minutes · <button className="text-blue-600 hover:underline">Resend</button></p>
              </div>
            )}

            {err && <p className="text-sm text-red-600">{err}</p>}
            <button
              onClick={verify}
              className="w-full bg-[#0B2545] hover:bg-[#1A3A6B] text-white py-3 rounded-xl font-semibold text-sm transition-colors mt-2"
            >
              {tab === "login" ? "Sign In Securely" : "Create Account"}
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            🔒 Secure sign-in with one-time passcode
          </p>
        </div>
      </div>
    </div>
  );
}

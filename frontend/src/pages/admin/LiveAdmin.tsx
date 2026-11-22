import { useState } from "react";
import { api } from "../../services/api";
import { useLoad } from "../../hooks";

// Every number and table here comes from the backend. Nothing is sample data.
const Bars = ({ rows, max, unit = "" }: { rows: { label: string; value: number }[]; max: number; unit?: string }) => (
  <div className="space-y-2.5">
    {rows.length === 0 && <p className="text-sm text-gray-400">No data yet.</p>}
    {rows.map((r) => (
      <div key={r.label} className="flex items-center gap-3 text-sm">
        <span className="w-36 text-gray-500 truncate">{r.label}</span>
        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#1B6B4A] rounded-full" style={{ width: `${Math.min(100, (r.value / Math.max(max, 1)) * 100)}%` }} /></div>
        <span className="mono text-xs text-gray-600 w-14 text-right">{r.value}{unit}</span>
      </div>
    ))}
  </div>
);
const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-5"><h3 className="text-sm font-semibold text-[#0B2545] mb-4">{title}</h3>{children}</div>
);
const rows = (o: Record<string, number> | undefined) => Object.entries(o ?? {}).map(([label, value]) => ({ label, value }));

export default function LiveAdmin() {
  const sum = useLoad(() => api.getSummary());
  const users = useLoad(() => api.listUsers());
  const [msg, setMsg] = useState("");
  const [nu, setNu] = useState({ username: "", password: "", role: "officer" });
  const S = sum.data;
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setMsg("");
    try { await fn(); setMsg(ok); users.reload(); sum.reload(); } catch (e) { setMsg(`Failed: ${(e as Error).message}`); }
  };
  const verify = async () => {
    try { const r = await api.verifyAuditChain(); setMsg(r.ok ? `Audit log intact (${r.entries ?? 0} entries verified)` : `Audit log TAMPERING detected at ${r.broken_at}`); } catch (e) { setMsg(`Failed: ${(e as Error).message}`); }
  };
  const feedback = async () => {
    try { const a = document.createElement("a"); a.href = await api.downloadFeedback(); a.download = "officer_feedback.jsonl"; a.click(); } catch (e) { setMsg(`Failed: ${(e as Error).message}`); }
  };
  const stats = [
    ["Documents received", S?.received], ["Officer-verified", S?.officer_verified], ["Pending", S?.pending],
    ["Avg. OCR confidence", S?.avg_confidence != null ? `${S.avg_confidence}%` : "—"],
    ["Officer correction rate", S?.correction_rate != null ? `${(S.correction_rate * 100).toFixed(1)}%` : "—"],
  ];
  return (
    <div className="flex-1 overflow-auto bg-[#F0F4FA] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div><h1 className="text-2xl font-bold text-[#0B2545]">Administrator Dashboard</h1><p className="text-sm text-gray-500 mt-1">Live system overview. Correction rate = officer corrections per extracted field, a real proxy for extraction accuracy.</p></div>
          <span className="text-xs font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full">Live backend data</span>
        </div>
        {sum.error && <p className="text-sm text-red-600 mb-3">Could not load the summary: {sum.error}</p>}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {stats.map(([l, v]) => <div key={String(l)} className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-xs text-gray-400">{l}</p><p className="text-2xl font-bold text-[#0B2545]">{v ?? "…"}</p></div>)}
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card title="Documents by status"><Bars rows={rows(S?.by_status)} max={S?.received ?? 1} /></Card>
          <Card title="Uploads per day (last 14 days)"><Bars rows={rows(S?.per_day)} max={Math.max(...Object.values(S?.per_day ?? { x: 1 }))} /></Card>
          <Card title="Documents by district"><Bars rows={rows(S?.by_district)} max={S?.received ?? 1} /></Card>
          <Card title="Officer actions (approve, reject, correct)"><Bars rows={rows(S?.officer_actions)} max={Math.max(...Object.values(S?.officer_actions ?? { x: 1 }))} /></Card>
          <Card title="Average OCR confidence by field"><Bars rows={rows(S?.field_confidence)} max={100} unit="%" /></Card>
          <Card title="Validation findings by category (warnings and failures)"><Bars rows={rows(S?.findings)} max={Math.max(...Object.values(S?.findings ?? { x: 1 }))} /></Card>
          <Card title="Confidence-based routing"><Bars rows={[{ label: "First-pass eligible", value: S?.routes?.first_pass_eligible ?? 0 }, { label: "Officer queue", value: S?.routes?.officer_queue ?? 0 }]} max={Math.max(S?.routes?.first_pass_eligible ?? 0, S?.routes?.officer_queue ?? 0, 1)} /></Card>
          <Card title="Integrity and feedback data">
            <div className="flex flex-wrap gap-2">
              <button onClick={verify} className="border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold">Verify audit log integrity</button>
              <button onClick={feedback} className="border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold">Download officer feedback (.jsonl)</button>
            </div>
            <p className="text-xs text-gray-400 mt-3">Feedback is labelled correction data for future model training. No automatic retraining is implemented.</p>
          </Card>
        </div>
        <Card title="User and role management">
          {msg && <p className="text-sm text-gray-700 mb-3">{msg}</p>}
          <table className="w-full text-sm mb-4">
            <thead><tr className="text-left text-xs text-gray-400"><th className="pb-2">User</th><th>Role</th><th>2FA</th><th>Status</th><th /></tr></thead>
            <tbody>
              {(users.data ?? []).map((u) => (
                <tr key={u.username} className="border-t border-gray-100">
                  <td className="py-2.5 font-medium text-[#0B2545]">{u.username}</td>
                  <td><select value={u.role} onChange={(e) => run(() => api.patchUser(u.username, { role: e.target.value }), `Role updated for ${u.username}`)} className="border border-gray-200 rounded-lg px-2 py-1 text-sm"><option value="officer">officer</option><option value="admin">admin</option></select></td>
                  <td className="text-xs">{u.has_2fa ? "on" : "off"}</td>
                  <td className="text-xs">{u.active ? (u.locked ? "locked" : "active") : "disabled"}</td>
                  <td className="text-right space-x-2">
                    <button onClick={() => run(() => api.patchUser(u.username, { active: !u.active }), `${u.username} ${u.active ? "disabled" : "enabled"}`)} className="text-xs text-blue-600">{u.active ? "Disable" : "Enable"}</button>
                    <button onClick={() => { const p = prompt(`New password for ${u.username} (min 10 characters)`); if (p) run(() => api.patchUser(u.username, { password: p }), `Password reset for ${u.username}`); }} className="text-xs text-blue-600">Reset password</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2">
            <input value={nu.username} onChange={(e) => setNu({ ...nu, username: e.target.value })} placeholder="New username" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
            <input type="password" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} placeholder="Password (10+ chars)" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
            <select value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value })} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"><option value="officer">officer</option><option value="admin">admin</option></select>
            <button onClick={() => run(async () => { await api.createUser(nu); setNu({ username: "", password: "", role: "officer" }); }, `User ${nu.username} created`)} className="bg-[#0B2545] text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Add user</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

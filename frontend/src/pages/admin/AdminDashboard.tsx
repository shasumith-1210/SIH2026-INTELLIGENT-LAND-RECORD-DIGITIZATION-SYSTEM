import { useState } from "react";
import { Page } from "../../types";
import { useAudit } from "../../store";
import { api } from "../../services/api";
import { useLoad } from "../../hooks";
import LiveAdmin from "./LiveAdmin";

// DEMONSTRATION DATA - replace with the dashboard/reporting module (FastAPI).
const monthly = [{ m: "Apr", v: 420 }, { m: "May", v: 610 }, { m: "Jun", v: 780 }, { m: "Jul", v: 905 }, { m: "Aug", v: 1130 }, { m: "Sep", v: 1260 }];
const districts = [{ d: "Varanasi", p: 72 }, { d: "Lucknow", p: 64 }, { d: "Kanpur", p: 51 }, { d: "Prayagraj", p: 38 }];
const workload = [{ n: "Amitabh Kumar", c: 34 }, { n: "Priya Verma", c: 27 }, { n: "Rahul Mishra", c: 19 }];
const errors = [{ e: "Unreadable handwriting", p: 38 }, { e: "Area mismatch", p: 24 }, { e: "Missing field", p: 21 }, { e: "Possible duplicate", p: 17 }];
const roles = ["Landowner", "Digitisation Officer", "Administrator"];

function Bars({ rows, max, unit = "" }: { rows: { label: string; value: number }[]; max: number; unit?: string }) {
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 text-sm">
          <span className="w-32 text-gray-500 truncate">{r.label}</span>
          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#1B6B4A] rounded-full" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <span className="mono text-xs text-gray-600 w-14 text-right">{r.value}{unit}</span>
        </div>
      ))}
    </div>
  );
}

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-5">
    <h3 className="text-sm font-semibold text-[#0B2545] mb-4">{title}</h3>
    {children}
  </div>
);

function DemoAdmin({ navigate: _navigate }: { navigate: (p: Page) => void }) {
  const { entries, log, submissions, verified } = useAudit();
  const [users, setUsers] = useState([
    { name: "Suresh Patel", role: roles[0] },
    { name: "Amitabh Kumar", role: roles[1] },
    { name: "Priya Verma", role: roles[1] },
    { name: "Admin Desk", role: roles[2] },
  ]);

  const changeRole = (i: number, role: string) => {
    log({ action: "Role Changed", record: "—", detail: `${users[i].name}: '${users[i].role}' → '${role}'`, type: "edit", officer: "Admin Desk" });
    setUsers((u) => u.map((x, j) => (j === i ? { ...x, role } : x)));
  };

  // Demo baseline + live session data from the shared store.
  const liveMonthly = [...monthly, { m: "Nov (live)", v: 140 + submissions.length }];
  const liveDistricts = [
    ...districts.map((x) => ({ label: x.d, value: x.p })),
    ...Array.from(new Set(submissions.map((s) => s.district).filter((d) => !districts.some((x) => x.d.toLowerCase() === d.toLowerCase())))).map((d) => ({ label: `${d} (new)`, value: Math.min(100, submissions.filter((s) => s.district === d).length * 5) })),
  ];
  const byOfficer = (n: string) => entries.filter((e) => e.officer === n && ["verify", "edit", "reject"].includes(e.type)).length;
  const liveWorkload = workload.map((x) => ({ label: x.n, value: x.c + byOfficer(x.n) }));
  const edits = entries.filter((e) => e.type === "edit" && e.action.includes("Field")).length;
  const sum = useLoad(() => api.getSummary(), api.enabled);
  const S = sum.data;
  const stats = api.enabled ? [
    { l: "Documents received", v: String(S?.received ?? "…") },
    { l: "Officer-verified", v: String(S?.officer_verified ?? "…") },
    { l: "Pending cases", v: String(S?.pending ?? "…") },
    { l: "Avg. OCR confidence", v: S?.avg_confidence != null ? `${S.avg_confidence}%` : "—" },
    { l: "Officer corrections", v: String(S?.corrections ?? "…") },
  ] : [
    { l: "Documents received", v: (5105 + submissions.length).toLocaleString() },
    { l: "Verified records", v: (3842 + verified.length).toLocaleString() },
    { l: "Pending cases", v: String(Math.max(0, 412 + submissions.length - verified.length)) },
    { l: "Avg. confidence", v: "86%" },
    { l: "Officer corrections (live)", v: String(edits) },
  ];

  return (
    <div className="flex-1 overflow-auto bg-[#F0F4FA] p-8">
      <div className="max-w-6xl mx-auto animate-fadeIn">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2545]">Administrator Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">System-wide processing, accuracy and workload overview.</p>
          </div>
          <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">{api.enabled ? "Live backend data" : "Demo baseline + live session"}</span>
        </div>
        <div className="grid grid-cols-5 gap-4 mb-6">
          {stats.map((s) => (
            <div key={s.l} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400">{s.l}</p>
              <p className="text-2xl font-bold text-[#0B2545]">{s.v}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {api.enabled ? (
            <Card title="Documents by status"><Bars rows={[["Submitted", S?.submitted], ["Awaiting officer", S?.processed], ["Verified", S?.officer_verified], ["Rejected", S?.rejected]].map(([l, v]) => ({ label: String(l), value: Number(v ?? 0) }))} max={Math.max(S?.received ?? 1, 1)} /></Card>
          ) : <Card title="Documents processed over time"><Bars rows={liveMonthly.map((x) => ({ label: x.m, value: x.v }))} max={1300} /></Card>}
          {api.enabled ? (
            <Card title="Documents by district"><Bars rows={Object.entries(S?.by_district ?? {}).map(([label, value]) => ({ label, value }))} max={Math.max(S?.received ?? 1, 1)} /></Card>
          ) : <Card title="District-wise progress"><Bars rows={liveDistricts} max={100} unit="%" /></Card>}
          {api.enabled ? (
            <Card title="Officer actions (approve, reject, correct)"><Bars rows={Object.entries(S?.officer_actions ?? {}).map(([label, value]) => ({ label, value }))} max={Math.max(...Object.values(S?.officer_actions ?? { x: 1 }), 1)} /></Card>
          ) : <Card title="Officer workload (cases this month)"><Bars rows={liveWorkload} max={40} /></Card>}
          {!api.enabled && <Card title="Error distribution"><Bars rows={errors.map((x) => ({ label: x.e, value: x.p }))} max={50} unit="%" /></Card>}
        </div>
        {api.enabled ? <Card title="User and role management"><p className="text-sm text-gray-500">Accounts and roles are configured on the server (USERS_JSON). In-app role editing is available only in demo mode.</p></Card> : (<Card title="User and role management">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-400"><th className="pb-2">User</th><th className="pb-2">Role</th></tr></thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.name} className="border-t border-gray-100">
                  <td className="py-2.5 text-[#0B2545] font-medium">{u.name}</td>
                  <td>
                    <select value={u.role} onChange={(e) => changeRole(i, e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-sm">
                      {roles.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>)}
      </div>
    </div>
  );
}

export default function AdminDashboard(props: { navigate: (p: Page) => void }) {
  return api.enabled ? <LiveAdmin /> : <DemoAdmin {...props} />;
}

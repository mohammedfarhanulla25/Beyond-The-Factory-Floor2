"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

type AnyRec = Record<string, any>;

const EDGES: [string, string, string?][] = [
  ["ST-01", "CN-01"], ["ST-01", "CN-03"], ["ST-02", "CN-02"], ["ST-02", "CN-04"],
  ["CN-01", "HT-01"], ["CN-02", "HT-01"], ["CN-03", "AS-01"], ["CN-04", "AS-02"],
  ["HT-01", "AS-01"], ["HT-01", "AS-02"], ["AS-01", "QC-01"], ["AS-02", "QC-01"], ["QC-01", "PK-01"], ["QC-01", "CN-02", "rework"],
];
const UTIL_EDGES: [string, string][] = [["UT-C1", "ST-01"], ["UT-C1", "ST-02"], ["UT-C1", "CN-01"], ["UT-C1", "CN-02"], ["UT-C1", "CN-03"], ["UT-C1", "CN-04"]];
const NAV = [
  { id: "overview", label: "Overview", short: "Home" },
  { id: "twin", label: "Digital Twin", short: "Twin" },
  { id: "losses", label: "Hidden Losses", short: "Losses" },
  { id: "forecast", label: "Forecasts", short: "Alerts" },
  { id: "simulator", label: "Simulator", short: "Sim" },
  { id: "actions", label: "Actions", short: "Actions" },
];

function statusColor(s: string) {
  return s === "running" ? "#16a34a" : s === "starved" ? "#dc2626" : s === "blocked" ? "#7c3aed" : s === "degraded" ? "#d97706" : "#64748b";
}
function badgeClass(s: string) {
  if (s === "running" || s === "healthy" || s === "done" || s === "action_created") return "badge badge-ok";
  if (s === "blocked") return "badge badge-block";
  if (s === "degraded" || s === "warning" || s === "in-progress" || s === "high" || s === "medium") return "badge badge-warn";
  if (s === "starved" || s === "critical" || s === "open") return "badge badge-bad";
  return "badge badge-neutral";
}
function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const sync = () => setDark(document.documentElement.classList.contains("dark"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}
function whyStatus(m: AnyRec) {
  if (m.code === "AS-01") return "Healthy (95) but starved: CN-03 micro-stops drained its buffer 17× today. Fix upstream, not AS-01.";
  if (m.code === "CN-03") return "Looks OK on OEE (82%) but 42 micro-stops <2 min are unlogged. Chip conveyor sensor suspected.";
  if (m.code === "UT-C1") return "Single shared compressor for 6 machines. Vibration 6.8 mm/s, +0.4/day for 6 days → bearing risk.";
  if (m.code === "CN-02") return "Blocked by HT-01 queue + burdened by QC rework loop (7.3%). Its load is inflated, output is not.";
  return "Operating within normal plant-coupled behaviour. No isolated fault detected.";
}
function playbook(code: string) {
  if (code === "AS-01") return "Move 20 parts from AS-02 buffer, slow AS-02 by 10% to share HT output, dispatch maint. to CN-03 conveyor.";
  if (code === "UT-C1") return "Book UT-C1 bearing swap for tonight's planned stop, bring rental compressor on standby, stagger presses now.";
  if (code === "QC-01") return "Change CN-03 tool at next micro-stop, quarantine last 40 CN-03 parts for burr check.";
  return "Pre-approve 1 hr overtime, split next HT batch, notify logistics of possible delay.";
}

export default function ControlRoom({ initialTab = "overview" }: { initialTab?: string }) {
  const dark = useDark();
  const [data, setData] = useState<AnyRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTabState] = useState(NAV.some((n) => n.id === initialTab) ? initialTab : "overview");
  const [selected, setSelected] = useState<AnyRec | null>(null);
  const [layer, setLayer] = useState("material");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [sim, setSim] = useState({ cn03Speed: 70, airStable: 60, bufferExtra: 15, reworkReduction: 40, batchSplit: true });
  const [simResult, setSimResult] = useState<AnyRec | null>(null);
  const [simError, setSimError] = useState("");
  const [ack, setAck] = useState<number[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [openLoss, setOpenLoss] = useState<number[]>([]);
  const [savingSim, setSavingSim] = useState(false);

  const notify = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };
  const setTab = (next: string) => {
    setTabState(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}`);
  };

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/plant");
      if (!r.ok) throw new Error("Plant feed unavailable");
      const j = await r.json();
      setData(j);
      setError("");
      setSelected((cur) => {
        if (!cur) return j.machines?.find((m: AnyRec) => m.code === "CN-03") ?? j.machines?.[0] ?? null;
        return j.machines?.find((m: AnyRec) => m.code === cur.code) ?? cur;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load the plant.";
      setError(msg);
      if (data) notify("err", "Refresh failed. Showing the last good snapshot.");
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && NAV.some((n) => n.id === t)) setTabState(t);
  }, []);
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sim) });
        if (!r.ok) throw new Error("Simulator unavailable");
        setSimResult(await r.json());
        setSimError("");
      } catch {
        setSimError("The plant model didn’t respond. Adjust a lever to retry.");
      }
    }, 250);
    return () => clearTimeout(t);
  }, [sim]);

  async function createAction(ineff: AnyRec) {
    setBusyId(ineff.id);
    try {
      const r = await fetch("/api/interventions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: ineff.recommendation,
          machineCode: ineff.machinesInvolved.split(" ")[0],
          actionType: "Improvement",
          priority: ineff.severity === "critical" ? "Critical" : "High",
          expectedGain: `+${ineff.lossUnitsPerDay} units/day potential • $${ineff.costPerDay.toLocaleString()}/day`,
          sourceInefficiencyId: ineff.id,
        }),
      });
      if (!r.ok) throw new Error();
      notify("ok", `Action created for “${ineff.title}” — assigned to Shift Supervisor`);
      await load();
    } catch {
      notify("err", "Could not create that action. Try again.");
    } finally {
      setBusyId(null);
    }
  }
  async function cycleIntervention(iv: AnyRec) {
    const next = iv.status === "open" ? "in-progress" : iv.status === "in-progress" ? "done" : "open";
    try {
      const r = await fetch("/api/interventions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: iv.id, status: next }) });
      if (!r.ok) throw new Error();
      notify("ok", `“${iv.title}” is now ${next}.`);
      await load();
    } catch {
      notify("err", "Could not update that action. Try again.");
    }
  }
  async function saveSimulation() {
    if (!simResult) return;
    setSavingSim(true);
    try {
      const r = await fetch("/api/interventions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Simulation plan: CN-03 ${sim.cn03Speed}%, Air ${sim.airStable}%, Buffer +${sim.bufferExtra}, Rework -${sim.reworkReduction}%${sim.batchSplit ? ", HT split" : ""}`,
          machineCode: "PLANT",
          actionType: "Simulation Plan",
          priority: "High",
          expectedGain: `+${simResult.gain} units/day • $${simResult.costSavingPerDay.toLocaleString()}/day`,
        }),
      });
      if (!r.ok) throw new Error();
      notify("ok", "Simulation saved as plant improvement plan");
      await load();
    } catch {
      notify("err", "Could not save the simulation plan.");
    } finally {
      setSavingSim(false);
    }
  }

  const machines: AnyRec[] = data?.machines || [];
  const byCode = useMemo(() => {
    const m: AnyRec = {};
    machines.forEach((x) => { m[x.code] = x; });
    return m;
  }, [machines]);
  const q = query.trim().toLowerCase();
  const filteredMachines = machines.filter((m) => (statusFilter === "all" || m.status === statusFilter) && (`${m.code} ${m.name} ${m.zone}`).toLowerCase().includes(q));
  const filteredLosses = (data?.inefficiencies || []).filter((inf: AnyRec) => (severityFilter === "all" || inf.severity === severityFilter) && (`${inf.title} ${inf.category} ${inf.machinesInvolved}`).toLowerCase().includes(q));
  const filteredPreds = (data?.predictions || []).filter((p: AnyRec) => (severityFilter === "all" || p.severity === severityFilter) && (`${p.title} ${p.machineCode} ${p.signal}`).toLowerCase().includes(q));
  const filteredActions = (data?.interventions || []).filter((iv: AnyRec) => (actionFilter === "all" || iv.status === actionFilter) && (`${iv.title} ${iv.machineCode} ${iv.owner}`).toLowerCase().includes(q));
  const filteredUtils = (data?.utilities || []).filter((u: AnyRec) => (`${u.name} ${u.code} ${u.affects}`).toLowerCase().includes(q));

  const axis = dark ? "#b7aea2" : "#6a6158";
  const grid = dark ? "#2c3530" : "#e2d8c8";
  const tip = { background: dark ? "#171e1a" : "#fffdf9", border: `1px solid ${grid}`, borderRadius: 12, color: dark ? "#f4efe8" : "#1c1712" };
  const waterfall = [
    { name: "Planned", value: 1200, fill: "#1c1712" },
    { name: "CN-03 micro-stops", value: -112, fill: "#dc2626" },
    { name: "Air pressure dips", value: -84, fill: "#ea580c" },
    { name: "Rework loop", value: -58, fill: "#d97706" },
    { name: "HT batch waves", value: -46, fill: "#ca8a04" },
    { name: "Forklift waits", value: -38, fill: "#64748b" },
    { name: "Coolant drift", value: -28, fill: "#0e7490" },
    { name: "Other", value: -10, fill: "#94a3b8" },
    { name: "Actual today", value: 824, fill: "#16a34a" },
  ];
  const searchPlaceholder = tab === "losses" ? "Search patterns…" : tab === "forecast" ? "Search forecasts…" : tab === "actions" ? "Search actions…" : tab === "simulator" ? "Search utilities…" : "Search machine, zone…";
  const doneCount = (data?.interventions || []).filter((i: AnyRec) => i.status === "done").length;
  const actionTotal = data?.interventions?.length || 0;

  return (
    <div className="min-h-screen">
      <aside className="sidebar">
        <Logo />
        <p className="kicker mt-6 mb-2 px-2">Control room</p>
        <nav className="grid gap-1" aria-label="Control room">
          {NAV.map((item) => (
            <button key={item.id} className={`nav-item ${tab === item.id ? "active" : ""}`} aria-current={tab === item.id ? "page" : undefined} onClick={() => setTab(item.id)}>
              <NavIcon id={item.id} />
              <span>{item.label}</span>
              {item.id === "forecast" && data && <span className="ml-auto text-xs opacity-70">{data.predictions.length}</span>}
              {item.id === "actions" && data && <span className="ml-auto text-xs opacity-70">{data.interventions.length}</span>}
              {item.id === "losses" && data && <span className="ml-auto text-xs opacity-70">{data.inefficiencies.length}</span>}
            </button>
          ))}
        </nav>
        <div className="mt-auto grid gap-2 pt-6">
          <div className="card-soft p-3 text-xs">
            <p className="font-bold">Shift B · 06:00–18:00</p>
            <p className="muted">Order #8841 · 1,050 by 16:30</p>
            <div className="progress mt-2"><span style={{ width: "78%" }} /></div>
            <p className="muted mt-1">824 / 1,050 on the truck</p>
          </div>
          <Link href="/" className="nav-item">← Back to site</Link>
        </div>
      </aside>

      <div className="lg:pl-[260px]">
        <header className="nav-blur">
          <div className="px-4 md:px-6 py-3 flex flex-wrap items-center gap-3">
            <div className="lg:hidden"><Logo /></div>
            <div className="flex-1 min-w-[200px] relative">
              <input className="field" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchPlaceholder} aria-label="Search" />
            </div>
            <span className="badge badge-bad hidden sm:inline-flex">● Live · 5 disruptions</span>
            <ThemeToggle compact />
          </div>
        </header>

        <main id="main" className="px-4 md:px-6 py-5 pb-28 lg:pb-10 space-y-4 max-w-[1240px]">
          {toast && <div role="status" className={`toast ${toast.type === "ok" ? "toast-ok" : "toast-err"}`}>{toast.msg}</div>}

          {loading && !data && <SkeletonBoard />}
          {!loading && !data && (
            <div className="card p-10 text-center max-w-lg mx-auto">
              <p className="kicker">Connection</p>
              <h1 className="display text-4xl mt-2">The floor feed didn’t answer.</h1>
              <p className="muted mt-2">{error || "Check the plant service and try again."}</p>
              <button className="btn btn-primary mt-5" onClick={() => { setLoading(true); load(); }}>Retry</button>
            </div>
          )}

          {data && (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="kicker">{NAV.find((n) => n.id === tab)?.label}</p>
                  <h1 className="display text-3xl md:text-4xl mt-1">{titleFor(tab)}</h1>
                  <p className="muted text-sm mt-1 max-w-2xl">{blurbFor(tab)}</p>
                </div>
                {(query || statusFilter !== "all" || severityFilter !== "all" || actionFilter !== "all") && (
                  <button className="btn-ghost" onClick={() => { setQuery(""); setStatusFilter("all"); setSeverityFilter("all"); setActionFilter("all"); }}>Clear filters</button>
                )}
              </div>

              {tab === "overview" && (
                <>
                  <section className="card-ink p-5 md:p-6 grid lg:grid-cols-12 gap-5 items-center">
                    <div className="lg:col-span-8">
                      <p className="kicker" style={{ color: "#e7a33a" }}>The mystery this plant sent us to solve</p>
                      <h2 className="display text-2xl md:text-3xl mt-2 text-white">Every machine looks healthy. The plant is 31% slow. The loss lives <em>between</em> machines.</h2>
                      <p className="text-sm text-white/70 mt-3">Individual monitors average <b className="text-white">{data.kpis.avgMachineOee}% OEE</b> — yet plant OEE is only <b className="text-red-300">57%</b>. By watching buffers, shared utilities, rework loops and timing coincidences across the whole floor, we found <b className="text-white">601 units/day of hidden loss (${data.kpis.totalCost.toLocaleString()}/day)</b> that no single-machine dashboard can see.</p>
                    </div>
                    <div className="lg:col-span-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-2xl bg-white/10 p-3"><p className="text-[10px] text-white/50 font-bold">MACHINE AVG</p><p className="text-2xl font-black text-emerald-300">{data.kpis.avgMachineOee}%</p><p className="text-[10px] text-white/50">looks normal</p></div>
                      <div className="rounded-2xl bg-white/10 p-3"><p className="text-[10px] text-white/50 font-bold">PLANT OEE</p><p className="text-2xl font-black text-red-300">57%</p><p className="text-[10px] text-white/50">real output</p></div>
                      <div className="rounded-2xl p-3" style={{ background: "#e7a33a", color: "#1a1208" }}><p className="text-[10px] font-bold">HIDDEN GAP</p><p className="text-2xl font-black">-30 pts</p><p className="text-[10px]">$60k / day</p></div>
                    </div>
                  </section>

                  <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    {[
                      { tab: "twin", title: "Inspect the floor", desc: "Open the live digital twin", meta: "12 machines" },
                      { tab: "losses", title: "Review hidden losses", desc: "6 patterns ranked by cost", meta: "$60,100/day" },
                      { tab: "forecast", title: "Next disruption", desc: "AS-01 starvation · 88%", meta: "in 47 min" },
                      { tab: "simulator", title: "Run a what-if", desc: "Move the real bottleneck", meta: "5 levers" },
                    ].map((c) => (
                      <button key={c.tab} onClick={() => setTab(c.tab)} className="card lift p-4 text-left">
                        <p className="text-xs font-bold muted">{c.meta}</p>
                        <p className="font-bold text-lg mt-1">{c.title}</p>
                        <p className="muted text-sm">{c.desc}</p>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { label: "Output today (projected)", value: "824", unit: "/ 1,200 units", sub: "▼ 31% vs plan • shipment at risk", tone: "var(--danger)" },
                      { label: "Hidden loss identified", value: "601", unit: "units / day", sub: "$60,100/day • 6 patterns found", tone: "var(--accent-deep)" },
                      { label: "Next disruption in", value: "47", unit: "minutes", sub: "AS-01 starvation • 88% probability", tone: "var(--danger)" },
                      { label: "Machines running", value: "8 / 12", unit: "", sub: "2 starved • 1 blocked • 1 degraded utility", tone: "var(--ink)" },
                    ].map((k) => (
                      <div key={k.label} className="card p-4">
                        <p className="text-xs font-bold muted uppercase tracking-wide">{k.label}</p>
                        <p className="text-3xl font-black mt-2" style={{ color: k.tone }}>{k.value} <span className="text-sm muted">{k.unit}</span></p>
                        <p className="text-xs muted mt-1">{k.sub}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-3 card p-4">
                      <div className="flex justify-between flex-wrap gap-2">
                        <div>
                          <h3 className="text-xl">Planned vs Actual throughput</h3>
                          <p className="text-xs muted">Units/hr • Dips at 12:00 & 14:00 have no machine alarm — hover to inspect</p>
                        </div>
                        <span className="badge badge-bad">14:00 dip = air + forklift + micro-stops coinciding</span>
                      </div>
                      <div className="h-[260px] mt-3">
                        <ResponsiveContainer>
                          <AreaChart data={data.telemetry}>
                            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                            <XAxis dataKey="hourLabel" stroke={axis} fontSize={12} />
                            <YAxis stroke={axis} fontSize={12} />
                            <Tooltip contentStyle={tip} />
                            <Area type="monotone" dataKey="planned" stroke="#94a3b8" fill="#e2e8f0" name="Planned /hr" />
                            <Area type="monotone" dataKey="actual" stroke="#dc2626" fill="#fecaca" name="Actual /hr" />
                            <Line type="monotone" dataKey="compressorPsi" stroke="#d97706" name="Compressor psi" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2">
                        <div className="card-soft p-2"><b>12:00</b><br /><span className="muted">Micro-stops peak (18/hr)</span></div>
                        <div className="card-soft p-2"><b>14:00</b><br /><span className="muted">Air 94 psi + forklift wait 24m</span></div>
                        <div className="card-soft p-2"><b>15:00</b><br /><span className="muted">Coolant 29°C, CNC -9%</span></div>
                      </div>
                    </div>
                    <div className="lg:col-span-2 card p-4">
                      <h3 className="text-xl">Where did 376 units go today?</h3>
                      <p className="text-xs muted">Loss waterfall — net of overlaps, reconciles plan → actual</p>
                      <div className="mt-4 space-y-2">
                        {waterfall.map((w, i) => {
                          const isTotal = i === 0 || i === waterfall.length - 1;
                          return (
                            <div key={w.name} className="flex items-center gap-2 text-xs">
                              <span className="w-36 truncate font-semibold">{w.name}</span>
                              <div className="flex-1 rounded h-6 overflow-hidden" style={{ background: "var(--chip)" }}>
                                <div className="h-full rounded" style={{ width: `${Math.abs(w.value) / 12}%`, background: w.fill }} />
                              </div>
                              <span className="w-16 text-right font-black" style={{ color: isTotal ? "inherit" : "var(--danger)" }}>{w.value > 0 && !isTotal ? "+" : ""}{w.value}</span>
                            </div>
                          );
                        })}
                      </div>
                      <button onClick={() => setTab("losses")} className="btn btn-ink w-full mt-4">Investigate each hidden loss →</button>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-3 card p-4">
                      <h3 className="text-xl">The divergence: machines vs plant</h3>
                      <p className="text-xs muted">If you only watch machines, you miss the story. The gap is starvation, blocking & shared-resource waits.</p>
                      <div className="h-[220px] mt-3">
                        <ResponsiveContainer>
                          <LineChart data={data.telemetry}>
                            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                            <XAxis dataKey="hourLabel" stroke={axis} fontSize={12} />
                            <YAxis domain={[40, 100]} stroke={axis} fontSize={12} />
                            <Tooltip contentStyle={tip} />
                            <Line type="monotone" dataKey="machineAvgOee" stroke="#16a34a" strokeWidth={3} name="Avg machine OEE %" />
                            <Line type="monotone" dataKey="plantOee" stroke="#dc2626" strokeWidth={3} name="Plant OEE %" />
                            <Line type="monotone" dataKey="microStops" stroke="#d97706" strokeDasharray="5 5" name="Micro-stops/hr (CN-03)" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="lg:col-span-2 card-ink p-4">
                      <h3 className="text-xl text-white">Next disruptions — act before they happen</h3>
                      <div className="space-y-3 mt-3">
                        {data.predictions.slice(0, 3).map((p: AnyRec) => (
                          <div key={p.id} className="rounded-xl bg-white/10 p-3">
                            <div className="flex justify-between gap-2"><b className="text-sm">{p.title}</b><span className="badge badge-bad">{p.probability}%</span></div>
                            <p className="text-xs text-white/60 mt-1">In ~{p.minutesToImpact} min • -{p.impactUnits} units • {p.machineCode}</p>
                            <div className="progress mt-2"><span style={{ width: `${p.probability}%`, background: "#e7a33a" }} /></div>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => setTab("forecast")} className="btn btn-primary w-full mt-3">See cascade paths & playbooks →</button>
                    </div>
                  </div>

                  <section className="card p-4">
                    <div className="flex flex-wrap justify-between gap-3 items-center">
                      <h3 className="text-xl">All machines — click any card to inspect in Digital Twin</h3>
                      <FilterPills value={statusFilter} onChange={setStatusFilter} options={["all", "running", "starved", "blocked", "degraded"]} />
                    </div>
                    {filteredMachines.length === 0 ? (
                      <Empty title="No machines in this view" body={`Nothing matches “${query || statusFilter}”. Clear the search or status filter.`} onClear={() => { setQuery(""); setStatusFilter("all"); }} />
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mt-3">
                        {filteredMachines.map((m) => (
                          <button key={m.id} onClick={() => { setSelected(m); setTab("twin"); }} className="text-left card-soft lift p-3">
                            <div className="flex justify-between gap-2"><b>{m.code}</b><span className={badgeClass(m.status)}>{m.status}</span></div>
                            <p className="text-xs muted truncate">{m.name} • {m.zone}</p>
                            <p className="text-lg font-black mt-2">{m.currentRate}<span className="text-xs muted"> / {m.nominalRate} u/hr</span></p>
                            <div className="flex gap-2 text-[11px] mt-1"><span>OEE <b>{m.oee}%</b></span><span>Health <b style={{ color: m.healthScore < 70 ? "var(--danger)" : "inherit" }}>{m.healthScore}</b></span><span>Buffer <b style={{ color: m.bufferLevel < 20 ? "var(--danger)" : "inherit" }}>{m.bufferLevel}%</b></span></div>
                            <div className="progress mt-2"><span style={{ width: `${m.bufferLevel}%`, background: m.bufferLevel < 20 ? "#dc2626" : m.bufferLevel > 85 ? "#7c3aed" : "#16a34a" }} /></div>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}

              {tab === "twin" && (
                <>
                  <section className="card p-4">
                    <div className="flex flex-wrap justify-between gap-3 items-center">
                      <p className="text-sm muted max-w-xl">Live positions, buffers & flows. Red = starved, purple = blocked, amber = degraded. Click a machine.</p>
                      <div className="flex gap-1 flex-wrap">
                        {[["material", "Material flow"], ["utility", "Utilities"], ["heat", "Bottleneck heat"]].map(([k, l]) => (
                          <button key={k} onClick={() => setLayer(k)} className={layer === k ? "chip chip-on" : "chip"}>{l}</button>
                        ))}
                      </div>
                    </div>
                    <div className="overflow-x-auto mt-3">
                      <svg viewBox="0 0 960 460" className="min-w-[860px] w-full rounded-2xl border" style={{ background: dark ? "#121815" : "#f7f5ee", borderColor: "var(--line)" }}>
                        <rect x="20" y="30" width="170" height="360" rx="12" fill={dark ? "#163044" : "#e0f2fe"} opacity="0.7" /><text x="32" y="52" fontSize="12" fontWeight="800" fill={dark ? "#9bd4f5" : "#0369a1"}>STAMPING</text>
                        <rect x="220" y="30" width="170" height="400" rx="12" fill={dark ? "#3a2e14" : "#fef3c7"} opacity="0.7" /><text x="232" y="52" fontSize="12" fontWeight="800" fill={dark ? "#f6d7a1" : "#92400e"}>MACHINING</text>
                        <rect x="430" y="30" width="170" height="180" rx="12" fill={dark ? "#3a1c1c" : "#fee2e2"} opacity="0.7" /><text x="442" y="52" fontSize="12" fontWeight="800" fill={dark ? "#ffc1ba" : "#991b1b"}>HEAT TREAT</text>
                        <rect x="430" y="230" width="170" height="180" rx="12" fill={dark ? "#3a2a14" : "#ffedd5"} opacity="0.75" /><text x="442" y="252" fontSize="12" fontWeight="800" fill={dark ? "#fdba74" : "#9a3412"}>UTILITIES</text>
                        <rect x="620" y="30" width="170" height="400" rx="12" fill={dark ? "#143028" : "#dcfce7"} opacity="0.7" /><text x="632" y="52" fontSize="12" fontWeight="800" fill={dark ? "#86efac" : "#166534"}>ASSEMBLY + QUALITY</text>
                        <rect x="810" y="150" width="130" height="160" rx="12" fill={dark ? "#2a2140" : "#ede9fe"} opacity="0.7" /><text x="822" y="172" fontSize="12" fontWeight="800" fill={dark ? "#ddd0ff" : "#5b21b6"}>PACKAGING</text>
                        {layer === "material" && EDGES.map(([a, b, typ], i) => {
                          const A = byCode[a], B = byCode[b]; if (!A || !B) return null;
                          const isRework = typ === "rework";
                          const isStarvePath = (a === "CN-03" && b === "AS-01") || a === "AS-01";
                          return (
                            <g key={i}>
                              <line x1={A.x + 55} y1={A.y + 22} x2={B.x} y2={B.y + 22} stroke={isRework || isStarvePath ? "#dc2626" : "#94a3b8"} strokeWidth={isStarvePath ? 3 : 2} strokeDasharray={isRework ? "6 4" : "none"} markerEnd="url(#arr)" />
                              <circle r="4" fill={isRework ? "#dc2626" : "#f59e0b"}><animateMotion dur={`${2 + (i % 3)}s`} repeatCount="indefinite" path={`M ${A.x + 55} ${A.y + 22} L ${B.x} ${B.y + 22}`} /></circle>
                            </g>
                          );
                        })}
                        {layer === "utility" && UTIL_EDGES.map(([a, b], i) => {
                          const A = byCode[a], B = byCode[b]; if (!A || !B) return null;
                          return <line key={i} x1={A.x + 27} y1={A.y} x2={B.x + 27} y2={B.y + 44} stroke="#ea580c" strokeWidth="2" strokeDasharray="4 4"><animate attributeName="stroke-dashoffset" from="20" to="0" dur="1s" repeatCount="indefinite" /></line>;
                        })}
                        <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="none" stroke="#64748b" strokeWidth="1.5" /></marker></defs>
                        {machines.map((m) => {
                          const heat = layer === "heat" ? (m.code === "CN-03" || m.code === "UT-C1" ? "#fecaca" : m.status === "starved" || m.status === "blocked" ? "#fed7aa" : (dark ? "#1c2420" : "#ffffff")) : (dark ? "#1c2420" : "#ffffff");
                          const sel = selected?.code === m.code;
                          return (
                            <g key={m.id} onClick={() => setSelected(m)} className="cursor-pointer">
                              <rect x={m.x} y={m.y} width="110" height="58" rx="10" fill={heat} stroke={sel ? "#f59e0b" : statusColor(m.status)} strokeWidth={sel ? 4 : 2.5} />
                              <circle cx={m.x + 14} cy={m.y + 14} r="6" fill={statusColor(m.status)}><animate attributeName="opacity" values="1;0.4;1" dur="1.6s" repeatCount="indefinite" /></circle>
                              <text x={m.x + 26} y={m.y + 19} fontSize="13" fontWeight="900" fill={dark && heat !== "#fecaca" && heat !== "#fed7aa" ? "#f4efe8" : "#1c1712"}>{m.code}</text>
                              <text x={m.x + 8} y={m.y + 36} fontSize="9" fill={dark ? "#c9c2b4" : "#475569"}>{m.name.slice(0, 18)}</text>
                              <text x={m.x + 8} y={m.y + 50} fontSize="9" fontWeight="700" fill={m.currentRate < m.nominalRate * 0.7 ? "#dc2626" : (dark ? "#e7e1d6" : "#334155")}>{m.currentRate}/{m.nominalRate} u/h • Buf {m.bufferLevel}%</text>
                            </g>
                          );
                        })}
                        <text x="30" y="445" fontSize="11" fill={dark ? "#b7aea2" : "#64748b"}>Animated dots = parts moving • Dashed red QC→CN-02 = hidden rework loop (7.3%) • Orange dashed (Utilities view) = shared air</text>
                      </svg>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3 text-xs">
                      <span className="badge badge-ok">Running</span>
                      <span className="badge badge-bad">Starved (no input, machine fine)</span>
                      <span className="badge badge-block">Blocked (nowhere to send)</span>
                      <span className="badge badge-warn">Degraded</span>
                      <span className="ml-auto muted">Key insight: AS-01 & PK-01 are <b style={{ color: "var(--danger)" }}>starved, not broken</b> — health 95–96, yet output halved.</span>
                    </div>
                  </section>
                  {selected ? (
                    <div className="grid lg:grid-cols-3 gap-4">
                      <div className="card-ink p-5">
                        <div className="flex justify-between gap-2"><div><p className="text-white/50 text-xs font-bold">{selected.zone} • {selected.type}</p><h3 className="text-2xl text-white">{selected.code} — {selected.name}</h3></div><span className={badgeClass(selected.status)}>{selected.status}</span></div>
                        <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                          <div className="rounded-xl bg-white/10 p-3">Rate<br /><b className="text-xl">{selected.currentRate} / {selected.nominalRate}</b> u/hr</div>
                          <div className="rounded-xl bg-white/10 p-3">OEE / Health<br /><b className="text-xl">{selected.oee}% • {selected.healthScore}</b></div>
                          <div className="rounded-xl bg-white/10 p-3">Temp<br /><b>{selected.tempC}°C</b> {selected.code === "UT-C1" && <span className="text-red-300 text-xs"> ↑ high</span>}</div>
                          <div className="rounded-xl bg-white/10 p-3">Vibration<br /><b>{selected.vibration} mm/s</b> {selected.vibration > 4 && <span className="text-amber-300 text-xs"> rising</span>}</div>
                          <div className="rounded-xl bg-white/10 p-3">Power<br /><b>{selected.powerKw} kW</b></div>
                          <div className="rounded-xl bg-white/10 p-3">Cycle<br /><b>{selected.cycleTimeSec}s</b></div>
                        </div>
                        <p className="text-xs text-white/60 mt-3">Upstream: <b className="text-white">{selected.upstream}</b> → Downstream: <b className="text-white">{selected.downstream}</b></p>
                      </div>
                      <div className="card p-5">
                        <h3 className="text-xl">Buffer before this machine</h3>
                        <div className="flex items-end gap-1 h-24 mt-3">{Array.from({ length: 20 }).map((_, i) => <div key={i} className="flex-1 rounded-t" style={{ height: `${30 + ((i * 37) % 60)}%`, background: (i / 20 * 100) < selected.bufferLevel ? (selected.bufferLevel < 20 ? "#fca5a5" : "#86efac") : "var(--chip)" }} />)}</div>
                        <p className="text-sm mt-2"><b style={{ color: selected.bufferLevel < 20 ? "var(--danger)" : "inherit" }}>{selected.bufferLevel}% full</b> <span className="muted">({Math.round(selected.bufferLevel / 100 * selected.bufferCapacity)} / {selected.bufferCapacity} parts)</span></p>
                        {selected.bufferLevel < 20 && <p className="text-xs rounded-xl p-2 mt-2 font-semibold badge-bad">At current drain (1.8%/min) this buffer empties in ~{Math.round(selected.bufferLevel / 1.8)} min. Machine itself is healthy — it will starve.</p>}
                        {selected.bufferLevel > 85 && <p className="text-xs rounded-xl p-2 mt-2 font-semibold badge-block">Buffer nearly full — upstream will soon be blocked. This is a downstream problem, not this machine&apos;s.</p>}
                        <h3 className="text-xl mt-4">Why this status?</h3>
                        <p className="text-sm muted">{whyStatus(selected)}</p>
                      </div>
                      <div className="card p-5">
                        <h3 className="text-xl">Cross-machine signals</h3>
                        <p className="text-xs muted">Not on the machine HMI</p>
                        <ul className="text-sm space-y-3 mt-3">
                          <li><b>Correlation to plant dip:</b> {selected.code === "CN-03" ? "r = 0.91 to AS-01 starvation" : selected.code === "UT-C1" ? "r = 0.89 to CNC cycle time" : "Moderate — see Hidden Losses"}</li>
                          <li><b>Starved / blocked today:</b> {selected.status === "starved" ? "23% of shift starved" : selected.status === "blocked" ? "31% blocked" : "<5%"}</li>
                          <li><b>Shared resources:</b> Air, coolant, forklift — contention windows logged</li>
                        </ul>
                        <button onClick={() => setTab("simulator")} className="btn btn-primary w-full mt-4">Simulate fixing {selected.code} →</button>
                        <button onClick={() => setTab("forecast")} className="btn btn-ghost w-full mt-2">See if {selected.code} triggers a cascade</button>
                      </div>
                    </div>
                  ) : (
                    <Empty title="Pick a machine" body="Click any asset on the floor map to open buffers, health, and cross-machine signals." />
                  )}
                </>
              )}

              {tab === "losses" && (
                <>
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <FilterPills value={severityFilter} onChange={setSeverityFilter} options={["all", "critical", "high", "medium"]} />
                    <span className="badge">Total at stake: $60,100 / day • $15.0M / yr</span>
                  </div>
                  {filteredLosses.length === 0 ? <Empty title="No patterns match" body="Try another severity or clear the search." onClear={() => { setQuery(""); setSeverityFilter("all"); }} /> : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {filteredLosses.map((inf: AnyRec, idx: number) => {
                        const open = openLoss.includes(inf.id);
                        return (
                          <article key={inf.id} className="card p-5 flex flex-col">
                            <div className="flex justify-between gap-2"><span className={badgeClass(inf.severity)}>{inf.severity} · #{idx + 1}</span><span className="text-xs font-bold muted">{inf.category}</span></div>
                            <h3 className="text-2xl mt-3">{inf.title}</h3>
                            <p className="text-xs font-bold muted mt-1">{inf.machinesInvolved}</p>
                            <p className="text-sm muted mt-2 flex-1">{inf.description}</p>
                            <div className="grid grid-cols-3 gap-2 mt-3 text-center text-sm">
                              <div className="card-soft p-2"><p className="text-[10px] font-bold muted">LOSS</p><b style={{ color: "var(--danger)" }}>{inf.lossUnitsPerDay} u/day</b></div>
                              <div className="card-soft p-2"><p className="text-[10px] font-bold muted">COST</p><b>${inf.costPerDay.toLocaleString()}/d</b></div>
                              <div className="card-soft p-2"><p className="text-[10px] font-bold muted">CONFIDENCE</p><b>{inf.confidence}% · r={inf.correlation}</b></div>
                            </div>
                            <div className="progress mt-3" aria-label={`Confidence ${inf.confidence}%`}><span style={{ width: `${inf.confidence}%`, background: "#1c6b5d" }} /></div>
                            <button type="button" className="btn-ghost mt-3" aria-expanded={open} onClick={() => setOpenLoss((ids) => open ? ids.filter((id) => id !== inf.id) : [...ids, inf.id])}>{open ? "Hide evidence" : "Show evidence & why it was hidden"}</button>
                            {open && (
                              <div className="card-soft p-3 mt-2 text-xs">
                                <p><b>Evidence:</b> {inf.evidence}</p>
                                <p className="muted mt-1"><b>Why it was hidden:</b> {inf.hiddenReason}</p>
                              </div>
                            )}
                            <p className="text-xs mt-3"><b>Recommended fix:</b> {inf.recommendation}</p>
                            {inf.status === "action_created" ? <p className="mt-3 badge badge-ok justify-center py-2">Action created — see Actions</p> : (
                              <button disabled={busyId === inf.id} onClick={() => createAction(inf)} className="btn btn-ink mt-3">{busyId === inf.id ? "Creating…" : "Create action & assign owner →"}</button>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                  <section className="card p-5">
                    <h3 className="text-xl">Correlation heatmap — what actually moves with what</h3>
                    <p className="text-xs muted">Machine HMIs show none of these links. Dark = strong coupled behaviour (last 14 days).</p>
                    <div className="overflow-x-auto mt-3">
                      <table className="text-xs w-full min-w-[640px]">
                        <thead><tr><th className="text-left p-2" /><th className="p-2">Plant output</th><th className="p-2">CN-03 stops</th><th className="p-2">Air psi</th><th className="p-2">QC rejects</th><th className="p-2">Coolant °C</th><th className="p-2">Forklift wait</th></tr></thead>
                        <tbody>
                          {[["Plant output", 1, 0.91, 0.89, 0.72, 0.68, 0.61], ["AS-01 starved %", 0.91, 1, 0.44, 0.38, 0.21, 0.55], ["CNC cycle time", 0.89, 0.44, 1, 0.29, 0.78, 0.18], ["CN-02 load", 0.72, 0.38, 0.29, 1, 0.24, 0.12], ["Afternoon speed", 0.68, 0.21, 0.78, 0.24, 1, 0.09]].map((row) => (
                            <tr key={String(row[0])}>
                              <td className="font-bold p-2">{row[0]}</td>
                              {row.slice(1).map((v, i) => <td key={i} className="p-2 text-center font-bold rounded" style={{ background: `rgba(220,38,38,${Number(v) * 0.75})`, color: Number(v) > 0.5 ? "white" : dark ? "#f4efe8" : "#334155" }}>{v as number}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}

              {tab === "forecast" && (
                <>
                  <FilterPills value={severityFilter} onChange={setSeverityFilter} options={["all", "critical", "high", "medium"]} />
                  {filteredPreds.length === 0 ? <Empty title="No forecasts in this filter" body="Every active cascade is still on file — clear the filter to see them." onClear={() => { setQuery(""); setSeverityFilter("all"); }} /> : (
                    <div className="space-y-4">
                      {filteredPreds.map((p: AnyRec) => {
                        const acked = ack.includes(p.id);
                        return (
                          <article key={p.id} className="card p-5" style={{ opacity: acked ? 0.65 : 1 }}>
                            <div className="flex flex-wrap justify-between gap-3">
                              <div>
                                <span className={badgeClass(p.severity)}>{p.severity}</span>
                                <h3 className="text-2xl mt-2">{p.title}</h3>
                                <p className="text-xs muted">{p.machineCode} • Signal: {p.signal}</p>
                              </div>
                              <div className="flex gap-4 text-center">
                                <div><p className="text-[10px] font-bold muted">PROBABILITY</p><p className="text-2xl font-black" style={{ color: "var(--danger)" }}>{p.probability}%</p></div>
                                <div><p className="text-[10px] font-bold muted">IN</p><p className="text-2xl font-black">{p.minutesToImpact}m</p></div>
                                <div><p className="text-[10px] font-bold muted">IMPACT</p><p className="text-2xl font-black" style={{ color: "var(--accent-deep)" }}>-{p.impactUnits}u</p></div>
                              </div>
                            </div>
                            <div className="progress mt-3" aria-label="Probability"><span style={{ width: `${p.probability}%` }} /></div>
                            <p className="text-xs font-black muted mt-4 mb-1">CASCADE PATH — HOW A LOCAL ISSUE BECOMES A PLANT ISSUE</p>
                            <div className="flex flex-wrap gap-1 items-center">
                              {p.cascadePath.split("→").map((s: string, i: number, arr: string[]) => (
                                <span key={i} className="flex items-center gap-1">
                                  <span className={`px-2.5 py-1.5 rounded-lg text-xs font-bold ${i === 0 ? "bg-red-600 text-white" : i === arr.length - 1 ? "bg-black text-white" : "badge badge-warn"}`}>{s.trim()}</span>
                                  {i < arr.length - 1 && <span aria-hidden="true">→</span>}
                                </span>
                              ))}
                            </div>
                            <div className="grid md:grid-cols-2 gap-3 mt-3 text-sm">
                              <div className="card-soft p-3"><b>Root cause hypothesis:</b><br /><span className="muted">{p.rootCause}</span></div>
                              <div className="card-soft p-3"><b>Playbook (do now):</b><br /><span className="muted">{playbook(p.machineCode)}</span></div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                              {!acked ? (
                                <>
                                  <button onClick={() => setAck([...ack, p.id])} className="btn btn-ink">Acknowledge & run playbook</button>
                                  <button onClick={() => { setSim({ cn03Speed: 85, airStable: 80, bufferExtra: 20, reworkReduction: 60, batchSplit: true }); setTab("simulator"); }} className="btn btn-ghost">Simulate mitigation</button>
                                </>
                              ) : <p className="font-bold text-sm" style={{ color: "var(--ok)" }}>Playbook running — owner notified, ETA tracked in Actions</p>}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                  <section className="card-ink p-5">
                    <h3 className="text-xl text-white">Risk timeline — next 8 hours (if nothing changes)</h3>
                    <div className="relative mt-8 mb-2">
                      <div className="h-2 bg-white/20 rounded" />
                      <div className="absolute top-0 h-2 bg-red-500 rounded" style={{ left: "8%", width: "18%" }} />
                      <div className="absolute top-0 h-2 bg-amber-400 rounded" style={{ left: "35%", width: "22%" }} />
                      <div className="absolute top-0 h-2 bg-red-600 rounded" style={{ left: "62%", width: "20%" }} />
                      <span className="absolute -top-6 text-xs font-bold" style={{ left: "8%" }}>47m AS-01</span>
                      <span className="absolute -top-6 text-xs font-bold" style={{ left: "38%" }}>~2h HT queue</span>
                      <span className="absolute -top-6 text-xs font-bold" style={{ left: "62%" }}>3.2h UT-C1</span>
                    </div>
                    <div className="flex justify-between text-xs text-white/50 mt-4"><span>Now</span><span>+2h</span><span>+4h</span><span>+6h</span><span>+8h / shipment</span></div>
                  </section>
                </>
              )}

              {tab === "simulator" && (
                <>
                  <div className="grid lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-2 card p-5">
                      <p className="text-sm muted">Drag levers — the plant model recalculates flow, bottlenecks & shipment risk server-side. Try fixing only CN-03 vs fixing the system.</p>
                      <div className="space-y-5 mt-5">
                        {[
                          { k: "cn03Speed", label: "Fix CN-03 micro-stops", desc: "Sensor + conveyor repair eliminates stops", suffix: "% fixed" },
                          { k: "airStable", label: "Stabilise compressed air", desc: "Stagger presses + air receiver", suffix: "% dips removed" },
                          { k: "reworkReduction", label: "Reduce QC rework loop", desc: "Fix CN-03 burr, separate rework queue", suffix: "% reduction" },
                        ].map((s) => (
                          <div key={s.k}>
                            <div className="flex justify-between text-sm"><b>{s.label}</b><span className="font-black" style={{ color: "var(--accent-deep)" }}>{(sim as AnyRec)[s.k]}{s.suffix}</span></div>
                            <p className="text-xs muted">{s.desc}</p>
                            <input className="range" type="range" min={0} max={100} value={(sim as AnyRec)[s.k]} onChange={(e) => setSim({ ...sim, [s.k]: +e.target.value })} aria-label={s.label} />
                          </div>
                        ))}
                        <div>
                          <div className="flex justify-between text-sm"><b>Extra buffer before AS-01</b><span className="font-black" style={{ color: "var(--accent-deep)" }}>+{sim.bufferExtra} parts</span></div>
                          <p className="text-xs muted">Floor space + rack — absorbs upstream stops</p>
                          <input className="range" type="range" min={0} max={30} value={sim.bufferExtra} onChange={(e) => setSim({ ...sim, bufferExtra: +e.target.value })} aria-label="Extra buffer before AS-01" />
                        </div>
                        <label className="flex items-center justify-between card-soft p-3 cursor-pointer">
                          <span className="text-sm"><b>Split HT-01 batches 40 → 2×20</b><br /><span className="text-xs muted">Slight furnace efficiency loss, big flow gain</span></span>
                          <input type="checkbox" checked={sim.batchSplit} onChange={(e) => setSim({ ...sim, batchSplit: e.target.checked })} className="w-5 h-5" />
                        </label>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => setSim({ cn03Speed: 0, airStable: 0, bufferExtra: 0, reworkReduction: 0, batchSplit: false })} className="btn btn-ghost flex-1">Reset to today</button>
                        <button onClick={() => setSim({ cn03Speed: 95, airStable: 90, bufferExtra: 25, reworkReduction: 80, batchSplit: true })} className="btn btn-primary flex-1">Apply all fixes</button>
                      </div>
                    </div>
                    <div className="lg:col-span-3 space-y-4">
                      {simError && <div className="card p-4 badge-bad">{simError}</div>}
                      {!simResult && !simError && <div className="card p-6"><div className="skeleton h-24" /></div>}
                      {simResult && (
                        <>
                          <div className="card-ink p-5">
                            <p className="text-white/60 text-xs font-bold">PREDICTED PLANT OUTPUT</p>
                            <div className="flex flex-wrap items-end gap-4 mt-1">
                              <span className="display text-6xl" style={{ color: "#e7a33a" }}>{simResult.predicted}</span>
                              <span className="text-white/60 mb-2">units/day (baseline 824, plan 1,200)</span>
                              <span className="mb-2 badge badge-ok">{simResult.gain >= 0 ? "+" : ""}{simResult.gain} units ({simResult.pct}%)</span>
                            </div>
                            <div className="h-3 bg-white/20 rounded mt-3 overflow-hidden flex"><div className="bg-red-400 h-full" style={{ width: `${824 / 12}%` }} /><div className="bg-emerald-400 h-full" style={{ width: `${simResult.gain / 12}%` }} /></div>
                            <div className="grid grid-cols-3 gap-2 mt-4 text-center text-sm">
                              <div className="rounded-xl bg-white/10 p-3"><p className="text-white/50 text-[11px] font-bold">PLANT OEE</p><b className="text-xl">{simResult.oeePredicted}%</b></div>
                              <div className="rounded-xl bg-white/10 p-3"><p className="text-white/50 text-[11px] font-bold">SAVING</p><b className="text-xl text-emerald-300">${simResult.costSavingPerDay.toLocaleString()}/d</b><p className="text-[11px] text-white/50">${(simResult.costSavingPerYear / 1000000).toFixed(2)}M/yr</p></div>
                              <div className="rounded-xl bg-white/10 p-3"><p className="text-white/50 text-[11px] font-bold">NEW BOTTLENECK</p><b className="text-sm">{simResult.bottleneck}</b></div>
                            </div>
                            <p className="mt-3 text-sm rounded-xl bg-white/10 p-3"><b>16:30 shipment:</b> {simResult.shipmentRisk}</p>
                          </div>
                          <div className="card p-5">
                            <h3 className="text-xl">What each lever buys you</h3>
                            <div className="space-y-2 mt-3">
                              {simResult.breakdown.map((b: AnyRec) => (
                                <div key={b.lever} className="flex gap-3 items-center text-sm">
                                  <span className="w-40 font-bold truncate">{b.lever}</span>
                                  <div className="flex-1 h-6 rounded overflow-hidden" style={{ background: "var(--chip)" }}><div className="h-full" style={{ width: `${Math.min(100, b.gain)}%`, background: "#e0a03a" }} /></div>
                                  <b className="w-16 text-right" style={{ color: "var(--ok)" }}>+{b.gain}</b>
                                  <span className="hidden xl:block w-64 text-xs muted truncate">{b.note}</span>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs card-soft p-3 mt-4"><b>Lesson:</b> Fixing CN-03 alone helps, but air + rework + batch fixes together move the bottleneck to the <em>true</em> capacity limit (HT-01). That&apos;s when you know hidden losses are gone.</p>
                            <button disabled={savingSim} onClick={saveSimulation} className="btn btn-ink mt-3">{savingSim ? "Saving…" : "Save this simulation as an action plan"}</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {filteredUtils.length === 0 ? <Empty title="No utilities match" body="Clear search to see air, coolant, power, and the forklift." onClear={() => setQuery("")} /> : (
                  <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
                    {filteredUtils.map((u: AnyRec) => (
                      <div key={u.id} className="card p-4">
                        <div className="flex justify-between gap-2"><b>{u.name}</b><span className={badgeClass(u.status)}>{u.status}</span></div>
                        <p className="text-3xl font-black mt-2">{u.currentLoad}% <span className="text-xs muted">load</span></p>
                        <div className="progress mt-2"><span style={{ width: `${u.currentLoad}%`, background: u.currentLoad > 85 ? "#dc2626" : "#e0a03a" }} /></div>
                        <p className="text-xs muted mt-2">{u.capacity} • {u.pressure}</p>
                        <p className="text-xs mt-2"><b>Affects:</b> {u.affects}</p>
                        <p className="text-xs muted">{u.trend}</p>
                      </div>
                    ))}
                  </div>
                  )}
                </>
              )}

              {tab === "actions" && (
                <>
                  <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm muted">Every hidden-loss fix and simulation plan, tracked. Click a card to advance status: open → in-progress → done.</p>
                      <p className="text-sm font-bold mt-1">{doneCount} of {actionTotal} done</p>
                    </div>
                    <div className="w-full sm:w-56">
                      <div className="progress"><span style={{ width: `${actionTotal ? Math.round((doneCount / actionTotal) * 100) : 0}%` }} /></div>
                    </div>
                  </div>
                  <FilterPills value={actionFilter} onChange={setActionFilter} options={["all", "open", "in-progress", "done"]} />
                  {data.interventions.length === 0 ? (
                    <Empty title="No actions yet" body="Create one from Hidden Losses, or save a simulation as a plan." actionLabel="Review hidden losses" onClear={() => setTab("losses")} />
                  ) : filteredActions.length === 0 ? (
                    <Empty title="Nothing in this tray" body="No actions match that filter." onClear={() => { setQuery(""); setActionFilter("all"); }} />
                  ) : (
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {filteredActions.map((iv: AnyRec) => {
                        const pct = iv.status === "done" ? 100 : iv.status === "in-progress" ? 62 : 28;
                        return (
                          <button key={iv.id} onClick={() => cycleIntervention(iv)} className="text-left card lift p-4">
                            <div className="flex justify-between"><span className="badge">{iv.machineCode}</span><span className={badgeClass(iv.status)}>{iv.status}</span></div>
                            <p className="font-bold mt-3 leading-snug">{iv.title}</p>
                            <p className="text-xs muted mt-2">{iv.actionType} • {iv.priority} priority<br />{iv.owner}</p>
                            <p className="text-sm font-bold mt-2" style={{ color: "var(--ok)" }}>{iv.expectedGain}</p>
                            <div className="progress mt-3"><span style={{ width: `${pct}%` }} /></div>
                            <p className="text-[11px] muted mt-2">{iv.createdAt ? new Date(iv.createdAt).toLocaleString() : ""} • click to advance status</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              <footer className="text-center text-xs muted py-4">Beyond the Factory Floor • The plant is a system — monitor the connections, not just the machines • Data: 12 machines, 4 utilities, live buffers & correlations • Apex Precision (demo plant)</footer>
            </>
          )}
        </main>
      </div>

      <nav className="bottom-nav lg:hidden" aria-label="Mobile">
        {NAV.map((item) => (
          <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
            <span className="block"><NavIcon id={item.id} /></span>
            {item.short}
          </button>
        ))}
      </nav>
    </div>
  );
}

function titleFor(tab: string) {
  if (tab === "twin") return "Apex plant floor";
  if (tab === "losses") return "Found by looking across the plant";
  if (tab === "forecast") return "Anticipate, don’t react";
  if (tab === "simulator") return "What if we fix the system?";
  if (tab === "actions") return "Owned interventions";
  return "Shift board";
}
function blurbFor(tab: string) {
  if (tab === "twin") return "Digital Twin — Apex Plant Floor. Positions, buffers, and flows in one map.";
  if (tab === "losses") return "Each pattern is invisible to single-machine monitoring. Ranked by cost. Gross loss 601 u/day (overlaps net to 376).";
  if (tab === "forecast") return "Predictions combine buffer drain rates, vibration trends, tool life and cross-machine correlations — hours before a line stop.";
  if (tab === "simulator") return "What-if simulator. Recalculated on the server as you move each lever.";
  if (tab === "actions") return "Actions & interventions created from hidden losses and saved simulations.";
  return "Apex Precision Components — Toledo • EV drivetrain housings. Plant-wide, not machine-by-machine.";
}
function FilterPills({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter">
      {options.map((o) => (
        <button key={o} type="button" className={value === o ? "chip chip-on" : "chip"} aria-pressed={value === o} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}
function Empty({ title, body, onClear, actionLabel = "Clear filters" }: { title: string; body: string; onClear?: () => void; actionLabel?: string }) {
  return (
    <div className="card p-10 text-center">
      <p className="display text-3xl">{title}</p>
      <p className="muted mt-2">{body}</p>
      {onClear && <button className="btn btn-primary mt-4" onClick={onClear}>{actionLabel}</button>}
    </div>
  );
}
function SkeletonBoard() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading plant">
      <div className="skeleton h-36" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-28" />)}</div>
      <div className="skeleton h-64" />
    </div>
  );
}
function NavIcon({ id }: { id: string }) {
  const p = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, "aria-hidden": true as const };
  if (id === "twin") return <svg {...p}><path d="M4 7l6-3 5 3 5-2v13l-5 2-5-3-6 3V7z" /></svg>;
  if (id === "losses") return <svg {...p}><circle cx="11" cy="11" r="6" /><path d="M20 20l-3.5-3.5" /></svg>;
  if (id === "forecast") return <svg {...p}><path d="M3 12h4l2-5 4 10 2-5h6" /></svg>;
  if (id === "simulator") return <svg {...p}><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="2" /><circle cx="15" cy="17" r="2" /></svg>;
  if (id === "actions") return <svg {...p}><path d="M5 12l4 4L19 6" /></svg>;
  return <svg {...p}><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>;
}

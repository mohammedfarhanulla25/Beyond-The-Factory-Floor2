"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

const FEATURES = [
  { href: "/control-room?tab=twin", kicker: "01", title: "Digital twin of the floor", body: "See every machine, buffer, and shared utility in one map. Starved, blocked, and degraded states show up even when the HMI says normal.", icon: "map" },
  { href: "/control-room?tab=losses", kicker: "02", title: "Hidden loss patterns", body: "Micro-stops, air dips, rework loops, and batch waves that never trip a downtime code — ranked by units and dollars.", icon: "search" },
  { href: "/control-room?tab=forecast", kicker: "03", title: "Cascade forecasts", body: "Know which local wobble becomes a missed truck. Probability, minutes-to-impact, and the path between machines.", icon: "pulse" },
  { href: "/control-room?tab=simulator", kicker: "04", title: "What-if simulator", body: "Drag the levers — conveyor fix, air receiver, extra buffer, rework cut, split batches — and watch the bottleneck move.", icon: "sliders" },
  { href: "/control-room?tab=overview", kicker: "05", title: "Machine vs plant OEE", body: "A live divergence chart. If you only watch machines, you miss starvation, blocking, and shared-resource waits.", icon: "split" },
  { href: "/control-room?tab=actions", kicker: "06", title: "Actions with owners", body: "Turn a finding into a tracked intervention. Advance it from open to in progress to done without leaving the floor view.", icon: "check" },
];

const FAQS = [
  { q: "Why do machines look healthy while the plant is slow?", a: "Single-machine OEE ignores the space between assets. Short stops under the logging threshold, shared air pressure dips, rework counted as production, and batch waves all leave every HMI green while finished goods fall behind plan." },
  { q: "What does the control room actually watch?", a: "Twelve machines across stamping, machining, heat treat, assembly, quality, and pack — plus four shared utilities: compressed air, coolant, power, and the forklift. Buffers, correlations, and timing coincidences are first-class signals." },
  { q: "Will this replace our machine HMIs?", a: "No. HMIs stay the source of truth for a single asset. Beyond the Factory Floor sits above them and asks a different question: how does a change in one bay move the whole line?" },
  { q: "Can we test a fix before touching the line?", a: "Yes. The what-if simulator recalculates flow, the new bottleneck, shipment risk, and daily savings on the server. Save any scenario as an action plan." },
  { q: "Is the Toledo plant live data?", a: "This is a working demo of Apex Precision Components — EV drivetrain housings, Shift B, order #8841. The control room reads a real PostgreSQL model: machines, telemetry, losses, forecasts, utilities, and interventions." },
  { q: "Who is it for?", a: "Plant managers, reliability engineers, and shift supervisors who are tired of chasing healthy machines while the truck leaves short." },
];

function Icon({ name }: { name: string }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, "aria-hidden": true as const };
  if (name === "map") return <svg {...common}><path d="M4 7l6-3 5 3 5-2v13l-5 2-5-3-6 3V7z" /><path d="M10 4v13M15 7v13" /></svg>;
  if (name === "search") return <svg {...common}><circle cx="11" cy="11" r="6" /><path d="M20 20l-3.5-3.5" /></svg>;
  if (name === "pulse") return <svg {...common}><path d="M3 12h4l2-5 4 10 2-5h6" /></svg>;
  if (name === "sliders") return <svg {...common}><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="2" /><circle cx="15" cy="17" r="2" /></svg>;
  if (name === "split") return <svg {...common}><path d="M4 16c3-8 5-8 8 0s5 8 8 0" /><path d="M4 10c3 6 5 6 8-2" /></svg>;
  return <svg {...common}><path d="M5 12l4 4L19 6" /></svg>;
}

export default function LandingPage() {
  const [open, setOpen] = useState<number | null>(0);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div>
      <header className="nav-blur" style={{ boxShadow: scrolled ? "var(--shadow)" : "none" }}>
        <div className="max-w-[1180px] mx-auto px-4 md:px-6 h-[72px] flex items-center justify-between gap-4">
          <Logo />
          <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
            <a className="nav-link" href="#features">Features</a>
            <a className="nav-link" href="#how">How it works</a>
            <a className="nav-link" href="#benefits">Benefits</a>
            <a className="nav-link" href="#stories">Stories</a>
            <a className="nav-link" href="#faq">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <Link href="/control-room" className="btn btn-primary hidden sm:inline-flex">Get Started</Link>
            <button type="button" className="btn-ghost lg:hidden" aria-expanded={menu} aria-label="Open menu" onClick={() => setMenu((v) => !v)}>Menu</button>
          </div>
        </div>
        {menu && (
          <div className="lg:hidden border-t px-4 py-4 grid gap-2" style={{ borderColor: "var(--line)", background: "var(--elev)" }}>
            {[["#features", "Features"], ["#how", "How it works"], ["#benefits", "Benefits"], ["#stories", "Stories"], ["#faq", "FAQ"]].map(([href, label]) => (
              <a key={href} href={href} className="nav-link" onClick={() => setMenu(false)}>{label}</a>
            ))}
            <Link href="/control-room" className="btn btn-primary" onClick={() => setMenu(false)}>Get Started</Link>
          </div>
        )}
      </header>

      <main id="main">
        <section className="hero-grid text-white" style={{ background: "radial-gradient(900px 420px at 12% -10%, rgba(224,160,58,.35), transparent 60%), radial-gradient(700px 380px at 100% 0%, rgba(28,107,93,.35), transparent 55%), #14110e" }}>
          <div className="max-w-[1180px] mx-auto px-4 md:px-6 py-16 md:py-24 grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 rise">
              <p className="kicker" style={{ color: "#e7a33a" }}>Apex Precision · Toledo · Shift B</p>
              <h1 className="display text-[3.1rem] md:text-7xl mt-4 text-white">The loss lives between the machines.</h1>
              <p className="mt-5 text-lg text-white/75 max-w-xl">Beyond the Factory Floor is plant-wide intelligence for operations leaders. It connects machines, buffers, utilities, and rework loops so you can find hidden inefficiencies and stop disruptions before the line does.</p>
              <div className="flex flex-wrap gap-3 mt-8">
                <Link href="/control-room" className="btn btn-primary">Get Started</Link>
                <a href="#features" className="btn btn-secondary" style={{ color: "white", borderColor: "rgba(255,255,255,.45)" }}>Learn More</a>
              </div>
              <dl className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
                <div><dt className="text-white/50 text-xs font-bold tracking-wide">MACHINE OEE</dt><dd className="display text-3xl text-emerald-300">87%</dd></div>
                <div><dt className="text-white/50 text-xs font-bold tracking-wide">PLANT OEE</dt><dd className="display text-3xl text-red-300">57%</dd></div>
                <div><dt className="text-white/50 text-xs font-bold tracking-wide">HIDDEN / DAY</dt><dd className="display text-3xl" style={{ color: "#e7a33a" }}>$60k</dd></div>
              </dl>
            </div>
            <div className="lg:col-span-6 rise rise-2 relative">
              <div className="rounded-[28px] overflow-hidden border border-white/10 shadow-2xl bg-[#1c1712]">
                <img src="/images/hero-system.png" alt="Illustrated plant line with copper and teal connections between machines" className="w-full h-auto object-cover" />
              </div>
              <div className="absolute -left-3 bottom-6 card-ink px-4 py-3 max-w-[230px] hidden md:block">
                <p className="text-[11px] uppercase tracking-widest text-white/50">Next disruption</p>
                <p className="font-bold mt-1">AS-01 starves in 47 min</p>
                <div className="progress mt-2"><span style={{ width: "88%", background: "#e7a33a" }} /></div>
                <p className="text-xs text-white/60 mt-1">88% probability · not a machine fault</p>
              </div>
              <div className="absolute -right-2 top-6 hidden md:block rounded-2xl px-4 py-3 bg-white text-[#1c1712] shadow-xl">
                <p className="text-[11px] font-bold text-[#6a6158]">ORDER #8841</p>
                <p className="font-bold">1,050 by 16:30</p>
                <p className="text-sm text-[#9f1d14]">Tracking 824 units</p>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-[1180px] mx-auto px-4 md:px-6 -mt-8 relative z-10">
          <div className="card grid grid-cols-2 md:grid-cols-4 overflow-hidden">
            {[
              ["12", "Machines on the twin"],
              ["4", "Shared utilities watched"],
              ["6", "Hidden patterns found"],
              ["47m", "Lead time on the next stop"],
            ].map(([n, l]) => (
              <div key={l} className="p-5 md:p-6 border-b md:border-b-0 md:border-r last:border-0" style={{ borderColor: "var(--line)" }}>
                <p className="display text-4xl">{n}</p>
                <p className="muted text-sm mt-1">{l}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="max-w-[1180px] mx-auto px-4 md:px-6 py-20">
          <div className="flex flex-wrap justify-between gap-4 items-end mb-8">
            <div>
              <p className="kicker">Features</p>
              <h2 className="display text-4xl md:text-5xl mt-2 max-w-xl">A control room, not another machine dashboard.</h2>
            </div>
            <p className="muted max-w-sm">Every card opens the live tool. Same data, same actions — just a floor you can actually navigate.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <Link key={f.title} href={f.href} className="card lift p-5 no-underline block">
                <div className="flex items-center justify-between">
                  <span className="grid place-items-center w-11 h-11 rounded-2xl" style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}><Icon name={f.icon} /></span>
                  <span className="kicker">{f.kicker}</span>
                </div>
                <h3 className="text-2xl mt-5">{f.title}</h3>
                <p className="muted text-sm mt-2">{f.body}</p>
                <span className="inline-block mt-4 text-sm font-bold" style={{ color: "var(--accent-deep)" }}>Open in control room →</span>
              </Link>
            ))}
          </div>
        </section>

        <section id="how" className="py-16" style={{ background: "var(--bg-alt)" }}>
          <div className="max-w-[1180px] mx-auto px-4 md:px-6">
            <p className="kicker">How it works</p>
            <h2 className="display text-4xl md:text-5xl mt-2 mb-10">Three moves. No new downtime codes required.</h2>
            <ol className="grid lg:grid-cols-3 gap-4">
              {[
                ["01", "Map the connections", "Machines, buffers, compressed air, coolant, the forklift, and the quiet rework path from quality back to CNC."],
                ["02", "Find the hidden gap", "Correlate stops under two minutes, pressure dips, and queues. The plant OEE gap is the story the HMIs never tell."],
                ["03", "Act before the cascade", "Forecasts, playbooks, and a simulator that shows when the true bottleneck — not the noisy one — is all that’s left."],
              ].map(([n, t, b]) => (
                <li key={n} className="card p-6">
                  <span className="display text-5xl" style={{ color: "var(--accent-deep)" }}>{n}</span>
                  <h3 className="text-2xl mt-4">{t}</h3>
                  <p className="muted mt-2">{b}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="benefits" className="max-w-[1180px] mx-auto px-4 md:px-6 py-20 grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <p className="kicker">Benefits</p>
            <h2 className="display text-4xl md:text-5xl mt-2">Stop repairing machines that aren’t broken.</h2>
            <ul className="mt-6 grid gap-3">
              {[
                ["Ship the 16:30 truck", "See the unit gap while there is still time to move buffer, stagger presses, or call overtime."],
                ["Trust the ranking", "Losses are scored by units, dollars, correlation, and confidence — not by whoever shouts loudest at standup."],
                ["Treat utilities as the line", "Air, coolant, and the forklift are on the twin because they slow six machines at once."],
                ["Leave a paper trail", "Every recommendation can become an owned action with status you can advance on the floor."],
              ].map(([t, b]) => (
                <li key={t} className="card-soft p-4">
                  <p className="font-bold">{t}</p>
                  <p className="muted text-sm mt-1">{b}</p>
                </li>
              ))}
            </ul>
          </div>
          <figure className="relative">
            <img src="https://images.pexels.com/photos/18471453/pexels-photo-18471453.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1200" alt="Automated machining cell on a precision factory floor" className="rounded-[28px] w-full h-[460px] object-cover" />
            <figcaption className="card absolute left-4 bottom-4 right-4 p-4">
              <p className="text-sm font-bold">AS-01 health score 95. Output halved.</p>
              <p className="muted text-sm">Starved by upstream micro-stops — a downstream symptom, not a broken cell.</p>
            </figcaption>
          </figure>
        </section>

        <section id="stories" className="py-16" style={{ background: "var(--bg-alt)" }}>
          <div className="max-w-[1180px] mx-auto px-4 md:px-6">
            <p className="kicker">From the floor</p>
            <h2 className="display text-4xl md:text-5xl mt-2 mb-8">What changes when you watch the connections.</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                ["https://images.pexels.com/photos/38758067/pexels-photo-38758067.png?auto=compress&cs=tinysrgb&fit=crop&h=240&w=240", "Lena Ortiz", "Plant manager", "We were celebrating 88% machine OEE while missing the 16:30 truck. The gap was stops too short to log."],
                ["https://images.pexels.com/photos/28943401/pexels-photo-28943401.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=240&w=240", "Marcus Hale", "Reliability engineer", "The compressor never alarmed. Six CNCs just got ‘a bit slow’ together. That’s a utility problem wearing a machining costume."],
                ["https://images.pexels.com/photos/39974544/pexels-photo-39974544.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=240&w=240", "Priya Shah", "Shift supervisor", "I don’t need another Pareto. I need the next 47 minutes and a playbook I can hand to maintenance."],
              ].map(([img, name, role, quote]) => (
                <figure key={name} className="card p-5">
                  <img src={img} alt="" className="w-14 h-14 rounded-full object-cover" />
                  <blockquote className="mt-4 text-[15px] leading-relaxed">“{quote}”</blockquote>
                  <figcaption className="mt-4 text-sm"><b>{name}</b><span className="muted"> · {role}</span></figcaption>
                </figure>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {[["−30 pts", "OEE gap explained"], ["601 u", "Hidden loss / day"], ["$15.0M", "Annualized stake"], ["r = 0.91", "Stop → starve link"]].map(([n, l]) => (
                <div key={l} className="card p-4 text-center"><p className="display text-3xl">{n}</p><p className="muted text-xs mt-1">{l}</p></div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="max-w-[860px] mx-auto px-4 md:px-6 py-20">
          <p className="kicker">FAQ</p>
          <h2 className="display text-4xl md:text-5xl mt-2 mb-6">Questions from the morning meeting.</h2>
          <div className="card divide-y" style={{ borderColor: "var(--line)" }}>
            {FAQS.map((item, i) => {
              const isOpen = open === i;
              return (
                <div key={item.q} className="px-5" style={{ borderColor: "var(--line)" }}>
                  <button type="button" className="w-full text-left py-4 flex items-center justify-between gap-4 font-bold" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)}>
                    {item.q}
                    <span aria-hidden="true" className="text-xl muted">{isOpen ? "–" : "+"}</span>
                  </button>
                  {isOpen && <p className="muted pb-4 text-sm">{item.a}</p>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="max-w-[1180px] mx-auto px-4 md:px-6 pb-20">
          <div className="card-ink p-8 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="kicker" style={{ color: "#e7a33a" }}>Open the floor</p>
              <h2 className="display text-4xl md:text-5xl mt-2 text-white">The line is already telling you. Listen between the machines.</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/control-room" className="btn btn-primary">Get Started</Link>
              <a href="#features" className="btn btn-secondary" style={{ color: "white", borderColor: "rgba(255,255,255,.4)" }}>Learn More</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t" style={{ borderColor: "var(--line)", background: "var(--bg-alt)" }}>
        <div className="max-w-[1180px] mx-auto px-4 md:px-6 py-12 grid md:grid-cols-4 gap-8">
          <div>
            <Logo />
            <p className="muted text-sm mt-4">Plant-wide intelligence for teams who are done celebrating healthy machines while the truck leaves short.</p>
          </div>
          <div>
            <p className="font-bold mb-3">Product</p>
            <ul className="grid gap-2 text-sm muted">
              <li><Link href="/control-room">Control room</Link></li>
              <li><Link href="/control-room?tab=twin">Digital twin</Link></li>
              <li><Link href="/control-room?tab=losses">Hidden losses</Link></li>
              <li><Link href="/control-room?tab=simulator">Simulator</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-bold mb-3">Plant</p>
            <ul className="grid gap-2 text-sm muted">
              <li>Apex Precision, Toledo</li>
              <li>EV drivetrain housings</li>
              <li>Shift B · 06:00–18:00</li>
              <li>Order #8841 · 16:30</li>
            </ul>
          </div>
          <div>
            <p className="font-bold mb-3">Social</p>
            <div className="flex gap-2">
              <a href="https://www.linkedin.com" aria-label="LinkedIn" target="_blank" rel="noreferrer" className="grid place-items-center w-10 h-10 rounded-full border" style={{ borderColor: "var(--line)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V24h-4V8.5zM8.5 8.5h3.8v2.1h.05c.53-1 1.84-2.1 3.79-2.1 4.05 0 4.8 2.67 4.8 6.14V24h-4v-7.7c0-1.84-.03-4.2-2.56-4.2-2.56 0-2.95 2-2.95 4.06V24h-4V8.5z" /></svg>
              </a>
              <a href="https://x.com" aria-label="X" target="_blank" rel="noreferrer" className="grid place-items-center w-10 h-10 rounded-full border" style={{ borderColor: "var(--line)" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.2 2H21l-6.5 7.4L22 22h-6.8l-4.7-6.1L5.6 22H2.8l7-8L2 2h7l4.2 5.6L18.2 2zm-1.2 18h1.9L7.1 3.9H5.1L17 20z" /></svg>
              </a>
              <a href="https://www.youtube.com" aria-label="YouTube" target="_blank" rel="noreferrer" className="grid place-items-center w-10 h-10 rounded-full border" style={{ borderColor: "var(--line)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23 12.2s0-3.2-.4-4.6c-.2-.9-.9-1.6-1.8-1.8C19.2 5.4 12 5.4 12 5.4s-7.2 0-8.8.4c-.9.2-1.6.9-1.8 1.8C1 9 1 12.2 1 12.2s0 3.2.4 4.6c.2.9.9 1.6 1.8 1.8 1.6.4 8.8.4 8.8.4s7.2 0 8.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.4.4-4.6.4-4.6zM9.8 15.5v-6.6l6.2 3.3-6.2 3.3z" /></svg>
              </a>
            </div>
          </div>
        </div>
        <p className="text-center text-xs muted pb-8">Beyond the Factory Floor · The plant is a system — monitor the connections, not just the machines.</p>
      </footer>
    </div>
  );
}

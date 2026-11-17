import { db } from "@/db";
import { machines, inefficiencies, predictions, telemetry, utilities, interventions } from "@/db/schema";

let seeded = false;

export async function ensureSeed() {
  if (seeded) return;
  try {
    const existing = await db.select().from(machines).limit(1);
    if (existing.length > 0) { seeded = true; return; }

    await db.insert(machines).values([
      { code:"ST-01", name:"Stamping Press 1", type:"Stamping", zone:"Stamping", line:"Main", status:"running", nominalRate:120, currentRate:112, oee:89, healthScore:92, tempC:62, vibration:2.1, powerKw:84, cycleTimeSec:32, bufferLevel:78, bufferCapacity:60, x:70, y:90, upstream:"Raw Coil", downstream:"CN-01, CN-03" },
      { code:"ST-02", name:"Stamping Press 2", type:"Stamping", zone:"Stamping", line:"Main", status:"running", nominalRate:120, currentRate:98, oee:84, healthScore:88, tempC:66, vibration:2.8, powerKw:79, cycleTimeSec:36, bufferLevel:62, bufferCapacity:60, x:70, y:210, upstream:"Raw Coil", downstream:"CN-02, CN-04" },
      { code:"CN-01", name:"CNC Mill Alpha", type:"CNC Mill", zone:"Machining", line:"Main", status:"running", nominalRate:95, currentRate:88, oee:91, healthScore:94, tempC:48, vibration:1.9, powerKw:42, cycleTimeSec:41, bufferLevel:55, bufferCapacity:40, x:270, y:60, upstream:"ST-01", downstream:"HT-01" },
      { code:"CN-02", name:"CNC Mill Beta", type:"CNC Mill", zone:"Machining", line:"Main", status:"blocked", nominalRate:95, currentRate:61, oee:76, healthScore:81, tempC:53, vibration:3.4, powerKw:38, cycleTimeSec:58, bufferLevel:94, bufferCapacity:40, x:270, y:160, upstream:"ST-02, QC-01 (rework)", downstream:"HT-01" },
      { code:"CN-03", name:"CNC Lathe Gamma", type:"CNC Lathe", zone:"Machining", line:"Main", status:"degraded", nominalRate:90, currentRate:54, oee:82, healthScore:79, tempC:57, vibration:4.6, powerKw:36, cycleTimeSec:67, bufferLevel:18, bufferCapacity:40, x:270, y:260, upstream:"ST-01", downstream:"AS-01" },
      { code:"CN-04", name:"CNC Lathe Delta", type:"CNC Lathe", zone:"Machining", line:"Main", status:"running", nominalRate:90, currentRate:84, oee:88, healthScore:90, tempC:50, vibration:2.2, powerKw:39, cycleTimeSec:43, bufferLevel:48, bufferCapacity:40, x:270, y:360, upstream:"ST-02", downstream:"AS-02" },
      { code:"HT-01", name:"Heat Treat Furnace", type:"Heat Treat", zone:"Heat Treat", line:"Main", status:"running", nominalRate:80, currentRate:73, oee:86, healthScore:87, tempC:842, vibration:1.2, powerKw:210, cycleTimeSec:49, bufferLevel:88, bufferCapacity:80, x:480, y:110, upstream:"CN-01, CN-02", downstream:"AS-01, AS-02" },
      { code:"AS-01", name:"Assembly Cell A", type:"Assembly", zone:"Assembly", line:"Main", status:"starved", nominalRate:85, currentRate:41, oee:63, healthScore:95, tempC:24, vibration:0.8, powerKw:18, cycleTimeSec:88, bufferLevel:12, bufferCapacity:30, x:650, y:80, upstream:"CN-03, HT-01", downstream:"QC-01" },
      { code:"AS-02", name:"Assembly Cell B", type:"Assembly", zone:"Assembly", line:"Main", status:"running", nominalRate:85, currentRate:79, oee:87, healthScore:93, tempC:25, vibration:0.9, powerKw:19, cycleTimeSec:45, bufferLevel:61, bufferCapacity:30, x:650, y:220, upstream:"CN-04, HT-01", downstream:"QC-01" },
      { code:"QC-01", name:"Vision Quality Gate", type:"Quality", zone:"Quality", line:"Main", status:"running", nominalRate:160, currentRate:118, oee:84, healthScore:89, tempC:26, vibration:0.6, powerKw:12, cycleTimeSec:30, bufferLevel:44, bufferCapacity:50, x:650, y:350, upstream:"AS-01, AS-02", downstream:"PK-01, CN-02 (rework)" },
      { code:"PK-01", name:"Pack & Label", type:"Packaging", zone:"Packaging", line:"Main", status:"starved", nominalRate:150, currentRate:92, oee:71, healthScore:96, tempC:23, vibration:1.1, powerKw:14, cycleTimeSec:39, bufferLevel:22, bufferCapacity:50, x:830, y:210, upstream:"QC-01", downstream:"Finished Goods" },
      { code:"UT-C1", name:"Air Compressor #1", type:"Utility", zone:"Utilities", line:"Shared", status:"degraded", nominalRate:100, currentRate:68, oee:78, healthScore:64, tempC:91, vibration:6.8, powerKw:132, cycleTimeSec:0, bufferLevel:71, bufferCapacity:100, x:480, y:340, upstream:"—", downstream:"ST-01, ST-02, CN-01..04" },
    ]);

    await db.insert(inefficiencies).values([
      { title:"CN-03 micro-stops starve Assembly A", category:"Micro-stops / Starvation", severity:"critical", machinesInvolved:"CN-03 → AS-01 → QC-01 → PK-01", description:"CN-03 stops 42× per shift for 38–110 seconds — below the 2-min logging threshold, so it reports 82% OEE and 'normal'. Each stop drains the 12-part buffer to AS-01. Assembly idles, then rushes, causing handling defects downstream.", evidence:"42 micro-stops today • AS-01 starved 23% of shift • Buffer empty 17 times • Correlation stop→starve r = 0.91", correlation:0.91, lossUnitsPerDay:184, costPerDay:18400, confidence:94, recommendation:"Fit CN-03 chip conveyor sensor + auto-log stops >20s. Add 15-part buffer before AS-01.", hiddenReason:"Stops too short to trigger existing downtime codes — invisible to machine-level OEE." },
      { title:"Shared air pressure dip slows 6 machines at once", category:"Shared Utility Coupling", severity:"critical", machinesInvolved:"UT-C1 → ST-01, ST-02, CN-01–CN-04", description:"When both stamping presses fire within 4s, compressor pressure falls from 118 → 94 psi. CNC pneumatic clamps respond by extending cycle time +18% for 2–3 minutes. No machine alarms — each just looks 'a bit slow'.", evidence:"Pressure <100 psi for 19% of shift • Cycle time +18.4% during dips • Coincidence window r = 0.89", correlation:0.89, lossUnitsPerDay:142, costPerDay:14200, confidence:92, recommendation:"Stagger ST-01/ST-02 firing by 6s in PLC + add 500L air receiver. Schedule UT-C1 service.", hiddenReason:"Utility not monitored per-machine. Cause is in Utilities, symptom spreads across Machining." },
      { title:"Invisible rework loop QC-01 → CN-02", category:"Quality Rework Loop", severity:"high", machinesInvolved:"QC-01 → CN-02 → HT-01", description:"7.3% of parts rejected at vision inspection are quietly re-routed to CN-02 for re-machining. They count as CN-02 load but not as new output, inflating its utilisation while stealing 11 hrs/week of capacity from first-pass parts.", evidence:"7.3% rework rate • CN-02 blocked 31% • First-pass yield 89.1% vs reported 96.4%", correlation:0.84, lossUnitsPerDay:96, costPerDay:9600, confidence:89, recommendation:"Root-cause burr on CN-03 output (feeds 68% of rejects). Separate rework queue with own KPI.", hiddenReason:"MES counts rework as production. Plant yield looks fine, capacity silently disappears." },
      { title:"Heat-treat batch mismatch creates WIP waves", category:"Batch / Flow Mismatch", severity:"high", machinesInvolved:"CN-01, CN-02 → HT-01 → AS-01, AS-02", description:"HT-01 runs in batches of 40 every 49 min, but Assembly consumes continuously at 1 part / 45s. Result: Assembly starves for 31 min, then is flooded. Average flow time is 3.2× the theoretical minimum, despite every machine being 'busy'.", evidence:"WIP before HT-01 swings 8 → 76 parts • Flow time 214 min vs 67 min ideal • AS idle-then-surge pattern", correlation:0.81, lossUnitsPerDay:78, costPerDay:7800, confidence:87, recommendation:"Split HT-01 into 2×20 batches or add heated buffer lane. Pull-signal from AS-01.", hiddenReason:"Batch efficiency (full furnace) is optimised locally, destroying line flow globally." },
      { title:"Forklift contention at shift-change & QC surge", category:"Material Handling Contention", severity:"medium", machinesInvolved:"Warehouse → ST-01, CN-03, PK-01", description:"One forklift serves raw coil, CN-03 blanks and finished pallets. At 13:45–14:20 demand triples. CN-03 waits for blanks 4× longer — recorded as 'operator wait', not machine fault, so it never appears in downtime Pareto.", evidence:"Material wait 6 min → 24 min at 14:00 • 3 zones compete • Forklift utilisation 97% in window", correlation:0.76, lossUnitsPerDay:54, costPerDay:5400, confidence:82, recommendation:"Stagger PK-01 pallet call by 20 min + pre-stage CN-03 blanks before shift change.", hiddenReason:"Shared resource with no sensor. Wait time coded differently in each zone." },
      { title:"Afternoon coolant drift extends CN cycle times", category:"Thermal / Utility Drift", severity:"medium", machinesInvolved:"Coolant Loop → CN-01–CN-04", description:"Coolant rises 21°C → 29°C by 15:00 on warm days. Controllers compensate with slower feeds to protect surface finish. Gradual, within tolerance, never alarms — but costs 9% machining speed every afternoon.", evidence:"Coolant temp vs cycle time r = 0.78 • Afternoon speed -9.2% • No alarm threshold crossed", correlation:0.78, lossUnitsPerDay:47, costPerDay:4700, confidence:85, recommendation:"Service chiller, add coolant temp to CNC feed-forward. Alert at 26°C, not 32°C.", hiddenReason:"Slow drift within spec. Day-level OEE hides the within-day pattern." },
    ]);

    await db.insert(predictions).values([
      { title:"AS-01 will starve & stop the line", machineCode:"AS-01", severity:"critical", probability:88, minutesToImpact:47, impactUnits:64, cascadePath:"CN-03 micro-stops → Buffer B-07 empties → AS-01 starved → QC-01 idle → PK-01 missed truck", rootCause:"CN-03 chip conveyor intermittent + buffer at 12% and falling 1.8%/min", signal:"Buffer drain rate + CN-03 stop frequency up 3× in last hour" },
      { title:"Compressor UT-C1 bearing failure risk", machineCode:"UT-C1", severity:"critical", probability:78, minutesToImpact:192, impactUnits:210, cascadePath:"UT-C1 trip → Pressure loss → ST + all CNC clamp faults → Plant stop", rootCause:"Vibration 6.8 mm/s rising 0.4/day for 6 days, temp 91°C, oil particle count high", signal:"Vibration trend + temp + pressure recovery time lengthening" },
      { title:"HT-01 queue overflow & overtime needed", machineCode:"HT-01", severity:"high", probability:71, minutesToImpact:118, impactUnits:88, cascadePath:"CN surge after pressure recovery → HT-01 queue >80 → AS-02 blocked → Overtime", rootCause:"WIP before furnace at 68 and rising, batch cycle fixed", signal:"Queue growth 0.6 parts/min sustained 40 min" },
      { title:"QC-01 reject spike from CN-03 burr", machineCode:"QC-01", severity:"high", probability:66, minutesToImpact:84, impactUnits:52, cascadePath:"CN-03 tool wear → Burr ↑ → QC rejects ↑ → CN-02 rework overload", rootCause:"CN-03 tool at 87% life, reject rate 4.1% → 7.3% today", signal:"Vision reject clustering on CN-03 parts (68% of rejects)" },
      { title:"PK-01 will miss 16:30 shipment", machineCode:"PK-01", severity:"medium", probability:62, minutesToImpact:146, impactUnits:120, cascadePath:"Upstream starvation → PK-01 at 61% rate → Shipment short 120 units", rootCause:"Cumulative upstream loss 268 units today already", signal:"Finished goods trajectory 18% below plan at current rate" },
    ]);

    const telemetryData = [
      ["06:00",0,95,94,88,71,116,3],["07:00",1,98,96,90,73,117,4],["08:00",2,100,92,89,70,112,6],["09:00",3,100,88,88,66,108,9],["10:00",4,100,90,87,68,115,7],["11:00",5,100,81,87,61,102,14],["12:00",6,95,74,86,55,96,18],["13:00",7,100,79,86,59,101,12],["14:00",8,100,68,85,49,94,21],["15:00",9,100,72,87,53,99,16],["16:00",10,100,76,86,57,104,11],["17:00",11,98,84,88,64,111,8],
    ] as const;
    await db.insert(telemetry).values(telemetryData.map(d=>({ hourLabel:d[0], hourIndex:d[1], planned:d[2], actual:d[3], machineAvgOee:d[4], plantOee:d[5], compressorPsi:d[6], microStops:d[7] })));

    await db.insert(utilities).values([
      { name:"Compressed Air", code:"AIR", currentLoad:87, capacity:"118 psi • 240 CFM", pressure:"94–118 psi (swinging)", status:"degraded", trend:"+ demand peaks when presses coincide", affects:"ST-01, ST-02, CN-01–CN-04" },
      { name:"Coolant Loop", code:"COOL", currentLoad:74, capacity:"29°C (limit 32°C)", pressure:"21→29°C daily drift", status:"warning", trend:"Chiller efficiency -14% this month", affects:"CN-01–CN-04" },
      { name:"Electrical Power", code:"PWR", currentLoad:68, capacity:"612 kW / 900 kW", pressure:"Stable 480V", status:"healthy", trend:"HT-01 is 34% of plant load", affects:"All zones" },
      { name:"Material Handling", code:"FORK", currentLoad:91, capacity:"1 forklift • 3 zones", pressure:"Wait 6→24 min @14:00", status:"degraded", trend:"Contention window widening", affects:"ST-01, CN-03, PK-01" },
    ]);

    await db.insert(interventions).values([
      { title:"Inspect CN-03 chip conveyor sensor", machineCode:"CN-03", actionType:"Maintenance", priority:"High", expectedGain:"+90 units/day", owner:"M. Alvarez — Maintenance", status:"open" },
      { title:"Stagger ST-01 / ST-02 press timing in PLC", machineCode:"UT-C1", actionType:"Process Change", priority:"High", expectedGain:"+70 units/day", owner:"J. Park — Controls", status:"in-progress" },
    ]);

    seeded = true;
  } catch (e) {
    console.error("seed error", e);
  }
}

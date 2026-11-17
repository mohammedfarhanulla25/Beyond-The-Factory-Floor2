import { NextResponse } from "next/server";
import { db } from "@/db";
import { machines, inefficiencies, predictions, telemetry, utilities, interventions } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { asc, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();
  const [m, ineff, pred, tel, util, interv] = await Promise.all([
    db.select().from(machines),
    db.select().from(inefficiencies),
    db.select().from(predictions).orderBy(asc(predictions.minutesToImpact)),
    db.select().from(telemetry).orderBy(asc(telemetry.hourIndex)),
    db.select().from(utilities),
    db.select().from(interventions).orderBy(desc(interventions.createdAt)),
  ]);
  // computed KPIs
  const totalLoss = ineff.reduce((s,i)=>s+i.lossUnitsPerDay,0);
  const totalCost = ineff.reduce((s,i)=>s+i.costPerDay,0);
  const avgMachineOee = m.length ? m.reduce((s,x)=>s+x.oee,0)/m.length : 0;
  return NextResponse.json({ machines:m, inefficiencies:ineff, predictions:pred, telemetry:tel, utilities:util, interventions:interv, kpis:{ totalLoss, totalCost, avgMachineOee: Math.round(avgMachineOee*10)/10, plantOee:57, plantRate:824, plannedRate:1200 } });
}

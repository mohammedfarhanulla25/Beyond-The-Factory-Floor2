import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { interventions, inefficiencies } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  await ensureSeed();
  const body = await req.json();
  const [row] = await db.insert(interventions).values({
    title: body.title,
    machineCode: body.machineCode || "—",
    actionType: body.actionType || "Investigation",
    priority: body.priority || "High",
    expectedGain: body.expectedGain || "+ units/day",
    owner: body.owner || "Shift Supervisor",
    status: "open",
    sourceInefficiencyId: body.sourceInefficiencyId || null,
  }).returning();
  if (body.sourceInefficiencyId) {
    await db.update(inefficiencies).set({ status:"action_created" }).where(eq(inefficiencies.id, body.sourceInefficiencyId));
  }
  return NextResponse.json(row);
}
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  await db.update(interventions).set({ status: body.status }).where(eq(interventions.id, body.id));
  return NextResponse.json({ ok:true });
}

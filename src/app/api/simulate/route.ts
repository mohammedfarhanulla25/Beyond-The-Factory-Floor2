import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const b = await req.json();
  const cn03Speed = b.cn03Speed ?? 60; // % improvement in effective rate
  const airPressureStable = b.airStable ?? 50; // % of dips eliminated
  const bufferExtra = b.bufferExtra ?? 0; // extra parts
  const reworkReduction = b.reworkReduction ?? 0; // %
  const batchSplit = b.batchSplit ?? false;

  // Base plant: planned 1200/day, actual 824
  let gain = 0;
  const breakdown: any[] = [];
  const cnGain = Math.round((cn03Speed/100) * 110); // fixing microstops up to 110
  gain += cnGain; breakdown.push({ lever:"CN-03 micro-stop fix", gain: cnGain, note:`${cn03Speed}% of micro-stops eliminated → AS-01 starvation falls` });
  const airGain = Math.round((airPressureStable/100) * 95);
  gain += airGain; breakdown.push({ lever:"Stable compressed air", gain: airGain, note:"Press stagger + receiver eliminates cycle-time penalty" });
  const bufGain = Math.round(Math.min(bufferExtra,30)/30 * 38);
  gain += bufGain; breakdown.push({ lever:`+${bufferExtra} buffer before AS-01`, gain: bufGain, note:"Absorbs 8–12 min upstream stops" });
  const rwGain = Math.round((reworkReduction/100) * 64);
  gain += rwGain; breakdown.push({ lever:"Rework reduction", gain: rwGain, note:"Frees CN-02 for first-pass work" });
  const batchGain = batchSplit ? 42 : 0;
  gain += batchGain; if(batchSplit) breakdown.push({ lever:"Split HT-01 batches 40→20", gain: batchGain, note:"Halves Assembly wait-then-surge" });

  const predicted = 824 + gain;
  const pct = Math.round(((predicted-824)/824)*1000)/10;
  const bottleneck = predicted > 1050 ? "HT-01 Heat Treat (true capacity limit)" : predicted > 950 ? "CN-02 / HT-01 shared" : cn03Speed < 50 ? "CN-03 → AS-01 (still starving)" : "HT-01 batch queue";
  const costSaving = gain * 100; // $100/unit contribution approx from seed cost/loss ~100
  return NextResponse.json({ baseline:824, planned:1200, predicted, gain, pct, bottleneck, costSavingPerDay: costSaving, costSavingPerYear: costSaving*250, breakdown, oeePredicted: Math.round((57 + (gain/1200)*100)*10)/10, shipmentRisk: predicted>=1050?"Low — 16:30 truck safe": predicted>=950?"Medium — buffer 40 units":"High — short ~"+(1050-predicted)+" units" });
}

import { pgTable, serial, text, integer, real, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

export const machines = pgTable("machines", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  zone: text("zone").notNull(),
  line: text("line").notNull().default("Main Line"),
  status: text("status").notNull().default("running"), // running, starved, blocked, degraded, idle
  nominalRate: integer("nominal_rate").notNull(), // units/hr
  currentRate: integer("current_rate").notNull(),
  oee: real("oee").notNull(),
  healthScore: integer("health_score").notNull(),
  tempC: real("temp_c").notNull(),
  vibration: real("vibration").notNull(),
  powerKw: real("power_kw").notNull(),
  cycleTimeSec: real("cycle_time_sec").notNull(),
  bufferLevel: integer("buffer_level").notNull().default(50), // %
  bufferCapacity: integer("buffer_capacity").notNull().default(40),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  upstream: text("upstream").notNull().default(""),
  downstream: text("downstream").notNull().default(""),
});

export const inefficiencies = pgTable("inefficiencies", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  severity: text("severity").notNull(),
  machinesInvolved: text("machines_involved").notNull(),
  description: text("description").notNull(),
  evidence: text("evidence").notNull(),
  correlation: real("correlation").notNull(),
  lossUnitsPerDay: integer("loss_units_per_day").notNull(),
  costPerDay: integer("cost_per_day").notNull(),
  confidence: integer("confidence").notNull(),
  status: text("status").notNull().default("detected"), // detected, investigating, action_created, resolved
  recommendation: text("recommendation").notNull(),
  hiddenReason: text("hidden_reason").notNull(),
});

export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  machineCode: text("machine_code").notNull(),
  severity: text("severity").notNull(),
  probability: integer("probability").notNull(),
  minutesToImpact: integer("minutes_to_impact").notNull(),
  impactUnits: integer("impact_units").notNull(),
  cascadePath: text("cascade_path").notNull(),
  rootCause: text("root_cause").notNull(),
  signal: text("signal").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const telemetry = pgTable("telemetry", {
  id: serial("id").primaryKey(),
  hourLabel: text("hour_label").notNull(),
  hourIndex: integer("hour_index").notNull(),
  planned: integer("planned").notNull(),
  actual: integer("actual").notNull(),
  machineAvgOee: real("machine_avg_oee").notNull(),
  plantOee: real("plant_oee").notNull(),
  compressorPsi: real("compressor_psi").notNull(),
  microStops: integer("micro_stops").notNull(),
});

export const interventions = pgTable("interventions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  machineCode: text("machine_code").notNull(),
  actionType: text("action_type").notNull(),
  priority: text("priority").notNull(),
  expectedGain: text("expected_gain").notNull(),
  owner: text("owner").notNull().default("Shift Supervisor"),
  status: text("status").notNull().default("open"),
  sourceInefficiencyId: integer("source_inefficiency_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const utilities = pgTable("utilities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  currentLoad: integer("current_load").notNull(), // %
  capacity: text("capacity").notNull(),
  pressure: text("pressure").notNull(),
  status: text("status").notNull(),
  trend: text("trend").notNull(),
  affects: text("affects").notNull(),
});

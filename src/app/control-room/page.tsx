import type { Metadata } from "next";
import ControlRoom from "@/components/ControlRoom";

export const metadata: Metadata = {
  title: "Control Room — Beyond the Factory Floor",
  description: "Live plant twin, hidden losses, cascade forecasts, and a what-if simulator for Apex Precision.",
};

export default async function ControlRoomPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return <ControlRoom initialTab={tab} />;
}

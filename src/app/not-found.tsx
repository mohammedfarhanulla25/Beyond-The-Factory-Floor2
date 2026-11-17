import Link from "next/link";
import Logo from "@/components/Logo";

export default function NotFound() {
  return (
    <main id="main" className="min-h-screen grid place-items-center px-6 py-16">
      <div className="card p-10 max-w-lg text-center">
        <div className="flex justify-center mb-6"><Logo /></div>
        <p className="kicker">404</p>
        <h1 className="display text-5xl mt-3">This bay is empty.</h1>
        <p className="muted mt-3">That route isn’t on the floor plan. The line, the losses, and the forecasts are still in the control room.</p>
        <div className="flex flex-wrap gap-3 justify-center mt-6">
          <Link href="/" className="btn btn-ghost">Back home</Link>
          <Link href="/control-room" className="btn btn-primary">Get Started</Link>
        </div>
      </div>
    </main>
  );
}

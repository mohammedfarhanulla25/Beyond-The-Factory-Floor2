import Link from "next/link";

export default function Logo({ tone = "ink" }: { tone?: "ink" | "light" }) {
  const light = tone === "light";
  return (
    <Link href="/" className="flex items-center gap-3 no-underline" aria-label="Beyond the Factory Floor, home">
      <svg width="38" height="38" viewBox="0 0 36 36" aria-hidden="true">
        <rect width="36" height="36" rx="11" fill={light ? "#e0a03a" : "#1c1712"} />
        <circle cx="10" cy="18" r="2.3" fill={light ? "#1c1712" : "#e0a03a"} />
        <circle cx="18" cy="11" r="2.3" fill={light ? "#1c1712" : "#e0a03a"} />
        <circle cx="26" cy="18" r="2.3" fill={light ? "#1c1712" : "#e0a03a"} />
        <circle cx="18" cy="25" r="2.3" fill={light ? "#1c1712" : "#f6f0e7"} />
        <path d="M12 17.2 16.4 12.8M19.6 12.8 24 17.2M24.2 19.4 19.6 23.6M16.4 23.6 12 19.4" stroke={light ? "#1c1712" : "#e0a03a"} strokeWidth="1.6" />
      </svg>
      <span className="leading-none">
        <span className="block font-semibold" style={{ fontFamily: "var(--font-fraunces), Georgia, serif", fontSize: 17 }}>
          Beyond the Floor
        </span>
        <span className={`block text-[11px] mt-1 ${light ? "text-white/60" : "muted"}`}>Factory intelligence</span>
      </span>
    </Link>
  );
}

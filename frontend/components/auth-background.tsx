import { cn } from "@/lib/utils";

const particles = [
  { left: "6%", top: "22%", size: "3px", delay: "0s" },
  { left: "14%", top: "64%", size: "2px", delay: "1.2s" },
  { left: "24%", top: "12%", size: "2px", delay: "2.4s" },
  { left: "31%", top: "78%", size: "3px", delay: "0.8s" },
  { left: "42%", top: "30%", size: "2px", delay: "3.1s" },
  { left: "55%", top: "84%", size: "2px", delay: "1.7s" },
  { left: "63%", top: "18%", size: "3px", delay: "2.9s" },
  { left: "72%", top: "58%", size: "2px", delay: "0.4s" },
  { left: "81%", top: "26%", size: "2px", delay: "2.1s" },
  { left: "90%", top: "70%", size: "3px", delay: "1.5s" },
  { left: "48%", top: "50%", size: "2px", delay: "3.6s" },
];

export function AuthBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(160deg,#E3F2FD_0%,color-mix(in_srgb,#E3F2FD_80%,#90CAF9)_50%,color-mix(in_srgb,#E3F2FD_65%,#90CAF9)_100%)]" />

      <div className="animate-aurora-1 absolute -left-[15%] -top-[20%] h-[75vmax] w-[75vmax] rounded-full bg-[#2196F3]/20 blur-[110px]" />
      <div className="animate-aurora-2 absolute -right-[20%] top-[15%] h-[65vmax] w-[65vmax] rounded-full bg-[#90CAF9]/30 blur-[110px]" />
      <div className="animate-aurora-3 absolute -bottom-[25%] left-[10%] h-[70vmax] w-[70vmax] rounded-full bg-[#0D47A1]/10 blur-[120px]" />

      <div className="absolute inset-0 bg-[conic-gradient(from_90deg_at_50%_0%,rgba(227,242,253,0.4)_0deg,transparent_60deg,transparent_180deg,rgba(33,150,243,0.15)_240deg,transparent_300deg)]" />

      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(144,202,249,0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(144,202,249,0.25)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_45%,black_15%,transparent_100%)]" />

      <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-ring absolute left-1/2 top-1/2 h-[55vmin] w-[55vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#90CAF9]/40"
            style={{ animationDelay: `${i * 2.4}s` }}
          />
        ))}
      </div>

      {particles.map((p, i) => (
        <div
          key={i}
          className="animate-particle absolute rounded-full bg-[#2196F3]/60 shadow-[0_0_8px_rgba(33,150,243,0.5)]"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
          }}
        />
      ))}

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(13,71,161,0.15)_100%)]" />
    </div>
  );
}

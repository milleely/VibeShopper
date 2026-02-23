"use client";

interface ScoreGaugeProps {
  score: number;
  size?: "sm" | "lg";
}

function getScoreColor(score: number) {
  if (score >= 75) return { text: "text-[#6bcf7f]", bg: "bg-[#6bcf7f]" };
  if (score >= 60) return { text: "text-[#ffd93d]", bg: "bg-[#ffd93d]" };
  if (score >= 40) return { text: "text-[#ff8c42]", bg: "bg-[#ff8c42]" };
  return { text: "text-[#ff6b6b]", bg: "bg-[#ff6b6b]" };
}

function getScoreLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Poor";
  return "Critical";
}

export default function ScoreGauge({ score, size = "lg" }: ScoreGaugeProps) {
  const { text, bg } = getScoreColor(score);
  const label = getScoreLabel(score);
  const isLarge = size === "lg";

  return (
    <div className={`flex flex-col ${isLarge ? "items-center gap-3" : "items-start gap-1.5"}`}>
      <div className="flex items-baseline gap-2">
        <span className={`${text} font-bold ${isLarge ? "text-6xl" : "text-3xl"}`}>
          {score}
        </span>
        <span className={`text-white/50 font-medium ${isLarge ? "text-xl" : "text-sm"}`}>
          / 100
        </span>
      </div>
      <span className={`${text} font-semibold ${isLarge ? "text-base" : "text-xs"}`}>
        {label}
      </span>
      <div className={`${isLarge ? "w-48 h-2" : "w-full h-1.5"} bg-white/15 rounded-full overflow-hidden`}>
        <div
          className={`h-full ${bg} rounded-full transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

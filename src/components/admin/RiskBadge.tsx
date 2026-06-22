import { riskLabel } from "@/server/fraud";

const STYLES = {
  low: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
} as const;

export default function RiskBadge({ riskScore }: { riskScore: number | null }) {
  if (riskScore == null) {
    return <span className="text-xs text-gray-400">Not checked</span>;
  }

  const label = riskLabel(riskScore);
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${STYLES[label]}`}>
      {label === "low" ? "Low risk" : label === "medium" ? "Medium risk" : "High risk"} (
      {riskScore})
    </span>
  );
}

import type { CohortRow } from "@/types/analytics";

interface CohortHeatmapProps {
  data: CohortRow[];
}

const retentionKeys = ["day_1", "day_3", "day_7", "day_14", "day_30"] as const;

function retentionColor(pct: number): string {
  if (pct <= 0) return "#f3f4f6";
  const intensity = Math.round(40 + (pct / 100) * 160);
  return `rgb(${200 - intensity}, ${220 - Math.round(intensity * 0.3)}, ${200 - intensity})`;
}

export default function CohortHeatmap({ data }: CohortHeatmapProps) {
  if (!data.length) {
    return <p className="text-sm text-gray-500">No cohort data available.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-3 py-2 text-left font-medium text-gray-700">Cohort</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">New Users</th>
            {retentionKeys.map((k) => (
              <th key={k} className="px-3 py-2 text-right font-medium text-gray-700">
                {k.replace("_", " ").replace("day", "Day")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.signup_date} className="border-b border-gray-200">
              <td className="px-3 py-2 whitespace-nowrap font-medium">{row.signup_date}</td>
              <td className="px-3 py-2 text-right">{row.new_users}</td>
              {retentionKeys.map((k) => {
                const pct = row.new_users > 0 ? (row[k] / row.new_users) * 100 : 0;
                return (
                  <td
                    key={k}
                    className="px-3 py-2 text-right font-mono"
                    style={{ backgroundColor: retentionColor(pct) }}
                  >
                    {pct.toFixed(1)}%
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

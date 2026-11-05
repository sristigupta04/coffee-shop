
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: number;
  description?: string;
  iconColor?: string;
  iconBackground?: string;
  loading?: boolean;
};

export default function StatCard({
  title,
  value,
  icon: Icon,
  change,
  description,
  iconColor = "text-[#9a4f24]",
  iconBackground = "bg-[#f5e9df]",
  loading = false,
}: StatCardProps) {
  const isPositive = (change ?? 0) >= 0;

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-[#eaded4] bg-white p-5 shadow-sm">
        <div className="h-4 w-28 rounded bg-gray-200" />
        <div className="mt-5 h-8 w-36 rounded bg-gray-200" />
        <div className="mt-4 h-3 w-24 rounded bg-gray-100" />
      </div>
    );
  }

  return (
    <article className="group rounded-2xl border border-[#eaded4] bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#80695b]">
            {title}
          </p>

          <h3 className="mt-3 break-words text-2xl font-bold tracking-tight text-[#3b2115] sm:text-3xl">
            {typeof value === "number"
              ? value.toLocaleString("en-IN")
              : value}
          </h3>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBackground} transition-transform group-hover:scale-110`}
        >
          <Icon size={23} className={iconColor} />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {typeof change === "number" && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
              isPositive
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {isPositive ? (
              <TrendingUp size={13} />
            ) : (
              <TrendingDown size={13} />
            )}

            {Math.abs(change).toFixed(1)}%
          </span>
        )}

        {description && (
          <p className="text-xs text-[#a18b7c]">
            {description}
          </p>
        )}
      </div>
    </article>
  );
}

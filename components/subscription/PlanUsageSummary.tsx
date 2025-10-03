"use client";

import type { PlanUsage } from "@/types/subscription";

import { cn } from "@/lib/utils";

interface PlanUsageSummaryProps {
  planUsage: PlanUsage[];
  highlightPlan?: string;
  className?: string;
  title?: string;
}

export function PlanUsageSummary({
  planUsage,
  highlightPlan,
  className,
  title,
}: PlanUsageSummaryProps) {
  if (!planUsage.length) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {title ? (
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      ) : null}

      <div className="grid gap-3" role="list">
        {planUsage.map((item) => {
          const isHighlighted = highlightPlan === item.plan;
          const isUnlimited = !Number.isFinite(item.limit);
          const percent = isUnlimited
            ? 0
            : item.limit === 0
                ? 0
                : Math.min(100, Math.round((item.used / item.limit) * 100));

          const plural = item.remaining === 1 ? "" : "s";
          const restanteSuffix = item.remaining === 1 ? "" : "s";
          const packsPurchased = item.bundleSize
            ? Math.ceil(item.purchased / item.bundleSize)
            : 0;
          const bundlePlural = item.bundleSize > 1 ? "s" : "";

          return (
            <div
              key={item.plan}
              className={cn(
                "rounded-lg border p-3 transition-colors",
                isHighlighted && "border-primary bg-primary/5"
              )}
              role="listitem"
            >
              <div className="flex items-center justify-between text-sm font-medium">
                <span>{item.plan}</span>
                <span>
                  {item.used}/{isUnlimited ? "∞" : item.limit} offres utilisées
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-[width]"
                  style={{ width: `${percent}%` }}
                  aria-hidden="true"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {isUnlimited
                  ? "Quota illimité disponible."
                  : item.purchased > 0
                    ? `${item.remaining} offre${plural} restante${restanteSuffix}. Pack${packsPurchased > 1 ? "s" : ""} actifs : ${packsPurchased} × ${item.bundleSize} offre${bundlePlural}.`
                    : `Aucun crédit actif. Chaque achat ajoute ${item.bundleSize} offre${bundlePlural}.`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

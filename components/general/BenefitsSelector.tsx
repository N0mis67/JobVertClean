"use client";

import { benefits } from "@/app/utils/listOfBenefits";
import { Badge } from "@/components/ui/badge";

type BenefitsField = {
  value: string[]; // (ou string[] | undefined si tu veux garder le fallback)
  onChange: (value: string[]) => void;
};

export interface BenefitsSelectorProps {
  field: BenefitsField;
}

export function BenefitsSelector({ field }: BenefitsSelectorProps) {
  const toggleBenefit = (benefitId: string) => {
    const currentBenefits = field.value ?? [];
    const newBenefits = currentBenefits.includes(benefitId)
      ? currentBenefits.filter((id) => id !== benefitId)
      : [...currentBenefits, benefitId];

    field.onChange(newBenefits);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {benefits.map((benefit) => {
          const isSelected = (field.value ?? []).includes(benefit.id);
          return (
            <Badge
              key={benefit.id}
              variant={isSelected ? "default" : "outline"}
              className="cursor-pointer transition-all hover:scale-105 active:scale-95 select-none text-sm px-4 py-1.5 rounded-full"
              onClick={() => toggleBenefit(benefit.id)}
            >
              <span className="flex items-center gap-2">
                {benefit.icon}
                {benefit.label}
              </span>
            </Badge>
          );
        })}
      </div>

      <div className="mt-4 text-sm text-muted-foreground">
        Avantages sélectionnés:{" "}
        <span className="text-primary">{(field.value ?? []).length}</span>
      </div>
    </div>
  );
}

export default BenefitsSelector;


"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FormControl } from "../ui/form";
import { ControllerRenderProps } from "react-hook-form";
import { jobListingDurationPricing } from "@/app/utils/pricingTiers";

interface JobListingDurationSelectorProps {
  field: ControllerRenderProps<any, "listingPlan">;
}

export function JobListingDurationSelector({
  field,
}: JobListingDurationSelectorProps) {
  return (
    <FormControl>
      <RadioGroup
        value={field.value}
        onValueChange={(value: string) => field.onChange(value)}
      >
        <div className="grid gap-3">
          {jobListingDurationPricing.map((plan) => (
            <div key={plan.name} className="relative">
              <RadioGroupItem
                value={plan.name}
                id={plan.name}
                className="peer sr-only"
              />
              <Label
                htmlFor={plan.name}
                className="flex flex-col cursor-pointer"
              >
                <Card
                  className={`p-4 border-2 transition-all ${
                    field.value === plan.name
                      ? "border-primary bg-primary/10"
                      : "hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-lg">{plan.name}</p>
                      <ul className="text-sm text-muted-foreground list-disc ml-4 mt-1 space-y-1">
                        {plan.features.map((feature, index) => (
                          <li key={index}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xl">
                        {plan.priceMonthly} €/mois
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {plan.priceAnnual} €/an (2 mois offerts)
                      </p>
                    </div>
                  </div>
                </Card>
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>
    </FormControl>
  );
}

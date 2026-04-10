export const jobListingDurationPricing = [
  {
    name: "Bonsai",
    priceMonthly: 79,
    priceAnnual: 790,
    jobLimit: 1,
    durationDays: 30,
    features: [
      "1 offre sur  30 jours",
      "Visibilité standard",
    ],
  },
  {
    name: "Arbuste",
    priceMonthly: 149,
    priceAnnual: 1490,
    jobLimit: 3,
    durationDays: 60,
    features: [
      "3 offres sur 60 jours",
      "Mise en avant",
    ],
  },
  {
    name: "Forêt",
    priceMonthly: 249,
    priceAnnual: 2490,
    jobLimit: 10,
    durationDays: 365,
    features: [
      "10 offres sur un an",
      "Priorité sur le site",
    ],
  },
];

// Map of plan names to their duration in days for easy access across the app
export const planDuration: Record<string, number> = Object.fromEntries(
  jobListingDurationPricing.map(({ name, durationDays }) => [
    name,
    durationDays,
  ])
);

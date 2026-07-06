export const EMPLOYMENT_TYPE_OPTIONS = [
  { label: "Temps plein", value: "Temps plein" },
  { label: "Temps partiel", value: "Temps partiel" },
] as const;

export const CONTRACT_TYPE_OPTIONS = [
  { label: "CDI", value: "CDI" },
  { label: "CDD", value: "CDD" },
  { label: "Intérim", value: "INTERIM" },
  { label: "Stage", value: "STAGE" },
  { label: "Apprentissage", value: "APPRENTISSAGE" },
  { label: "Freelance", value: "FREELANCE" },
  { label: "Saisonnier", value: "SAISONNIER" },
] as const;

export const CONTRACT_TYPE_VALUES = CONTRACT_TYPE_OPTIONS.map(
  (option) => option.value
) as [
  "CDI",
  "CDD",
  "INTERIM",
  "STAGE",
  "APPRENTISSAGE",
  "FREELANCE",
  "SAISONNIER",
];

export type ContractTypeValue = (typeof CONTRACT_TYPE_VALUES)[number];
export type EmploymentTypeValue = (typeof EMPLOYMENT_TYPE_OPTIONS)[number]["value"];

export function getEmploymentTypeValue(
  employmentType: string | null | undefined
): EmploymentTypeValue | undefined {
  if (employmentType === "Temps plein" || employmentType === "Temps partiel") {
    return employmentType;
  }

  return undefined;
}

export function getContractTypeLabel(
  contractType: ContractTypeValue | string | null | undefined
): string | null {
  if (!contractType) {
    return null;
  }

  return (
    CONTRACT_TYPE_OPTIONS.find((option) => option.value === contractType)
      ?.label ?? contractType
  );
}

export function inferContractTypeFromEmploymentType(
  employmentType: string | null | undefined
): ContractTypeValue | null {
  const normalized = employmentType?.trim().toLowerCase();

  switch (normalized) {
    case "cdi":
      return "CDI";
    case "cdd":
      return "CDD";
    case "intérim":
    case "interim":
      return "INTERIM";
    case "stage":
      return "STAGE";
    case "apprentissage":
    case "stage/apprenti":
      return "APPRENTISSAGE";
    case "freelance":
      return "FREELANCE";
    case "saisonnier":
      return "SAISONNIER";
    default:
      return null;
  }
}

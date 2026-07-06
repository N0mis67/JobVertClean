CREATE TYPE "ContractType" AS ENUM (
  'CDI',
  'CDD',
  'INTERIM',
  'STAGE',
  'APPRENTISSAGE',
  'FREELANCE',
  'SAISONNIER'
);

ALTER TABLE "JobPost"
ADD COLUMN "contractType" "ContractType";

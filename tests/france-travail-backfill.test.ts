import assert from "node:assert/strict";
import test from "node:test";

import { planFranceTravailUrlBackfill } from "../lib/france-travail-backfill.ts";

test("backfill updates only France Travail rows and is idempotent", () => {
  const firstPlan = planFranceTravailUrlBackfill([
    {
      id: "france-travail",
      externalSource: "FRANCE_TRAVAIL",
      externalId: "ABC123",
      externalUrl: "https://partner.example/apply",
    },
    {
      id: "native",
      externalSource: null,
      externalId: null,
      externalUrl: null,
    },
  ]);

  assert.deepEqual(firstPlan.updates, [
    {
      id: "france-travail",
      externalId: "ABC123",
      externalUrl:
        "https://candidat.francetravail.fr/offres/recherche/detail/ABC123",
    },
  ]);
  assert.deepEqual(firstPlan.ignoredIds, ["native"]);

  const secondPlan = planFranceTravailUrlBackfill([
    {
      ...firstPlan.updates[0],
      externalSource: "FRANCE_TRAVAIL",
    },
  ]);

  assert.equal(secondPlan.updates.length, 0);
  assert.deepEqual(secondPlan.unchangedIds, ["france-travail"]);
});


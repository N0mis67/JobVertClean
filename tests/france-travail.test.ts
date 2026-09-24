import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalizeFranceTravailImport,
  getJobApplicationAction,
} from "../lib/france-travail.ts";

test("canonicalizes a France Travail import from its externalId", () => {
  assert.deepEqual(canonicalizeFranceTravailImport("ABC123"), {
    externalId: "ABC123",
    externalUrl:
      "https://candidat.francetravail.fr/offres/recherche/detail/ABC123",
  });
});

test("does not allow an arbitrary URL to drive a France Travail application", () => {
  const action = getJobApplicationAction(
    {
      externalSource: "FRANCE_TRAVAIL",
      externalId: "ABC123",
      externalUrl: "https://example.com/phishing",
    },
    "/job/test/apply"
  );

  assert.deepEqual(action, {
    kind: "external",
    href: "https://candidat.francetravail.fr/offres/recherche/detail/ABC123",
  });
});

test("keeps the internal Jobvert application action for native jobs", () => {
  assert.deepEqual(
    getJobApplicationAction(
      { externalSource: null, externalId: null, externalUrl: null },
      "/job/native/apply"
    ),
    { kind: "native", href: "/job/native/apply" }
  );
});

test("never falls back to the internal form for an invalid France Travail id", () => {
  assert.deepEqual(
    getJobApplicationAction(
      {
        externalSource: "FRANCE_TRAVAIL",
        externalId: "../invalid",
        externalUrl: null,
      },
      "/job/imported/apply"
    ),
    { kind: "unavailable" }
  );
});


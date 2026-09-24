import importlib.util
import pathlib
import unittest


SCRIPT_PATH = pathlib.Path(__file__).parents[1] / "import-france-travail-to-jobvert.py"
SPEC = importlib.util.spec_from_file_location("france_travail_import", SCRIPT_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


class NormalizeOfferTests(unittest.TestCase):
    def test_uses_canonical_france_travail_url_and_traces_origin_url(self):
        normalized = MODULE.normalize_offer({
            "id": "ABC123",
            "intitule": "Paysagiste",
            "description": "Une description suffisamment détaillée pour le test.",
            "origineOffre": {
                "urlOrigine": "https://partner.example/apply",
            },
        })

        self.assertEqual(normalized["externalId"], "ABC123")
        self.assertEqual(
            normalized["externalUrl"],
            "https://candidat.francetravail.fr/offres/recherche/detail/ABC123",
        )
        self.assertEqual(
            normalized["rawPayload"]["urlOrigine"],
            "https://partner.example/apply",
        )

    def test_rejects_an_unusable_external_id(self):
        self.assertIsNone(MODULE.normalize_offer({"id": "../invalid"}))


if __name__ == "__main__":
    unittest.main()


import json
import os
import re
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone


AUTH_URL = "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire"
SEARCH_URL = "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search"
SCOPE = "api_offresdemploiv2 o2dsoffre"

KEYWORDS = [
    "paysagiste",
    "ouvrier paysagiste",
    "chef d'équipe paysagiste",
    "chef équipe paysage",
    "conducteur de travaux paysage",
    "technicien paysagiste",
    "jardinier paysagiste",
    "élagueur",
    "arboriste",
    "aménagement paysager",
    "entretien espaces verts",
    "espaces verts",
]

POSITIVE_SIGNALS = [
    "paysagiste",
    "espaces verts",
    "aménagement paysager",
    "entretien espaces verts",
    "jardinier",
    "élagueur",
    "arboriste",
    "cdi",
    "cdd",
    "alternance",
    "apprentissage",
    "notre entreprise",
    "rejoindre notre équipe",
]

NEGATIVE_SIGNALS = [
    "cabinet de recrutement",
    "agence d'emploi",
    "agence de recrutement",
    "agence d'intérim",
    "travail temporaire",
    "mission intérim",
    "notre client",
    "pour le compte d'un client",
    "adecco",
    "manpower",
    "randstad",
    "synergie",
    "proman",
    "crit",
    "samsic",
    "start people",
    "temporis",
    "partnaire",
    "aquila rh",
    "michael page",
    "page personnel",
    "hays",
]


def env_required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def http_json_request(url: str, method: str = "GET", headers=None, body=None, retries: int = 3):
    headers = headers or {}
    headers.setdefault("Accept", "application/json")
    headers.setdefault("User-Agent", "JobVertImporter/1.0 (+https://jobvert.fr)")

    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers.setdefault("Content-Type", "application/json")

    for attempt in range(1, retries + 1):
        request = urllib.request.Request(
            url=url,
            data=data,
            headers=headers,
            method=method,
        )

        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                raw = response.read().decode("utf-8", errors="replace").strip()

                if not raw:
                    print(f"Empty JSON response received. status={response.status}")
                    return response.status, {}

                try:
                    return response.status, json.loads(raw)
                except json.JSONDecodeError:
                    snippet = raw[:500].replace("\n", " ")

                    if attempt < retries:
                        print(f"Non-JSON response received. Retry {attempt}/{retries} in 10s...")
                        print(f"Response preview: {snippet}")
                        time.sleep(10)
                        continue

                    raise RuntimeError(
                        f"Non-JSON response received after {retries} attempts. "
                        f"status={response.status}, preview={snippet}"
                    )

        except urllib.error.HTTPError as error:
            raw = error.read().decode("utf-8", errors="replace")

            if error.code in [429, 500, 502, 503, 504] and attempt < retries:
                wait_seconds = 60 if error.code in [429, 502, 503, 504] else 10
                print(f"HTTP {error.code} received. Retry {attempt}/{retries} in {wait_seconds}s...")
                time.sleep(wait_seconds)
                continue

            raise RuntimeError(f"HTTP {error.code} on {url}: {raw}") from error

        except (TimeoutError, urllib.error.URLError) as error:
            if attempt < retries:
                print(f"Network error received. Retry {attempt}/{retries} in 10s...")
                print(f"Error: {error}")
                time.sleep(10)
                continue

            raise RuntimeError(f"Network error after {retries} attempts on {url}: {error}") from error


def authenticate_france_travail() -> str:
    client_id = env_required("FRANCE_TRAVAIL_CLIENT_ID")
    client_secret = env_required("FRANCE_TRAVAIL_CLIENT_SECRET")

    form = urllib.parse.urlencode({
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": SCOPE,
    }).encode("utf-8")

    for attempt in range(1, 4):
        request = urllib.request.Request(
            AUTH_URL,
            data=form,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
                "User-Agent": "JobVertImporter/1.0 (+https://jobvert.fr)",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                raw = response.read().decode("utf-8", errors="replace").strip()
                payload = json.loads(raw)

                access_token = payload.get("access_token")
                if not access_token:
                    raise RuntimeError(f"France Travail auth response has no access_token: {payload}")

                return access_token

        except urllib.error.HTTPError as error:
            raw = error.read().decode("utf-8", errors="replace")

            if error.code in [429, 500, 502, 503, 504] and attempt < 3:
                print(f"France Travail auth HTTP {error.code}. Retry {attempt}/3 in 30s...")
                time.sleep(30)
                continue

            raise RuntimeError(f"France Travail auth failed: HTTP {error.code} — {raw}") from error

        except Exception as error:
            if attempt < 3:
                print(f"France Travail auth failed. Retry {attempt}/3 in 10s...")
                print(f"Error: {error}")
                time.sleep(10)
                continue

            raise

    raise RuntimeError("France Travail auth failed after 3 attempts")


def fetch_offers_for_keyword(token: str, keyword: str, days_back: int):
    now = datetime.now(timezone.utc)
    date_from = (now - timedelta(days=days_back)).strftime("%Y-%m-%dT00:00:00Z")
    date_to = now.strftime("%Y-%m-%dT23:59:59Z")

    clean_keyword = keyword.replace("'", " ").replace("’", " ")

    params = urllib.parse.urlencode({
        "motsCles": clean_keyword,
        "minCreationDate": date_from,
        "maxCreationDate": date_to,
    })

    url = f"{SEARCH_URL}?{params}"

    try:
        _status, payload = http_json_request(
            url,
            method="GET",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
                "Range": "0-149",
                "User-Agent": "JobVertImporter/1.0 (+https://jobvert.fr)",
            },
        )
    except Exception as error:
        print(f"[{keyword}] France Travail request failed. Keyword skipped.")
        print(f"[{keyword}] Error: {error}")
        return []

    if not isinstance(payload, dict):
        print(f"[{keyword}] Unexpected payload type. Keyword skipped.")
        return []

    results = payload.get("resultats", [])

    if not isinstance(results, list):
        print(f"[{keyword}] Unexpected resultats format. Keyword skipped.")
        return []

    return results


def normalize_url(value):
    if not value:
        return None

    value = str(value).strip()

    if not value:
        return None

    if value.startswith("http://") or value.startswith("https://"):
        return value

    if "." in value:
        return "https://" + value

    return None


def parse_salary_number(value: str):
    clean = value.replace("\u00a0", " ").strip()
    clean = re.sub(r"\s+", "", clean)

    if "," in clean and "." in clean:
        if clean.rfind(",") > clean.rfind("."):
            clean = clean.replace(".", "").replace(",", ".")
        else:
            clean = clean.replace(",", "")
    elif "," in clean:
        clean = clean.replace(",", ".")

    try:
        return float(clean)
    except ValueError:
        return None


def extract_salary_range(offer: dict):
    salaire = offer.get("salaire") or {}

    if not isinstance(salaire, dict):
        return 0, 0

    raw_salary = " ".join(
        str(value)
        for value in [
            salaire.get("libelle"),
            salaire.get("commentaire"),
            salaire.get("complement1"),
            salaire.get("complement2"),
        ]
        if value
    )

    if not raw_salary.strip():
        return 0, 0

    text = raw_salary.replace("\u00a0", " ")
    lower_text = text.lower()

    if any(signal in lower_text for signal in [
        "non précisé",
        "non precise",
        "selon profil",
        "à négocier",
        "a negocier",
        "selon expérience",
        "selon experience",
    ]):
        return 0, 0

    values = []

    number_pattern = r"\d+(?:[\s\u00a0]\d{3})*(?:[,.]\d+)?|\d+(?:[,.]\d+)?"

    for match in re.finditer(number_pattern, text):
        parsed_value = parse_salary_number(match.group(0))

        if parsed_value is None or parsed_value <= 0:
            continue

        start, end = match.span()
        context = lower_text[max(0, start - 25):min(len(lower_text), end + 25)]

        if "mois" in context and parsed_value <= 24:
            continue

        if "jour" in context and parsed_value <= 31:
            continue

        values.append(parsed_value)

    if not values:
        return 0, 0

    is_hourly = any(signal in lower_text for signal in [
        "horaire",
        "heure",
        "/h",
        " h ",
        "€/h",
        "euros/h",
        "de l'heure",
    ])

    is_monthly = any(signal in lower_text for signal in [
        "mensuel",
        "mensuelle",
        "mois",
        "/mois",
        "par mois",
    ])

    is_yearly = (
        "annuel" in lower_text
        or "annuelle" in lower_text
        or "annuels" in lower_text
        or "annuelles" in lower_text
        or "par an" in lower_text
        or re.search(r"\ban\b", lower_text) is not None
    )

    multiplier = None
    candidates = []

    if is_hourly:
        candidates = [value for value in values if 8 <= value <= 100]
        multiplier = 35 * 52

    elif is_monthly:
        candidates = [value for value in values if 500 <= value <= 15000]
        multiplier = 12

    elif is_yearly:
        candidates = [value for value in values if 10000 <= value <= 300000]
        multiplier = 1

    else:
        annual_candidates = [value for value in values if 10000 <= value <= 300000]
        monthly_candidates = [value for value in values if 500 <= value <= 15000]
        hourly_candidates = [value for value in values if 8 <= value <= 100]

        if annual_candidates:
            candidates = annual_candidates
            multiplier = 1
        elif monthly_candidates:
            candidates = monthly_candidates
            multiplier = 12
        elif hourly_candidates:
            candidates = hourly_candidates
            multiplier = 35 * 52

    if not candidates or multiplier is None:
        return 0, 0

    if len(candidates) == 1:
        salary_from = candidates[0]
        salary_to = candidates[0]
    else:
        salary_from = min(candidates)
        salary_to = max(candidates)

    salary_from = round(salary_from * multiplier)
    salary_to = round(salary_to * multiplier)

    if salary_from <= 0 or salary_to <= 0:
        return 0, 0

    if salary_from > salary_to:
        salary_from, salary_to = salary_to, salary_from

    if salary_to > 300000:
        return 0, 0

    return salary_from, salary_to


def score_offer(offer: dict):
    score = 50
    reasons = []

    title = offer.get("intitule", "") or ""
    description = offer.get("description", "") or ""
    company = offer.get("entreprise", {}).get("nom", "") or ""

    text = f"{title} {description} {company}".lower()

    for signal in POSITIVE_SIGNALS:
        if signal in text:
            score += 10
            reasons.append(f"Signal positif détecté : {signal}")
            break

    for signal in NEGATIVE_SIGNALS:
        if signal in text:
            score -= 45
            reasons.append(f"Signal négatif détecté : {signal}")
            break

    if company:
        score += 10
        reasons.append("Entreprise identifiable")

    if len(description) >= 250:
        score += 10
        reasons.append("Description suffisamment détaillée")
    else:
        score -= 15
        reasons.append("Description courte")

    contract = offer.get("typeContratLibelle", "") or ""
    if any(x in contract.lower() for x in ["cdi", "cdd", "alternance", "apprentissage"]):
        score += 10
        reasons.append(f"Contrat pertinent : {contract}")

    location = offer.get("lieuTravail", {}).get("libelle", "") or ""
    if location:
        score += 5
        reasons.append("Localisation disponible")

    score = max(0, min(100, score))
    return score, reasons


def normalize_offer(offer: dict):
    external_id = offer.get("id")
    if not external_id:
        return None

    entreprise = offer.get("entreprise", {}) or {}
    origine = offer.get("origineOffre", {}) or {}

    score, score_reasons = score_offer(offer)
    salary_from, salary_to = extract_salary_range(offer)

    external_url = normalize_url(origine.get("urlOrigine"))
    company_website = normalize_url(entreprise.get("url"))

    normalized = {
        "externalId": str(external_id),
        "title": offer.get("intitule", "") or "",
        "companyName": entreprise.get("nom", "") or "",
        "location": offer.get("lieuTravail", {}).get("libelle", "") or "France",
        "employmentType": offer.get("typeContratLibelle", "") or "Autre",
        "description": offer.get("description", "") or "",
        "salaryFrom": salary_from,
        "salaryTo": salary_to,
        "score": score,
        "scoreReasons": score_reasons,
        "rawPayload": {
            "id": external_id,
            "source": "FRANCE_TRAVAIL",
            "salaire": offer.get("salaire"),
            "dateCreation": offer.get("dateCreation"),
        },
    }

    if external_url:
        normalized["externalUrl"] = external_url

    if company_website:
        normalized["companyWebsite"] = company_website

    date_creation = offer.get("dateCreation")
    if date_creation:
        normalized["publishedAt"] = date_creation

    return normalized


def send_to_jobvert(jobs, dry_run: bool):
    api_url = env_required("JOBVERT_IMPORT_API_URL")
    api_secret = env_required("JOBVERT_IMPORT_API_SECRET")

    payload = {
        "source": "FRANCE_TRAVAIL",
        "dryRun": dry_run,
        "jobs": jobs,
    }

    payload_json = json.dumps(payload, ensure_ascii=False)
    payload_size = len(payload_json.encode("utf-8"))

    print(f"Payload size sent to JobVert: {payload_size} bytes")

    result = subprocess.run(
        [
            "curl",
            "--silent",
            "--show-error",
            "--fail-with-body",
            "--max-time",
            "90",
            "--retry",
            "2",
            "--retry-delay",
            "10",
            "--retry-all-errors",
            "--request",
            "POST",
            api_url,
            "--header",
            f"Authorization: Bearer {api_secret}",
            "--header",
            "Content-Type: application/json",
            "--header",
            "Accept: application/json",
            "--header",
            "User-Agent: JobVertImporter/1.0 (+https://jobvert.fr)",
            "--data-binary",
            "@-",
        ],
        input=payload_json,
        text=True,
        capture_output=True,
    )

    if result.returncode != 0:
        print("JobVert API request failed")
        print("STDOUT:")
        print(result.stdout)
        print("STDERR:")
        print(result.stderr)
        raise RuntimeError(f"curl failed with exit code {result.returncode}")

    response_text = result.stdout.strip()

    print("JobVert API raw response:")
    print(response_text)

    try:
        response = json.loads(response_text)
    except json.JSONDecodeError as error:
        raise RuntimeError(f"JobVert API returned non-JSON response: {response_text[:500]}") from error

    if not response.get("success"):
        raise RuntimeError(f"JobVert API returned success=false: {response}")

    return 200, response


def main():
    days_back = int(os.getenv("DAYS_BACK", "1"))
    min_score = int(os.getenv("MIN_SCORE", "70"))
    max_jobs_to_send = int(os.getenv("MAX_JOBS_TO_SEND", "20"))
    batch_size = max(1, int(os.getenv("BATCH_SIZE", "5")))
    dry_run = os.getenv("DRY_RUN", "true").lower() == "true"

    print(
        "Starting France Travail import — "
        f"daysBack={days_back}, "
        f"minScore={min_score}, "
        f"maxJobs={max_jobs_to_send}, "
        f"batchSize={batch_size}, "
        f"dryRun={dry_run}"
    )

    token = authenticate_france_travail()

    raw_offers = []

    for keyword in KEYWORDS:
        offers = fetch_offers_for_keyword(token, keyword, days_back)
        print(f"[{keyword}] {len(offers)} offers found")
        raw_offers.extend(offers)
        time.sleep(0.5)

    print(f"Raw offers collected: {len(raw_offers)}")

    seen = set()
    normalized_jobs = []

    for offer in raw_offers:
        job = normalize_offer(offer)

        if not job:
            continue

        if job["externalId"] in seen:
            continue

        seen.add(job["externalId"])

        if job["score"] < min_score:
            continue

        if not job["title"] or not job["description"]:
            continue

        normalized_jobs.append(job)

    normalized_jobs.sort(key=lambda item: item["score"], reverse=True)
    jobs_to_send = normalized_jobs[:max_jobs_to_send]

    print(f"Qualified jobs: {len(normalized_jobs)}")
    print(f"Jobs sent to JobVert: {len(jobs_to_send)}")

    if not jobs_to_send:
        print("No jobs to send. Import finished.")
        return

    total_created = 0
    total_skipped = 0
    total_received = 0

    for index in range(0, len(jobs_to_send), batch_size):
        batch = jobs_to_send[index:index + batch_size]
        batch_number = index // batch_size + 1

        print(f"Sending batch {batch_number} with {len(batch)} jobs to JobVert")

        status, response = send_to_jobvert(batch, dry_run)

        print(f"JobVert API status: {status}")
        print(json.dumps(response, ensure_ascii=False, indent=2))

        total_received += int(response.get("receivedCount", 0))
        total_created += int(response.get("createdCount", 0))
        total_skipped += int(response.get("skippedCount", 0))

        time.sleep(2)

    print("Import summary:")
    print(json.dumps({
        "dryRun": dry_run,
        "receivedCount": total_received,
        "createdCount": total_created,
        "skippedCount": total_skipped,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
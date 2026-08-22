import os
import json
import time
import urllib.parse
import urllib.request
import urllib.error
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


def http_json_request(url: str, method: str = "GET", headers=None, body=None):
    headers = headers or {}

    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(
        url=url,
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")
            return response.status, json.loads(raw)
    except urllib.error.HTTPError as error:
        raw = error.read().decode("utf-8")
        raise RuntimeError(f"HTTP {error.code} on {url}: {raw}") from error


def authenticate_france_travail() -> str:
    client_id = env_required("FRANCE_TRAVAIL_CLIENT_ID")
    client_secret = env_required("FRANCE_TRAVAIL_CLIENT_SECRET")

    form = urllib.parse.urlencode({
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": SCOPE,
    }).encode("utf-8")

    request = urllib.request.Request(
        AUTH_URL,
        data=form,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
            return payload["access_token"]
    except urllib.error.HTTPError as error:
        raw = error.read().decode("utf-8")
        raise RuntimeError(f"France Travail auth failed: HTTP {error.code} — {raw}") from error


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

    status, payload = http_json_request(
        url,
        method="GET",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Range": "0-149",
        },
    )

    return payload.get("resultats", [])


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

    external_url = normalize_url(origine.get("urlOrigine"))
    company_website = normalize_url(entreprise.get("url"))

    normalized = {
        "externalId": str(external_id),
        "title": offer.get("intitule", "") or "",
        "companyName": entreprise.get("nom", "") or "",
        "location": offer.get("lieuTravail", {}).get("libelle", "") or "France",
        "employmentType": offer.get("typeContratLibelle", "") or "Autre",
        "description": offer.get("description", "") or "",
        "salaryFrom": 0,
        "salaryTo": 0,
        "score": score,
        "scoreReasons": score_reasons,
        "rawPayload": offer,
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

    import subprocess

    result = subprocess.run(
        [
            "curl",
            "--silent",
            "--show-error",
            "--fail-with-body",
            "--max-time",
            "90",
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

    return 200, json.loads(response_text)


def main():
    days_back = int(os.getenv("DAYS_BACK", "1"))
    min_score = int(os.getenv("MIN_SCORE", "70"))
    max_jobs_to_send = int(os.getenv("MAX_JOBS_TO_SEND", "20"))
    dry_run = os.getenv("DRY_RUN", "true").lower() == "true"

    print(f"Starting France Travail import — daysBack={days_back}, minScore={min_score}, maxJobs={max_jobs_to_send}, dryRun={dry_run}")

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

    status, response = send_to_jobvert(jobs_to_send, dry_run)

    print(f"JobVert API status: {status}")
    print(json.dumps(response, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
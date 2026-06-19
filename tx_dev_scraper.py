#!/usr/bin/env python3
"""
Texas Residential Development Tracker — County Clerk Scraper
============================================================
Scrapes commissioners court agendas across Texas counties near:
  • Fort Worth / DFW  (150-mile radius)
  • Georgetown / Austin (150-mile radius)
  • San Antonio (150-mile radius)

Filters for residential development filings, extracts key details,
and outputs structured JSON for the React dashboard.

Requirements:
    pip install playwright pdfplumber requests beautifulsoup4 anthropic

    playwright install chromium

Schedule (weekly, Sunday 6 AM):
    0 6 * * 0 python /path/to/tx_dev_scraper.py --output filings.json
"""

import json
import re
import time
import argparse
import logging
from datetime import datetime, timedelta
from pathlib import Path

import requests
from bs4 import BeautifulSoup

try:
    import pdfplumber
    HAS_PDF = True
except ImportError:
    HAS_PDF = False

try:
    from playwright.sync_api import sync_playwright
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
log = logging.getLogger(__name__)

# ─── Keywords that flag a residential development filing ──────────────────────
RESIDENTIAL_KEYWORDS = [
    "subdivision", "condominium", "condo", "apartment", "multifamily",
    "multi-family", "residential", "plat", "site development",
    "construction agreement", "housing", "townhome", "townhouse",
    "duplex", "single family", "single-family", "planned development",
    "mixed use", "mixed-use", "annexation", "rezoning", "zoning change",
    "variance", "preliminary plat", "final plat", "replat",
    "infrastructure agreement", "drainage improvement", "HOA",
    "lot development", "building permit", "development agreement",
]

# ─── County portal configurations ─────────────────────────────────────────────
# Each entry: county name, hub, agenda URL, portal type
COUNTIES = [
    # ── Fort Worth / DFW ──────────────────────────────────────────────────────
    {
        "name": "Tarrant", "hub": "fort_worth",
        "agenda_url": "https://www.tarrantcounty.com/en/commissioner-court/commissioners-court.html",
        "type": "static",
        "notes": "Agenda packets listed on commissioners court page"
    },
    {
        "name": "Dallas", "hub": "fort_worth",
        "agenda_url": "https://www.dallascounty.org/government/commissioners-court/minutes-agendas.php",
        "type": "static",
    },
    {
        "name": "Denton", "hub": "fort_worth",
        "agenda_url": "https://www.dentoncounty.gov/agendacenter",
        "type": "civicplus",
        "notes": "CivicPlus agenda portal — use AgendaCenter scraper"
    },
    {
        "name": "Collin", "hub": "fort_worth",
        "agenda_url": "https://www.collincountytx.gov/county_clerk/Pages/CommissionersCourt.aspx",
        "type": "static",
    },
    {
        "name": "Johnson", "hub": "fort_worth",
        "agenda_url": "https://www.johnsoncountytx.org/agendacenter",
        "type": "civicplus",
    },
    {
        "name": "Parker", "hub": "fort_worth",
        "agenda_url": "https://www.parkercountytx.com/agendacenter",
        "type": "civicplus",
    },
    {
        "name": "Wise", "hub": "fort_worth",
        "agenda_url": "https://wisecounty.org/commissioners/",
        "type": "static",
    },
    {
        "name": "Ellis", "hub": "fort_worth",
        "agenda_url": "https://www.co.ellis.tx.us/agendacenter",
        "type": "civicplus",
    },
    {
        "name": "Kaufman", "hub": "fort_worth",
        "agenda_url": "https://www.kaufmancounty.net/agendacenter",
        "type": "civicplus",
    },
    {
        "name": "Rockwall", "hub": "fort_worth",
        "agenda_url": "https://www.rockwallcountytexas.com/agendacenter",
        "type": "civicplus",
    },
    {
        "name": "McLennan", "hub": "fort_worth",
        "agenda_url": "https://www.co.mclennan.tx.us/agendacenter",
        "type": "civicplus",
    },
    # ── Georgetown / Austin ───────────────────────────────────────────────────
    {
        "name": "Williamson", "hub": "georgetown",
        "agenda_url": "https://www.wilco.org/Departments/CountyJudge/CommissionersCourt",
        "type": "static",
        "notes": "High-yield county — active development corridor"
    },
    {
        "name": "Travis", "hub": "georgetown",
        "agenda_url": "https://www.traviscountytx.gov/commissioners-court/current-agenda",
        "type": "legistar",
        "notes": "Uses Legistar-style portal, JS-heavy"
    },
    {
        "name": "Hays", "hub": "georgetown",
        "agenda_url": "https://www.hayscountytx.com/commissioners-court/",
        "type": "static",
    },
    {
        "name": "Bastrop", "hub": "georgetown",
        "agenda_url": "https://www.co.bastrop.tx.us/agendacenter",
        "type": "civicplus",
    },
    {
        "name": "Bell", "hub": "georgetown",
        "agenda_url": "https://www.bellcountytx.com/agendacenter",
        "type": "civicplus",
    },
    {
        "name": "Burnet", "hub": "georgetown",
        "agenda_url": "https://www.burnetcountytexas.org/agendacenter",
        "type": "civicplus",
    },
    {
        "name": "Caldwell", "hub": "georgetown",
        "agenda_url": "https://www.caldwellcounty.org/commissioners-court/",
        "type": "static",
    },
    {
        "name": "Comal", "hub": "georgetown",
        "agenda_url": "https://www.co.comal.tx.us/agendacenter",
        "type": "civicplus",
    },
    # ── San Antonio ───────────────────────────────────────────────────────────
    {
        "name": "Bexar", "hub": "san_antonio",
        "agenda_url": "https://bexar.legistar.com/Calendar.aspx",
        "type": "legistar",
        "notes": "High-yield — use Legistar API if available"
    },
    {
        "name": "Guadalupe", "hub": "san_antonio",
        "agenda_url": "https://www.co.guadalupe.tx.us/agendacenter",
        "type": "civicplus",
    },
    {
        "name": "Wilson", "hub": "san_antonio",
        "agenda_url": "https://www.co.wilson.tx.us/commissioners-court/",
        "type": "static",
    },
    {
        "name": "Atascosa", "hub": "san_antonio",
        "agenda_url": "https://www.co.atascosa.tx.us/commissioners-court/",
        "type": "static",
    },
    {
        "name": "Medina", "hub": "san_antonio",
        "agenda_url": "https://www.medinacountytexas.org/agendacenter",
        "type": "civicplus",
    },
    {
        "name": "Kendall", "hub": "san_antonio",
        "agenda_url": "https://www.co.kendall.tx.us/agendacenter",
        "type": "civicplus",
    },
    {
        "name": "Kerr", "hub": "san_antonio",
        "agenda_url": "https://www.co.kerr.tx.us/commissioners-court/",
        "type": "static",
    },
]

# ─── Scraper classes ───────────────────────────────────────────────────────────

class BaseScraper:
    """Base class for county agenda scrapers."""

    def __init__(self, county: dict, lookback_days: int = 10):
        self.county = county
        self.lookback_days = lookback_days
        self.cutoff = datetime.now() - timedelta(days=lookback_days)
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (compatible; TXDevTracker/1.0; research)"
        })

    def is_residential(self, text: str) -> bool:
        """Return True if text contains residential development keywords."""
        text_lower = text.lower()
        return any(kw in text_lower for kw in RESIDENTIAL_KEYWORDS)

    def extract_filing_details(self, text: str, county_name: str, hub: str, date: str) -> dict | None:
        """
        Parse raw agenda item text into a structured filing dict.
        Uses regex heuristics; augment with Claude API for better extraction.
        """
        if not self.is_residential(text):
            return None

        # Extract acreage
        acres_match = re.search(r"(\d+\.?\d*)\s*(?:acres?|ac\.?)", text, re.I)
        acres = float(acres_match.group(1)) if acres_match else 0.0

        # Extract units/lots
        units_match = re.search(r"(\d+)\s*(?:lots?|units?|homes?|dwellings?|townhomes?)", text, re.I)
        units = int(units_match.group(1)) if units_match else 0

        # Extract permit number
        permit_match = re.search(r"(?:permit|case|application|proj(?:ect)?)\s*#?\s*([\w\-]+)", text, re.I)
        permit = permit_match.group(1) if permit_match else ""

        # Detect filing type
        filing_type = "Agenda Item"
        type_patterns = [
            (r"final plat", "Final Plat"),
            (r"preliminary plat", "Preliminary Plat"),
            (r"replat", "Replat"),
            (r"construction agreement", "Construction Agreement"),
            (r"development agreement", "Development Agreement"),
            (r"site development", "Site Development"),
            (r"variance", "Variance Request"),
            (r"rezoning|zoning change", "Rezoning"),
            (r"annexation", "Annexation"),
        ]
        for pattern, label in type_patterns:
            if re.search(pattern, text, re.I):
                filing_type = label
                break

        # Truncate notes to first 200 chars
        notes = re.sub(r"\s+", " ", text).strip()[:200]

        return {
            "id": f"{county_name}_{date}_{hash(text) % 99999:05d}",
            "date": date,
            "county": county_name,
            "hub": hub,
            "developer": "",          # Extracted by Claude AI or regex below
            "project": "",            # Extracted by Claude AI or regex below
            "type": filing_type,
            "acres": acres,
            "units": units,
            "address": "",
            "permit": permit,
            "status": "pending",
            "notes": notes,
            "raw_text": text[:1000],  # Keep raw for AI extraction
        }

    def fetch(self, url: str, use_playwright: bool = False) -> str:
        """Fetch page HTML, optionally using Playwright for JS-heavy pages."""
        if use_playwright and HAS_PLAYWRIGHT:
            return self._playwright_fetch(url)
        try:
            resp = self.session.get(url, timeout=15)
            resp.raise_for_status()
            return resp.text
        except Exception as e:
            log.warning(f"Failed to fetch {url}: {e}")
            return ""

    def _playwright_fetch(self, url: str) -> str:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            try:
                page.goto(url, wait_until="networkidle", timeout=20000)
                html = page.content()
            except Exception as e:
                log.warning(f"Playwright failed on {url}: {e}")
                html = ""
            browser.close()
        return html

    def scrape(self) -> list[dict]:
        raise NotImplementedError


class CivicPlusScraper(BaseScraper):
    """
    Scrapes counties using the CivicPlus AgendaCenter portal.
    Most Texas counties use this system (e.g. Denton, Johnson, Parker).
    URL pattern: /agendacenter
    """

    def scrape(self) -> list[dict]:
        filings = []
        base_url = self.county["agenda_url"].replace("/agendacenter","")
        html = self.fetch(self.county["agenda_url"])
        if not html:
            return filings

        soup = BeautifulSoup(html, "html.parser")

        # CivicPlus lists agendas as <a> links with "Agenda" in text
        links = soup.find_all("a", href=True)
        agenda_links = [
            (a.get_text(strip=True), a["href"])
            for a in links
            if "agenda" in a.get_text(strip=True).lower()
            or a["href"].lower().endswith(".pdf")
        ]

        for title, href in agenda_links[:5]:  # Limit to recent 5
            full_url = href if href.startswith("http") else base_url + href
            log.info(f"  → Fetching agenda: {title[:60]}")
            time.sleep(1)  # Polite delay

            if href.lower().endswith(".pdf"):
                text = self._extract_pdf_text(full_url)
            else:
                page_html = self.fetch(full_url)
                text = BeautifulSoup(page_html,"html.parser").get_text(" ")

            # Split into agenda items and check each
            items = re.split(r"\n{2,}|\t{2,}", text)
            for item in items:
                if len(item.strip()) < 30:
                    continue
                filing = self.extract_filing_details(
                    item,
                    self.county["name"],
                    self.county["hub"],
                    datetime.now().strftime("%Y-%m-%d")
                )
                if filing:
                    filings.append(filing)

        return filings

    def _extract_pdf_text(self, url: str) -> str:
        if not HAS_PDF:
            return ""
        try:
            resp = self.session.get(url, timeout=30)
            tmp = Path("/tmp/agenda_tmp.pdf")
            tmp.write_bytes(resp.content)
            with pdfplumber.open(tmp) as pdf:
                return "\n".join(p.extract_text() or "" for p in pdf.pages[:8])
        except Exception as e:
            log.warning(f"PDF extraction failed: {e}")
            return ""


class StaticScraper(BaseScraper):
    """
    Simple HTML scraper for counties with static agenda pages.
    Looks for PDF links and agenda item text.
    """

    def scrape(self) -> list[dict]:
        filings = []
        html = self.fetch(self.county["agenda_url"])
        if not html:
            return filings

        soup = BeautifulSoup(html, "html.parser")
        text = soup.get_text(" ")
        items = re.split(r"\n{2,}", text)

        for item in items:
            if len(item.strip()) < 40:
                continue
            filing = self.extract_filing_details(
                item,
                self.county["name"],
                self.county["hub"],
                datetime.now().strftime("%Y-%m-%d")
            )
            if filing:
                filings.append(filing)
        return filings


class LegistarScraper(BaseScraper):
    """
    Scraper for counties using Legistar (e.g. Travis, Bexar).
    Legistar has a public API: https://{county}.legistar.com/
    """

    LEGISTAR_API = "https://webapi.legistar.com/v1/{client}"

    # Known Legistar client IDs for Texas counties
    CLIENTS = {
        "Travis": "travis",
        "Bexar": "bexar",
    }

    def scrape(self) -> list[dict]:
        filings = []
        client = self.CLIENTS.get(self.county["name"])
        if not client:
            # Fall back to Playwright scrape of the portal
            html = self.fetch(self.county["agenda_url"], use_playwright=True)
            soup = BeautifulSoup(html, "html.parser")
            text = soup.get_text(" ")
            items = re.split(r"\n{3,}", text)
            for item in items:
                if len(item.strip()) < 40:
                    continue
                filing = self.extract_filing_details(
                    item, self.county["name"], self.county["hub"],
                    datetime.now().strftime("%Y-%m-%d")
                )
                if filing:
                    filings.append(filing)
            return filings

        # Use the Legistar REST API
        try:
            api_base = self.LEGISTAR_API.format(client=client)
            start = self.cutoff.strftime("%Y-%m-%d")
            resp = self.session.get(
                f"{api_base}/matters",
                params={"$filter": f"MatterLastModifiedUtc ge datetime'{start}T00:00:00'",
                        "$top": 100},
                timeout=15
            )
            matters = resp.json()
            for m in matters:
                title = m.get("MatterTitle","") + " " + m.get("MatterBodyName","")
                if self.is_residential(title):
                    filing = {
                        "id": f"{self.county['name']}_{m.get('MatterId','')}",
                        "date": (m.get("MatterIntroDate") or datetime.now().isoformat())[:10],
                        "county": self.county["name"],
                        "hub": self.county["hub"],
                        "developer": "",
                        "project": m.get("MatterTitle","")[:120],
                        "type": m.get("MatterTypeName","Agenda Item"),
                        "acres": 0.0,
                        "units": 0,
                        "address": "",
                        "permit": str(m.get("MatterFile","")),
                        "status": "pending",
                        "notes": m.get("MatterTitle","")[:200],
                        "raw_text": m.get("MatterTitle",""),
                    }
                    filings.append(filing)
        except Exception as e:
            log.warning(f"Legistar API failed for {self.county['name']}: {e}")

        return filings


# ─── AI enrichment (optional, uses Claude API) ────────────────────────────────

def enrich_with_claude(filing: dict) -> dict:
    """
    Use Claude to extract structured data from raw agenda text.
    Requires ANTHROPIC_API_KEY environment variable.
    """
    import os
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or not filing.get("raw_text"):
        return filing

    prompt = f"""Extract structured data from this Texas county clerk agenda item about residential development.

Raw text:
{filing['raw_text']}

Return ONLY valid JSON (no markdown), with these fields:
{{
  "developer": "developer or applicant company name, or empty string",
  "project": "project or subdivision name, or empty string",
  "acres": "numeric acreage as number, or 0",
  "units": "number of lots/units/homes as integer, or 0",
  "address": "street address or location description, or empty string",
  "status": "one of: approved, pending, under_review, denied",
  "notes": "one-sentence summary of what's being approved"
}}"""

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}]
        )
        text = message.content[0].text.strip()
        data = json.loads(text.replace("```json","").replace("```","").strip())
        filing.update({k: v for k, v in data.items() if v})
    except Exception as e:
        log.debug(f"Claude enrichment failed: {e}")

    return filing


# ─── Main ─────────────────────────────────────────────────────────────────────

def get_scraper(county: dict, lookback_days: int) -> BaseScraper:
    portal_type = county.get("type", "static")
    if portal_type == "civicplus":
        return CivicPlusScraper(county, lookback_days)
    elif portal_type == "legistar":
        return LegistarScraper(county, lookback_days)
    else:
        return StaticScraper(county, lookback_days)


def run(args):
    all_filings = []
    errors = []

    counties_to_scrape = COUNTIES
    if args.hub:
        counties_to_scrape = [c for c in COUNTIES if c["hub"] == args.hub]
    if args.county:
        counties_to_scrape = [c for c in counties_to_scrape if c["name"].lower() == args.county.lower()]

    log.info(f"Scraping {len(counties_to_scrape)} counties | lookback={args.lookback_days}d")

    for county in counties_to_scrape:
        log.info(f"[{county['hub']}] {county['name']} County ({county['type']})")
        try:
            scraper = get_scraper(county, args.lookback_days)
            filings = scraper.scrape()
            log.info(f"  → Found {len(filings)} residential filing(s)")

            if args.enrich:
                filings = [enrich_with_claude(f) for f in filings]

            all_filings.extend(filings)
            time.sleep(args.delay)
        except Exception as e:
            log.error(f"  ✗ {county['name']}: {e}")
            errors.append({"county": county["name"], "error": str(e)})

    # Deduplicate by id
    seen = set()
    unique = []
    for f in all_filings:
        if f["id"] not in seen:
            seen.add(f["id"])
            # Remove raw_text from output to keep JSON clean
            f.pop("raw_text", None)
            unique.append(f)

    # Sort newest first
    unique.sort(key=lambda f: f["date"], reverse=True)

    output = {
        "generated_at": datetime.now().isoformat(),
        "lookback_days": args.lookback_days,
        "counties_scraped": len(counties_to_scrape),
        "filings_found": len(unique),
        "errors": errors,
        "filings": unique,
    }

    out_path = Path(args.output)
    out_path.write_text(json.dumps(output, indent=2, ensure_ascii=False))
    log.info(f"\n✓ Done. {len(unique)} filings → {out_path}")

    if errors:
        log.warning(f"  {len(errors)} county(s) had errors — check logs above")

    return output


def main():
    parser = argparse.ArgumentParser(description="Texas Dev Tracker — County Clerk Scraper")
    parser.add_argument("--output", default="filings.json", help="Output JSON file path")
    parser.add_argument("--lookback-days", type=int, default=10, help="Days of history to check (default 10)")
    parser.add_argument("--hub", choices=["fort_worth","georgetown","san_antonio"], help="Only scrape one hub")
    parser.add_argument("--county", help="Only scrape one county by name")
    parser.add_argument("--delay", type=float, default=2.0, help="Seconds between county requests (default 2)")
    parser.add_argument("--enrich", action="store_true", help="Use Claude API to enrich extracted data (needs ANTHROPIC_API_KEY)")
    parser.add_argument("--dry-run", action="store_true", help="List counties without scraping")
    args = parser.parse_args()

    if args.dry_run:
        print(f"\nCounties that would be scraped ({len(COUNTIES)} total):\n")
        for c in COUNTIES:
            print(f"  [{c['hub']:12s}] {c['name']:12s} ({c['type']:10s}) {c['agenda_url']}")
        return

    run(args)


if __name__ == "__main__":
    main()

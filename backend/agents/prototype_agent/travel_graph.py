from __future__ import annotations

import json
import logging
import os
import re
import time
from dataclasses import dataclass
from typing import Any, Literal, Protocol

logger = logging.getLogger(__name__)

from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langgraph.graph import END, START, StateGraph

from graph_state import (
    FlightOption,
    HotelOption,
    MissingField,
    OutputConfig,
    PackageRegistration,
    ParsedIntentPlan,
    TravelGraphState,
    TravelQueryInput,
    TravelQueryOutput,
    TravelRequest,
)
from serpapi_tools import search_google_flights, search_google_hotels


DATE_RE = r"\d{4}-\d{2}-\d{2}"
DEFAULT_MODEL = "nvidia/nemotron-3-super-120b-a12b"
MODEL = os.environ.get("NVIDIA_MODEL", DEFAULT_MODEL)


class FlightToolRunner(Protocol):
    def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        ...


class HotelToolRunner(Protocol):
    def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        ...


@dataclass
class DefaultFlightToolRunner:
    def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        return _safe_json_loads(search_google_flights.invoke(payload))


@dataclass
class DefaultHotelToolRunner:
    def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        return _safe_json_loads(search_google_hotels.invoke(payload))


flight_runner: FlightToolRunner = DefaultFlightToolRunner()
hotel_runner: HotelToolRunner = DefaultHotelToolRunner()

try:
    llm_parser = ChatNVIDIA(model=MODEL, temperature=0)
    llm_writer = ChatNVIDIA(model=MODEL, temperature=0.2)
    _LLM_AVAILABLE = True
except Exception as exc:
    llm_parser = None
    llm_writer = None
    _LLM_AVAILABLE = False
    logger.warning(
        "LLM initialization failed — running in heuristic-only mode. "
        "Verify NVIDIA_API_KEY and model availability. Error: %s: %s",
        type(exc).__name__,
        exc,
    )


def _maybe_travel_request(raw: Any) -> TravelRequest | None:
    if raw is None:
        return None
    if isinstance(raw, TravelRequest):
        return raw
    if isinstance(raw, dict):
        try:
            return TravelRequest.model_validate(raw)
        except Exception:
            return None
    return None


def _primary_place_name(destination: str) -> str:
    part = destination.split(",")[0].strip()
    return part if part else destination.strip()


def _normalize_airport_like(value: str | None) -> str:
    """Return a clean airport identifier: IATA code if value is already one, else the primary city name.

    The LLM parsing step is responsible for resolving city names to IATA codes before this runs.
    This function only sanitizes the output — it does not perform city-to-code lookups.
    SerpAPI's Google Flights engine accepts both IATA codes and city names.
    """
    if not value:
        return ""
    primary = value.strip().split(",")[0].strip()
    # If already a 3-letter code (any case), return uppercased
    if re.match(r'^[A-Za-z]{3}$', primary):
        return primary.upper()
    # Return the city name as-is for SerpAPI text resolution
    return primary[:60].strip()


def _structured_seed_from_request(req: TravelRequest | None) -> dict[str, Any]:
    if not req:
        return {}
    seed: dict[str, Any] = {}
    if req.departure_city and req.departure_city.strip():
        seed["origin"] = req.departure_city.strip()
    if req.destination and req.destination.strip():
        seed["destination"] = req.destination.strip()
        seed["hotel_city"] = req.destination.strip()
    start_iso = req.start_date_iso()
    end_iso = req.end_date_iso()
    if start_iso:
        seed["depart_date"] = start_iso
        seed["hotel_checkin"] = start_iso
    if end_iso:
        seed["return_date"] = end_iso
        seed["hotel_checkout"] = end_iso
    elif start_iso:
        seed["hotel_checkout"] = start_iso
    return seed


def _preferences_from_request(req: TravelRequest | None) -> dict[str, Any]:
    if not req:
        return {}
    prefs: dict[str, Any] = {}
    if req.min_budget is not None:
        prefs["min_budget"] = req.min_budget
    if req.max_budget is not None:
        prefs["max_budget"] = req.max_budget
    td = req.travelers_display()
    if td:
        prefs["travelers"] = td
    if req.currency:
        prefs["currency"] = req.currency
    if req.locale:
        prefs["locale"] = req.locale
    return prefs


def _build_composite_query(user_query: str, req: TravelRequest | None) -> str:
    blocks: list[str] = []
    if req:
        lines: list[str] = []
        if req.client_name:
            lines.append(f"Client name: {req.client_name}")
        if req.client_email:
            lines.append(f"Client email: {req.client_email}")
        if req.departure_city:
            lines.append(f"Departure city: {req.departure_city}")
        if req.destination:
            lines.append(f"Destination: {req.destination}")
        if req.start_date_iso() or req.end_date_iso():
            lines.append(f"Trip window: {req.start_date_iso() or '?'} → {req.end_date_iso() or '?'}")
        if req.min_budget is not None or req.max_budget is not None:
            curr = req.currency or "USD"
            lines.append(f"Budget range: {req.min_budget} to {req.max_budget} ({curr})")
        if req.travelers_display():
            lines.append(f"Travelers: {req.travelers_display()}")
        if req.special_preferences:
            lines.append(f"Natural language preferences:\n{req.special_preferences.strip()}")
        blocks.append("[Structured travel request]\n" + "\n".join(lines))
    uq = user_query.strip()
    if uq:
        blocks.append("[Additional instructions]\n" + uq)
    if not blocks:
        return "Plan a travel package with flights and hotels."
    return "\n\n".join(blocks)


def _extract_dates_ordered(text: str) -> tuple[str | None, str | None]:
    _MIN_YEAR, _MAX_YEAR = 2020, 2040

    def _valid_iso(d: str) -> bool:
        try:
            y = int(d[:4])
            return _MIN_YEAR <= y <= _MAX_YEAR
        except (ValueError, IndexError):
            return False

    matches = sorted(d for d in set(re.findall(DATE_RE, text)) if _valid_iso(d))
    if len(matches) >= 2:
        return matches[0], matches[1]
    if len(matches) == 1:
        return matches[0], None

    try:
        from dateparser.search import search_dates
    except Exception:
        return None, None

    try:
        found = search_dates(
            text,
            languages=("en", "es"),
            settings={
                "PREFER_DATES_FROM": "future",
                "DATE_ORDER": "DMY",
            },
        )
    except Exception:
        return None, None

    if not found:
        return None, None
    uniq: list[Any] = []
    seen = set()
    for _, dt in found:
        donly = getattr(dt, "date", lambda: dt)()
        year = getattr(donly, "year", 0)
        if donly not in seen and _MIN_YEAR <= year <= _MAX_YEAR:
            seen.add(donly)
            uniq.append(donly)

    uniq.sort()

    def iso(d_obj: Any) -> str:
        return d_obj.isoformat() if hasattr(d_obj, "isoformat") else str(d_obj)

    if len(uniq) >= 2:
        return iso(uniq[0]), iso(uniq[1])
    if len(uniq) == 1:
        return iso(uniq[0]), None
    return None, None


def _parse_adults(req: TravelRequest | None, preferences: dict[str, Any]) -> int:
    src = preferences.get("travelers") if isinstance(preferences, dict) else None
    candidates: list[Any] = [src]
    if req:
        candidates.append(req.travelers_display())
    text = ""
    for c in candidates:
        if c:
            text = str(c)
            break
    m = re.search(r"(\d+)", text or "")
    if m:
        return max(1, min(int(m.group(1)), 9))
    return 2


def _guess_currency(req: TravelRequest | None, preferences: dict[str, Any]) -> str:
    c = preferences.get("currency") if preferences else None
    if isinstance(c, str) and c.strip():
        return c.strip().upper()
    if req and req.currency:
        return str(req.currency).strip().upper()
    return "USD"


def _guess_gl_hl(locale: str | None) -> tuple[str, str]:
    loc = (locale or "").strip().lower()
    if loc.startswith("es"):
        return "mx", "es"
    return "mx", "en"


def _tool_error_messages(data: dict[str, Any]) -> list[str]:
    msgs: list[str] = []
    if not isinstance(data, dict):
        return msgs
    if isinstance(data.get("_http_error"), str):
        msgs.append("Error de conexión al buscar. Intenta de nuevo en unos momentos.")
    api_err = data.get("_serpapi_error_message", "")
    if isinstance(api_err, str) and api_err:
        low = api_err.lower()
        if "api key" in low or "invalid" in low:
            msgs.append("Clave de búsqueda no válida. Contacta al administrador.")
        elif "quota" in low or "limit" in low or "rate" in low:
            msgs.append("Límite de búsquedas alcanzado. Intenta en unos minutos.")
        else:
            msgs.append("No se encontraron resultados para los parámetros indicados.")
    return msgs


def _extract_two_dates(text: str) -> tuple[str | None, str | None]:
    matches = sorted(set(re.findall(DATE_RE, text)))
    if not matches:
        return None, None
    if len(matches) == 1:
        return matches[0], None
    return matches[0], matches[1]


def _extract_between(text: str, start_word: str, end_word: str) -> str | None:
    pattern = rf"{start_word}\s+(.+?)\s+{end_word}\s+"
    # Use findall to get all matches; prefer the last one for destination (avoids
    # grabbing the whole sentence when "to" appears multiple times before a date).
    matches = re.findall(pattern, text, flags=re.IGNORECASE)
    if not matches:
        return None
    # Pick the shortest match that is at most 4 words — avoids full-sentence captures.
    candidates = [m.strip(" .,") for m in matches]
    short = [c for c in candidates if len(c.split()) <= 4]
    return short[-1] if short else candidates[-1]


def _detect_intent(query: str) -> Literal["flight", "hotel", "both"]:
    q = query.lower()
    # Only treat as single-tool when user explicitly says they need ONLY one.
    # Phrases about flight/hotel preferences (round trip, economy, boutique) are NOT intent signals.
    flight_only_nl = any(p in q for p in (
        "flight-only", "only flight", "just flight", "just a flight",
        "solo el vuelo", "solo vuelo", "solo necesito el vuelo",
        "ya tengo hotel", "ya tengo hospedaje",
    ))
    hotel_only_nl = any(p in q for p in (
        "hotel-only", "only hotel", "just hotel", "just a hotel",
        "solo el hotel", "solo hotel", "solo necesito el hotel",
        "ya tengo vuelo", "ya tengo boleto",
    ))
    if flight_only_nl and not hotel_only_nl:
        return "flight"
    if hotel_only_nl and not flight_only_nl:
        return "hotel"
    # Default: search both. A mention of "flight" or "hotel" without "only" is a preference,
    # not a reason to suppress the other tool.
    return "both"


def _heuristic_airport_pair(query: str) -> tuple[str | None, str | None]:
    """Match phrases like ``JFK to CDG`` (3-letter ids SerpAPI often accepts)."""
    m = re.search(r"\b([A-Za-z]{3})\s+to\s+([A-Za-z]{3})\b", query)
    if not m:
        return None, None
    return m.group(1).upper(), m.group(2).upper()


def _heuristic_plan(query: str) -> ParsedIntentPlan:
    iso_first, iso_second = _extract_two_dates(query)
    nl_first, nl_second = _extract_dates_ordered(query)
    depart_date = iso_first or nl_first
    second_date = iso_second if len(re.findall(DATE_RE, query)) >= 2 else nl_second

    origin = _extract_between(query, "from", "to") or None
    destination = _extract_between(query, "to", "on")
    for delimiter in ("departing", "departure", "on", "leaving"):
        if not destination:
            destination = _extract_between(query, "to", delimiter)

    dest_alt = None
    m_to = re.search(r"\bto\s+([\w\s,]+)$", query, flags=re.IGNORECASE)
    if m_to:
        dest_alt = m_to.group(1).strip(" .")
    destination = destination or dest_alt

    code_a, code_b = _heuristic_airport_pair(query)
    if not origin and code_a:
        origin = code_a
    if not destination and code_b:
        destination = code_b

    # Bug 3c fallback: if destination still unknown, grab the first standalone IATA-like token
    # that isn't already used as origin (e.g. "fly to CDG returning June 20")
    if not destination:
        for m_iata in re.finditer(r'\b([A-Z]{3})\b', query):
            candidate = m_iata.group(1)
            if candidate != origin:
                destination = candidate
                break

    hotel_city = None
    m_city = re.search(r"in\s+(.+?)\s+from\s+" + DATE_RE, query, flags=re.IGNORECASE)
    if m_city:
        hotel_city = m_city.group(1).strip(" .,")

    lowercase = query.lower()
    # Set return_date when there is a second date AND any round-trip signal.
    # "returning" covers "returning July 30", "return on", "return flight", etc.
    _roundtrip_signals = ("return", "round trip", "round-trip", "vuelta", "ida y vuelta")
    ret_date = second_date if second_date and any(s in lowercase for s in _roundtrip_signals) else None

    hc_in = depart_date
    hc_out = second_date

    intent = _detect_intent(query)
    tool_plan: list[Literal["flight", "hotel"]] = (
        ["flight", "hotel"] if intent == "both" else [intent]
    )

    parsed = TravelQueryInput(
        user_query=query,
        origin=origin,
        destination=destination,
        depart_date=depart_date,
        return_date=ret_date,
        hotel_city=hotel_city or destination,
        hotel_checkin=hc_in,
        hotel_checkout=hc_out,
        preferences={},
    )

    return ParsedIntentPlan(
        intent=intent,
        origin=parsed.origin,
        destination=parsed.destination,
        depart_date=parsed.depart_date,
        return_date=parsed.return_date,
        hotel_city=parsed.hotel_city,
        hotel_checkin=parsed.hotel_checkin,
        hotel_checkout=parsed.hotel_checkout,
        preferences=parsed.preferences,
        missing_fields=[],
        tool_plan=tool_plan,
        plan_confidence=0.45,
    )


def _llm_plan(query: str) -> ParsedIntentPlan | None:
    if llm_parser is None:
        return None
    prompt = (
        "Extract travel intent and planning fields from the user request. "
        "Return structured data matching the schema.\n"
        "Rules:\n"
        "- intent ∈ {flight, hotel, both, unknown}. Default to 'both' whenever the request "
        "includes a departure city and a destination — that means search for flights AND hotels. "
        "Set intent to 'flight' ONLY if the user explicitly says they need only a flight and "
        "already have accommodation (e.g. 'flight only', 'solo el vuelo', 'ya tengo hotel'). "
        "Set intent to 'hotel' ONLY if the user explicitly says they need only a hotel and "
        "already have transport (e.g. 'hotel only', 'solo el hotel', 'ya tengo vuelo'). "
        "Preferences about flight type (round trip, economy class, direct, business class, "
        "'vuelo de ida y vuelta', 'clase económica', etc.) do NOT change intent away from 'both'.\n"
        "- tool_plan is a subset of [flight, hotel] matching the intent above.\n"
        "- Dates must be ISO YYYY-MM-DD when confidently known.\n"
        "- For origin and destination ALWAYS output the primary IATA airport code "
        "(exactly 3 uppercase letters). Resolve any city name to its main international airport: "
        "New York → JFK, Mexico City → MEX, Paris → CDG, London → LHR, Tokyo → NRT, "
        "Los Angeles → LAX, Miami → MIA, Madrid → MAD, Barcelona → BCN, Rome → FCO, "
        "Cancun → CUN, Bogota → BOG, Lima → LIM, Buenos Aires → EZE, São Paulo → GRU, "
        "Dubai → DXB, Singapore → SIN, Bangkok → BKK, Sydney → SYD, Toronto → YYZ. "
        "If the user already provides an IATA code, keep it unchanged. "
        "For any city not listed above, resolve to its largest international airport code.\n"
        f"\nUSER REQUEST:\n{query}"
    )
    try:
        return llm_parser.with_structured_output(ParsedIntentPlan).invoke(prompt)
    except Exception:
        return None


def _coalesce(primary: str | None, fallback: str | None) -> str | None:
    return primary if primary else fallback


def _merge_plans(llm_plan: ParsedIntentPlan | None, heuristic_plan: ParsedIntentPlan) -> ParsedIntentPlan:
    if llm_plan is None:
        return heuristic_plan.model_copy(update={"missing_fields": []})
    merged_tool_plan = llm_plan.tool_plan or heuristic_plan.tool_plan
    merged_intent = llm_plan.intent if llm_plan.intent != "unknown" else heuristic_plan.intent

    merged = ParsedIntentPlan(
        intent=merged_intent if merged_intent in {"flight", "hotel", "both"} else heuristic_plan.intent,
        origin=_coalesce(llm_plan.origin, heuristic_plan.origin),
        destination=_coalesce(llm_plan.destination, heuristic_plan.destination),
        depart_date=_coalesce(llm_plan.depart_date, heuristic_plan.depart_date),
        return_date=_coalesce(llm_plan.return_date, heuristic_plan.return_date),
        hotel_city=_coalesce(llm_plan.hotel_city, heuristic_plan.hotel_city),
        hotel_checkin=_coalesce(llm_plan.hotel_checkin, heuristic_plan.hotel_checkin),
        hotel_checkout=_coalesce(llm_plan.hotel_checkout, heuristic_plan.hotel_checkout),
        preferences={**heuristic_plan.preferences, **llm_plan.preferences},
        missing_fields=[],
        tool_plan=list(merged_tool_plan) if merged_tool_plan else list(heuristic_plan.tool_plan),
        plan_confidence=max(llm_plan.plan_confidence, heuristic_plan.plan_confidence),
    )
    return merged


# ── Hub fallback: connecting flight search ─────────────────────────────────────

_AIRPORT_REGION: dict[str, str] = {
    # México
    "MEX": "mx", "CUN": "mx", "GDL": "mx", "MTY": "mx", "TIJ": "mx",
    "PVR": "mx", "SJD": "mx", "MZT": "mx", "MID": "mx", "BJX": "mx",
    # Centroamérica y Caribe
    "GUA": "ca", "SAL": "ca", "SJO": "ca", "PTY": "ca", "MGA": "ca",
    "TGU": "ca", "BZE": "ca", "HAV": "ca", "SDQ": "ca", "SJU": "ca",
    "PUJ": "ca", "NAS": "ca", "MBJ": "ca",
    # Sudamérica
    "BOG": "sa", "GRU": "sa", "GIG": "sa", "EZE": "sa", "SCL": "sa",
    "LIM": "sa", "UIO": "sa", "GYE": "sa", "MVD": "sa", "CCS": "sa",
    "MDE": "sa", "CLO": "sa", "CTG": "sa", "BSB": "sa", "FOR": "sa",
    # EE.UU. y Canadá
    "JFK": "us", "LAX": "us", "MIA": "us", "ORD": "us", "DFW": "us",
    "SFO": "us", "IAH": "us", "ATL": "us", "DEN": "us", "SEA": "us",
    "LAS": "us", "BOS": "us", "PHX": "us", "MCO": "us", "YYZ": "us",
    "YVR": "us", "YUL": "us",
    # Europa
    "LHR": "eu", "CDG": "eu", "MAD": "eu", "FCO": "eu", "AMS": "eu",
    "FRA": "eu", "MXP": "eu", "BCN": "eu", "MUC": "eu", "ZRH": "eu",
    "VIE": "eu", "LIS": "eu", "BRU": "eu", "IST": "eu", "ATH": "eu",
    "DUB": "eu", "CPH": "eu", "ARN": "eu", "OSL": "eu",
    # Islas mediterráneas y destinos turísticos europeos
    "JMK": "eu", "HER": "eu", "SKG": "eu", "RHO": "eu", "CFU": "eu",
    "ZTH": "eu", "KGS": "eu", "CHQ": "eu", "JTR": "eu", "MJT": "eu",
    "PMI": "eu", "IBZ": "eu", "MAH": "eu", "LPA": "eu", "TFS": "eu",
    "ACE": "eu", "FUE": "eu", "VCE": "eu", "NAP": "eu", "CTA": "eu",
    "PSA": "eu", "BRI": "eu", "OLB": "eu", "CAG": "eu",
    # Asia
    "NRT": "as", "HND": "as", "ICN": "as", "PEK": "as", "PVG": "as",
    "HKG": "as", "SIN": "as", "BKK": "as", "KUL": "as", "CGK": "as",
    "MNL": "as", "DEL": "as", "BOM": "as", "KIX": "as", "DPS": "as",
    "SGN": "as", "HAN": "as",
    # Medio Oriente
    "DXB": "me", "DOH": "me", "AUH": "me", "RUH": "me", "JED": "me",
    "IST": "me",
    # Oceanía
    "SYD": "oc", "MEL": "oc", "BNE": "oc", "PER": "oc", "AKL": "oc",
    # África
    "JNB": "af", "CPT": "af", "CAI": "af", "CMN": "af", "NBO": "af",
}

_REGION_HUBS: dict[frozenset, list[str]] = {
    frozenset(["mx", "as"]):  ["LAX", "SFO", "JFK", "ORD"],
    frozenset(["ca", "as"]):  ["LAX", "MIA", "JFK"],
    frozenset(["sa", "as"]):  ["MIA", "LAX", "JFK"],
    frozenset(["mx", "eu"]):  ["JFK", "MIA", "MAD"],
    frozenset(["ca", "eu"]):  ["MIA", "JFK", "MAD"],
    frozenset(["sa", "eu"]):  ["MIA", "MAD", "JFK"],
    frozenset(["mx", "me"]):  ["JFK", "MIA", "LHR"],
    frozenset(["ca", "me"]):  ["MIA", "JFK", "LHR"],
    frozenset(["sa", "me"]):  ["MIA", "JFK", "LHR"],
    frozenset(["mx", "oc"]):  ["LAX", "SFO", "SYD"],
    frozenset(["ca", "oc"]):  ["LAX", "MIA"],
    frozenset(["sa", "oc"]):  ["LAX", "SYD"],
    frozenset(["us", "as"]):  ["LAX", "SFO", "ORD", "JFK"],
    frozenset(["us", "me"]):  ["JFK", "LHR", "FRA"],
    frozenset(["us", "af"]):  ["JFK", "LHR", "CDG"],
    frozenset(["eu", "as"]):  ["DXB", "DOH", "IST"],
    frozenset(["eu", "oc"]):  ["DXB", "SIN"],
    frozenset(["as", "oc"]):  ["SIN", "BKK"],
    frozenset(["me", "as"]):  ["SIN", "BKK"],
    frozenset(["mx", "af"]):  ["JFK", "MIA", "LHR"],
    frozenset(["ca", "af"]):  ["MIA", "JFK", "LHR"],
    frozenset(["sa", "af"]):  ["MIA", "LHR", "JNB"],
}


def _hub_candidates(origin: str, destination: str) -> list[str]:
    o = _AIRPORT_REGION.get(origin.upper())
    d = _AIRPORT_REGION.get(destination.upper())
    if not o or not d or o == d:
        return []
    key = frozenset([o, d])
    return [
        h for h in _REGION_HUBS.get(key, [])
        if h not in (origin.upper(), destination.upper())
    ][:3]


def _try_via_hub(
    parsed: "TravelQueryInput",
    base_payload: dict,
    outbound_date: str,
    runner: "FlightToolRunner",
) -> "dict | None":
    """Try finding flights via hub airports when direct route returns empty."""
    origin = (parsed.origin or "").upper()
    destination = (parsed.destination or "").upper()
    hubs = _hub_candidates(origin, destination)

    for hub in hubs:
        try:
            leg1 = _safe_json_loads(
                search_google_flights.invoke({
                    **base_payload,
                    "arrival_id": hub,
                    "type": 2,
                    "return_date": "",
                })
            )
            l1 = (leg1.get("best_flights") or []) + (leg1.get("other_flights") or []) + (leg1.get("flights") or [])
            if not l1:
                continue

            leg2 = _safe_json_loads(
                search_google_flights.invoke({
                    **base_payload,
                    "departure_id": hub,
                    "type": 2,
                    "return_date": "",
                })
            )
            l2 = (leg2.get("best_flights") or []) + (leg2.get("other_flights") or []) + (leg2.get("flights") or [])
            if not l2:
                continue

            f1, f2 = l1[0], l2[0]

            def _price(f: dict) -> float | None:
                try:
                    return float(f["price"])
                except Exception:
                    return None

            p1, p2 = _price(f1), _price(f2)
            combined_price = (p1 + p2) if (p1 is not None and p2 is not None) else None
            dur1 = f1.get("total_duration") or 0
            dur2 = f2.get("total_duration") or 0

            combined_flight = {
                "flights": (f1.get("flights") or []) + (f2.get("flights") or []),
                "price": combined_price,
                "total_duration": dur1 + dur2 + 120,
                "layovers": [{"id": hub, "duration": 120, "name": hub}],
                "_via_hub": hub,
                "type": f"Connecting via {hub}",
            }

            return {
                "search_parameters": {
                    "currency": base_payload.get("currency", "USD"),
                    "_via_hub": hub,
                },
                "best_flights": [combined_flight],
                "other_flights": [],
                "flights": [],
            }
        except Exception:
            continue

    return None


# 3-letter uppercase strings that are NOT IATA airport codes and must be rejected.
_NOT_IATA = frozenset({
    # Currency codes
    "USD", "EUR", "GBP", "CAD", "AUD", "JPY", "MXN", "BRL", "CNY", "AED",
    "CHF", "KRW", "SGD", "HKD", "NOK", "SEK", "DKK", "NZD", "ZAR", "INR",
    # Common English words that are 3 letters
    "THE", "AND", "FOR", "ARE", "NOT", "FLY", "USA", "NYC", "LAW", "AIR",
})


def _overlay_structured(plan: ParsedIntentPlan, seed: dict[str, Any]) -> ParsedIntentPlan:
    if not seed:
        return plan
    kwargs: dict[str, Any] = {}
    mapping = ["origin", "destination", "depart_date", "return_date", "hotel_city", "hotel_checkin", "hotel_checkout"]
    for key in mapping:
        val = seed.get(key)
        if val is None:
            continue
        if isinstance(val, str) and not val.strip():
            continue
        # Don't overwrite a valid IATA code already resolved by the LLM with a raw city name.
        # Exclude known non-airport 3-letter strings (currency codes, etc.).
        if key in ("origin", "destination"):
            current = getattr(plan, key, None)
            if (
                isinstance(current, str)
                and re.match(r'^[A-Z]{3}$', current.strip())
                and current.strip() not in _NOT_IATA
            ):
                continue
        kwargs[key] = val.strip() if isinstance(val, str) else val
    return plan.model_copy(update=kwargs) if kwargs else plan


def _resolve_iata_if_needed(value: str | None) -> str | None:
    """Return value as-is if already a valid IATA code; otherwise ask the LLM to resolve it.

    Only triggers when a city name slipped through (e.g. LLM unavailable or parse failed).
    Rejects known non-airport 3-letter strings (currency codes, common words).
    """
    if not value:
        return value
    s = value.strip().split(",")[0].strip()
    if re.match(r'^[A-Z]{3}$', s) and s not in _NOT_IATA:
        return s
    if llm_parser is None:
        return s
    try:
        result = llm_parser.invoke(
            f"Output only the 3-letter IATA airport code for this city or place: {s}\n"
            "Respond with exactly 3 uppercase letters and nothing else. Example: BCN"
        )
        code = (result.content if hasattr(result, "content") else str(result)).strip().upper()
        m = re.search(r'\b([A-Z]{3})\b', code)
        if m and m.group(1) not in _NOT_IATA:
            return m.group(1)
    except Exception:
        pass
    return s


def _apply_nl_date_backfill(plan: ParsedIntentPlan, composite: str) -> ParsedIntentPlan:
    iso_all = sorted(set(re.findall(DATE_RE, composite)))
    d1, d2 = _extract_dates_ordered(composite)
    update: dict[str, Any] = {}
    new_depart = plan.depart_date or d1
    if new_depart:
        update["depart_date"] = new_depart

    incoming_return = plan.return_date
    if not incoming_return and d2 and d2 != update.get("depart_date"):
        incoming_return = d2
    elif not incoming_return and len(iso_all) >= 2:
        second = iso_all[1]
        if second != update.get("depart_date"):
            incoming_return = second

    if incoming_return:
        update["return_date"] = incoming_return

    hin = plan.hotel_checkin or update.get("depart_date") or plan.depart_date
    hout = plan.hotel_checkout or update.get("return_date") or plan.return_date

    hc_updates: dict[str, Any] = {}
    if hin:
        hc_updates["hotel_checkin"] = hin
    if hout:
        hc_updates["hotel_checkout"] = hout
    if not plan.hotel_city and plan.destination:
        hc_updates["hotel_city"] = _primary_place_name(plan.destination)

    merge = {**update, **hc_updates}
    return plan.model_copy(update=merge) if merge else plan


_IATA_CITY_MAP: dict[str, str] = {
    # México
    "MEX": "Ciudad de Mexico", "CUN": "Cancun", "GDL": "Guadalajara",
    "MTY": "Monterrey", "TIJ": "Tijuana", "PVR": "Puerto Vallarta",
    "SJD": "Los Cabos", "MZT": "Mazatlan", "MID": "Merida",
    # EE.UU.
    "JFK": "New York", "LAX": "Los Angeles", "ORD": "Chicago",
    "MIA": "Miami", "ATL": "Atlanta", "DFW": "Dallas", "SFO": "San Francisco",
    "LAS": "Las Vegas", "SEA": "Seattle", "BOS": "Boston", "DEN": "Denver",
    "IAH": "Houston", "PHX": "Phoenix", "MCO": "Orlando",
    # Canadá
    "YYZ": "Toronto", "YVR": "Vancouver", "YUL": "Montreal",
    # Europa continental
    "LHR": "London", "CDG": "Paris", "MAD": "Madrid", "FCO": "Rome",
    "AMS": "Amsterdam", "FRA": "Frankfurt", "MXP": "Milan", "BCN": "Barcelona",
    "MUC": "Munich", "ZRH": "Zurich", "VIE": "Vienna", "LIS": "Lisbon",
    "BRU": "Brussels", "ATH": "Athens", "DUB": "Dublin", "CPH": "Copenhagen",
    "ARN": "Stockholm", "OSL": "Oslo",
    # Islas griegas
    "JMK": "Mykonos", "HER": "Heraklion", "SKG": "Thessaloniki",
    "RHO": "Rhodes", "CFU": "Corfu", "ZTH": "Zakynthos", "KGS": "Kos",
    "CHQ": "Chania", "JTR": "Santorini", "MJT": "Mytilene",
    # Islas españolas
    "PMI": "Palma de Mallorca", "IBZ": "Ibiza", "MAH": "Menorca",
    "LPA": "Las Palmas", "TFS": "Tenerife", "ACE": "Lanzarote", "FUE": "Fuerteventura",
    # Italia islas/ciudades
    "VCE": "Venecia", "NAP": "Napoles", "CTA": "Catania",
    # Turquía
    "IST": "Istanbul",
    # Asia
    "NRT": "Tokyo", "HND": "Tokyo", "ICN": "Seoul", "PEK": "Beijing",
    "PVG": "Shanghai", "HKG": "Hong Kong", "SIN": "Singapore",
    "BKK": "Bangkok", "KUL": "Kuala Lumpur", "DEL": "Nueva Delhi",
    "BOM": "Mumbai", "DPS": "Bali", "MNL": "Manila",
    # Medio Oriente
    "DXB": "Dubai", "DOH": "Doha", "AUH": "Abu Dhabi",
    # América del Sur
    "GRU": "Sao Paulo", "GIG": "Rio de Janeiro", "EZE": "Buenos Aires",
    "BOG": "Bogota", "LIM": "Lima", "SCL": "Santiago", "MVD": "Montevideo",
    # Caribe / Centroamérica
    "HAV": "Habana", "SJU": "San Juan", "CCS": "Caracas",
    "PTY": "Panama", "SJO": "San Jose",
    # África
    "JNB": "Johannesburg", "CAI": "Cairo", "CMN": "Casablanca",
    # Oceanía
    "SYD": "Sydney", "MEL": "Melbourne", "AKL": "Auckland",
}


def _iata_to_city(code: str) -> str:
    city = _IATA_CITY_MAP.get(code.upper())
    if city:
        return city
    if llm_parser is not None:
        try:
            result = llm_parser.invoke(
                f"What city does the airport with IATA code {code} serve? "
                "Reply with just the city name, nothing else. Example: Paris"
            )
            content = (result.content if hasattr(result, "content") else str(result)).strip()
            if content:
                return content.split(",")[0].strip()
        except Exception:
            pass
    return code


def _resolve_hotel_city(city: str) -> str:
    part = city.split(",")[0].strip()
    if re.match(r'^[A-Z]{3}$', part) and part not in _NOT_IATA:
        return _iata_to_city(part)
    return part


def _apply_package_invariants(plan: ParsedIntentPlan) -> ParsedIntentPlan:
    # Respect explicit flight-only or hotel-only intent from NL; only default to "both".
    explicit_single = plan.intent in {"flight", "hotel"}
    if explicit_single:
        u: dict[str, Any] = {"tool_plan": [plan.intent]}
    else:
        u: dict[str, Any] = {"intent": "both", "tool_plan": ["flight", "hotel"]}
    dest = plan.destination
    hc = plan.hotel_city
    if dest and not hc:
        u["hotel_city"] = _resolve_hotel_city(dest)

    hin = plan.hotel_checkin or plan.depart_date
    hout = plan.hotel_checkout or plan.return_date or plan.depart_date

    if hin:
        u["hotel_checkin"] = hin
    if hout:
        u["hotel_checkout"] = hout

    dep = plan.depart_date
    ret = plan.return_date
    if dep and ret and dep > ret:
        u["depart_date"], u["return_date"] = ret, dep

    return plan.model_copy(update=u)


def _recompute_missing_and_tools(plan: ParsedIntentPlan) -> tuple[ParsedIntentPlan, list[MissingField]]:
    tool_plan = list(plan.tool_plan or [])
    if not tool_plan:
        tool_plan = ["flight"] if plan.intent == "flight" else ["hotel"] if plan.intent == "hotel" else ["flight", "hotel"]

    missing: list[MissingField] = []
    if "flight" in tool_plan:
        if not plan.origin:
            missing.append(MissingField(field="origin", reason="Flight search needs departure location."))
        if not plan.destination:
            missing.append(MissingField(field="destination", reason="Flight search needs arrival location."))
        if not plan.depart_date:
            missing.append(MissingField(field="depart_date", reason="Flight search needs outbound date."))

    if "hotel" in tool_plan:
        if not plan.hotel_city:
            missing.append(MissingField(field="hotel_city", reason="Hotel search needs destination city/query."))
        if not plan.hotel_checkin:
            missing.append(MissingField(field="hotel_checkin", reason="Hotel search needs check-in date."))
        if not plan.hotel_checkout:
            missing.append(MissingField(field="hotel_checkout", reason="Hotel search needs check-out date."))

    updated_plan = plan.model_copy(update={"tool_plan": tool_plan, "missing_fields": missing})
    return updated_plan, missing


def _plan_to_preferences(plan: ParsedIntentPlan, extras: dict[str, Any]) -> dict[str, Any]:
    return {**extras, **(plan.preferences or {})}


def _llm_parser_planner_node(state: TravelGraphState) -> TravelGraphState:
    user_query = state.get("user_query") or ""
    warnings = list(state.get("warnings", []))
    req = _maybe_travel_request(state.get("travel_request"))
    package_mode = bool(state.get("package_mode", req is not None))

    prefs_extras = _preferences_from_request(req)
    composite = _build_composite_query(user_query, req)
    seed = _structured_seed_from_request(req)

    heuristic = _heuristic_plan(composite)
    llm_result = _llm_plan(composite)
    if llm_parser is None:
        logger.warning("LLM parser unavailable; running in heuristic-only mode.")
    elif llm_result is None:
        logger.warning("LLM parser returned no structured result; using heuristic fallback.")
    plan = _merge_plans(llm_result, heuristic)

    plan = _overlay_structured(plan, seed)
    plan = _apply_nl_date_backfill(plan, composite)

    if package_mode:
        plan = _apply_package_invariants(plan)

    plan, missing = _recompute_missing_and_tools(plan)
    prefs = _plan_to_preferences(plan, prefs_extras)

    origin_norm = _resolve_iata_if_needed(plan.origin)
    dest_norm = _resolve_iata_if_needed(plan.destination)

    parsed = TravelQueryInput(
        user_query=composite,
        origin=origin_norm or plan.origin,
        destination=dest_norm or plan.destination,
        depart_date=plan.depart_date,
        return_date=plan.return_date,
        hotel_city=_resolve_hotel_city(plan.hotel_city) if plan.hotel_city else plan.hotel_city,
        hotel_checkin=plan.hotel_checkin,
        hotel_checkout=plan.hotel_checkout,
        preferences=prefs,
    )

    return {
        "user_query": user_query if user_query else composite,
        "composite_query": composite,
        "parsed_input": parsed,
        "parsed_plan": plan.model_copy(update={"missing_fields": missing}),
        "intent": plan.intent,
        "tool_plan": plan.tool_plan,
        "missing_fields": missing,
        "plan_confidence": plan.plan_confidence,
        "warnings": warnings,
    }


def _input_guard_node(state: TravelGraphState) -> TravelGraphState:
    warnings = list(state.get("warnings", []))
    missing = state.get("missing_fields") or []
    if missing:
        missing_summary = ", ".join(str(f.field) for f in missing)
        warnings.append(f"Información incompleta: {missing_summary}. Verifica origen, destino y fechas.")
    return {"warnings": warnings}


def _missing_field_names(state: TravelGraphState) -> set[str]:
    return {mf.field for mf in (state.get("missing_fields") or [])}




def _safe_json_loads(text: str) -> dict[str, Any]:
    try:
        value = json.loads(text)
        return value if isinstance(value, dict) else {"raw": value}
    except json.JSONDecodeError:
        return {"raw_text": text}


def _output_cfg(state: TravelGraphState) -> OutputConfig:
    cfg = state.get("output_config")
    if isinstance(cfg, OutputConfig):
        return cfg
    if isinstance(cfg, dict):
        return OutputConfig(**cfg)
    return OutputConfig()


def _flight_node(state: TravelGraphState) -> TravelGraphState:
    if "flight" not in (state.get("tool_plan") or []):
        return {}

    parsed = state.get("parsed_input")
    if parsed is None:
        return {}

    flight_warnings: list[str] = []
    req = _maybe_travel_request(state.get("travel_request"))

    if not (parsed.origin and parsed.destination and parsed.depart_date):
        flight_warnings.append("Faltan datos de origen, destino o fecha para buscar vuelos.")
        return {"flight_warnings": flight_warnings, "flight_tool_result": {}}

    adults = _parse_adults(req, parsed.preferences)
    currency = _guess_currency(req, parsed.preferences)
    gl, hl = _guess_gl_hl(parsed.preferences.get("locale"))

    ret = parsed.return_date or ""
    has_round_trip = bool(isinstance(ret, str) and ret.strip())
    payload: dict[str, Any] = {
        "departure_id": parsed.origin,
        "arrival_id": parsed.destination,
        "outbound_date": parsed.depart_date,
        "type": 1 if has_round_trip else 2,
        "adults": adults,
        "currency": currency,
        "gl": gl,
        "hl": hl,
        "max_results": max(3, _output_cfg(state).max_options),
    }
    if has_round_trip:
        payload["return_date"] = ret.strip()

    started = time.time()
    try:
        result = flight_runner.run(payload)
        flight_warnings.extend(_tool_error_messages(result))

        # If direct search returned nothing, try connecting via hub airports
        direct_hits = (
            len(result.get("best_flights") or []) +
            len(result.get("other_flights") or []) +
            len(result.get("flights") or [])
        )
        if direct_hits == 0 and not _tool_error_messages(result):
            flight_warnings.append(
                f"No direct flights found for {parsed.origin} → {parsed.destination}. "
                "Searching connecting routes via hub airports…"
            )
            hub_payload = {
                "departure_id": parsed.origin,
                "outbound_date": parsed.depart_date,
                "adults": adults,
                "currency": currency,
                "gl": "us",   # broader coverage for international hub searches
                "hl": hl,
                "max_results": 3,
            }
            hub_result = _try_via_hub(parsed, hub_payload, parsed.depart_date, flight_runner)
            if hub_result:
                hub = hub_result.get("search_parameters", {}).get("_via_hub", "hub")
                flight_warnings.append(f"Found connecting flights via {hub}.")
                result = hub_result
            else:
                flight_warnings.append("No connecting routes found for this destination.")

        return {
            "flight_tool_result": result,
            "flight_warnings": flight_warnings,
            "meta_timing_flight_ms": int((time.time() - started) * 1000),
        }
    except Exception as exc:
        logger.error("Flight tool error: %s", exc)
        flight_warnings.append("Error al buscar vuelos. Intenta con otra moneda o fechas distintas.")
        return {
            "flight_tool_result": {},
            "flight_warnings": flight_warnings,
            "meta_timing_flight_ms": int((time.time() - started) * 1000),
        }


def _hotel_node(state: TravelGraphState) -> TravelGraphState:
    if "hotel" not in (state.get("tool_plan") or []):
        return {}

    parsed = state.get("parsed_input")
    if parsed is None:
        return {}

    hotel_warnings: list[str] = []

    req = _maybe_travel_request(state.get("travel_request"))

    if not (parsed.hotel_city and parsed.hotel_checkin and parsed.hotel_checkout):
        hotel_warnings.append("Faltan datos de ciudad, entrada o salida para buscar hoteles.")
        return {"hotel_warnings": hotel_warnings, "hotel_tool_result": {}}

    started = time.time()
    output_cfg = _output_cfg(state)
    adults = _parse_adults(req, parsed.preferences)
    currency = _guess_currency(req, parsed.preferences)
    gl, hl = _guess_gl_hl(parsed.preferences.get("locale"))

    try:
        result = hotel_runner.run(
            {
                "q": parsed.hotel_city,
                "check_in_date": parsed.hotel_checkin,
                "check_out_date": parsed.hotel_checkout,
                "adults": adults,
                "currency": currency,
                "gl": gl,
                "hl": hl,
                "max_results": max(3, output_cfg.max_options),
            }
        )
        hotel_warnings.extend(_tool_error_messages(result))
        return {
            "hotel_tool_result": result,
            "hotel_warnings": hotel_warnings,
            "meta_timing_hotel_ms": int((time.time() - started) * 1000),
        }
    except Exception as exc:
        logger.error("Hotel tool error: %s", exc)
        hotel_warnings.append("Error al buscar hoteles. Intenta con otro nombre de ciudad o moneda.")
        return {"hotel_tool_result": {}, "hotel_warnings": hotel_warnings}


def _to_flight_options(data: dict[str, Any], include_raw: bool, max_options: int) -> list[FlightOption]:
    options: list[FlightOption] = []
    search_currency = data.get("search_parameters", {}).get("currency")
    all_items = (data.get("best_flights") or []) + (data.get("flights") or [])
    for idx, item in enumerate(all_items[:max_options]):
        legs = item.get("flights", []) or []
        airline = legs[0].get("airline") if legs else None

        raw_price = item.get("price")
        total_price: float | None = None
        if raw_price is not None:
            try:
                total_price = float(raw_price)
            except (TypeError, ValueError):
                pass

        emissions_raw = (item.get("carbon_emissions") or {}).get("this_flight")
        emissions_kg: float | None = None
        if emissions_raw is not None:
            try:
                emissions_kg = round(float(emissions_raw) / 1000, 2)
            except (TypeError, ValueError):
                pass

        total_duration_raw = item.get("total_duration")
        total_duration_min: int | None = None
        if total_duration_raw is not None:
            try:
                total_duration_min = int(total_duration_raw)
            except (TypeError, ValueError):
                pass

        options.append(
            FlightOption(
                title=f"{item.get('type', 'Flight')} option",
                total_price=total_price,
                currency=item.get("currency") or search_currency,
                total_duration_min=total_duration_min,
                layover_count=len(item.get("layovers") or []),
                airline=airline,
                departure_token=item.get("departure_token"),
                segments_jsonb=legs if legs else None,
                emissions_kg=emissions_kg,
                ranking_score=round(1.0 / (idx + 1), 4),
                raw_option_jsonb=item if include_raw else {},
            )
        )
    return options


def _to_hotel_options(data: dict[str, Any], include_raw: bool, max_options: int) -> list[HotelOption]:
    options: list[HotelOption] = []
    search_currency = data.get("search_parameters", {}).get("currency")
    for idx, item in enumerate(data.get("properties", [])[:max_options]):
        rate = item.get("rate_per_night") or {}

        nightly_raw = rate.get("extracted_lowest")
        nightly_rate: float | None = None
        if nightly_raw is not None:
            try:
                nightly_rate = float(nightly_raw)
            except (TypeError, ValueError):
                pass

        total_raw = item.get("total_rate", {})
        total_lowest = total_raw.get("extracted_lowest") if isinstance(total_raw, dict) else None
        total_rate: float | None = None
        if total_lowest is not None:
            try:
                total_rate = float(total_lowest)
            except (TypeError, ValueError):
                pass

        options.append(
            HotelOption(
                property_name=item.get("name", "Hotel option"),
                total_rate=total_rate,
                nightly_rate=nightly_rate,
                currency=search_currency,
                overall_rating=item.get("overall_rating"),
                location=item.get("description"),
                property_token=item.get("property_token"),
                location_rating=item.get("location_rating"),
                review_count=item.get("reviews"),
                amenities_jsonb=item.get("amenities") or None,
                free_cancellation=item.get("free_cancellation"),
                ranking_score=round(1.0 / (idx + 1), 4),
                raw_option_jsonb=item if include_raw else {},
            )
        )
    return options


def _snapshot_travelers(req: TravelRequest | None, preferences: dict[str, Any]) -> str | None:
    text = ""
    if req:
        td = req.travelers_display()
        if td:
            text = td
    if not text:
        traveler_pref = preferences.get("travelers")
        if traveler_pref is not None:
            text = str(traveler_pref).strip()
    return text or None


def _summarizer_node(state: TravelGraphState) -> TravelGraphState:
    flight_data = state.get("flight_tool_result", {}) or {}
    hotel_data = state.get("hotel_tool_result", {}) or {}
    warnings = (
        list(state.get("warnings", []) or [])
        + list(state.get("flight_warnings", []) or [])
        + list(state.get("hotel_warnings", []) or [])
    )

    parsed = state.get("parsed_input")
    req_resolved = _maybe_travel_request(state.get("travel_request"))

    prefs_dict: dict[str, Any] = {}
    if isinstance(parsed, TravelQueryInput) and getattr(parsed, "preferences", None):
        prefs_dict = parsed.preferences

    registration: PackageRegistration | None = None

    def _budget_from_prefs(key: str) -> float | None:
        v = prefs_dict.get(key)
        if isinstance(v, (int, float)):
            return float(v)
        return None

    min_budget_snap = req_resolved.min_budget if req_resolved and req_resolved.min_budget is not None else None
    min_budget_snap = min_budget_snap if min_budget_snap is not None else _budget_from_prefs("min_budget")

    max_budget_snap = req_resolved.max_budget if req_resolved and req_resolved.max_budget is not None else None
    max_budget_snap = max_budget_snap if max_budget_snap is not None else _budget_from_prefs("max_budget")

    if req_resolved or parsed:
        dest = req_resolved.destination if req_resolved else None
        if not dest and parsed:
            dest = getattr(parsed, "destination", None)

        dep_city = req_resolved.departure_city if req_resolved else None
        if not dep_city and parsed:
            dep_city = getattr(parsed, "origin", None)

        trip_start = req_resolved.start_date_iso() if req_resolved else None
        if not trip_start and parsed:
            trip_start = getattr(parsed, "depart_date", None)

        trip_end = req_resolved.end_date_iso() if req_resolved else None
        if not trip_end and parsed:
            trip_end = getattr(parsed, "return_date", None)

        registration = PackageRegistration(
            client_name=getattr(req_resolved, "client_name", None) if req_resolved else None,
            client_email=getattr(req_resolved, "client_email", None) if req_resolved else None,
            destination=dest,
            departure_city=dep_city,
            trip_start_iso=trip_start,
            trip_end_iso=trip_end,
            travelers=_snapshot_travelers(req_resolved, prefs_dict),
            min_budget=min_budget_snap,
            max_budget=max_budget_snap,
            special_preferences=getattr(req_resolved, "special_preferences", None) if req_resolved else None,
            normalized_search=(
                {
                    "origin": getattr(parsed, "origin", None),
                    "destination": getattr(parsed, "destination", None),
                    "depart_date": getattr(parsed, "depart_date", None),
                    "return_date": getattr(parsed, "return_date", None),
                    "hotel_city": getattr(parsed, "hotel_city", None),
                    "hotel_checkin": getattr(parsed, "hotel_checkin", None),
                    "hotel_checkout": getattr(parsed, "hotel_checkout", None),
                }
                if parsed
                else {}
            ),
        )

    output_cfg = _output_cfg(state)
    flights = _to_flight_options(
        flight_data,
        include_raw=output_cfg.include_raw,
        max_options=output_cfg.max_options,
    )
    hotels = _to_hotel_options(
        hotel_data,
        include_raw=output_cfg.include_raw,
        max_options=output_cfg.max_options,
    )

    # ── Compute package-level fields ──────────────────────────────────────────
    pkg_currency = _guess_currency(req_resolved, prefs_dict)

    flight_price = flights[0].total_price if flights else None
    hotel_price = hotels[0].total_rate if hotels else None

    pkg_total: float | None = None
    if flight_price is not None and hotel_price is not None:
        pkg_total = round(flight_price + hotel_price, 2)
    elif flight_price is not None:
        pkg_total = round(flight_price, 2)
    elif hotel_price is not None:
        pkg_total = round(hotel_price, 2)

    within_budget: bool | None = None
    if pkg_total is not None and max_budget_snap is not None:
        within_budget = pkg_total <= max_budget_snap

    flight_scores = [f.ranking_score for f in flights if f.ranking_score is not None]
    hotel_scores = [h.ranking_score for h in hotels if h.ranking_score is not None]
    all_scores = flight_scores + hotel_scores
    quality_score = round(sum(all_scores) / len(all_scores), 4) if all_scores else None

    tier: str | None = None
    if pkg_total is not None and max_budget_snap is not None and max_budget_snap > 0:
        ratio = pkg_total / max_budget_snap
        tier = "budget" if ratio < 0.6 else "standard" if ratio < 0.9 else "premium"

    price_breakdown: dict[str, Any] | None = None
    if flight_price is not None or hotel_price is not None:
        price_breakdown = {
            "flight": flight_price,
            "hotel": hotel_price,
            "total": pkg_total,
            "currency": pkg_currency,
        }

    if registration is not None:
        registration = registration.model_copy(
            update={
                "total_price": pkg_total,
                "currency": pkg_currency,
                "within_budget": within_budget,
                "tier": tier,
                "quality_score": quality_score,
                "price_breakdown": price_breakdown,
            }
        )

    # ── Build summary ─────────────────────────────────────────────────────────
    summary_parts: list[str] = []
    if flights:
        summary_parts.append(f"Found {len(flights)} flight option(s).")
    if hotels:
        summary_parts.append(f"Found {len(hotels)} hotel option(s).")
    if not summary_parts:
        summary_parts.append("No options found from tools; check inputs or warnings.")

    output = TravelQueryOutput(
        summary=" ".join(summary_parts),
        flight_options=flights,
        hotel_options=hotels,
        warnings=warnings,
        registration=registration,
        meta={
            "source": "langgraph",
            "intent": state.get("intent", "unknown"),
            "composite_query": state.get("composite_query"),
            "timings": {
                "flight_ms": state.get("meta_timing_flight_ms"),
                "hotel_ms": state.get("meta_timing_hotel_ms"),
            },
            "warnings_count": len(warnings),
            "tool_keys": {
                "flight": list(flight_data.keys())[:14] if isinstance(flight_data, dict) else [],
                "hotel": list(hotel_data.keys())[:14] if isinstance(hotel_data, dict) else [],
            },
            "serpapi_signals": {
                "flight_http": flight_data.get("_http_error"),
                "flight_api": flight_data.get("_serpapi_error_message"),
                "hotel_http": hotel_data.get("_http_error"),
                "hotel_api": hotel_data.get("_serpapi_error_message"),
            },
        },
    )
    return {"output": output}


def _llm_response_writer_node(state: TravelGraphState) -> TravelGraphState:
    output = state.get("output")
    if not isinstance(output, TravelQueryOutput):
        return {}
    if not output.flight_options and not output.hotel_options:
        return {}

    if llm_writer is None:
        return {}

    try:
        prompt = (
            "Rewrite the summary into one concise travel brief sentence. "
            "Do not add new facts.\n"
            f"Current summary: {output.summary}\n"
            f"Flight options count: {len(output.flight_options)}\n"
            f"Hotel options count: {len(output.hotel_options)}"
        )
        rewritten = llm_writer.invoke(prompt)
        if hasattr(rewritten, "content") and isinstance(rewritten.content, str) and rewritten.content.strip():
            output.summary = rewritten.content.strip()
            return {"output": output}
    except Exception:
        return {}
    return {}


def _output_validate_node(state: TravelGraphState) -> TravelGraphState:
    output = state.get("output")
    warnings = state.get("warnings") or []
    if isinstance(output, TravelQueryOutput):
        return {"output": TravelQueryOutput.model_validate(output.model_dump())}
    if isinstance(output, dict):
        return {"output": TravelQueryOutput.model_validate(output)}
    return {
        "output": TravelQueryOutput(
            summary="No structured output was produced.",
            registration=None,
            warnings=warnings if isinstance(warnings, list) else [str(warnings)],
        )
    }


def build_travel_graph():
    graph = StateGraph(TravelGraphState)
    graph.add_node("llm_parser_planner", _llm_parser_planner_node)
    graph.add_node("input_guard", _input_guard_node)
    graph.add_node("flight_tool_node", _flight_node)
    graph.add_node("hotel_tool_node", _hotel_node)
    graph.add_node("response_summarizer", _summarizer_node)
    graph.add_node("llm_response_writer", _llm_response_writer_node)
    graph.add_node("output_validate", _output_validate_node)

    graph.add_edge(START, "llm_parser_planner")
    graph.add_edge("llm_parser_planner", "input_guard")
    # Fan out to both tool nodes in parallel; each self-gates on tool_plan.
    # LangGraph waits for both to complete before running response_summarizer.
    graph.add_edge("input_guard", "flight_tool_node")
    graph.add_edge("input_guard", "hotel_tool_node")
    graph.add_edge("flight_tool_node", "response_summarizer")
    graph.add_edge("hotel_tool_node", "response_summarizer")
    graph.add_edge("response_summarizer", "llm_response_writer")
    graph.add_edge("llm_response_writer", "output_validate")
    graph.add_edge("output_validate", END)

    return graph.compile()

import json
import os
from typing import Any

import httpx
from langchain_core.tools import tool

SERPAPI_SEARCH_URL = "https://serpapi.com/search.json"


def _api_key() -> str:
    return os.environ["SERPAPI_API_KEY"]


def _request(params: dict[str, Any]) -> dict[str, Any]:
    timeout = httpx.Timeout(60.0, connect=15.0)
    with httpx.Client(timeout=timeout) as client:
        response = client.get(
            SERPAPI_SEARCH_URL,
            params={**params, "api_key": _api_key()},
        )
        snippet = ""
        try:
            text = response.text
            snippet = text[:600] if text else ""
        except Exception:
            snippet = ""

        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            return {
                "_http_error": f"HTTP {response.status_code} {exc}",
                "_response_snippet": snippet,
                "search_parameters": {},
            }

        try:
            data = response.json()
        except ValueError:
            return {
                "_http_error": "Invalid JSON response from SerpAPI",
                "_response_snippet": snippet,
                "search_parameters": {},
            }

        serp_err = data.get("error")
        if serp_err:
            payload = dict(data)
            payload["_serpapi_error_message"] = str(serp_err)
            payload.setdefault("search_parameters", {})
            return payload

        return data


@tool
def search_google_flights(
    departure_id: str,
    arrival_id: str,
    outbound_date: str,
    return_date: str = "",
    type: int = 2,
    adults: int = 1,
    currency: str = "MXN",
    gl: str = "mx",
    hl: str = "en",
    travel_class: int = 1,
    max_results: int = 5,
) -> str:
    """SerpAPI Google Flights: YYYY-MM-DD dates. Airport / place IDs for departure/arrival.

    Round-trip requires ``type`` 1 whenever ``return_date`` is set; one-way uses ``type`` 2 with no ``return_date``."""
    trimmed_ret = str(return_date or "").strip()
    eff_type = 1 if trimmed_ret else type
    params: dict[str, Any] = {
        "engine": "google_flights",
        "departure_id": departure_id,
        "arrival_id": arrival_id,
        "outbound_date": outbound_date,
        "type": eff_type,
        "adults": adults,
        "currency": currency,
        "gl": gl,
        "hl": hl,
        "travel_class": travel_class,
    }
    if trimmed_ret:
        params["return_date"] = trimmed_ret

    data = _request(params)
    if isinstance(data.get("_http_error"), str) or isinstance(data.get("_serpapi_error_message"), str):
        return json.dumps(data, ensure_ascii=False)

    best = data.get("best_flights", []) or []
    other = data.get("other_flights", []) or []
    merged = (best + other)[: max(1, min(max_results, 20))]

    output = {
        "search_parameters": data.get("search_parameters", {}),
        "price_insights": data.get("price_insights", {}),
        "flights": merged,
    }
    return json.dumps(output, ensure_ascii=False)


@tool
def search_google_hotels(
    q: str,
    check_in_date: str,
    check_out_date: str,
    adults: int = 2,
    currency: str = "MXN",
    gl: str = "mx",
    hl: str = "en",
    max_results: int = 5,
) -> str:
    """Search hotels with SerpAPI Google Hotels engine. q is the destination (e.g. Ibiza). Dates must be YYYY-MM-DD."""
    params: dict[str, Any] = {
        "engine": "google_hotels",
        "q": q,
        "check_in_date": check_in_date,
        "check_out_date": check_out_date,
        "adults": adults,
        "currency": currency,
        "gl": gl,
        "hl": hl,
    }
    data = _request(params)
    if isinstance(data.get("_http_error"), str) or isinstance(data.get("_serpapi_error_message"), str):
        return json.dumps(data, ensure_ascii=False)

    properties = data.get("properties") or []

    output = {
        "search_parameters": data.get("search_parameters", {}),
        "brands": data.get("brands", []),
        "properties": properties[: max(1, min(max_results, 20))],
    }
    return json.dumps(output, ensure_ascii=False)

"""
TravelOS Backend
Conecta el formulario React → agente LangGraph → Supabase.
"""
from __future__ import annotations

import asyncio
import logging
import os
import sys
from datetime import date
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── Entorno ───────────────────────────────────────────────────────────────────
# Carga backend/.env ANTES de importar el agente (necesita NVIDIA_API_KEY)
load_dotenv(Path(__file__).parent / ".env", override=False)

# ── Agente en sys.path ────────────────────────────────────────────────────────
# prototype_agent usa imports locales (no es un paquete), lo inyectamos en path
_AGENT_DIR = Path(__file__).parent / "agents" / "prototype_agent"
if str(_AGENT_DIR) not in sys.path:
    sys.path.insert(0, str(_AGENT_DIR))

from graph_state import FlightOption, HotelOption, TravelQueryOutput, TravelRequest  # noqa: E402
from travel_graph import build_travel_graph  # noqa: E402

# ── App ───────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s – %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="TravelOS API", version="1.0.0")

_origins = ["http://localhost:5173", "http://localhost:3000"]
if os.getenv("FRONTEND_URL"):
    _origins.append(os.getenv("FRONTEND_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Supabase ──────────────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# ── Grafo (singleton lazy) ────────────────────────────────────────────────────
_graph = None

def _get_graph():
    global _graph
    if _graph is None:
        logger.info("Construyendo travel graph …")
        _graph = build_travel_graph()
        logger.info("Travel graph listo.")
    return _graph


# ── Schemas de entrada (lo que manda el frontend) ─────────────────────────────

class TravelersIn(BaseModel):
    adults: int = 2
    children: int = 0

class PreferencesIn(BaseModel):
    hotel_stars: int | None = None
    hotel_type: str | None = None
    flight_class: str | None = None
    extras: list[str] = Field(default_factory=list)

class PlanTripRequest(BaseModel):
    request_id: str | None = None
    origin: str
    destination: str
    departure_date: str
    return_date: str
    travelers: TravelersIn = Field(default_factory=TravelersIn)
    budget_mxn: float | None = None
    preferences: PreferencesIn = Field(default_factory=PreferencesIn)
    notes: str | None = None       # "clientName | clientEmail | preferences"
    user_id: str | None = None     # Supabase auth user UUID (opcional)


# ── Schemas de salida (lo que espera el frontend) ─────────────────────────────

class FlightOut(BaseModel):
    airline: str
    price: float | None = None
    departure_time: str | None = None
    arrival_time: str | None = None
    duration_hours: float | None = None

class HotelOut(BaseModel):
    name: str
    stars: int | None = None
    price_per_night: float | None = None
    location: str
    image_url: str | None = None

class PricingOut(BaseModel):
    flights_total: float
    hotel_total: float
    extras_total: float
    grand_total: float
    currency: str

class DayPlanOut(BaseModel):
    day: int
    activities: list[str]

class ItineraryOut(BaseModel):
    destination: str
    days: int
    plan: list[DayPlanOut]

class PlanTripResponse(BaseModel):
    flights: list[FlightOut]
    hotels: list[HotelOut]
    pricing: PricingOut
    itinerary: ItineraryOut


# ── Helpers de mapeo ──────────────────────────────────────────────────────────

def _seg_time(segments: list | None, key: str) -> str | None:
    if not segments:
        return None
    try:
        seg = segments[0] if isinstance(segments[0], dict) else {}
        return seg.get(key) or seg.get(key.replace("_time", ""))
    except Exception:
        return None


def _map_flight(f: FlightOption) -> FlightOut:
    segs = f.segments_jsonb or []
    dep = _seg_time(segs, "departure_time") or _seg_time(segs, "departure")
    last = segs[-1:] if segs else []
    arr = _seg_time(last, "arrival_time") or _seg_time(last, "arrival")
    return FlightOut(
        airline=f.airline or f.title or "Unknown Airline",
        price=f.total_price,
        departure_time=dep,
        arrival_time=arr,
        duration_hours=round(f.total_duration_min / 60, 1) if f.total_duration_min else None,
    )


def _map_hotel(h: HotelOption, destination: str) -> HotelOut:
    stars = None
    if h.overall_rating is not None:
        try:
            stars = max(1, min(5, round(float(h.overall_rating))))
        except Exception:
            pass

    # Extraer imagen real — SerpAPI la pone en images[0]["thumbnail"] (no en raíz)
    raw = h.raw_option_jsonb or {}
    image_url: str | None = None
    images = raw.get("images", [])
    if images and isinstance(images, list):
        first = images[0] if isinstance(images[0], dict) else {}
        # thumbnail es la versión pequeña (~287px) — más rápida para UI
        image_url = first.get("thumbnail") or first.get("original_image")

    return HotelOut(
        name=h.property_name,
        stars=stars,
        price_per_night=h.nightly_rate or h.total_rate,
        location=h.location or destination,
        image_url=image_url,
    )


def _build_itinerary(destination: str, departure_date: str, return_date: str) -> ItineraryOut:
    try:
        start = date.fromisoformat(departure_date)
        end = date.fromisoformat(return_date)
        days = max(1, (end - start).days)
    except Exception:
        days = 5

    base_activities: dict[int, list[str]] = {
        1: ["Llegada y check-in", "Tour panorámico de orientación"],
        2: ["City tour guiado", "Cena en restaurante local"],
        3: ["Excursión de día completo"],
        4: ["Día libre con actividades opcionales"],
        5: ["Check-out y regreso"],
    }

    plan = [
        DayPlanOut(
            day=i + 1,
            activities=base_activities.get(i + 1, [f"Explorar {destination}", "Tiempo libre"]),
        )
        for i in range(days)
    ]
    return ItineraryOut(destination=destination, days=days, plan=plan)


# ── Guardado en Supabase ──────────────────────────────────────────────────────

async def _persist(req: PlanTripRequest, output: TravelQueryOutput) -> None:
    """
    Guarda en las tablas reales del proyecto Supabase:
    quote_requests → quote_jobs → flight_options + hotel_options → packages
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.warning("Supabase no configurado – omitiendo guardado en DB.")
        return

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    reg = output.registration
    normalized = (reg.normalized_search if reg else {}) or {}

    async with httpx.AsyncClient(timeout=30.0) as client:

        # 1. quote_requests — datos del formulario
        qr_body: dict[str, Any] = {
            "origin_label": req.origin,
            "origin_flights_id": normalized.get("origin") or req.origin,
            "destination_label": req.destination,
            "destination_flights_id": normalized.get("destination") or req.destination,
            "destination_hotels_query": req.destination,
            "depart_date": req.departure_date,
            "return_date": req.return_date,
            "adults": req.travelers.adults,
            "children": req.travelers.children,
            "infants_in_seat": 0,
            "infants_on_lap": 0,
            "budget_max": req.budget_mxn,
            "currency": "MXN",
            "hl": "es",
            "gl": "mx",
            "travel_class": 1,
            "submitted_payload": req.model_dump(),
        }
        if req.user_id:
            qr_body["created_by_user_id"] = req.user_id

        r1 = await client.post(f"{SUPABASE_URL}/rest/v1/QUOTE_REQUESTS", headers=headers, json=qr_body)
        quote_request_id = None
        if r1.status_code in (200, 201):
            rows = r1.json()
            if rows:
                quote_request_id = rows[0].get("id")
        else:
            logger.error("quote_requests insert failed: %s %s", r1.status_code, r1.text[:300])

        # 2. quote_jobs — job de procesamiento
        r2 = await client.post(f"{SUPABASE_URL}/rest/v1/QUOTE_JOBS", headers=headers, json={
            "quote_request_id": quote_request_id,
            "status": "completed",
            "phase": "done",
        })
        job_id = None
        if r2.status_code in (200, 201):
            rows = r2.json()
            if rows:
                job_id = rows[0].get("id")
        else:
            logger.error("quote_jobs insert failed: %s %s", r2.status_code, r2.text[:300])

        # 3. flight_options — una fila por vuelo del agente
        flight_ids: list[str] = []
        for flight in output.flight_options:
            rf = await client.post(f"{SUPABASE_URL}/rest/v1/FLIGHT_OPTIONS", headers=headers, json={
                "job_id": job_id,
                "departure_token": flight.departure_token,
                "segments_jsonb": flight.segments_jsonb,
                "total_price": flight.total_price,
                "currency": flight.currency or "MXN",
                "total_duration_min": flight.total_duration_min,
                "layover_count": flight.layover_count,
                "emissions_kg": flight.emissions_kg,
                "ranking_score": flight.ranking_score,
                "raw_option_jsonb": flight.raw_option_jsonb,
            })
            if rf.status_code in (200, 201):
                rows = rf.json()
                if rows:
                    flight_ids.append(rows[0]["id"])
            else:
                logger.error("flight_options insert failed: %s %s", rf.status_code, rf.text[:200])

        # 4. hotel_options — una fila por hotel del agente
        hotel_ids: list[str] = []
        for hotel in output.hotel_options:
            rh = await client.post(f"{SUPABASE_URL}/rest/v1/HOTEL_OPTIONS", headers=headers, json={
                "job_id": job_id,
                "property_token": hotel.property_token,
                "property_name": hotel.property_name,
                "nightly_rate": hotel.nightly_rate,
                "total_rate": hotel.total_rate,
                "currency": hotel.currency or "MXN",
                "overall_rating": hotel.overall_rating,
                "location_rating": hotel.location_rating,
                "review_count": hotel.review_count,
                "amenities_jsonb": hotel.amenities_jsonb,
                "free_cancellation": hotel.free_cancellation,
                "ranking_score": hotel.ranking_score,
                "raw_option_jsonb": hotel.raw_option_jsonb,
            })
            if rh.status_code in (200, 201):
                rows = rh.json()
                if rows:
                    hotel_ids.append(rows[0]["id"])
            else:
                logger.error("hotel_options insert failed: %s %s", rh.status_code, rh.text[:200])

        # 5. packages — una por combinación flight+hotel (hasta 3)
        tiers = ["budget", "standard", "premium"]
        for i, (fid, hid) in enumerate(zip(flight_ids[:3], hotel_ids[:3])):
            rp = await client.post(f"{SUPABASE_URL}/rest/v1/PACKAGES", headers=headers, json={
                "job_id": job_id,
                "flight_option_id": fid,
                "hotel_option_id": hid,
                "tier": (reg.tier if reg and i == 0 else None) or tiers[i % 3],
                "package_rank": i + 1,
                "total_price": reg.total_price if reg else None,
                "currency": reg.currency if reg else "MXN",
                "within_budget": reg.within_budget if reg else None,
                "quality_score": reg.quality_score if reg else None,
                "price_breakdown_jsonb": reg.price_breakdown if reg else None,
                "package_snapshot_jsonb": {"summary": output.summary, "warnings": output.warnings},
            })
            if rp.status_code not in (200, 201):
                logger.error("packages insert failed: %s %s", rp.status_code, rp.text[:200])

        logger.info("Supabase OK – quote_request=%s job=%s flights=%d hotels=%d",
                    quote_request_id, job_id, len(flight_ids), len(hotel_ids))


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/plan-trip", response_model=PlanTripResponse)
async def plan_trip(req: PlanTripRequest):
    # Armar etiqueta de viajeros
    travelers_label = f"{req.travelers.adults} Adults"
    if req.travelers.children:
        travelers_label += f", {req.travelers.children} Children"

    extras_str = ", ".join(req.preferences.extras)

    # Construir TravelRequest para el agente (mismos campos que graph_state.py)
    travel_request = TravelRequest(
        destination=req.destination,
        departure_city=req.origin,
        start_date=req.departure_date,
        end_date=req.return_date,
        travelers=travelers_label,
        max_budget=req.budget_mxn,
        special_preferences=extras_str or None,
    )

    # Query en lenguaje natural para reforzar el parseo del LLM
    user_query = (
        f"Plan a trip from {req.origin} to {req.destination}, "
        f"departing {req.departure_date} and returning {req.return_date}, "
        f"for {travelers_label}, budget {req.budget_mxn} MXN."
    )
    if extras_str:
        user_query += f" Preferences: {extras_str}."

    graph_input: dict[str, Any] = {
        "user_query": user_query,
        "travel_request": travel_request,
        "package_mode": True,
        "output_config": {"include_raw": True, "max_options": 3},
    }

    # Ejecutar el grafo en un thread (es síncrono internamente)
    try:
        graph = _get_graph()
        result_state = await asyncio.to_thread(graph.invoke, graph_input)
    except Exception as exc:
        logger.exception("Error en el agente")
        raise HTTPException(status_code=500, detail=f"Error del agente: {exc}") from exc

    output: TravelQueryOutput | None = result_state.get("output")
    if not isinstance(output, TravelQueryOutput):
        raise HTTPException(status_code=500, detail="El agente no devolvió un resultado estructurado.")

    # Detectar moneda principal del resultado
    currency = "MXN"
    if output.flight_options:
        currency = output.flight_options[0].currency or currency
    elif output.hotel_options:
        currency = output.hotel_options[0].currency or currency

    # Mapear a formato del frontend
    flights = [_map_flight(f) for f in output.flight_options]
    hotels = [_map_hotel(h, req.destination) for h in output.hotel_options]

    # Calcular precios
    try:
        dep = date.fromisoformat(req.departure_date)
        ret = date.fromisoformat(req.return_date)
        nights = max(1, (ret - dep).days)
    except Exception:
        nights = 5

    flights_total = sum(f.price or 0 for f in flights)
    hotel_total = sum((h.price_per_night or 0) * nights for h in hotels[:1])
    grand_total = flights_total + hotel_total

    pricing = PricingOut(
        flights_total=round(flights_total, 2),
        hotel_total=round(hotel_total, 2),
        extras_total=0.0,
        grand_total=round(grand_total, 2),
        currency=currency,
    )
    itinerary = _build_itinerary(req.destination, req.departure_date, req.return_date)

    response = PlanTripResponse(
        flights=flights,
        hotels=hotels,
        pricing=pricing,
        itinerary=itinerary,
    )

    # Guardar en Supabase en segundo plano (no bloquea la respuesta al usuario)
    asyncio.create_task(_persist(req, output))

    return response


@app.get("/requests")
async def get_requests(limit: int = 20):
    """Retorna las quote_requests recientes para el dashboard."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return []
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/QUOTE_REQUESTS",
            headers=headers,
            params={
                "select": "id,origin_label,destination_label,depart_date,return_date,adults,children,budget_max,submitted_payload,created_at",
                "order": "created_at.desc",
                "limit": str(min(limit, 50)),
            },
        )
    if r.status_code != 200:
        logger.error("Error leyendo quote_requests: %s", r.text[:200])
        return []
    return r.json()

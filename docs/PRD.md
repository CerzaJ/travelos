# Product Requirements Document (PRD)
# TravelOS - Sistema de Agente de Viajes con IA

**Versión:** 1.0  
**Fecha:** 5 de Febrero 2026  
**Equipo:** [Nombres del equipo]  
**Repositorio:** https://github.com/[tu-org]/travelos

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Objetivos del Producto](#objetivos-del-producto)
3. [Arquitectura del Sistema](#arquitectura-del-sistema)
4. [Estructura del Proyecto](#estructura-del-proyecto)
5. [Especificación de Componentes](#especificación-de-componentes)
6. [Setup del Proyecto](#setup-del-proyecto)
7. [Flujos de Trabajo](#flujos-de-trabajo)
8. [APIs y Endpoints](#apis-y-endpoints)
9. [Base de Datos](#base-de-datos)
10. [Agentes de IA](#agentes-de-ia)
11. [Criterios de Aceptación](#criterios-de-aceptación)
12. [Roadmap de Desarrollo](#roadmap-de-desarrollo)

---

## 1. Resumen Ejecutivo

**Problema:**  
Las operadoras de viajes dedican 4-6 horas manualmente investigando, cotizando y armando paquetes de viaje, consultando múltiples proveedores, calculando márgenes y generando propuestas.

**Solución:**  
TravelOS automatiza este proceso mediante agentes de IA especializados que:
- Consultan proveedores privados y APIs públicas
- Arman itinerarios optimizados
- Calculan márgenes según políticas empresariales (RAG)
- Generan propuestas profesionales en PDF

**Resultado:**  
Reducción de tiempo de 4-6 horas a 15 minutos (94% de ahorro), permitiendo escalar sin contratar más operadores.

---

## 2. Objetivos del Producto

### Objetivos de Negocio
- **Q1 2026:** MVP funcional con 1 destino, 2 proveedores
- **Q2 2026:** 5 agencias piloto usando el sistema
- **Q3 2026:** Lanzamiento comercial a 30+ agencias
- **Métrica de éxito:** 80% de paquetes generados requieren <5 minutos de edición manual

### Objetivos Técnicos
- Tiempo de generación: <2 minutos
- Precisión de precios: >95%
- Disponibilidad: 99% uptime
- Costo por consulta: <$0.50 USD

---

## 3. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                      │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
│  │ Dashboard  │  │ Formulario │  │ Revisar Paquete     │   │
│  │            │  │ Solicitud  │  │ (Edición Manual)    │   │
│  └────────────┘  └────────────┘  └─────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/REST API
┌───────────────────────────▼─────────────────────────────────┐
│                    BACKEND (FastAPI)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              LANGGRAPH AGENT SYSTEM                   │   │
│  │  ┌────────────┐  ┌────────────┐  ┌───────────────┐  │   │
│  │  │Coordinador │→ │Investigador│→ │Itinerario Agt.│  │   │
│  │  └────────────┘  └────────────┘  └───────────────┘  │   │
│  │  ┌────────────┐  ┌────────────┐  ┌───────────────┐  │   │
│  │  │Financiero  │  │Compliance  │  │Presentación   │  │   │
│  │  └────────────┘  └────────────┘  └───────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│  ┌────────────────────────┼────────────────────────────┐   │
│  │         TOOLS (Herramientas de Agentes)             │   │
│  │  - search_flights()      - scrape_hotels()          │   │
│  │  - query_sop_rag()       - calculate_margin()       │   │
│  │  - validate_visa()       - save_package()           │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                      CAPA DE DATOS                           │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ PostgreSQL   │  │ Pinecone     │  │ Redis (caché)   │   │
│  │ (relacional) │  │ (vectores)   │  │ (opcional)      │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                  SERVICIOS EXTERNOS                          │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ Amadeus API  │  │ OpenAI/Claude│  │ Proveedores     │   │
│  │ (vuelos)     │  │ (LLM)        │  │ Privados        │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Estructura del Proyecto

```
travelos/
│
├── README.md                           # Documentación principal
├── .gitignore
├── .env.example                        # Variables de entorno template
├── docker-compose.yml                  # Setup de servicios locales
│
├── backend/                            # 🐍 FastAPI Backend
│   ├── main.py                         # Entry point FastAPI
│   ├── requirements.txt                # Dependencias Python
│   ├── Dockerfile
│   │
│   ├── app/
│   │   ├── __init__.py
│   │   │
│   │   ├── api/                        # Endpoints REST
│   │   │   ├── __init__.py
│   │   │   ├── deps.py                 # Dependencias compartidas
│   │   │   ├── auth.py                 # Autenticación JWT
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── requests.py         # CRUD solicitudes
│   │   │       ├── packages.py         # CRUD paquetes
│   │   │       ├── agents.py           # Ejecutar agentes
│   │   │       ├── providers.py        # Gestión proveedores
│   │   │       ├── sops.py             # Gestión SOPs (RAG)
│   │   │       └── proposals.py        # Generar PDFs
│   │   │
│   │   ├── agents/                     # 🤖 LangGraph Agents
│   │   │   ├── __init__.py
│   │   │   ├── graph.py                # Grafo principal LangGraph
│   │   │   ├── coordinator.py          # Agente coordinador
│   │   │   ├── researcher.py           # Agente investigador
│   │   │   ├── itinerary.py            # Agente de itinerarios
│   │   │   ├── financial.py            # Agente financiero
│   │   │   ├── compliance.py           # Agente de compliance
│   │   │   └── presenter.py            # Agente de presentación
│   │   │
│   │   ├── tools/                      # 🔧 Herramientas para agentes
│   │   │   ├── __init__.py
│   │   │   ├── flights.py              # API Amadeus (vuelos)
│   │   │   ├── hotels.py               # Scraping hoteles
│   │   │   ├── activities.py           # API tours/actividades
│   │   │   ├── transfers.py            # Cotización traslados
│   │   │   ├── rag.py                  # Consulta SOPs (RAG)
│   │   │   ├── pricing.py              # Cálculo de márgenes
│   │   │   └── validation.py           # Validaciones (visas, etc.)
│   │   │
│   │   ├── core/                       # Configuración central
│   │   │   ├── __init__.py
│   │   │   ├── config.py               # Settings (Pydantic)
│   │   │   ├── security.py             # JWT, encriptación
│   │   │   └── logging.py              # Setup de logs
│   │   │
│   │   ├── db/                         # Base de datos
│   │   │   ├── __init__.py
│   │   │   ├── session.py              # SQLAlchemy session
│   │   │   ├── base.py                 # Base para modelos
│   │   │   └── models/
│   │   │       ├── __init__.py
│   │   │       ├── user.py
│   │   │       ├── request.py          # TravelRequest
│   │   │       ├── package.py          # Package
│   │   │       ├── provider.py
│   │   │       ├── sop.py              # SOPDocument
│   │   │       └── conversation.py
│   │   │
│   │   ├── schemas/                    # Pydantic schemas
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── request.py
│   │   │   ├── package.py
│   │   │   ├── provider.py
│   │   │   └── sop.py
│   │   │
│   │   ├── services/                   # Lógica de negocio
│   │   │   ├── __init__.py
│   │   │   ├── scraper.py              # Playwright scraper
│   │   │   ├── pdf_generator.py        # Generación de PDFs
│   │   │   ├── vectorstore.py          # Pinecone RAG
│   │   │   └── email.py                # Envío de emails
│   │   │
│   │   └── utils/                      # Utilidades
│   │       ├── __init__.py
│   │       ├── dates.py
│   │       ├── currency.py
│   │       └── validators.py
│   │
│   ├── alembic/                        # Migraciones DB
│   │   ├── env.py
│   │   ├── versions/
│   │   └── alembic.ini
│   │
│   ├── scripts/                        # Scripts de utilidad
│   │   ├── init_db.py                  # Inicializar DB
│   │   ├── load_sops.py                # Cargar SOPs a Pinecone
│   │   └── test_agent.py               # Probar agente standalone
│   │
│   └── tests/                          # Tests
│       ├── __init__.py
│       ├── conftest.py
│       ├── test_api/
│       ├── test_agents/
│       ├── test_tools/
│       └── test_services/
│
├── frontend/                           # ⚛️ Next.js Frontend
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── .eslintrc.json
│   │
│   ├── public/
│   │   ├── logo.svg
│   │   └── favicon.ico
│   │
│   ├── src/
│   │   ├── app/                        # App router (Next.js 14)
│   │   │   ├── layout.tsx              # Root layout
│   │   │   ├── page.tsx                # Home/Dashboard
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── requests/
│   │   │   │   ├── page.tsx            # Lista solicitudes
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx        # Nueva solicitud
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx        # Detalle solicitud
│   │   │   │       └── review/
│   │   │   │           └── page.tsx    # Revisar paquete
│   │   │   ├── providers/
│   │   │   │   └── page.tsx            # Gestión proveedores
│   │   │   ├── sops/
│   │   │   │   └── page.tsx            # Gestión SOPs
│   │   │   └── analytics/
│   │   │       └── page.tsx
│   │   │
│   │   ├── components/                 # Componentes React
│   │   │   ├── ui/                     # shadcn/ui components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── modal.tsx
│   │   │   │   └── ...
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Topbar.tsx
│   │   │   │   └── Layout.tsx
│   │   │   ├── requests/
│   │   │   │   ├── RequestCard.tsx
│   │   │   │   ├── RequestForm.tsx
│   │   │   │   └── RequestFilters.tsx
│   │   │   ├── packages/
│   │   │   │   ├── PackageViewer.tsx
│   │   │   │   ├── FlightCard.tsx
│   │   │   │   ├── HotelCard.tsx
│   │   │   │   ├── ActivityCard.tsx
│   │   │   │   └── PricingBreakdown.tsx
│   │   │   ├── agents/
│   │   │   │   ├── AgentProgress.tsx   # Barra progreso agentes
│   │   │   │   └── AgentLog.tsx
│   │   │   └── common/
│   │   │       ├── LoadingSpinner.tsx
│   │   │       ├── ErrorBoundary.tsx
│   │   │       └── Toast.tsx
│   │   │
│   │   ├── lib/                        # Utilidades
│   │   │   ├── api.ts                  # Cliente API
│   │   │   ├── auth.ts                 # Manejo de auth
│   │   │   ├── utils.ts                # Helpers generales
│   │   │   └── constants.ts
│   │   │
│   │   ├── hooks/                      # Custom hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useRequests.ts
│   │   │   ├── usePackages.ts
│   │   │   └── useAgentProgress.ts
│   │   │
│   │   ├── store/                      # State management (Zustand)
│   │   │   ├── authStore.ts
│   │   │   ├── requestStore.ts
│   │   │   └── uiStore.ts
│   │   │
│   │   └── types/                      # TypeScript types
│   │       ├── request.ts
│   │       ├── package.ts
│   │       ├── provider.ts
│   │       └── api.ts
│   │
│   └── .env.local.example
│
├── docs/                               # 📚 Documentación
│   ├── architecture.md                 # Diagrama arquitectura
│   ├── api-reference.md                # Especificación API
│   ├── agents-guide.md                 # Cómo funcionan los agentes
│   ├── deployment.md                   # Guía deployment
│   ├── contributing.md                 # Cómo contribuir
│   └── user-manual.md                  # Manual de usuario
│
├── scripts/                            # Scripts de automatización
│   ├── setup.sh                        # Setup inicial
│   ├── dev.sh                          # Iniciar desarrollo
│   └── deploy.sh                       # Deploy a producción
│
└── sops_documents/                     # Documentos empresariales
    ├── politica_margenes_2026.pdf
    ├── restricciones_destinos.pdf
    └── proceso_cancelaciones.pdf
```

---

## 5. Especificación de Componentes

### 5.1 Backend - FastAPI

#### `backend/main.py`
```python
"""
Entry point de la aplicación FastAPI.

Este módulo inicializa la aplicación FastAPI, configura CORS,
monta los routers de la API v1, y define endpoints de health check.

Uso:
    uvicorn main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import requests, packages, agents, providers, sops, proposals
from app.core.config import settings
from app.core.logging import setup_logging

# Setup logging
logger = setup_logging()

# Crear app
app = FastAPI(
    title="TravelOS API",
    description="API para sistema de agente de viajes con IA",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(requests.router, prefix="/api/v1", tags=["requests"])
app.include_router(packages.router, prefix="/api/v1", tags=["packages"])
app.include_router(agents.router, prefix="/api/v1", tags=["agents"])
app.include_router(providers.router, prefix="/api/v1", tags=["providers"])
app.include_router(sops.router, prefix="/api/v1", tags=["sops"])
app.include_router(proposals.router, prefix="/api/v1", tags=["proposals"])

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "1.0.0"}

@app.on_event("startup")
async def startup_event():
    logger.info("Starting TravelOS API...")
    # Inicializar conexiones, caché, etc.

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down TravelOS API...")
    # Cerrar conexiones
```

#### `backend/app/core/config.py`
```python
"""
Configuración central de la aplicación usando Pydantic Settings.

Carga variables de entorno desde .env y las valida.

Env vars requeridas:
    - DATABASE_URL: PostgreSQL connection string
    - OPENAI_API_KEY: OpenAI API key
    - PINECONE_API_KEY: Pinecone API key
    - SECRET_KEY: JWT secret key
    - AMADEUS_API_KEY: Amadeus API key
    - AMADEUS_API_SECRET: Amadeus API secret
"""

from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # App
    APP_NAME: str = "TravelOS"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 horas
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # OpenAI / Claude
    OPENAI_API_KEY: str
    LLM_MODEL: str = "gpt-4"
    LLM_TEMPERATURE: float = 0.7
    
    # Pinecone (RAG)
    PINECONE_API_KEY: str
    PINECONE_ENVIRONMENT: str = "us-east-1"
    PINECONE_INDEX_NAME: str = "travelos-sops"
    
    # Amadeus API
    AMADEUS_API_KEY: str
    AMADEUS_API_SECRET: str
    AMADEUS_BASE_URL: str = "https://api.amadeus.com/v2"
    
    # Scraping
    PLAYWRIGHT_HEADLESS: bool = True
    SCRAPER_TIMEOUT: int = 30000  # ms
    
    # PDF Generation
    PDF_TEMPLATE_PATH: str = "templates/proposal.html"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

#### `backend/app/agents/graph.py`
```python
"""
Grafo principal de LangGraph que orquesta todos los agentes.

El flujo es:
    START → Coordinator → Researcher (paralelo: vuelos, hoteles, actividades)
    → Itinerary → Financial → Compliance → Presenter → END

Cada nodo es un agente especializado, y los edges definen
el flujo de información entre ellos.
"""

from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage
from typing import TypedDict, List, Dict, Any
from .coordinator import CoordinatorAgent
from .researcher import ResearcherAgent
from .itinerary import ItineraryAgent
from .financial import FinancialAgent
from .compliance import ComplianceAgent
from .presenter import PresenterAgent

# Estado compartido entre agentes
class AgentState(TypedDict):
    """Estado global que pasa entre todos los agentes"""
    request_id: str
    destination: str
    dates: Dict[str, str]  # {start, end}
    travelers: Dict[str, int]  # {adults, children}
    budget: Dict[str, float]  # {min, max}
    preferences: Dict[str, Any]
    
    # Resultados de cada agente
    sop_guidelines: Dict[str, Any]
    flights_data: List[Dict]
    hotels_data: List[Dict]
    activities_data: List[Dict]
    itinerary: Dict[str, Any]
    pricing: Dict[str, Any]
    compliance_checks: Dict[str, bool]
    final_packages: List[Dict]  # [economic, standard, premium]
    
    # Logs
    agent_logs: List[str]

def create_travel_agent_graph():
    """
    Crea y retorna el grafo de agentes de LangGraph.
    
    Returns:
        StateGraph: Grafo compilado listo para ejecutar
    """
    workflow = StateGraph(AgentState)
    
    # Inicializar agentes
    coordinator = CoordinatorAgent()
    researcher = ResearcherAgent()
    itinerary = ItineraryAgent()
    financial = FinancialAgent()
    compliance = ComplianceAgent()
    presenter = PresenterAgent()
    
    # Agregar nodos
    workflow.add_node("coordinator", coordinator.run)
    workflow.add_node("researcher", researcher.run)
    workflow.add_node("itinerary", itinerary.run)
    workflow.add_node("financial", financial.run)
    workflow.add_node("compliance", compliance.run)
    workflow.add_node("presenter", presenter.run)
    
    # Definir edges (flujo)
    workflow.set_entry_point("coordinator")
    workflow.add_edge("coordinator", "researcher")
    workflow.add_edge("researcher", "itinerary")
    workflow.add_edge("itinerary", "financial")
    workflow.add_edge("financial", "compliance")
    workflow.add_edge("compliance", "presenter")
    workflow.add_edge("presenter", END)
    
    # Compilar
    graph = workflow.compile()
    
    return graph
```

#### `backend/app/agents/coordinator.py`
```python
"""
Agente Coordinador - Orquesta el flujo completo.

Responsabilidades:
    - Recibe la solicitud del usuario
    - Consulta SOPs vía RAG para políticas empresariales
    - Divide la tarea en subtareas
    - Pasa el estado al siguiente agente

Herramientas usadas:
    - query_sop_rag()
"""

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from ..tools.rag import query_sop_knowledge
from ..core.config import settings
import logging

logger = logging.getLogger(__name__)

class CoordinatorAgent:
    """Agente coordinador principal"""
    
    def __init__(self):
        self.llm = ChatOpenAI(
            model=settings.LLM_MODEL,
            temperature=0.3,  # Más determinístico
            api_key=settings.OPENAI_API_KEY
        )
    
    def run(self, state: dict) -> dict:
        """
        Ejecuta el agente coordinador.
        
        Args:
            state: Estado actual con request_id, destination, etc.
            
        Returns:
            dict: Estado actualizado con sop_guidelines y agent_logs
        """
        logger.info(f"[Coordinator] Processing request {state['request_id']}")
        
        # Construir query para SOPs
        sop_query = f"""
        ¿Cuáles son las políticas de márgenes y restricciones para
        viajes a {state['destination']}? Presupuesto: ${state['budget']['min']}-${state['budget']['max']}
        """
        
        # Consultar RAG
        sop_results = query_sop_knowledge(sop_query)
        
        # Actualizar estado
        state['sop_guidelines'] = sop_results
        state['agent_logs'].append(
            f"[Coordinator] Retrieved SOP guidelines: {sop_results['summary']}"
        )
        
        logger.info(f"[Coordinator] Found margin range: {sop_results.get('margin_range')}")
        
        return state
```

#### `backend/app/tools/flights.py`
```python
"""
Herramienta para buscar vuelos usando Amadeus API.

Esta tool es usada por el ResearcherAgent para encontrar opciones
de vuelos según origen, destino y fechas.

API Reference:
    https://developers.amadeus.com/self-service/category/flights
"""

from langchain_core.tools import tool
import requests
from datetime import datetime
from typing import List, Dict
from ..core.config import settings
import logging

logger = logging.getLogger(__name__)

@tool
def search_flights(
    origin: str,
    destination: str,
    departure_date: str,
    return_date: str,
    adults: int = 2,
    children: int = 0
) -> List[Dict]:
    """
    Busca vuelos usando Amadeus API.
    
    Args:
        origin: Código IATA origen (ej: "MEX")
        destination: Código IATA destino (ej: "CUN")
        departure_date: Fecha salida formato YYYY-MM-DD
        return_date: Fecha regreso formato YYYY-MM-DD
        adults: Número de adultos
        children: Número de niños
        
    Returns:
        List[Dict]: Lista de opciones de vuelo con estructura:
            {
                "flight_id": str,
                "airline": str,
                "departure": {
                    "time": str,
                    "date": str,
                    "airport": str
                },
                "arrival": {
                    "time": str,
                    "date": str,
                    "airport": str
                },
                "duration": str,
                "stops": int,
                "price": {
                    "amount": float,
                    "currency": str
                },
                "class": str
            }
    """
    logger.info(f"Searching flights {origin} -> {destination} ({departure_date})")
    
    try:
        # 1. Obtener token de acceso
        token = _get_amadeus_token()
        
        # 2. Buscar vuelos
        headers = {"Authorization": f"Bearer {token}"}
        params = {
            "originLocationCode": origin,
            "destinationLocationCode": destination,
            "departureDate": departure_date,
            "returnDate": return_date,
            "adults": adults,
            "children": children,
            "currencyCode": "MXN",
            "max": 10  # Top 10 resultados
        }
        
        response = requests.get(
            f"{settings.AMADEUS_BASE_URL}/shopping/flight-offers",
            headers=headers,
            params=params,
            timeout=30
        )
        response.raise_for_status()
        
        # 3. Parsear respuesta
        data = response.json()
        flights = _parse_amadeus_response(data)
        
        logger.info(f"Found {len(flights)} flight options")
        return flights
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Amadeus API error: {e}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error in search_flights: {e}")
        return []

def _get_amadeus_token() -> str:
    """Obtiene token de acceso de Amadeus"""
    response = requests.post(
        "https://api.amadeus.com/v1/security/oauth2/token",
        data={
            "grant_type": "client_credentials",
            "client_id": settings.AMADEUS_API_KEY,
            "client_secret": settings.AMADEUS_API_SECRET
        }
    )
    response.raise_for_status()
    return response.json()["access_token"]

def _parse_amadeus_response(data: dict) -> List[Dict]:
    """Parsea respuesta de Amadeus a formato estándar"""
    flights = []
    for offer in data.get("data", []):
        # Extraer información relevante
        # (implementación simplificada, ampliar según necesidad)
        flight = {
            "flight_id": offer["id"],
            "airline": offer["validatingAirlineCodes"][0],
            "price": {
                "amount": float(offer["price"]["total"]),
                "currency": offer["price"]["currency"]
            },
            # ... más campos
        }
        flights.append(flight)
    
    return flights
```

#### `backend/app/tools/hotels.py`
```python
"""
Herramienta para scraping de hoteles de proveedores privados.

Usa Playwright para automatizar login y extracción de datos
de sistemas privados de booking que no tienen API pública.

IMPORTANTE: Las credenciales deben estar encriptadas en la DB.
"""

from langchain_core.tools import tool
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
from typing import List, Dict
from ..db.models.provider import Provider
from ..core.security import decrypt_credentials
from ..core.config import settings
import logging

logger = logging.getLogger(__name__)

@tool
def scrape_hotel_provider(
    provider_id: int,
    destination: str,
    checkin_date: str,
    checkout_date: str,
    rooms: int = 1
) -> List[Dict]:
    """
    Scraping de hoteles de proveedor privado con Playwright.
    
    Args:
        provider_id: ID del proveedor en DB (tiene credenciales)
        destination: Nombre del destino (ej: "Cancún")
        checkin_date: Fecha check-in YYYY-MM-DD
        checkout_date: Fecha check-out YYYY-MM-DD
        rooms: Número de habitaciones
        
    Returns:
        List[Dict]: Lista de hoteles con estructura:
            {
                "hotel_id": str,
                "name": str,
                "category": int,  # estrellas
                "location": str,
                "price_per_night": float,
                "total_price": float,
                "room_type": str,
                "amenities": List[str],
                "availability": bool,
                "images": List[str]
            }
    """
    logger.info(f"Scraping provider {provider_id} for {destination}")
    
    # 1. Obtener credenciales del proveedor desde DB
    # (En implementación real, usar session de SQLAlchemy)
    # provider = session.query(Provider).filter_by(id=provider_id).first()
    # credentials = decrypt_credentials(provider.credentials_encrypted)
    
    # Simulación para ejemplo:
    credentials = {
        "url": "https://proveedor-ejemplo.com",
        "username": "usuario_agencia",
        "password": "password_seguro"
    }
    
    hotels = []
    
    try:
        with sync_playwright() as p:
            # 2. Iniciar navegador
            browser = p.chromium.launch(
                headless=settings.PLAYWRIGHT_HEADLESS
            )
            page = browser.new_page()
            
            # 3. Login
            page.goto(f"{credentials['url']}/login", timeout=settings.SCRAPER_TIMEOUT)
            page.fill("#username", credentials["username"])
            page.fill("#password", credentials["password"])
            page.click("#login-button")
            page.wait_for_url("**/dashboard", timeout=10000)
            
            logger.info(f"Logged in to {credentials['url']}")
            
            # 4. Navegar a búsqueda
            page.goto(f"{credentials['url']}/search")
            page.fill("#destination", destination)
            page.fill("#checkin", checkin_date)
            page.fill("#checkout", checkout_date)
            page.click("#search-button")
            page.wait_for_selector(".hotel-card", timeout=15000)
            
            # 5. Extraer datos
            hotel_cards = page.query_selector_all(".hotel-card")
            
            for card in hotel_cards[:10]:  # Top 10
                try:
                    hotel = {
                        "hotel_id": card.get_attribute("data-hotel-id"),
                        "name": card.query_selector(".hotel-name").text_content(),
                        "category": int(card.query_selector(".stars").get_attribute("data-stars")),
                        "location": card.query_selector(".location").text_content(),
                        "price_per_night": float(
                            card.query_selector(".price").text_content()
                            .replace("$", "").replace(",", "")
                        ),
                        "room_type": card.query_selector(".room-type").text_content(),
                        "availability": True
                    }
                    hotels.append(hotel)
                    
                except Exception as e:
                    logger.warning(f"Error parsing hotel card: {e}")
                    continue
            
            browser.close()
            logger.info(f"Scraped {len(hotels)} hotels from provider {provider_id}")
            
    except PlaywrightTimeout as e:
        logger.error(f"Playwright timeout: {e}")
        return []
    except Exception as e:
        logger.error(f"Scraping error: {e}")
        return []
    
    return hotels
```

#### `backend/app/tools/rag.py`
```python
"""
Herramienta RAG para consultar SOPs empresariales.

Usa Pinecone como base de datos vectorial y OpenAI Embeddings
para búsqueda semántica en documentos de políticas.
"""

from langchain_core.tools import tool
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from typing import Dict
from ..core.config import settings
import logging

logger = logging.getLogger(__name__)

# Inicializar vectorstore (singleton)
_vectorstore = None

def get_vectorstore():
    """Lazy loading del vectorstore"""
    global _vectorstore
    if _vectorstore is None:
        embeddings = OpenAIEmbeddings(api_key=settings.OPENAI_API_KEY)
        _vectorstore = PineconeVectorStore(
            index_name=settings.PINECONE_INDEX_NAME,
            embedding=embeddings
        )
    return _vectorstore

@tool
def query_sop_knowledge(question: str, k: int = 3) -> Dict:
    """
    Consulta base de conocimiento de SOPs empresariales.
    
    Args:
        question: Pregunta en lenguaje natural
        k: Número de documentos relevantes a retornar
        
    Returns:
        Dict con estructura:
            {
                "summary": str,  # Resumen de la respuesta
                "sources": List[str],  # Fuentes consultadas
                "margin_range": Dict,  # Si aplica: {min, max}
                "restrictions": List[str],  # Restricciones encontradas
                "confidence": float  # Score de confianza 0-1
            }
    """
    logger.info(f"Querying SOP knowledge: {question[:50]}...")
    
    try:
        vectorstore = get_vectorstore()
        
        # Búsqueda semántica
        docs = vectorstore.similarity_search_with_score(question, k=k)
        
        # Extraer información relevante
        sources = [doc.metadata.get("source", "Unknown") for doc, score in docs]
        contents = [doc.page_content for doc, score in docs]
        avg_score = sum(score for doc, score in docs) / len(docs) if docs else 0
        
        # Construir resumen (aquí podrías usar LLM para sintetizar)
        summary = _synthesize_answer(question, contents)
        
        # Parsear información estructurada (márgenes, etc.)
        margin_range = _extract_margin_info(contents)
        restrictions = _extract_restrictions(contents)
        
        result = {
            "summary": summary,
            "sources": sources,
            "margin_range": margin_range,
            "restrictions": restrictions,
            "confidence": 1 - (avg_score / 2)  # Normalizar score
        }
        
        logger.info(f"RAG query successful. Confidence: {result['confidence']:.2f}")
        return result
        
    except Exception as e:
        logger.error(f"RAG query error: {e}")
        return {
            "summary": "Error consultando base de conocimiento",
            "sources": [],
            "margin_range": None,
            "restrictions": [],
            "confidence": 0.0
        }

def _synthesize_answer(question: str, contents: List[str]) -> str:
    """Sintetiza respuesta desde documentos relevantes"""
    # Implementación simple - en producción usar LLM
    combined = "\n\n".join(contents[:2])  # Top 2 docs
    return combined[:500] + "..." if len(combined) > 500 else combined

def _extract_margin_info(contents: List[str]) -> Dict:
    """Extrae rangos de márgenes desde contenido"""
    # Implementación simplificada - usar regex o LLM en producción
    for content in contents:
        if "margen" in content.lower():
            # Buscar patrones como "18-22%" o "25-30%"
            import re
            match = re.search(r'(\d+)-(\d+)%', content)
            if match:
                return {"min": int(match.group(1)), "max": int(match.group(2))}
    return None

def _extract_restrictions(contents: List[str]) -> List[str]:
    """Extrae lista de restricciones"""
    restrictions = []
    for content in contents:
        if "restricción" in content.lower() or "no permitido" in content.lower():
            # Extraer restricciones (simplificado)
            restrictions.append(content[:200])
    return restrictions
```

### 5.2 Frontend - Next.js

#### `frontend/src/app/page.tsx`
```typescript
/**
 * Dashboard principal de TravelOS
 * 
 * Muestra resumen ejecutivo de solicitudes activas, métricas clave,
 * y acceso rápido a funcionalidades principales.
 * 
 * Features:
 *   - Cards de métricas (solicitudes activas, valor total, tasa conversión)
 *   - Lista de solicitudes recientes
 *   - Filtros rápidos
 *   - Botón de nueva solicitud
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import RequestCard from '@/components/requests/RequestCard';
import { useRequests } from '@/hooks/useRequests';
import { Plus, TrendingUp, Clock, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  const { requests, loading, error, fetchRequests } = useRequests();
  const [stats, setStats] = useState({
    active: 0,
    inProgress: 0,
    ready: 0,
    totalValue: 0
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    // Calcular estadísticas
    const active = requests.filter(r => r.status !== 'archived').length;
    const inProgress = requests.filter(r => r.status === 'processing').length;
    const ready = requests.filter(r => r.status === 'ready').length;
    const totalValue = requests
      .filter(r => r.approved_package)
      .reduce((sum, r) => sum + r.approved_package.final_price, 0);
    
    setStats({ active, inProgress, ready, totalValue });
  }, [requests]);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Vista general de tus solicitudes y paquetes
          </p>
        </div>
        <Button 
          size="lg" 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => window.location.href = '/requests/new'}
        >
          <Plus className="mr-2 h-5 w-5" />
          Nueva Solicitud
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Solicitudes Activas</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">En Proceso</p>
              <p className="text-2xl font-bold">{stats.inProgress}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Listas para Revisar</p>
              <p className="text-2xl font-bold">{stats.ready}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Valor Total</p>
              <p className="text-2xl font-bold">
                ${stats.totalValue.toLocaleString('es-MX')}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Requests List */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Solicitudes Recientes</h2>
        
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Cargando solicitudes...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            Error: {error}
          </div>
        )}

        {!loading && !error && requests.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No hay solicitudes aún</p>
            <Button className="mt-4" onClick={() => window.location.href = '/requests/new'}>
              Crear Primera Solicitud
            </Button>
          </div>
        )}

        {!loading && !error && requests.length > 0 && (
          <div className="space-y-4">
            {requests.slice(0, 10).map(request => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
```

#### `frontend/src/hooks/useRequests.ts`
```typescript
/**
 * Custom hook para manejar solicitudes de viaje.
 * 
 * Proporciona estado y funciones para:
 *   - Listar solicitudes
 *   - Crear nueva solicitud
 *   - Obtener detalle de solicitud
 *   - Actualizar solicitud
 * 
 * Uso:
 *   const { requests, loading, createRequest } = useRequests();
 */

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { TravelRequest } from '@/types/request';

interface UseRequestsReturn {
  requests: TravelRequest[];
  loading: boolean;
  error: string | null;
  fetchRequests: () => Promise<void>;
  createRequest: (data: Partial<TravelRequest>) => Promise<TravelRequest>;
  getRequest: (id: string) => Promise<TravelRequest>;
  updateRequest: (id: string, data: Partial<TravelRequest>) => Promise<TravelRequest>;
}

export function useRequests(): UseRequestsReturn {
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Obtiene lista de todas las solicitudes
   */
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiClient.get<TravelRequest[]>('/requests');
      setRequests(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching requests');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Crea nueva solicitud y ejecuta agentes
   */
  const createRequest = useCallback(async (data: Partial<TravelRequest>): Promise<TravelRequest> => {
    setLoading(true);
    setError(null);
    
    try {
      const created = await apiClient.post<TravelRequest>('/requests', data);
      setRequests(prev => [created, ...prev]);
      
      // Trigger agent processing (async)
      apiClient.post(`/agents/process/${created.id}`).catch(console.error);
      
      return created;
    } catch (err: any) {
      setError(err.message || 'Error creating request');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtiene detalle de una solicitud específica
   */
  const getRequest = useCallback(async (id: string): Promise<TravelRequest> => {
    setLoading(true);
    setError(null);
    
    try {
      const request = await apiClient.get<TravelRequest>(`/requests/${id}`);
      return request;
    } catch (err: any) {
      setError(err.message || 'Error fetching request');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Actualiza solicitud existente
   */
  const updateRequest = useCallback(async (
    id: string,
    data: Partial<TravelRequest>
  ): Promise<TravelRequest> => {
    setLoading(true);
    setError(null);
    
    try {
      const updated = await apiClient.put<TravelRequest>(`/requests/${id}`, data);
      setRequests(prev => prev.map(r => r.id === id ? updated : r));
      return updated;
    } catch (err: any) {
      setError(err.message || 'Error updating request');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    requests,
    loading,
    error,
    fetchRequests,
    createRequest,
    getRequest,
    updateRequest
  };
}
```

---

## 6. Setup del Proyecto

### 6.1 Requisitos Previos
- **Python 3.11+**
- **Node.js 18+**
- **PostgreSQL 15+**
- **Docker** (recomendado para desarrollo)
- **Git**

### 6.2 Clonar Repositorio
```bash
git clone https://github.com/[tu-org]/travelos.git
cd travelos
```

### 6.3 Setup Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Copiar variables de entorno
cp .env.example .env
# EDITAR .env con tus API keys

# Inicializar base de datos
python scripts/init_db.py

# Correr migraciones
alembic upgrade head

# Cargar SOPs a Pinecone
python scripts/load_sops.py

# Iniciar servidor de desarrollo
uvicorn main:app --reload --port 8000
```

### 6.4 Setup Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.local.example .env.local
# EDITAR .env.local

# Iniciar servidor de desarrollo
npm run dev
```

### 6.5 Setup con Docker (Recomendado)

```bash
# Desde raíz del proyecto
docker-compose up -d

# Backend estará en http://localhost:8000
# Frontend estará en http://localhost:3000
# PostgreSQL en localhost:5432
```

### 6.6 Variables de Entorno

#### Backend `.env`
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/travelos

# Security
SECRET_KEY=tu-secret-key-muy-seguro-aqui
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# OpenAI
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4
LLM_TEMPERATURE=0.7

# Pinecone
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=travelos-sops

# Amadeus
AMADEUS_API_KEY=...
AMADEUS_API_SECRET=...

# Scraping
PLAYWRIGHT_HEADLESS=true
SCRAPER_TIMEOUT=30000

# CORS
CORS_ORIGINS=["http://localhost:3000"]
```

#### Frontend `.env.local`
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## 7. Flujos de Trabajo

### 7.1 Flujo: Crear Nueva Solicitud

```
Usuario (Frontend)
  ↓
1. Llena formulario en /requests/new
   - Destino, fechas, viajeros, presupuesto, preferencias
  ↓
2. Submit → POST /api/v1/requests
  ↓
Backend (FastAPI)
  ↓
3. Valida datos (Pydantic schema)
  ↓
4. Guarda en DB (status='pending')
  ↓
5. Retorna ID de solicitud
  ↓
6. Trigger async: POST /api/v1/agents/process/{request_id}
  ↓
LangGraph Agents
  ↓
7. Coordinator → consulta SOPs vía RAG
  ↓
8. Researcher → busca vuelos (Amadeus) + hotels (scraping) en paralelo
  ↓
9. Itinerary → arma ruta día a día
  ↓
10. Financial → calcula márgenes, genera 3 opciones
  ↓
11. Compliance → valida visas, restricciones
  ↓
12. Presenter → estructura paquete final
  ↓
13. Guarda packages en DB (status='ready')
  ↓
Frontend
  ↓
14. Poll status cada 5 seg o WebSocket
  ↓
15. Cuando status='ready' → redirige a /requests/{id}/review
```

### 7.2 Flujo: Revisar y Editar Paquete

```
Usuario (Frontend)
  ↓
1. Entra a /requests/{id}/review
  ↓
2. GET /api/v1/packages?request_id={id}
  ↓
3. Muestra 3 opciones (económica, estándar, premium)
  ↓
4. Usuario selecciona opción "estándar"
  ↓
5. Ve detalles completos:
   - Vuelos
   - Hotel
   - Actividades
   - Traslados
   - Desglose financiero
  ↓
6. Usuario hace click "Editar Hotel"
  ↓
7. Modal muestra alternativas del mismo agente
  ↓
8. Usuario selecciona otro hotel
  ↓
9. PUT /api/v1/packages/{package_id}
   {
     "hotels_data": [nuevo_hotel],
     "recalculate": true
   }
  ↓
10. Backend recalcula totales
  ↓
11. Retorna package actualizado
  ↓
12. Frontend muestra nuevo total
  ↓
13. Usuario satisfecho → Click "Aprobar"
  ↓
14. POST /api/v1/packages/{package_id}/approve
  ↓
15. Actualiza status a 'approved'
  ↓
16. Usuario genera propuesta PDF
  ↓
17. POST /api/v1/proposals/generate
    {
      "package_id": "...",
      "format": "pdf",
      "include_images": true
    }
  ↓
18. Backend genera PDF con template
  ↓
19. Retorna URL de descarga
  ↓
20. Usuario descarga o envía por email
```

---

## 8. APIs y Endpoints

### 8.1 Autenticación

```
POST /api/v1/auth/login
  Body: { email, password }
  Returns: { access_token, token_type, user }

POST /api/v1/auth/register
  Body: { email, password, full_name }
  Returns: { id, email, full_name }

GET /api/v1/auth/me
  Headers: Authorization: Bearer {token}
  Returns: { id, email, full_name, role }
```

### 8.2 Solicitudes (Requests)

```
GET /api/v1/requests
  Query params: ?status=pending&limit=20&offset=0
  Returns: [TravelRequest]

POST /api/v1/requests
  Body: TravelRequestCreate schema
  Returns: TravelRequest

GET /api/v1/requests/{id}
  Returns: TravelRequest (con packages si existen)

PUT /api/v1/requests/{id}
  Body: TravelRequestUpdate schema
  Returns: TravelRequest

DELETE /api/v1/requests/{id}
  Returns: { message: "deleted" }
```

### 8.3 Agentes

```
POST /api/v1/agents/process/{request_id}
  Trigger: Ejecuta grafo de agentes
  Returns: { status: "processing", job_id }

GET /api/v1/agents/status/{request_id}
  Returns: {
    status: "processing" | "completed" | "failed",
    progress: 73,  // 0-100
    current_agent: "financial",
    logs: [...]
  }
```

### 8.4 Paquetes (Packages)

```
GET /api/v1/packages
  Query: ?request_id={id}
  Returns: [Package] (económico, estándar, premium)

GET /api/v1/packages/{id}
  Returns: Package completo

PUT /api/v1/packages/{id}
  Body: { hotels_data, recalculate: true }
  Returns: Package actualizado

POST /api/v1/packages/{id}/approve
  Returns: { message: "approved", package_id }
```

### 8.5 Propuestas (Proposals)

```
POST /api/v1/proposals/generate
  Body: {
    package_id,
    format: "pdf" | "html",
    include_images: true,
    custom_message: "..."
  }
  Returns: {
    proposal_id,
    download_url,
    expires_at
  }

POST /api/v1/proposals/{id}/send-email
  Body: { recipient_email, subject, message }
  Returns: { sent: true, email_id }
```

### 8.6 Proveedores (Providers)

```
GET /api/v1/providers
  Returns: [Provider]

POST /api/v1/providers
  Body: {
    name,
    type: "api" | "scraping",
    url,
    credentials: {...}  // se encriptan automáticamente
  }
  Returns: Provider

PUT /api/v1/providers/{id}
  Body: { credentials: {...} }
  Returns: Provider

DELETE /api/v1/providers/{id}
  Returns: { deleted: true }

POST /api/v1/providers/{id}/test
  Test: Prueba conexión
  Returns: { success: true, message }
```

### 8.7 SOPs (Knowledge Base)

```
GET /api/v1/sops
  Returns: [SOPDocument]

POST /api/v1/sops/upload
  Body: multipart/form-data (file: PDF/DOCX)
  Returns: { document_id, processed: true }

DELETE /api/v1/sops/{id}
  Returns: { deleted: true, removed_from_vectorstore: true }

POST /api/v1/sops/query
  Body: { question: "..." }
  Returns: {
    answer,
    sources: [...],
    confidence
  }
```

---

## 9. Base de Datos

### 9.1 Esquema PostgreSQL

```sql
-- Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'operator',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Travel Requests
CREATE TABLE travel_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id),
    client_name VARCHAR(255),
    client_email VARCHAR(255),
    client_phone VARCHAR(50),
    
    destination VARCHAR(255),
    start_date DATE,
    end_date DATE,
    num_adults INTEGER DEFAULT 2,
    num_children INTEGER DEFAULT 0,
    
    budget_min DECIMAL(10,2),
    budget_max DECIMAL(10,2),
    preferences JSONB,  -- flexible preferences
    
    status VARCHAR(50) DEFAULT 'pending',
    -- pending, processing, ready, approved, rejected, archived
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Packages
CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES travel_requests(id) ON DELETE CASCADE,
    
    package_type VARCHAR(50),  -- economic, standard, premium
    
    flights_data JSONB,      -- [{flight details}]
    hotels_data JSONB,       -- [{hotel details}]
    activities_data JSONB,   -- [{activity details}]
    transfers_data JSONB,    -- [{transfer details}]
    
    total_cost DECIMAL(10,2),
    margin_percentage DECIMAL(5,2),
    final_price DECIMAL(10,2),
    
    is_approved BOOLEAN DEFAULT false,
    version_number INTEGER DEFAULT 1,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversation History
CREATE TABLE conversation_history (
    id SERIAL PRIMARY KEY,
    request_id UUID REFERENCES travel_requests(id) ON DELETE CASCADE,
    
    user_message TEXT,
    agent_response TEXT,
    agent_actions JSONB,  -- log de acciones
    
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Providers
CREATE TABLE providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,  -- api, scraping
    url VARCHAR(500),
    
    credentials_encrypted BYTEA,  -- encriptado con Fernet
    config JSONB,  -- selectores CSS, etc.
    
    is_active BOOLEAN DEFAULT true,
    last_sync TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SOP Documents
CREATE TABLE sop_documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    pinecone_index_id VARCHAR(255),  -- ID en Pinecone
    document_hash VARCHAR(64)  -- SHA-256 del archivo
);

-- Generated Proposals
CREATE TABLE generated_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES packages(id),
    
    format VARCHAR(20),  -- pdf, html
    file_path VARCHAR(500),
    
    sent_to_client BOOLEAN DEFAULT false,
    sent_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_requests_user ON travel_requests(user_id);
CREATE INDEX idx_requests_status ON travel_requests(status);
CREATE INDEX idx_requests_created ON travel_requests(created_at DESC);
CREATE INDEX idx_packages_request ON packages(request_id);
CREATE INDEX idx_conversation_request ON conversation_history(request_id);
```

---

## 10. Agentes de IA

### 10.1 Agente Coordinador
- **Rol:** Orquesta el flujo completo
- **Herramientas:** query_sop_rag()
- **Output:** sop_guidelines

### 10.2 Agente Investigador
- **Rol:** Busca opciones de vuelos, hoteles, actividades
- **Herramientas:** search_flights(), scrape_hotel_provider(), search_activities()
- **Output:** flights_data, hotels_data, activities_data

### 10.3 Agente de Itinerarios
- **Rol:** Arma ruta día a día optimizada
- **Input:** flights_data, hotels_data, activities_data
- **Output:** itinerary (estructura día a día)

### 10.4 Agente Financiero
- **Rol:** Calcula costos y márgenes
- **Herramientas:** calculate_margin()
- **Input:** itinerary, sop_guidelines
- **Output:** pricing (3 opciones), final_price

### 10.5 Agente de Compliance
- **Rol:** Valida requisitos legales
- **Herramientas:** validate_visa(), check_travel_restrictions()
- **Output:** compliance_checks

### 10.6 Agente de Presentación
- **Rol:** Estructura paquete final
- **Input:** Todo lo anterior
- **Output:** final_packages [economic, standard, premium]

---

## 11. Criterios de Aceptación

### Sprint 1 (Semanas 1-2)
- [ ] Repositorio configurado en GitHub
- [ ] Docker Compose funcional (Postgres + Redis)
- [ ] Backend: `GET /health` retorna 200
- [ ] Frontend: Home page renderiza sin errores
- [ ] Login funcional (JWT)

### Sprint 2 (Semanas 3-4)
- [ ] Formulario de nueva solicitud funcional
- [ ] POST /api/v1/requests crea registro en DB
- [ ] Dashboard muestra lista de solicitudes
- [ ] Tests unitarios de API requests (>80% coverage)

### Sprint 3 (Semanas 5-6)
- [ ] Agente simple busca vuelos en Amadeus
- [ ] POST /api/v1/agents/process/{id} ejecuta agente
- [ ] Frontend muestra progreso en tiempo real
- [ ] Log de acciones del agente visible

### Sprint 4 (Semanas 7-8)
- [ ] Scraping de 1 proveedor privado funcional
- [ ] Login automático exitoso
- [ ] Extrae mínimo 5 hoteles
- [ ] Manejo de errores (timeout, credenciales inválidas)

### Sprint 5 (Semanas 9-10)
- [ ] Pinecone configurado y funcionando
- [ ] Script carga 3+ documentos SOPs
- [ ] query_sop_knowledge retorna respuestas relevantes
- [ ] Confidence score >0.7 en queries de prueba

### Sprint 6 (Semanas 11-12)
- [ ] LangGraph con 6 agentes implementados
- [ ] Flujo completo genera 3 opciones de paquete
- [ ] Tiempo de ejecución <2 minutos
- [ ] Test E2E: request → packages completo

### Sprint 7 (Semanas 13-14)
- [ ] Vista de review muestra paquete completo
- [ ] Edición de hotel funcional
- [ ] Recalculo de totales automático
- [ ] Guardar versión editada

### Sprint 8 (Semanas 15-16)
- [ ] Generación de PDF con template HTML
- [ ] Incluye imágenes, itinerario, pricing
- [ ] Descarga funcional
- [ ] Envío por email (bonus)

---

## 12. Roadmap de Desarrollo

### Fase 1: MVP (Meses 1-4)
- ✅ Setup y autenticación
- ✅ CRUD de solicitudes
- ✅ Agentes básicos (1 destino, 2 proveedores)
- ✅ RAG con SOPs
- ✅ Vista de revisión
- ✅ Generador de PDF

### Fase 2: Beta (Meses 5-6)
- Multi-destino
- 5+ proveedores conectados
- Monitor de precios en tiempo real
- Alertas por email
- Panel de analytics

### Fase 3: Producción (Meses 7-9)
- Sistema de reservas
- Pasarela de pagos
- Multi-usuario con permisos
- App móvil (React Native)
- API pública para partners

---

## 13. Comandos Útiles

```bash
# Backend
cd backend
source venv/bin/activate
uvicorn main:app --reload              # Dev server
pytest                                  # Run tests
pytest --cov=app                        # Coverage
alembic revision --autogenerate -m ""   # Nueva migración
alembic upgrade head                    # Aplicar migraciones
python scripts/load_sops.py             # Cargar SOPs

# Frontend
cd frontend
npm run dev                             # Dev server
npm run build                           # Build producción
npm run test                            # Run tests
npm run lint                            # Linter

# Docker
docker-compose up -d                    # Start services
docker-compose down                     # Stop services
docker-compose logs -f backend          # Ver logs backend
docker-compose exec backend bash        # Shell en container

# Git
git checkout -b feature/nombre          # Nueva rama
git add .
git commit -m "feat: descripción"
git push origin feature/nombre
# Crear PR en GitHub
```

---

## 14. Recursos Adicionales

- **LangGraph Docs:** https://python.langchain.com/docs/langgraph
- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **Next.js Docs:** https://nextjs.org/docs
- **Playwright Docs:** https://playwright.dev/python/
- **Pinecone Docs:** https://docs.pinecone.io/
- **Amadeus API:** https://developers.amadeus.com/

---

## 15. Contacto y Soporte

- **Tech Lead:** [email]
- **Product Owner:** [email]
- **Slack:** #travelos-dev
- **GitHub Issues:** https://github.com/[org]/travelos/issues

---

**Última actualización:** 5 Febrero 2026
**Versión:** 1.0

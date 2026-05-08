# TravelOS — AI Travel Operations Platform

TravelOS es una plataforma para agencias de viaje que usa agentes de IA para generar paquetes de vuelos y hoteles personalizados. El sistema busca opciones en tiempo real via SerpAPI, las procesa con un LLM de NVIDIA y guarda los resultados en Supabase.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite, Supabase Auth |
| Backend | FastAPI + Python 3.11 |
| Agente | LangGraph + NVIDIA NIM (Nemotron) |
| Búsqueda | SerpAPI (Google Flights & Hotels) |
| Base de datos | Supabase (PostgreSQL) |
| Deploy | Docker Compose |

---

## Requisitos previos

- **Python 3.11+**
- **Node.js 20+**
- **Git**
- Cuentas con API keys de:
  - [NVIDIA NIM](https://build.nvidia.com) — modelo `nvidia/nemotron-3-super-120b-a12b`
  - [SerpAPI](https://serpapi.com) — para búsqueda de vuelos y hoteles
  - [Supabase](https://supabase.com) — base de datos y autenticación

---

## Variables de entorno

### Backend — `backend/.env`

Crea el archivo `backend/.env` con estas variables:

```env
# LLM / Search
NVIDIA_API_KEY=nvapi-...
SERPAPI_API_KEY=...

# Supabase (service role — nunca exponer al frontend)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# Servidor
FRONTEND_URL=http://localhost:5173
```

### Frontend — `frontend/.env`

Crea el archivo `frontend/.env` con estas variables:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_API_URL=http://localhost:8000
```

> Las keys de Supabase las encuentras en: **Supabase Dashboard → Project Settings → API**

---

## Opción A — Ejecución local (desarrollo)

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/travelos.git
cd travelos
```

### 2. Backend

```bash
cd backend

# Crear entorno virtual
python -m venv .venv

# Activar (Windows)
.\.venv\Scripts\Activate.ps1

# Activar (Mac/Linux)
source .venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Crear archivo de entorno (ver sección Variables de entorno)
# cp backend/.env.example backend/.env  ← edita con tus keys

# Levantar servidor
uvicorn main:app --reload --port 8000
```

El backend queda disponible en `http://localhost:8000`.  
Verifica que funciona en `http://localhost:8000/health`.

### 3. Frontend

Abre una **segunda terminal**:

```bash
cd frontend

# Instalar dependencias
npm install

# Crear archivo de entorno (ver sección Variables de entorno)

# Levantar servidor de desarrollo
npm run dev
```

El frontend queda disponible en `http://localhost:5173`.

---

## Opción B — Docker Compose

### Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Pasos

```bash
# 1. Clonar y entrar al proyecto
git clone https://github.com/tu-usuario/travelos.git
cd travelos

# 2. Crear backend/.env con tus keys (ver sección Variables de entorno)

# 3. Construir y levantar
docker compose up --build
```

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8000 |

Para detener:

```bash
docker compose down
```

> **Nota:** El frontend se construye con las URLs hardcodeadas en `docker-compose.yml`. Si cambias el dominio del backend en producción, edita `VITE_API_URL` en `docker-compose.yml` y vuelve a construir.

---

## Base de datos (Supabase)

Las tablas se crean automáticamente en tu proyecto de Supabase. Si necesitas crearlas manualmente, ejecuta el siguiente SQL en **Supabase Dashboard → SQL Editor**:

```sql
CREATE TABLE IF NOT EXISTS "QUOTE_REQUESTS" (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by_user_id uuid,
  origin_label text, origin_flights_id text,
  destination_label text, destination_flights_id text,
  destination_hotels_query text,
  depart_date date, return_date date,
  adults integer, children integer,
  infants_in_seat integer DEFAULT 0, infants_on_lap integer DEFAULT 0,
  budget_max numeric, currency text,
  hl text, gl text, travel_class integer,
  submitted_payload jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "QUOTE_JOBS" (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_request_id uuid REFERENCES "QUOTE_REQUESTS"(id),
  status text, phase text,
  error_code text, error_message text,
  started_at timestamptz, completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS "FLIGHT_OPTIONS" (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid REFERENCES "QUOTE_JOBS"(id),
  search_run_id uuid,
  departure_token text, segments_jsonb jsonb,
  total_price numeric, currency text,
  total_duration_min integer, layover_count integer,
  emissions_kg numeric, ranking_score numeric,
  raw_option_jsonb jsonb
);

CREATE TABLE IF NOT EXISTS "HOTEL_OPTIONS" (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid REFERENCES "QUOTE_JOBS"(id),
  search_run_id uuid,
  property_token text, property_name text,
  nightly_rate numeric, total_rate numeric, currency text,
  overall_rating numeric, location_rating numeric,
  review_count integer, amenities_jsonb jsonb,
  free_cancellation boolean, ranking_score numeric,
  raw_option_jsonb jsonb
);

CREATE TABLE IF NOT EXISTS "PACKAGES" (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid REFERENCES "QUOTE_JOBS"(id),
  flight_option_id uuid REFERENCES "FLIGHT_OPTIONS"(id),
  hotel_option_id uuid REFERENCES "HOTEL_OPTIONS"(id),
  tier text, package_rank integer,
  total_price numeric, currency text,
  within_budget boolean, quality_score numeric,
  price_breakdown_jsonb jsonb,
  rationale_text text, package_snapshot_jsonb jsonb,
  created_at timestamptz DEFAULT now()
);
```

---

## Estructura del proyecto

```
travelos/
├── backend/
│   ├── main.py                  # FastAPI — endpoints y lógica principal
│   ├── requirements.txt         # Dependencias Python
│   ├── Dockerfile
│   └── agents/
│       └── prototype_agent/
│           ├── travel_graph.py  # Grafo LangGraph del agente
│           ├── graph_state.py   # Modelos Pydantic del agente
│           └── serpapi_tools.py # Herramientas de búsqueda SerpAPI
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Routing y estado global
│   │   ├── pages/               # Pantallas de la app
│   │   ├── components/          # Componentes reutilizables
│   │   └── lib/supabase.js      # Cliente Supabase
│   ├── Dockerfile
│   └── nginx.conf
└── docker-compose.yml
```

---

## Flujo de uso

1. **Login** — autenticación con Supabase (email/contraseña)
2. **New Travel Request** — llena el formulario con destino, fechas, presupuesto
3. **Processing** — el agente busca vuelos y hoteles en tiempo real (~30–90 segundos)
4. **Review** — revisa el paquete generado con vuelos, hotel e imagen
5. **Dashboard** — historial de todas las solicitudes guardadas en Supabase

---

## Endpoints del backend

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Estado del servidor |
| `POST` | `/plan-trip` | Genera un paquete de viaje con el agente |
| `GET` | `/requests` | Lista las solicitudes recientes del dashboard |

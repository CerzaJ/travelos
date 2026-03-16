# 🚀 TravelOS - Sistema de Agente de Viajes con IA

Sistema B2B que automatiza el proceso de investigación, cotización y armado de paquetes de viaje mediante agentes de IA especializados, reduciendo el tiempo de procesamiento de **4-6 horas a 15 minutos**.

## 📋 Tabla de Contenidos

- [Features](#features)
- [Arquitectura](#arquitectura)
- [Stack Tecnológico](#stack-tecnológico)
- [Setup Rápido](#setup-rápido)
- [Documentación](#documentación)
- [Contribuir](#contribuir)

## ✨ Features

### Core MVP
- ✅ **Formulario inteligente** de solicitudes de viaje
- ✅ **Agentes de IA especializados** (LangGraph)
  - Coordinador, Investigador, Itinerarios, Financiero, Compliance, Presentación
- ✅ **Scraping automatizado** de proveedores privados
- ✅ **RAG (Retrieval-Augmented Generation)** para consultar SOPs empresariales
- ✅ **Generación de 3 opciones** de paquetes (Económica, Estándar, Premium)
- ✅ **Editor manual** de paquetes con recalculo automático
- ✅ **Generador de PDF** profesional para propuestas

### Integraciones
- 🛫 **Amadeus API** - Búsqueda de vuelos
- 🏨 **Scraping Playwright** - Proveedores privados de hoteles
- 🧠 **OpenAI GPT-4 / Claude** - Motor de IA
- 📊 **Pinecone** - Base de datos vectorial para RAG

## 🏗️ Arquitectura

```
Frontend (Next.js)
      ↓
Backend (FastAPI)
      ↓
LangGraph Agents → Tools (Flights, Hotels, RAG, etc.)
      ↓
PostgreSQL + Pinecone + Redis
```

Diagrama completo: [`docs/architecture.md`](docs/architecture.md)

## 🛠️ Stack Tecnológico

### Backend
- Python 3.11+
- FastAPI (API REST)
- LangGraph + LangChain (Orquestación de agentes)
- SQLAlchemy (ORM)
- Playwright (Web scraping)
- Pinecone (Base vectorial)

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS + shadcn/ui
- Zustand (State management)

### Base de Datos
- PostgreSQL 15 (Datos relacionales)
- Pinecone (Embeddings de SOPs)
- Redis (Caché - opcional)

### DevOps
- Docker & Docker Compose
- Railway (Backend hosting)
- Vercel (Frontend hosting)
- GitHub Actions (CI/CD)

## 🚀 Setup Rápido

### Prerequisitos
- Python 3.11+
- Node.js 18+
- Docker (recomendado)

### Opción 1: Docker (Recomendado)

```bash
# Clonar repo
git clone https://github.com/[tu-org]/travelos.git
cd travelos

# Copiar variables de entorno
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# EDITAR archivos .env con tus API keys

# Levantar servicios
docker-compose up -d

# Inicializar DB
docker-compose exec backend python scripts/init_db.py

# Cargar SOPs a Pinecone
docker-compose exec backend python scripts/load_sops.py
```

**Acceder a:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs

### Opción 2: Local

#### Backend
```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Setup DB
cp .env.example .env
# Editar .env con tus credenciales

# Migraciones
alembic upgrade head

# Inicializar datos
python scripts/init_db.py
python scripts/load_sops.py

# Correr servidor
uvicorn main:app --reload
```

#### Frontend
```bash
cd frontend

# Instalar dependencias
npm install

# Setup env vars
cp .env.local.example .env.local
# Editar .env.local

# Correr dev server
npm run dev
```

## 📚 Documentación

- **[PRD Completo](docs/PRD_TravelOS.md)** - Product Requirements Document
- **[Arquitectura](docs/architecture.md)** - Diagramas y flujos
- **[API Reference](docs/api-reference.md)** - Especificación de endpoints
- **[Guía de Agentes](docs/agents-guide.md)** - Cómo funcionan los agentes
- **[Deployment](docs/deployment.md)** - Deploy a producción
- **[Contributing](docs/contributing.md)** - Cómo contribuir

## 📊 Estructura del Proyecto

```
travelos/
├── backend/              # FastAPI backend
│   ├── agents/           # LangGraph agents
│   ├── database/         # Database models & vectorstore
│   ├── tools/            # Agent tools
│   ├── main.py           # Entry point
│   └── requirements.txt  # Dependencies
├── frontend/             # Next.js frontend (Sketch)
│   ├── components/       # React components
│   └── pages/            # Pages
├── docs/                 # Documentation (PRD, Sketch)
└── documentos_empresa/   # Enterprise SOPs (RAG)
```

## 🧪 Testing

### Backend
```bash
cd backend
pytest                    # Run all tests
pytest --cov=app         # With coverage
pytest -v tests/test_agents/  # Specific module
```

### Frontend
```bash
cd frontend
npm test                 # Run tests
npm run test:coverage    # With coverage
```

## 🚢 Deployment

### Staging
```bash
git push origin develop
# Auto-deploy a Railway (staging)
```

### Producción
```bash
git checkout main
git merge develop
git push origin main
# Auto-deploy a Railway (producción)
```

Guía completa: [`docs/deployment.md`](docs/deployment.md)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push a la branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

Ver [`CONTRIBUTING.md`](docs/contributing.md) para más detalles.

### Convención de Commits
```
feat: Nueva funcionalidad
fix: Bug fix
docs: Cambios en documentación
style: Formateo, punto y coma faltante, etc.
refactor: Refactorización de código
test: Agregar tests
chore: Actualizar deps, configs, etc.
```

## 📈 Roadmap

### Q1 2026 - MVP ✅
- [x] Setup básico
- [x] CRUD solicitudes
- [x] Agentes de IA
- [x] RAG con SOPs
- [x] Generador de PDF

### Q2 2026 - Beta
- [ ] Multi-destino
- [ ] 5+ proveedores
- [ ] Monitor de precios
- [ ] Alertas email/WhatsApp

### Q3 2026 - Producción
- [ ] Sistema de reservas
- [ ] Pasarela de pagos
- [ ] Multi-usuario
- [ ] App móvil

## 📄 Licencia

Este proyecto está bajo la licencia MIT - ver [`LICENSE`](LICENSE) para detalles.

## 👥 Equipo

- **Product Owner:** [Jose_Maria]
- **Tech Lead:** [Ameyal_y_Mateo]
- **Backend Devs:** [TheNewMix]
- **Frontend Devs:** [Uriel]

## 📞 Contacto

- **Email:** team@travelos.com
- **Slack:** #travelos-dev
- **Issues:** [GitHub Issues](https://github.com/[org]/travelos/issues)

---

Hecho con ❤️ por el equipo de TravelOS
skjdls
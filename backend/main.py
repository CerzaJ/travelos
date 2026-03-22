from fastapi import FastAPI, HTTPException
from schemas.travel import TravelRequest
from schemas.orchestrator import OrchestratorResponse
from agents.coordinador import run_orchestrator

app = FastAPI()


@app.post("/plan-trip", response_model=OrchestratorResponse)
def plan_trip(request: TravelRequest):
    try:
        # Convertir a dict por compatibilidad con el orquestador
        request_data = request.dict()

        # Llamar al orquestador (caja negra)
        result = run_orchestrator(request_data)

        # Validar y estructurar respuesta
        return OrchestratorResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
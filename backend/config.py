"""
Configuración central del backend.
Carga de variables de entorno, claves de API (Amadeus, OpenAI, Pinecone) y configuración de base de datos.
"""

import os

class Settings:
    ENV = os.getenv("ENV", "dev")
    DEBUG = True if ENV == "dev" else False

settings = Settings()

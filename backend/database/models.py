"""
Modelos de PostgreSQL (SQLAlchemy).
Define los esquemas de tablas para usuarios, solicitudes de viaje,
paquetes generados, documentos SOP, historial y propuestas.
"""

from sqlalchemy import (
    Column, Integer, String, Boolean, Text,
    DateTime, Date, Numeric, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import uuid

Base = declarative_base()


class Usuario(Base):
    """Operadores de la agencia que usan el sistema."""
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    contrasena_hash = Column(Text, nullable=False)
    nombre_completo = Column(String(255), nullable=False)
    rol = Column(String(50), nullable=False, default="operador")
    activo = Column(Boolean, nullable=False, default=True)
    creado_en = Column(DateTime, default=datetime.utcnow)
    ultimo_acceso = Column(DateTime, nullable=True)

    # Relaciones
    solicitudes = relationship("SolicitudViaje", back_populates="usuario")
    documentos_sop = relationship("DocumentoSOP", back_populates="subido_por_usuario")


class SolicitudViaje(Base):
    """Solicitudes de viaje enviadas por clientes."""
    __tablename__ = "solicitudes_viaje"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    nombre_cliente = Column(String(255), nullable=False)
    email_cliente = Column(String(255), nullable=True)
    destino = Column(String(255), nullable=False)
    ciudad_origen = Column(String(100), nullable=True)
    fecha_salida = Column(Date, nullable=False)
    fecha_regreso = Column(Date, nullable=False)
    adultos = Column(Integer, nullable=False, default=1)
    ninos = Column(Integer, nullable=False, default=0)
    presupuesto_min = Column(Numeric(10, 2), nullable=True)
    presupuesto_max = Column(Numeric(10, 2), nullable=True)
    preferencias = Column(JSONB, nullable=True)
    estado = Column(String(50), nullable=False, default="pendiente")
    creado_en = Column(DateTime, default=datetime.utcnow)
    actualizado_en = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    usuario = relationship("Usuario", back_populates="solicitudes")
    paquetes = relationship("Paquete", back_populates="solicitud")
    historial = relationship("HistorialConversacion", back_populates="solicitud")


class Paquete(Base):
    """Paquetes de viaje generados por los agentes de IA."""
    __tablename__ = "paquetes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    solicitud_id = Column(UUID(as_uuid=True), ForeignKey("solicitudes_viaje.id"), nullable=False)
    nivel = Column(String(20), nullable=False)  # economico, estandar, premium
    titulo = Column(String(255), nullable=False)
    itinerario = Column(JSONB, nullable=True)
    datos_vuelos = Column(JSONB, nullable=True)
    datos_hoteles = Column(JSONB, nullable=True)
    datos_actividades = Column(JSONB, nullable=True)
    costo_total = Column(Numeric(12, 2), nullable=True)
    precio_venta = Column(Numeric(12, 2), nullable=True)
    porcentaje_margen = Column(Numeric(5, 2), nullable=True)
    verificaciones_cumplimiento = Column(JSONB, nullable=True)
    editado_manualmente = Column(Boolean, nullable=False, default=False)
    estado = Column(String(50), nullable=False, default="borrador")
    creado_en = Column(DateTime, default=datetime.utcnow)
    actualizado_en = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    solicitud = relationship("SolicitudViaje", back_populates="paquetes")
    propuestas = relationship("PropuestaGenerada", back_populates="paquete")


class DocumentoSOP(Base):
    """Metadata de documentos de políticas empresariales para el RAG."""
    __tablename__ = "documentos_sop"

    id = Column(Integer, primary_key=True, autoincrement=True)
    titulo = Column(String(255), nullable=False)
    ruta_archivo = Column(String(500), nullable=True)
    subido_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    subido_en = Column(DateTime, default=datetime.utcnow)
    coleccion_milvus = Column(String(255), nullable=True)
    hash_documento = Column(String(64), nullable=True)
    cantidad_fragmentos = Column(Integer, nullable=True)
    activo = Column(Boolean, nullable=False, default=True)

    # Relaciones
    subido_por_usuario = relationship("Usuario", back_populates="documentos_sop")


class HistorialConversacion(Base):
    """Log de acciones realizadas por los agentes de IA."""
    __tablename__ = "historial_conversacion"

    id = Column(Integer, primary_key=True, autoincrement=True)
    solicitud_id = Column(UUID(as_uuid=True), ForeignKey("solicitudes_viaje.id"), nullable=False)
    nombre_agente = Column(String(100), nullable=False)
    accion = Column(String(255), nullable=True)
    datos_entrada = Column(JSONB, nullable=True)
    datos_salida = Column(JSONB, nullable=True)
    estado = Column(String(50), nullable=False, default="exitoso")
    mensaje_error = Column(Text, nullable=True)
    duracion_ms = Column(Integer, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    solicitud = relationship("SolicitudViaje", back_populates="historial")


class PropuestaGenerada(Base):
    """Registro de PDFs de propuestas generados para clientes."""
    __tablename__ = "propuestas_generadas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    paquete_id = Column(UUID(as_uuid=True), ForeignKey("paquetes.id"), nullable=False)
    formato = Column(String(20), nullable=False, default="pdf")
    ruta_archivo = Column(String(500), nullable=True)
    enviado_cliente = Column(Boolean, nullable=False, default=False)
    enviado_en = Column(DateTime, nullable=True)
    creado_en = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    paquete = relationship("Paquete", back_populates="propuestas")

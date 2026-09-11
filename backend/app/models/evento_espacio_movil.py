from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func

from app.config.database import Base


class EventoEspacioMovil(Base):
    __tablename__ = "evento_espacio_movil"

    id_evento = Column(Integer, primary_key=True, index=True)
    tipo_evento = Column(String, nullable=False)
    codigo_espacio = Column(String, nullable=False, index=True)
    codigo_zona = Column(String, nullable=False)
    titulo_zona = Column(String, nullable=False)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=True)
    nombre_usuario = Column(String, nullable=True)
    horas_estimadas = Column(Integer, nullable=True)
    fecha_inicio = Column(DateTime, nullable=True)
    fecha_expiracion = Column(DateTime, nullable=True)
    fecha_confirmacion_requerida = Column(DateTime, nullable=True)
    fecha_evento = Column(DateTime, server_default=func.now(), nullable=False)

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from app.config.database import Base


class ReporteEspacioMovil(Base):
    __tablename__ = "reporte_espacio_movil"

    codigo_espacio = Column(String, primary_key=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False, index=True)
    nombre_usuario = Column(String, nullable=False)
    codigo_zona = Column(String, nullable=False)
    titulo_zona = Column(String, nullable=False)
    horas_estimadas = Column(Integer, nullable=False)
    fecha_inicio = Column(DateTime, nullable=False)
    fecha_expiracion = Column(DateTime, nullable=False)
    fecha_confirmacion_requerida = Column(DateTime, nullable=False)

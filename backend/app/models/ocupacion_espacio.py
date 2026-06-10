from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.config.database import Base


class OcupacionEspacio(Base):
    __tablename__ = "ocupacion_espacio"

    id_ocupacion = Column(Integer, primary_key=True, index=True)
    id_analisis = Column(
        Integer,
        ForeignKey("analisis_imagen.id_analisis", ondelete="CASCADE"),
        nullable=False,
    )
    id_espacio = Column(Integer, ForeignKey("espacio.id_espacio"), nullable=True)
    codigo_espacio = Column(String, nullable=True)
    ocupado = Column(Boolean, default=False)
    fuente = Column(String, default="estimado_yolo")
    fecha_registro = Column(DateTime, server_default=func.now())

    analisis = relationship("AnalisisImagen", back_populates="ocupaciones")
    espacio = relationship("Espacio", back_populates="ocupaciones")

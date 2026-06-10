from sqlalchemy import Column, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.config.database import Base


class VehiculoDetectado(Base):
    __tablename__ = "vehiculo_detectado"

    id_vehiculo = Column(Integer, primary_key=True, index=True)
    id_analisis = Column(
        Integer,
        ForeignKey("analisis_imagen.id_analisis", ondelete="CASCADE"),
        nullable=False,
    )
    clase = Column(String, nullable=False)
    confianza = Column(Float, nullable=False)
    color_detectado = Column(String, nullable=True)
    x1 = Column(Integer, nullable=False)
    y1 = Column(Integer, nullable=False)
    x2 = Column(Integer, nullable=False)
    y2 = Column(Integer, nullable=False)

    analisis = relationship("AnalisisImagen", back_populates="vehiculos")

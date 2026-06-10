from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.config.database import Base


class AnalisisImagen(Base):
    __tablename__ = "analisis_imagen"

    id_analisis = Column(Integer, primary_key=True, index=True)
    id_imagen = Column(Integer, ForeignKey("imagen_capturada.id_imagen"), nullable=False)
    vehiculos_detectados = Column(Integer, default=0)
    espacios_libres = Column(Integer, default=0)
    espacios_ocupados = Column(Integer, default=0)
    porcentaje_ocupacion = Column(Float, default=0)
    precision_modelo = Column(Float, nullable=True)
    estado = Column(String, default="pendiente")
    fecha_analisis = Column(DateTime, server_default=func.now())

    imagen = relationship("ImagenCapturada", back_populates="analisis")
    vehiculos = relationship(
        "VehiculoDetectado",
        back_populates="analisis",
        cascade="all, delete-orphan",
    )
    ocupaciones = relationship(
        "OcupacionEspacio",
        back_populates="analisis",
        cascade="all, delete-orphan",
    )

from sqlalchemy import Boolean, Column, Integer, String
from sqlalchemy.orm import relationship

from app.config.database import Base


class Estacionamiento(Base):
    __tablename__ = "estacionamiento"

    id_estacionamiento = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    ubicacion = Column(String)
    descripcion = Column(String)
    estado = Column(Boolean, default=True)

    espacios = relationship("Espacio", back_populates="estacionamiento")
    imagenes = relationship("ImagenCapturada", back_populates="estacionamiento")

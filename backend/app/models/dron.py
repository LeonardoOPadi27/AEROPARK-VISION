from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.config.database import Base


class Dron(Base):
    __tablename__ = "dron"

    id_dron = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=True)
    nombre = Column(String, nullable=False)
    modelo = Column(String)
    numero_serie = Column(String, unique=True)
    estado = Column(Boolean, default=True)

    usuario = relationship("Usuario", back_populates="drones")
    imagenes = relationship("ImagenCapturada", back_populates="dron")

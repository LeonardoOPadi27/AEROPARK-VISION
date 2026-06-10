from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.config.database import Base


class Espacio(Base):
    __tablename__ = "espacio"

    id_espacio = Column(Integer, primary_key=True, index=True)
    id_estacionamiento = Column(
        Integer,
        ForeignKey("estacionamiento.id_estacionamiento"),
        nullable=False,
    )
    codigo = Column(String, nullable=False)
    fila = Column(String)
    columna = Column(Integer)
    estado_ocupado = Column(Boolean, default=False)
    estado = Column(Boolean, default=True)

    estacionamiento = relationship("Estacionamiento", back_populates="espacios")
    ocupaciones = relationship("OcupacionEspacio", back_populates="espacio")

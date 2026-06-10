from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.config.database import Base


class ImagenCapturada(Base):
    __tablename__ = "imagen_capturada"

    id_imagen = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=True)
    id_dron = Column(Integer, ForeignKey("dron.id_dron"), nullable=True)
    id_estacionamiento = Column(
        Integer,
        ForeignKey("estacionamiento.id_estacionamiento"),
        nullable=True,
    )
    nombre_archivo = Column(String, nullable=False)
    nombre_original = Column(String)
    ruta_archivo = Column(String, nullable=False)
    tipo_contenido = Column(String)
    estado = Column(String, default="subida")
    fecha_captura = Column(DateTime, nullable=True)
    fecha_subida = Column(DateTime, server_default=func.now())

    usuario = relationship("Usuario", back_populates="imagenes")
    dron = relationship("Dron", back_populates="imagenes")
    estacionamiento = relationship("Estacionamiento", back_populates="imagenes")
    analisis = relationship("AnalisisImagen", back_populates="imagen", uselist=False)

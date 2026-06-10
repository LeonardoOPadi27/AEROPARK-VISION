from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.config.database import Base


class Usuario(Base):
    __tablename__ = "usuario"

    id_usuario = Column(Integer, primary_key=True, index=True)
    id_rol = Column(Integer, ForeignKey("rol.id_rol"), nullable=True)
    nombres = Column(String)
    apellidos = Column(String)
    correo = Column(String, unique=True, index=True)
    contrasena = Column(String)
    estado = Column(Boolean, default=True)

    rol = relationship("Rol", back_populates="usuarios")
    drones = relationship("Dron", back_populates="usuario")
    imagenes = relationship("ImagenCapturada", back_populates="usuario")

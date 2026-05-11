from sqlalchemy import Column, Integer, String, Boolean
from app.config.database import Base

class Usuario(Base):
    __tablename__ = "usuario"

    id_usuario = Column(Integer, primary_key=True, index=True)
    nombres = Column(String)
    apellidos = Column(String)
    correo = Column(String, unique=True, index=True)
    contrasena = Column(String)
    estado = Column(Boolean, default=True)
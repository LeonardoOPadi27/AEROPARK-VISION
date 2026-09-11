from sqlalchemy import Column, DateTime, String, Text, func

from app.config.database import Base


class ConfiguracionSistema(Base):
    __tablename__ = "configuracion_sistema"

    clave = Column(String, primary_key=True)
    valor_json = Column(Text, nullable=False)
    fecha_actualizacion = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

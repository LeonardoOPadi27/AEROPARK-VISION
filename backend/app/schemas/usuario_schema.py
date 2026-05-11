from pydantic import BaseModel, ConfigDict

class UsuarioCreate(BaseModel):
    nombres: str
    apellidos: str
    correo: str
    contrasena: str

class UsuarioLogin(BaseModel):
    correo: str
    contrasena: str


class UsuarioResponse(BaseModel):
    id_usuario: int
    nombres: str
    apellidos: str
    correo: str
    estado: bool

    model_config = ConfigDict(from_attributes=True)
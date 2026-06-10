from pydantic import BaseModel, ConfigDict, field_validator

class UsuarioCreate(BaseModel):
    nombres: str
    apellidos: str
    correo: str
    contrasena: str

    @field_validator("nombres", "apellidos", "correo", "contrasena")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Este campo es obligatorio")
        return normalized

    @field_validator("correo")
    @classmethod
    def validate_email_shape(cls, value: str) -> str:
        normalized = value.lower()
        if "@" not in normalized or "." not in normalized.split("@")[-1]:
            raise ValueError("Correo invalido")
        return normalized

    @field_validator("contrasena")
    @classmethod
    def validate_password_length(cls, value: str) -> str:
        if len(value) < 6:
            raise ValueError("La contrasena debe tener al menos 6 caracteres")
        return value

class UsuarioLogin(BaseModel):
    correo: str
    contrasena: str

    @field_validator("correo")
    @classmethod
    def normalize_login_email(cls, value: str) -> str:
        return value.strip().lower()


class UsuarioResponse(BaseModel):
    id_usuario: int
    nombres: str
    apellidos: str
    correo: str
    estado: bool

    model_config = ConfigDict(from_attributes=True)


class UsuarioSessionResponse(UsuarioResponse):
    id_rol: int | None = None

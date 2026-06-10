from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas.usuario_schema import (
    UsuarioCreate,
    UsuarioLogin,
    UsuarioResponse,
    UsuarioSessionResponse,
)
from app.services.auth_service import create_user, authenticate_user
from app.core.security import create_access_token, get_current_user
from app.config.database import get_db
from app.models.usuario import Usuario

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", response_model=UsuarioResponse)
def register(user: UsuarioCreate, db: Session = Depends(get_db)):
    return create_user(db, user)

@router.post("/login")
def login(user: UsuarioLogin, db: Session = Depends(get_db)):
    db_user = authenticate_user(db, user.correo, user.contrasena)

    if not db_user:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    token = create_access_token({
        "sub": db_user.correo
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id_usuario": db_user.id_usuario,
            "nombres": db_user.nombres,
            "apellidos": db_user.apellidos,
            "correo": db_user.correo,
            "estado": db_user.estado,
            "id_rol": db_user.id_rol,
        },
    }


@router.get("/me", response_model=UsuarioSessionResponse)
def me(current_user: Usuario = Depends(get_current_user)):
    return current_user

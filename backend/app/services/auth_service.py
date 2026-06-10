from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.models.usuario import Usuario
from app.core.security import verify_password, hash_password


def normalize_email(correo: str) -> str:
    return correo.strip().lower()


def create_user(db: Session, user):
    correo = normalize_email(user.correo)
    existing_user = db.query(Usuario).filter(Usuario.correo == correo).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="El correo ya esta registrado")

    new_user = Usuario(
        nombres=user.nombres.strip(),
        apellidos=user.apellidos.strip(),
        correo=correo,
        contrasena=hash_password(user.contrasena)
    )
    db.add(new_user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="El correo ya esta registrado",
        ) from exc
    db.refresh(new_user)
    return new_user


def authenticate_user(db: Session, correo: str, password: str):
    user = db.query(Usuario).filter(Usuario.correo == normalize_email(correo)).first()
    if not user:
        return None
    if user.estado is False:
        return None
    if not verify_password(password, user.contrasena):
        return None
    return user

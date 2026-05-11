from sqlalchemy.orm import Session
from app.models.usuario import Usuario
from app.core.security import verify_password, hash_password

def create_user(db: Session, user):
    new_user = Usuario(
        nombres=user.nombres,
        apellidos=user.apellidos,
        correo=user.correo,
        contrasena=hash_password(user.contrasena)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def authenticate_user(db: Session, correo: str, password: str):
    user = db.query(Usuario).filter(Usuario.correo == correo).first()
    if not user:
        return None
    if not verify_password(password, user.contrasena):
        return None
    return user
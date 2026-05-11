from fastapi import FastAPI
from app.routes import auth_routes

# 👇 IMPORTANTE
from app.config.database import engine, Base
from app.models import usuario  # importa modelos

app = FastAPI()

# 👇 CREA TABLAS
Base.metadata.create_all(bind=engine)

app.include_router(auth_routes.router)
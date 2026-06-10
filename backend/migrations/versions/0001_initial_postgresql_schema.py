"""initial postgresql schema

Revision ID: 0001_initial_postgresql_schema
Revises:
Create Date: 2026-05-22 00:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = "0001_initial_postgresql_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "rol",
        sa.Column("id_rol", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(), nullable=False),
        sa.Column("descripcion", sa.String(), nullable=True),
        sa.Column("estado", sa.Boolean(), nullable=True),
    )
    op.create_index(op.f("ix_rol_id_rol"), "rol", ["id_rol"])
    op.create_index(op.f("ix_rol_nombre"), "rol", ["nombre"], unique=True)

    op.create_table(
        "estacionamiento",
        sa.Column("id_estacionamiento", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(), nullable=False),
        sa.Column("ubicacion", sa.String(), nullable=True),
        sa.Column("descripcion", sa.String(), nullable=True),
        sa.Column("estado", sa.Boolean(), nullable=True),
    )
    op.create_index(
        op.f("ix_estacionamiento_id_estacionamiento"),
        "estacionamiento",
        ["id_estacionamiento"],
    )

    op.create_table(
        "usuario",
        sa.Column("id_usuario", sa.Integer(), primary_key=True),
        sa.Column("id_rol", sa.Integer(), nullable=True),
        sa.Column("nombres", sa.String(), nullable=True),
        sa.Column("apellidos", sa.String(), nullable=True),
        sa.Column("correo", sa.String(), nullable=True),
        sa.Column("contrasena", sa.String(), nullable=True),
        sa.Column("estado", sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(["id_rol"], ["rol.id_rol"]),
    )
    op.create_index(op.f("ix_usuario_correo"), "usuario", ["correo"], unique=True)
    op.create_index(op.f("ix_usuario_id_usuario"), "usuario", ["id_usuario"])

    op.create_table(
        "dron",
        sa.Column("id_dron", sa.Integer(), primary_key=True),
        sa.Column("id_usuario", sa.Integer(), nullable=True),
        sa.Column("nombre", sa.String(), nullable=False),
        sa.Column("modelo", sa.String(), nullable=True),
        sa.Column("numero_serie", sa.String(), nullable=True),
        sa.Column("estado", sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(["id_usuario"], ["usuario.id_usuario"]),
    )
    op.create_index(op.f("ix_dron_id_dron"), "dron", ["id_dron"])
    op.create_unique_constraint("uq_dron_numero_serie", "dron", ["numero_serie"])

    op.create_table(
        "espacio",
        sa.Column("id_espacio", sa.Integer(), primary_key=True),
        sa.Column("id_estacionamiento", sa.Integer(), nullable=False),
        sa.Column("codigo", sa.String(), nullable=False),
        sa.Column("fila", sa.String(), nullable=True),
        sa.Column("columna", sa.Integer(), nullable=True),
        sa.Column("estado_ocupado", sa.Boolean(), nullable=True),
        sa.Column("estado", sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(
            ["id_estacionamiento"],
            ["estacionamiento.id_estacionamiento"],
        ),
    )
    op.create_index(op.f("ix_espacio_id_espacio"), "espacio", ["id_espacio"])

    op.create_table(
        "imagen_capturada",
        sa.Column("id_imagen", sa.Integer(), primary_key=True),
        sa.Column("id_usuario", sa.Integer(), nullable=True),
        sa.Column("id_dron", sa.Integer(), nullable=True),
        sa.Column("id_estacionamiento", sa.Integer(), nullable=True),
        sa.Column("nombre_archivo", sa.String(), nullable=False),
        sa.Column("nombre_original", sa.String(), nullable=True),
        sa.Column("ruta_archivo", sa.String(), nullable=False),
        sa.Column("tipo_contenido", sa.String(), nullable=True),
        sa.Column("estado", sa.String(), nullable=True),
        sa.Column("fecha_captura", sa.DateTime(), nullable=True),
        sa.Column("fecha_subida", sa.DateTime(), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["id_dron"], ["dron.id_dron"]),
        sa.ForeignKeyConstraint(
            ["id_estacionamiento"],
            ["estacionamiento.id_estacionamiento"],
        ),
        sa.ForeignKeyConstraint(["id_usuario"], ["usuario.id_usuario"]),
    )
    op.create_index(
        op.f("ix_imagen_capturada_id_imagen"),
        "imagen_capturada",
        ["id_imagen"],
    )

    op.create_table(
        "analisis_imagen",
        sa.Column("id_analisis", sa.Integer(), primary_key=True),
        sa.Column("id_imagen", sa.Integer(), nullable=False),
        sa.Column("vehiculos_detectados", sa.Integer(), nullable=True),
        sa.Column("espacios_libres", sa.Integer(), nullable=True),
        sa.Column("espacios_ocupados", sa.Integer(), nullable=True),
        sa.Column("porcentaje_ocupacion", sa.Float(), nullable=True),
        sa.Column("precision_modelo", sa.Float(), nullable=True),
        sa.Column("estado", sa.String(), nullable=True),
        sa.Column("fecha_analisis", sa.DateTime(), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["id_imagen"],
            ["imagen_capturada.id_imagen"],
        ),
    )
    op.create_index(
        op.f("ix_analisis_imagen_id_analisis"),
        "analisis_imagen",
        ["id_analisis"],
    )

    op.create_table(
        "vehiculo_detectado",
        sa.Column("id_vehiculo", sa.Integer(), primary_key=True),
        sa.Column("id_analisis", sa.Integer(), nullable=False),
        sa.Column("clase", sa.String(), nullable=False),
        sa.Column("confianza", sa.Float(), nullable=False),
        sa.Column("color_detectado", sa.String(), nullable=True),
        sa.Column("x1", sa.Integer(), nullable=False),
        sa.Column("y1", sa.Integer(), nullable=False),
        sa.Column("x2", sa.Integer(), nullable=False),
        sa.Column("y2", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["id_analisis"],
            ["analisis_imagen.id_analisis"],
            ondelete="CASCADE",
        ),
    )
    op.create_index(
        op.f("ix_vehiculo_detectado_id_vehiculo"),
        "vehiculo_detectado",
        ["id_vehiculo"],
    )

    op.create_table(
        "ocupacion_espacio",
        sa.Column("id_ocupacion", sa.Integer(), primary_key=True),
        sa.Column("id_analisis", sa.Integer(), nullable=False),
        sa.Column("id_espacio", sa.Integer(), nullable=True),
        sa.Column("codigo_espacio", sa.String(), nullable=True),
        sa.Column("ocupado", sa.Boolean(), nullable=True),
        sa.Column("fuente", sa.String(), nullable=True),
        sa.Column("fecha_registro", sa.DateTime(), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["id_analisis"],
            ["analisis_imagen.id_analisis"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["id_espacio"], ["espacio.id_espacio"]),
    )
    op.create_index(
        op.f("ix_ocupacion_espacio_id_ocupacion"),
        "ocupacion_espacio",
        ["id_ocupacion"],
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_ocupacion_espacio_id_ocupacion"), table_name="ocupacion_espacio")
    op.drop_table("ocupacion_espacio")
    op.drop_index(op.f("ix_vehiculo_detectado_id_vehiculo"), table_name="vehiculo_detectado")
    op.drop_table("vehiculo_detectado")
    op.drop_index(op.f("ix_analisis_imagen_id_analisis"), table_name="analisis_imagen")
    op.drop_table("analisis_imagen")
    op.drop_index(op.f("ix_imagen_capturada_id_imagen"), table_name="imagen_capturada")
    op.drop_table("imagen_capturada")
    op.drop_index(op.f("ix_espacio_id_espacio"), table_name="espacio")
    op.drop_table("espacio")
    op.drop_constraint("uq_dron_numero_serie", "dron", type_="unique")
    op.drop_index(op.f("ix_dron_id_dron"), table_name="dron")
    op.drop_table("dron")
    op.drop_index(op.f("ix_usuario_id_usuario"), table_name="usuario")
    op.drop_index(op.f("ix_usuario_correo"), table_name="usuario")
    op.drop_table("usuario")
    op.drop_index(op.f("ix_estacionamiento_id_estacionamiento"), table_name="estacionamiento")
    op.drop_table("estacionamiento")
    op.drop_index(op.f("ix_rol_nombre"), table_name="rol")
    op.drop_index(op.f("ix_rol_id_rol"), table_name="rol")
    op.drop_table("rol")

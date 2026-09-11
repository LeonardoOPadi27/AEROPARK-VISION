"""persist operational state in PostgreSQL

Revision ID: 0002_persist_operational_state
Revises: 0001_initial_postgresql_schema
Create Date: 2026-09-08 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_persist_operational_state"
down_revision = "0001_initial_postgresql_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("imagen_capturada", sa.Column("codigo_zona", sa.String(), nullable=True))
    op.add_column("imagen_capturada", sa.Column("titulo_zona", sa.String(), nullable=True))

    op.create_table(
        "configuracion_sistema",
        sa.Column("clave", sa.String(), primary_key=True),
        sa.Column("valor_json", sa.Text(), nullable=False),
        sa.Column("fecha_actualizacion", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "reporte_espacio_movil",
        sa.Column("codigo_espacio", sa.String(), primary_key=True),
        sa.Column("id_usuario", sa.Integer(), nullable=False),
        sa.Column("nombre_usuario", sa.String(), nullable=False),
        sa.Column("codigo_zona", sa.String(), nullable=False),
        sa.Column("titulo_zona", sa.String(), nullable=False),
        sa.Column("horas_estimadas", sa.Integer(), nullable=False),
        sa.Column("fecha_inicio", sa.DateTime(), nullable=False),
        sa.Column("fecha_expiracion", sa.DateTime(), nullable=False),
        sa.Column("fecha_confirmacion_requerida", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["id_usuario"], ["usuario.id_usuario"]),
    )
    op.create_index(op.f("ix_reporte_espacio_movil_id_usuario"), "reporte_espacio_movil", ["id_usuario"])
    op.create_table(
        "evento_espacio_movil",
        sa.Column("id_evento", sa.Integer(), primary_key=True),
        sa.Column("tipo_evento", sa.String(), nullable=False),
        sa.Column("codigo_espacio", sa.String(), nullable=False),
        sa.Column("codigo_zona", sa.String(), nullable=False),
        sa.Column("titulo_zona", sa.String(), nullable=False),
        sa.Column("id_usuario", sa.Integer(), nullable=True),
        sa.Column("nombre_usuario", sa.String(), nullable=True),
        sa.Column("horas_estimadas", sa.Integer(), nullable=True),
        sa.Column("fecha_inicio", sa.DateTime(), nullable=True),
        sa.Column("fecha_expiracion", sa.DateTime(), nullable=True),
        sa.Column("fecha_confirmacion_requerida", sa.DateTime(), nullable=True),
        sa.Column("fecha_evento", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["id_usuario"], ["usuario.id_usuario"]),
    )
    op.create_index(op.f("ix_evento_espacio_movil_codigo_espacio"), "evento_espacio_movil", ["codigo_espacio"])
    op.create_index(op.f("ix_evento_espacio_movil_id_evento"), "evento_espacio_movil", ["id_evento"])



def downgrade() -> None:
    op.drop_index(op.f("ix_evento_espacio_movil_id_evento"), table_name="evento_espacio_movil")
    op.drop_index(op.f("ix_evento_espacio_movil_codigo_espacio"), table_name="evento_espacio_movil")
    op.drop_table("evento_espacio_movil")
    op.drop_index(op.f("ix_reporte_espacio_movil_id_usuario"), table_name="reporte_espacio_movil")
    op.drop_table("reporte_espacio_movil")
    op.drop_table("configuracion_sistema")
    op.drop_column("imagen_capturada", "titulo_zona")
    op.drop_column("imagen_capturada", "codigo_zona")

"""RLS tenant isolation policies

Revision ID: e3f5a7b9c0d2
Revises: d2e4f6a8b0c1
Create Date: 2026-02-27 00:02:00.000000

Row Level Security — implementado mas NÃO habilitado por padrão.
Para habilitar em produção, execute manualmente:
    ALTER TABLE devices         ENABLE ROW LEVEL SECURITY;
    ALTER TABLE routines        ENABLE ROW LEVEL SECURITY;
    ALTER TABLE activity_logs   ENABLE ROW LEVEL SECURITY;
    ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE routine_actions ENABLE ROW LEVEL SECURITY;

O backend deve chamar SET LOCAL app.current_org_id = '{org_id}'
em cada transação para que as políticas sejam aplicadas.

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'e3f5a7b9c0d2'
down_revision: Union[str, Sequence[str], None] = 'd2e4f6a8b0c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TENANT_TABLES = ['devices', 'routines', 'activity_logs', 'device_sessions', 'routine_actions']


def upgrade() -> None:
    for table in TENANT_TABLES:
        # Criar política de isolamento (sem habilitar RLS ainda)
        # A política usa current_setting() — retorna '' se não definido (seguro)
        op.execute(
            f"""
            CREATE POLICY zionhub_tenant_isolation ON {table}
              USING (
                organization_id = current_setting('app.current_org_id', true)::uuid
              )
            """
        )

    # NOTA: ALTER TABLE ... ENABLE ROW LEVEL SECURITY não é executado aqui.
    # Para habilitar:
    #   ALTER TABLE devices         ENABLE ROW LEVEL SECURITY;
    #   ALTER TABLE routines        ENABLE ROW LEVEL SECURITY;
    #   ALTER TABLE activity_logs   ENABLE ROW LEVEL SECURITY;
    #   ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;
    #   ALTER TABLE routine_actions ENABLE ROW LEVEL SECURITY;


def downgrade() -> None:
    for table in reversed(TENANT_TABLES):
        op.execute(f"DROP POLICY IF EXISTS zionhub_tenant_isolation ON {table}")

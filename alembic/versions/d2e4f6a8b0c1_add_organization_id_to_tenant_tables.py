"""add organization_id to tenant tables

Revision ID: d2e4f6a8b0c1
Revises: c1d3e5f7a9b0
Create Date: 2026-02-27 00:01:00.000000

Zero-downtime strategy:
  1. Add nullable columns
  2. Populate with default org (slug='default')
  3. Set NOT NULL + create indexes

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'd2e4f6a8b0c1'
down_revision: Union[str, Sequence[str], None] = 'c1d3e5f7a9b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = ['users', 'devices', 'routines', 'activity_logs', 'device_sessions']


def upgrade() -> None:
    # Step 1: Add nullable organization_id columns
    for table in TABLES:
        op.add_column(
            table,
            sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True),
        )
        op.create_foreign_key(
            f'fk_{table}_organization_id',
            table,
            'organizations',
            ['organization_id'],
            ['id'],
            ondelete='CASCADE',
        )

    # Step 2: Populate with default org
    op.execute(
        """
        UPDATE users       SET organization_id = (SELECT id FROM organizations WHERE slug = 'default');
        UPDATE devices     SET organization_id = (SELECT id FROM organizations WHERE slug = 'default');
        UPDATE routines    SET organization_id = (SELECT id FROM organizations WHERE slug = 'default');
        UPDATE activity_logs   SET organization_id = (SELECT id FROM organizations WHERE slug = 'default');
        UPDATE device_sessions SET organization_id = (SELECT id FROM organizations WHERE slug = 'default');
        """
    )

    # Step 3: Set NOT NULL + add indexes
    for table in TABLES:
        op.alter_column(table, 'organization_id', nullable=False)
        op.create_index(
            op.f(f'ix_{table}_organization_id'),
            table,
            ['organization_id'],
            unique=False,
        )


def downgrade() -> None:
    for table in reversed(TABLES):
        op.drop_index(op.f(f'ix_{table}_organization_id'), table_name=table)
        op.drop_constraint(f'fk_{table}_organization_id', table, type_='foreignkey')
        op.drop_column(table, 'organization_id')

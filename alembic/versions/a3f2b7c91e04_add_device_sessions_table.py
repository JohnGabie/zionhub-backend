"""add device_sessions table

Revision ID: a3f2b7c91e04
Revises: 1809cbc82dfa
Create Date: 2026-02-06 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a3f2b7c91e04'
down_revision: Union[str, Sequence[str], None] = '1809cbc82dfa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('device_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('device_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('device_name', sa.String(length=255), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('trigger_source', sa.Enum('MANUAL', 'ROUTINE', 'SCHEDULED', 'MASTER_SWITCH', name='triggersource'), nullable=False),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_device_sessions_id'), 'device_sessions', ['id'], unique=True)
    op.create_index(op.f('ix_device_sessions_device_id'), 'device_sessions', ['device_id'], unique=False)
    op.create_index(op.f('ix_device_sessions_user_id'), 'device_sessions', ['user_id'], unique=False)
    op.create_index(op.f('ix_device_sessions_started_at'), 'device_sessions', ['started_at'], unique=False)
    op.create_index(op.f('ix_device_sessions_ended_at'), 'device_sessions', ['ended_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_device_sessions_ended_at'), table_name='device_sessions')
    op.drop_index(op.f('ix_device_sessions_started_at'), table_name='device_sessions')
    op.drop_index(op.f('ix_device_sessions_user_id'), table_name='device_sessions')
    op.drop_index(op.f('ix_device_sessions_device_id'), table_name='device_sessions')
    op.drop_index(op.f('ix_device_sessions_id'), table_name='device_sessions')
    op.drop_table('device_sessions')
    op.execute("DROP TYPE IF EXISTS triggersource")

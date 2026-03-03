"""create organizations and invite_tokens tables

Revision ID: c1d3e5f7a9b0
Revises: a3f2b7c91e04
Create Date: 2026-02-27 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'c1d3e5f7a9b0'
down_revision: Union[str, Sequence[str], None] = 'a3f2b7c91e04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- organizations ---
    op.create_table(
        'organizations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('custom_domain', sa.String(length=255), nullable=True),
        sa.Column(
            'plan',
            sa.Enum('free', 'starter', 'pro', 'custom', name='plantype'),
            nullable=False,
            server_default='free',
        ),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug', name='uq_organizations_slug'),
        sa.UniqueConstraint('custom_domain', name='uq_organizations_custom_domain'),
    )
    op.create_index(op.f('ix_organizations_id'), 'organizations', ['id'], unique=True)
    op.create_index(op.f('ix_organizations_slug'), 'organizations', ['slug'], unique=True)
    op.create_index(
        op.f('ix_organizations_custom_domain'), 'organizations', ['custom_domain'], unique=False
    )
    op.create_index(op.f('ix_organizations_owner_id'), 'organizations', ['owner_id'], unique=False)

    # Insert default org so existing data has a valid organization_id to reference
    op.execute(
        """
        INSERT INTO organizations (id, created_at, updated_at, name, slug, plan, is_active)
        VALUES (
            gen_random_uuid(),
            NOW() AT TIME ZONE 'America/Sao_Paulo',
            NOW() AT TIME ZONE 'America/Sao_Paulo',
            'Default',
            'default',
            'pro',
            true
        )
        """
    )

    # --- invite_tokens ---
    op.create_table(
        'invite_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('token', sa.String(length=255), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token', name='uq_invite_tokens_token'),
    )
    op.create_index(op.f('ix_invite_tokens_id'), 'invite_tokens', ['id'], unique=True)
    op.create_index(op.f('ix_invite_tokens_token'), 'invite_tokens', ['token'], unique=True)
    op.create_index(op.f('ix_invite_tokens_email'), 'invite_tokens', ['email'], unique=False)
    op.create_index(
        op.f('ix_invite_tokens_organization_id'), 'invite_tokens', ['organization_id'], unique=False
    )
    op.create_index(
        op.f('ix_invite_tokens_created_by'), 'invite_tokens', ['created_by'], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_invite_tokens_created_by'), table_name='invite_tokens')
    op.drop_index(op.f('ix_invite_tokens_organization_id'), table_name='invite_tokens')
    op.drop_index(op.f('ix_invite_tokens_email'), table_name='invite_tokens')
    op.drop_index(op.f('ix_invite_tokens_token'), table_name='invite_tokens')
    op.drop_index(op.f('ix_invite_tokens_id'), table_name='invite_tokens')
    op.drop_table('invite_tokens')

    op.drop_index(op.f('ix_organizations_owner_id'), table_name='organizations')
    op.drop_index(op.f('ix_organizations_custom_domain'), table_name='organizations')
    op.drop_index(op.f('ix_organizations_slug'), table_name='organizations')
    op.drop_index(op.f('ix_organizations_id'), table_name='organizations')
    op.drop_table('organizations')
    op.execute("DROP TYPE IF EXISTS plantype")

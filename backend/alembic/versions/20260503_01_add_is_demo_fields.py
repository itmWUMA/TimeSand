"""is_demo fields are included in the baseline schema

Revision ID: 20260503_01
Revises: 001_initial_schema
Create Date: 2026-05-03 00:00:00
"""

from __future__ import annotations

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "20260503_01"
down_revision: str | None = "001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

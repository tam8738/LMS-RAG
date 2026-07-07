"""Cung cấp context manager mở/đóng kết nối PostgreSQL."""

from collections.abc import Iterator
from contextlib import contextmanager

import psycopg
from psycopg import Connection

from app.core.config import settings


@contextmanager
def get_connection() -> Iterator[Connection]:
    """Mở một connection mới và luôn đóng connection khi rời context.

    Hàm không tự bật autocommit. Repository quyết định ranh giới transaction
    để có thể rollback toàn bộ thao tác replace chunks khi một insert bị lỗi.
    """
    connection = psycopg.connect(
        settings.database_url,
        connect_timeout=settings.db_connect_timeout,
    )
    try:
        yield connection
    finally:
        connection.close()
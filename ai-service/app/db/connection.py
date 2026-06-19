from collections.abc import Iterator
from contextlib import contextmanager

import psycopg
from psycopg import Connection

from app.core.config import settings


@contextmanager
def get_connection() -> Iterator[Connection]:
    connection = psycopg.connect(
        settings.database_url,
        connect_timeout=settings.db_connect_timeout,
    )
    try:
        yield connection
    finally:
        connection.close()

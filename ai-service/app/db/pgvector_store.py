from dataclasses import dataclass

from app.db.connection import get_connection


@dataclass(frozen=True)
class PgVectorCheckResult:
    database: str
    pgvector_extension: str
    sample_id: int
    nearest_label: str
    distance: float


def to_vector_literal(values: list[float]) -> str:
    return "[" + ",".join(str(float(value)) for value in values) + "]"


def ensure_pgvector_ready() -> PgVectorCheckResult:
    sample_vector = [0.1, 0.2, 0.3]
    query_vector = [0.1, 0.2, 0.31]

    with get_connection() as connection:
        connection.autocommit = True
        with connection.cursor() as cursor:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS vector")
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS ai_vector_test (
                    id BIGSERIAL PRIMARY KEY,
                    label TEXT NOT NULL,
                    embedding VECTOR(3) NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cursor.execute("DELETE FROM ai_vector_test WHERE label = %s", ("sample",))
            cursor.execute(
                """
                INSERT INTO ai_vector_test (label, embedding)
                VALUES (%s, %s::vector)
                RETURNING id
                """,
                ("sample", to_vector_literal(sample_vector)),
            )
            sample_id = cursor.fetchone()[0]

            cursor.execute(
                """
                SELECT label, embedding <-> %s::vector AS distance
                FROM ai_vector_test
                ORDER BY embedding <-> %s::vector
                LIMIT 1
                """,
                (to_vector_literal(query_vector), to_vector_literal(query_vector)),
            )
            nearest_label, distance = cursor.fetchone()

            cursor.execute(
                "SELECT extversion FROM pg_extension WHERE extname = 'vector'"
            )
            extension_row = cursor.fetchone()
            extension_version = extension_row[0] if extension_row else "unknown"

            cursor.execute("SELECT current_database()")
            database = cursor.fetchone()[0]

    return PgVectorCheckResult(
        database=database,
        pgvector_extension=extension_version,
        sample_id=sample_id,
        nearest_label=nearest_label,
        distance=float(distance),
    )

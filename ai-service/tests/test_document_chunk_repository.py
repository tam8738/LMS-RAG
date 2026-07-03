import unittest
from copy import deepcopy

import psycopg

from app.core.errors import ErrorCode, ServiceError
from app.repositories.document_chunk_repository import DocumentChunkRepository
from app.repositories.postgres_document_chunk_repository import (
    PostgresDocumentChunkRepository,
)
from app.schemas.document import (
    DocumentFileType,
    EmbeddedDocument,
    EmbeddedDocumentChunk,
)


class FakeCursor:
    def __init__(self, connection: "FakeConnection") -> None:
        self.connection = connection

    def __enter__(self) -> "FakeCursor":
        self.connection.events.append("cursor_open")
        return self

    def __exit__(self, exc_type, exc_value, traceback) -> bool:
        self.connection.events.append("cursor_close")
        return False

    def execute(self, query: str, parameters: tuple) -> None:
        self.connection.events.append(("execute", query, parameters))
        if self.connection.fail_delete:
            raise psycopg.DatabaseError("delete failed")
        self.connection.rows.clear()

    def executemany(self, query: str, rows: list[tuple]) -> None:
        materialized_rows = list(rows)
        self.connection.events.append(
            ("executemany", query, materialized_rows)
        )
        for position, row in enumerate(materialized_rows, start=1):
            self.connection.rows.append(row)
            if self.connection.fail_insert_after == position:
                raise psycopg.DatabaseError("insert failed")


class FakeTransaction:
    def __init__(self, connection: "FakeConnection") -> None:
        self.connection = connection
        self.snapshot: list[tuple] = []

    def __enter__(self) -> "FakeTransaction":
        self.snapshot = deepcopy(self.connection.rows)
        self.connection.events.append("begin")
        return self

    def __exit__(self, exc_type, exc_value, traceback) -> bool:
        if exc_type is None:
            self.connection.events.append("commit")
        else:
            self.connection.rows[:] = self.snapshot
            self.connection.events.append("rollback")
        return False


class FakeConnection:
    def __init__(
        self,
        initial_rows: list[tuple] | None = None,
        *,
        fail_delete: bool = False,
        fail_insert_after: int | None = None,
    ) -> None:
        self.rows = list(initial_rows or [])
        self.fail_delete = fail_delete
        self.fail_insert_after = fail_insert_after
        self.events: list[object] = []

    def transaction(self) -> FakeTransaction:
        return FakeTransaction(self)

    def cursor(self) -> FakeCursor:
        return FakeCursor(self)


class FakeConnectionContext:
    def __init__(self, factory: "FakeConnectionFactory") -> None:
        self.factory = factory

    def __enter__(self) -> FakeConnection:
        self.factory.calls += 1
        self.factory.connection.events.append("connection_open")
        return self.factory.connection

    def __exit__(self, exc_type, exc_value, traceback) -> bool:
        self.factory.connection.events.append("connection_close")
        return False


class FakeConnectionFactory:
    def __init__(self, connection: FakeConnection) -> None:
        self.connection = connection
        self.calls = 0

    def __call__(self) -> FakeConnectionContext:
        return FakeConnectionContext(self)


def embedded_document(
    *,
    dimensions: int = 3,
    indexes: tuple[int, ...] = (0, 1),
    vector_size: int | None = None,
    non_finite: bool = False,
) -> EmbeddedDocument:
    selected_vector_size = vector_size if vector_size is not None else dimensions
    chunks = []
    for position, chunk_index in enumerate(indexes):
        vector = [float(position + 1)] * selected_vector_size
        if non_finite and position == 0 and vector:
            vector[0] = float("nan")
        chunks.append(
            EmbeddedDocumentChunk(
                page_number=position + 1,
                chunk_index=chunk_index,
                content=f"Nội dung chunk {chunk_index}",
                token_count=10 + position,
                embedding=vector,
            )
        )

    return EmbeddedDocument(
        file_type=DocumentFileType.PDF,
        page_count=2,
        embedding_model="mock-embedding",
        embedding_dimensions=dimensions,
        chunks=chunks,
    )


class DocumentChunkRepositoryInterfaceTest(unittest.TestCase):
    def test_interface_cannot_be_instantiated(self) -> None:
        with self.assertRaises(TypeError):
            DocumentChunkRepository()


class PostgresDocumentChunkRepositoryTest(unittest.TestCase):
    def test_batch_replaces_chunks_and_commits(self) -> None:
        old_rows = [("old chunk",)]
        connection = FakeConnection(initial_rows=old_rows)
        factory = FakeConnectionFactory(connection)
        repository = PostgresDocumentChunkRepository(
            connection_factory=factory,
            expected_dimensions=3,
        )

        inserted_count = repository.replace_document_chunks(
            document_id=12,
            lecture_id=5,
            document=embedded_document(),
        )

        self.assertEqual(inserted_count, 2)
        self.assertEqual(factory.calls, 1)
        self.assertEqual(connection.events[0:2], ["connection_open", "begin"])
        self.assertIn("commit", connection.events)
        self.assertNotIn("rollback", connection.events)
        self.assertEqual(connection.events[-1], "connection_close")
        self.assertEqual(len(connection.rows), 2)
        self.assertNotIn(("old chunk",), connection.rows)

        execute_events = [
            event
            for event in connection.events
            if isinstance(event, tuple) and event[0] == "execute"
        ]
        insert_events = [
            event
            for event in connection.events
            if isinstance(event, tuple) and event[0] == "executemany"
        ]
        self.assertEqual(len(execute_events), 1)
        self.assertEqual(len(insert_events), 1)
        self.assertIn("DELETE FROM document_chunks", execute_events[0][1])
        self.assertEqual(execute_events[0][2], (12,))
        self.assertIn("INSERT INTO document_chunks", insert_events[0][1])
        self.assertIn("%s::vector", insert_events[0][1])

        inserted_rows = insert_events[0][2]
        self.assertEqual(inserted_rows[0][0:6], (12, 5, 1, 0, "Nội dung chunk 0", 10))
        self.assertEqual(inserted_rows[0][6], "[1.0,1.0,1.0]")
        self.assertEqual(inserted_rows[1][0:6], (12, 5, 2, 1, "Nội dung chunk 1", 11))
        self.assertEqual(inserted_rows[1][6], "[2.0,2.0,2.0]")

    def test_partial_insert_failure_rolls_back_and_preserves_old_chunks(self) -> None:
        old_rows = [("old chunk 1",), ("old chunk 2",)]
        connection = FakeConnection(
            initial_rows=old_rows,
            fail_insert_after=1,
        )
        repository = PostgresDocumentChunkRepository(
            connection_factory=FakeConnectionFactory(connection),
            expected_dimensions=3,
        )

        with self.assertRaises(ServiceError) as context:
            repository.replace_document_chunks(12, 5, embedded_document())

        self.assertEqual(context.exception.code, ErrorCode.DATABASE_ERROR)
        self.assertEqual(context.exception.status_code, 503)
        self.assertIn("rollback", connection.events)
        self.assertNotIn("commit", connection.events)
        self.assertEqual(connection.rows, old_rows)

    def test_delete_failure_rolls_back_and_preserves_old_chunks(self) -> None:
        old_rows = [("old chunk",)]
        connection = FakeConnection(
            initial_rows=old_rows,
            fail_delete=True,
        )
        repository = PostgresDocumentChunkRepository(
            connection_factory=FakeConnectionFactory(connection),
            expected_dimensions=3,
        )

        with self.assertRaises(ServiceError) as context:
            repository.replace_document_chunks(12, 5, embedded_document())

        self.assertEqual(context.exception.code, ErrorCode.DATABASE_ERROR)
        self.assertIn("rollback", connection.events)
        self.assertEqual(connection.rows, old_rows)
        self.assertFalse(
            any(
                isinstance(event, tuple) and event[0] == "executemany"
                for event in connection.events
            )
        )

    def test_rejects_invalid_ids_before_opening_connection(self) -> None:
        invalid_cases = ((0, 5, "document_id"), (12, 0, "lecture_id"))

        for document_id, lecture_id, expected_field in invalid_cases:
            with self.subTest(document_id=document_id, lecture_id=lecture_id):
                factory = FakeConnectionFactory(FakeConnection())
                repository = PostgresDocumentChunkRepository(
                    connection_factory=factory,
                    expected_dimensions=3,
                )

                with self.assertRaises(ServiceError) as context:
                    repository.replace_document_chunks(
                        document_id,
                        lecture_id,
                        embedded_document(),
                    )

                self.assertEqual(context.exception.code, ErrorCode.INVALID_INPUT)
                self.assertEqual(context.exception.details[0].field, expected_field)
                self.assertEqual(factory.calls, 0)

    def test_rejects_document_dimension_mismatch_before_connection(self) -> None:
        factory = FakeConnectionFactory(FakeConnection())
        repository = PostgresDocumentChunkRepository(
            connection_factory=factory,
            expected_dimensions=3,
        )

        with self.assertRaises(ServiceError) as context:
            repository.replace_document_chunks(
                12,
                5,
                embedded_document(dimensions=4),
            )

        self.assertEqual(context.exception.code, ErrorCode.INVALID_INPUT)
        self.assertEqual(
            context.exception.details[0].field,
            "embedding_dimensions",
        )
        self.assertEqual(factory.calls, 0)

    def test_rejects_vector_dimension_mismatch_before_connection(self) -> None:
        factory = FakeConnectionFactory(FakeConnection())
        repository = PostgresDocumentChunkRepository(
            connection_factory=factory,
            expected_dimensions=3,
        )

        with self.assertRaises(ServiceError) as context:
            repository.replace_document_chunks(
                12,
                5,
                embedded_document(dimensions=3, vector_size=2),
            )

        self.assertEqual(context.exception.code, ErrorCode.INVALID_INPUT)
        self.assertEqual(
            context.exception.details[0].field,
            "embedding_dimensions",
        )
        self.assertEqual(factory.calls, 0)

    def test_rejects_non_contiguous_chunk_indexes_before_connection(self) -> None:
        factory = FakeConnectionFactory(FakeConnection())
        repository = PostgresDocumentChunkRepository(
            connection_factory=factory,
            expected_dimensions=3,
        )

        with self.assertRaises(ServiceError) as context:
            repository.replace_document_chunks(
                12,
                5,
                embedded_document(indexes=(0, 2)),
            )

        self.assertEqual(context.exception.code, ErrorCode.INVALID_INPUT)
        self.assertEqual(context.exception.details[0].field, "chunk_index")
        self.assertEqual(factory.calls, 0)

    def test_rejects_non_finite_vector_before_connection(self) -> None:
        factory = FakeConnectionFactory(FakeConnection())
        repository = PostgresDocumentChunkRepository(
            connection_factory=factory,
            expected_dimensions=3,
        )

        with self.assertRaises(ServiceError) as context:
            repository.replace_document_chunks(
                12,
                5,
                embedded_document(non_finite=True),
            )

        self.assertEqual(context.exception.code, ErrorCode.INVALID_INPUT)
        self.assertEqual(context.exception.details[0].field, "embedding")
        self.assertEqual(factory.calls, 0)

    def test_rejects_invalid_expected_dimensions(self) -> None:
        with self.assertRaises(ValueError):
            PostgresDocumentChunkRepository(expected_dimensions=0)


if __name__ == "__main__":
    unittest.main()
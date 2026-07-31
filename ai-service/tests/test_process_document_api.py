"""Kiểm thử orchestration service, internal auth và API contract /v1."""

import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, call, patch

import psycopg
from fastapi.testclient import TestClient

from app.api.dependencies import get_process_document_service
from app.api.internal_auth import get_expected_internal_api_key
from app.core.errors import ErrorCode, ErrorDetail, ServiceError
from app.main import create_app
from app.schemas.document import (
    ChunkedDocument,
    DocumentChunk,
    DocumentFileType,
    EmbeddedDocument,
    EmbeddedDocumentChunk,
    ValidatedDocument,
)
from app.schemas.process_document import (
    ProcessDocumentRequest,
    ProcessDocumentResult,
)
from app.services.process_document_service import ProcessDocumentService


def process_request(reprocess: bool = False) -> ProcessDocumentRequest:
    return ProcessDocumentRequest(
        document_id=12,
        storage_key="documents/12/v1/source.pdf",
        file_type=DocumentFileType.PDF,
        reprocess=reprocess,
        metadata={
            "subject": "Cơ sở dữ liệu",
            "topic": "Chuẩn hóa dữ liệu",
            "chapter": "Chương 3",
            "tags": ["database", "normalization", "database"],
        },
    )


def validated_document() -> ValidatedDocument:
    return ValidatedDocument(
        storage_key="documents/12/v1/source.pdf",
        path=Path("/storage/uploads/documents/12/v1/source.pdf"),
        file_type=DocumentFileType.PDF,
        media_type="application/pdf",
        size_bytes=100,
    )


def chunked_document() -> ChunkedDocument:
    return ChunkedDocument(
        file_type=DocumentFileType.PDF,
        page_count=2,
        chunks=[
            DocumentChunk(
                page_number=1,
                chunk_index=0,
                content="Chunk một",
                token_count=3,
            ),
            DocumentChunk(
                page_number=2,
                chunk_index=1,
                content="Chunk hai",
                token_count=3,
            ),
        ],
    )


def embedded_document() -> EmbeddedDocument:
    return EmbeddedDocument(
        file_type=DocumentFileType.PDF,
        page_count=2,
        embedding_model="mock-embedding",
        embedding_dimensions=3,
        chunks=[
            EmbeddedDocumentChunk(
                page_number=1,
                chunk_index=0,
                content="Chunk một",
                token_count=3,
                embedding=[1.0, 0.0, 0.0],
            ),
            EmbeddedDocumentChunk(
                page_number=2,
                chunk_index=1,
                content="Chunk hai",
                token_count=3,
                embedding=[0.0, 1.0, 0.0],
            ),
        ],
    )


class ProcessDocumentServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.resolver = MagicMock()
        self.validator = MagicMock()
        self.pipeline = MagicMock()
        self.embedding_service = MagicMock()
        self.repository = MagicMock()
        self.service = ProcessDocumentService(
            storage_resolver=self.resolver,
            document_validator=self.validator,
            chunking_pipeline=self.pipeline,
            embedding_service=self.embedding_service,
            chunk_repository=self.repository,
        )

    def test_runs_complete_pipeline_in_order(self) -> None:
        request = process_request(reprocess=True)
        path = Path("/storage/uploads/documents/12/v1/source.pdf")
        validated = validated_document()
        chunked = chunked_document()
        embedded = embedded_document()
        self.resolver.resolve.return_value = path
        self.validator.validate.return_value = validated
        self.pipeline.run.return_value = chunked
        self.embedding_service.embed.return_value = embedded
        self.repository.replace_document_chunks.return_value = 2

        calls = MagicMock()
        calls.attach_mock(self.resolver.resolve, "resolve")
        calls.attach_mock(self.validator.validate, "validate")
        calls.attach_mock(self.pipeline.run, "chunk")
        calls.attach_mock(self.embedding_service.embed, "embed")
        calls.attach_mock(
            self.repository.replace_document_chunks,
            "replace",
        )

        result = self.service.process(request)

        self.assertEqual(
            calls.mock_calls,
            [
                call.resolve("documents/12/v1/source.pdf"),
                call.validate(
                    path,
                    "documents/12/v1/source.pdf",
                    DocumentFileType.PDF,
                ),
                call.chunk(validated),
                call.embed(chunked),
                call.replace(12, embedded),
            ],
        )
        self.assertEqual(result.document_id, 12)
        self.assertEqual(result.status, "PROCESSED")
        self.assertEqual(result.page_count, 2)
        self.assertEqual(result.chunk_count, 2)
        self.assertEqual(request.metadata.subject, "Cơ sở dữ liệu")
        self.assertEqual(request.metadata.tags, ["database", "normalization"])

    def test_rejects_repository_count_mismatch(self) -> None:
        self.resolver.resolve.return_value = Path("source.pdf")
        self.validator.validate.return_value = validated_document()
        self.pipeline.run.return_value = chunked_document()
        self.embedding_service.embed.return_value = embedded_document()
        self.repository.replace_document_chunks.return_value = 1

        with self.assertRaises(ServiceError) as context:
            self.service.process(process_request())

        self.assertEqual(context.exception.code, ErrorCode.DATABASE_ERROR)

    def test_stops_pipeline_when_resolve_fails(self) -> None:
        self.resolver.resolve.side_effect = ServiceError(
            ErrorCode.INVALID_INPUT,
            "Storage key không hợp lệ",
            status_code=422,
        )

        with self.assertRaises(ServiceError):
            self.service.process(process_request())

        self.validator.validate.assert_not_called()
        self.pipeline.run.assert_not_called()
        self.embedding_service.embed.assert_not_called()
        self.repository.replace_document_chunks.assert_not_called()


class ProcessDocumentApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self.app = create_app()
        self.service = MagicMock()
        self.app.dependency_overrides[get_expected_internal_api_key] = (
            lambda: "test-secret"
        )
        self.app.dependency_overrides[get_process_document_service] = (
            lambda: self.service
        )
        self.client = TestClient(
            self.app,
            raise_server_exceptions=False,
        )

    def tearDown(self) -> None:
        self.client.close()
        self.app.dependency_overrides.clear()

    def test_public_health_uses_v1_success_envelope(self) -> None:
        response = self.client.get("/v1/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "success": True,
                "data": {
                    "status": "UP",
                    "service": "ai-service",
                    "environment": "local",
                },
            },
        )

    def test_legacy_health_path_is_not_exposed(self) -> None:
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 404)

    def test_protected_endpoints_reject_missing_or_wrong_key(self) -> None:
        requests = (
            ("GET", "/v1/health/pgvector", None),
            ("GET", "/v1/health/pgvector", "wrong"),
            ("POST", "/v1/process-document", None),
            ("POST", "/v1/process-document", "wrong"),
            ("POST", "/v1/index-document", None),
            ("POST", "/v1/index-document", "wrong"),
        )
        payload = {
            "document_id": 12,
            "storage_key": "documents/12/v1/source.pdf",
            "file_type": "PDF",
            "reprocess": False,
        }

        for method, path, key in requests:
            with self.subTest(method=method, path=path, key=key):
                headers = {"X-Internal-Key": key} if key else {}
                response = self.client.request(
                    method,
                    path,
                    headers=headers,
                    json=payload if method == "POST" else None,
                )

                self.assertEqual(response.status_code, 401)
                self.assertEqual(response.json()["success"], False)
                self.assertEqual(
                    response.json()["error"]["code"],
                    "UNAUTHORIZED_INTERNAL_CALL",
                )

        self.service.process.assert_not_called()

    def test_internal_auth_fails_closed_when_server_key_is_empty(self) -> None:
        self.app.dependency_overrides[get_expected_internal_api_key] = lambda: ""

        response = self.client.post(
            "/v1/process-document",
            headers={"X-Internal-Key": "anything"},
            json={
                "document_id": 12,
                "storage_key": "documents/12/v1/source.pdf",
                "file_type": "PDF",
            },
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.json()["error"]["code"],
            "UNAUTHORIZED_INTERNAL_CALL",
        )

    @patch("app.api.routes.health.ensure_pgvector_ready")
    def test_pgvector_health_requires_key_and_returns_envelope(
        self,
        check_mock,
    ) -> None:
        check_mock.return_value = SimpleNamespace(
            database="lms_rag",
            pgvector_extension="0.8.2",
        )

        response = self.client.get(
            "/v1/health/pgvector",
            headers={"X-Internal-Key": "test-secret"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "success": True,
                "data": {
                    "status": "UP",
                    "database": "lms_rag",
                    "pgvector_extension": "0.8.2",
                },
            },
        )

    @patch("app.api.routes.health.ensure_pgvector_ready")
    def test_pgvector_database_error_uses_common_error_envelope(
        self,
        check_mock,
    ) -> None:
        check_mock.side_effect = psycopg.OperationalError("database down")

        response = self.client.get(
            "/v1/health/pgvector",
            headers={"X-Internal-Key": "test-secret"},
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["error"]["code"], "DATABASE_ERROR")

    def test_process_document_returns_contract_response(self) -> None:
        self.service.process.return_value = ProcessDocumentResult(
            document_id=12,
            page_count=2,
            chunk_count=8,
        )

        response = self.client.post(
            "/v1/process-document",
            headers={"X-Internal-Key": "test-secret"},
            json={
                "document_id": 12,
                "storage_key": "documents/12/v1/source.pdf",
                "file_type": "PDF",
                "reprocess": True,
                "metadata": {
                    "subject": "Cơ sở dữ liệu",
                    "topic": "  Chuẩn hóa dữ liệu  ",
                    "chapter": "Chương 3",
                    "tags": ["database", "", "normalization"],
                },
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "success": True,
                "data": {
                    "document_id": 12,
                    "status": "PROCESSED",
                    "page_count": 2,
                    "chunk_count": 8,
                },
                "message": "Học liệu đã được xử lý thành công",
            },
        )
        request = self.service.process.call_args.args[0]
        self.assertEqual(request.file_type, DocumentFileType.PDF)
        self.assertTrue(request.reprocess)
        self.assertEqual(request.metadata.topic, "Chuẩn hóa dữ liệu")
        self.assertEqual(request.metadata.tags, ["database", "normalization"])

    def test_process_document_accepts_docx_file_type(self) -> None:
        self.service.process.return_value = ProcessDocumentResult(
            document_id=12,
            page_count=1,
            chunk_count=4,
        )

        response = self.client.post(
            "/v1/process-document",
            headers={"X-Internal-Key": "test-secret"},
            json={
                "document_id": 12,
                "storage_key": "documents/12/v1/source.docx",
                "file_type": "DOCX",
                "reprocess": True,
            },
        )

        self.assertEqual(response.status_code, 200)
        request = self.service.process.call_args.args[0]
        self.assertEqual(request.file_type, DocumentFileType.DOCX)
        self.assertTrue(request.reprocess)

    def test_index_document_returns_contract_response(self) -> None:
        self.service.process.return_value = ProcessDocumentResult(
            document_id=12,
            page_count=2,
            chunk_count=8,
        )

        response = self.client.post(
            "/v1/index-document",
            headers={"X-Internal-Key": "test-secret"},
            json={
                "document_id": 12,
                "storage_key": "documents/12/v1/source.pdf",
                "file_type": "PDF",
                "reprocess": False,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "success": True,
                "data": {
                    "document_id": 12,
                    "status": "PROCESSED",
                    "page_count": 2,
                    "chunk_count": 8,
                },
                "message": "Tài liệu đã được index RAG thành công",
            },
        )
        request = self.service.process.call_args.args[0]
        self.assertEqual(request.document_id, 12)
        self.assertEqual(request.file_type, DocumentFileType.PDF)
        self.assertFalse(request.reprocess)

    def test_request_validation_uses_invalid_input_envelope(self) -> None:
        response = self.client.post(
            "/v1/process-document",
            headers={"X-Internal-Key": "test-secret"},
            json={
                "document_id": 0,
                "storage_key": "  ",
                "file_type": "PPTX",
            },
        )

        self.assertEqual(response.status_code, 422)
        body = response.json()
        self.assertEqual(body["success"], False)
        self.assertEqual(body["error"]["code"], "INVALID_INPUT")
        fields = {detail["field"] for detail in body["error"]["details"]}
        self.assertIn("body.document_id", fields)
        self.assertIn("body.storage_key", fields)
        self.assertIn("body.file_type", fields)

    def test_rejects_legacy_lecture_id_field(self) -> None:
        response = self.client.post(
            "/v1/process-document",
            headers={"X-Internal-Key": "test-secret"},
            json={
                "document_id": 12,
                "lecture_id": 5,
                "storage_key": "documents/12/v1/source.pdf",
                "file_type": "PDF",
            },
        )

        self.assertEqual(response.status_code, 422)
        body = response.json()
        self.assertEqual(body["success"], False)
        self.assertEqual(body["error"]["code"], "INVALID_INPUT")
        fields = {detail["field"] for detail in body["error"]["details"]}
        self.assertIn("body.lecture_id", fields)
        self.service.process.assert_not_called()

    def test_service_error_is_mapped_to_contract_envelope(self) -> None:
        self.service.process.side_effect = ServiceError(
            ErrorCode.FILE_NOT_FOUND,
            "Không tìm thấy học liệu trong shared storage",
            status_code=404,
            details=[
                ErrorDetail(
                    field="storage_key",
                    message="documents/12/v1/source.pdf",
                )
            ],
        )

        response = self.client.post(
            "/v1/process-document",
            headers={"X-Internal-Key": "test-secret"},
            json={
                "document_id": 12,
                "storage_key": "documents/12/v1/source.pdf",
                "file_type": "PDF",
            },
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["error"]["code"], "FILE_NOT_FOUND")
        self.assertEqual(
            response.json()["error"]["details"][0]["field"],
            "storage_key",
        )

    @patch("app.api.error_handlers.logger")
    def test_unexpected_error_is_hidden_by_internal_error_envelope(
        self,
        logger_mock,
    ) -> None:
        self.service.process.side_effect = RuntimeError("sensitive detail")

        response = self.client.post(
            "/v1/process-document",
            headers={"X-Internal-Key": "test-secret"},
            json={
                "document_id": 12,
                "storage_key": "documents/12/v1/source.pdf",
                "file_type": "PDF",
            },
        )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()["error"]["code"], "INTERNAL_ERROR")
        self.assertNotIn("sensitive detail", response.text)
        logger_mock.exception.assert_called_once()


if __name__ == "__main__":
    unittest.main()

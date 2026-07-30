"""Tests for /v1/analyze-document RAG capability check."""

import unittest
from pathlib import Path
from unittest.mock import MagicMock, call

from fastapi.testclient import TestClient

from app.api.dependencies import get_analyze_document_service
from app.api.internal_auth import get_expected_internal_api_key
from app.core.errors import ErrorCode, ServiceError
from app.main import create_app
from app.schemas.analyze_document import AnalyzeDocumentRequest, AnalyzeDocumentResult
from app.schemas.document import (
    ChunkedDocument,
    DocumentChunk,
    DocumentFileType,
    ValidatedDocument,
)
from app.services.analyze_document_service import AnalyzeDocumentService


def analyze_request() -> AnalyzeDocumentRequest:
    return AnalyzeDocumentRequest(
        document_id=12,
        storage_key="documents/12/v1/source.pdf",
        file_type=DocumentFileType.PDF,
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
                content="Chunk one",
                token_count=10,
            ),
            DocumentChunk(
                page_number=2,
                chunk_index=1,
                content="Chunk two",
                token_count=15,
            ),
        ],
    )


class AnalyzeDocumentServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.resolver = MagicMock()
        self.validator = MagicMock()
        self.pipeline = MagicMock()
        self.service = AnalyzeDocumentService(
            storage_resolver=self.resolver,
            document_validator=self.validator,
            chunking_pipeline=self.pipeline,
        )

    def test_analyze_returns_ready_to_process_when_chunks_exist(self) -> None:
        request = analyze_request()
        path = Path("/storage/uploads/documents/12/v1/source.pdf")
        validated = validated_document()
        chunked = chunked_document()
        self.resolver.resolve.return_value = path
        self.validator.validate.return_value = validated
        self.pipeline.run.return_value = chunked

        calls = MagicMock()
        calls.attach_mock(self.resolver.resolve, "resolve")
        calls.attach_mock(self.validator.validate, "validate")
        calls.attach_mock(self.pipeline.run, "chunk")

        result = self.service.analyze(request)

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
            ],
        )
        self.assertEqual(result.document_id, 12)
        self.assertTrue(result.can_rag)
        self.assertEqual(result.rag_status, "READY_TO_PROCESS")
        self.assertEqual(result.page_count, 2)
        self.assertEqual(result.estimated_token_count, 25)
        self.assertEqual(result.estimated_chunk_count, 2)
        self.assertIsNone(result.unsupported_reason)

    def test_empty_document_returns_unsupported_without_raising(self) -> None:
        self.resolver.resolve.return_value = Path("source.pdf")
        self.validator.validate.return_value = validated_document()
        self.pipeline.run.side_effect = ServiceError(
            ErrorCode.EMPTY_DOCUMENT,
            "No text",
            status_code=422,
        )

        result = self.service.analyze(analyze_request())

        self.assertFalse(result.can_rag)
        self.assertEqual(result.rag_status, "UNSUPPORTED")
        self.assertEqual(result.page_count, 0)
        self.assertEqual(result.estimated_token_count, 0)
        self.assertEqual(result.estimated_chunk_count, 0)
        self.assertEqual(result.unsupported_reason, "EMPTY_DOCUMENT")

    def test_non_empty_document_errors_still_raise(self) -> None:
        self.resolver.resolve.side_effect = ServiceError(
            ErrorCode.FILE_NOT_FOUND,
            "File not found",
            status_code=404,
        )

        with self.assertRaises(ServiceError) as context:
            self.service.analyze(analyze_request())

        self.assertEqual(context.exception.code, ErrorCode.FILE_NOT_FOUND)
        self.validator.validate.assert_not_called()
        self.pipeline.run.assert_not_called()


class AnalyzeDocumentApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self.app = create_app()
        self.service = MagicMock()
        self.app.dependency_overrides[get_expected_internal_api_key] = (
            lambda: "test-secret"
        )
        self.app.dependency_overrides[get_analyze_document_service] = (
            lambda: self.service
        )
        self.client = TestClient(
            self.app,
            raise_server_exceptions=False,
        )

    def tearDown(self) -> None:
        self.client.close()
        self.app.dependency_overrides.clear()

    def test_analyze_endpoint_returns_success_envelope(self) -> None:
        self.service.analyze.return_value = AnalyzeDocumentResult(
            document_id=12,
            can_rag=True,
            rag_status="READY_TO_PROCESS",
            page_count=2,
            estimated_token_count=25,
            estimated_chunk_count=2,
        )

        response = self.client.post(
            "/v1/analyze-document",
            headers={"X-Internal-Key": "test-secret"},
            json={
                "document_id": 12,
                "storage_key": "documents/12/v1/source.pdf",
                "file_type": "PDF",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "success": True,
                "data": {
                    "document_id": 12,
                    "can_rag": True,
                    "rag_status": "READY_TO_PROCESS",
                    "page_count": 2,
                    "estimated_token_count": 25,
                    "estimated_chunk_count": 2,
                },
                "message": "Tài liệu có thể xử lý RAG",
            },
        )

    def test_analyze_endpoint_accepts_docx_file_type(self) -> None:
        self.service.analyze.return_value = AnalyzeDocumentResult(
            document_id=12,
            can_rag=True,
            rag_status="READY_TO_PROCESS",
            page_count=1,
            estimated_token_count=25,
            estimated_chunk_count=2,
        )

        response = self.client.post(
            "/v1/analyze-document",
            headers={"X-Internal-Key": "test-secret"},
            json={
                "document_id": 12,
                "storage_key": "documents/12/v1/source.docx",
                "file_type": "DOCX",
            },
        )

        self.assertEqual(response.status_code, 200)
        request = self.service.analyze.call_args.args[0]
        self.assertEqual(request.file_type, DocumentFileType.DOCX)

    def test_analyze_endpoint_requires_internal_key(self) -> None:
        response = self.client.post(
            "/v1/analyze-document",
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
        self.service.analyze.assert_not_called()

    def test_analyze_endpoint_validates_payload(self) -> None:
        response = self.client.post(
            "/v1/analyze-document",
            headers={"X-Internal-Key": "test-secret"},
            json={
                "document_id": 0,
                "storage_key": "   ",
                "file_type": "PPTX",
            },
        )

        self.assertEqual(response.status_code, 422)
        self.service.analyze.assert_not_called()


if __name__ == "__main__":
    unittest.main()
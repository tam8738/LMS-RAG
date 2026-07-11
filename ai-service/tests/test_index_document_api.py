"""Tests for the /v1/index-document endpoint."""

import unittest
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.api.dependencies import get_index_document_service
from app.api.internal_auth import get_expected_internal_api_key
from app.core.errors import ErrorCode, ErrorDetail, ServiceError
from app.main import create_app
from app.schemas.document import DocumentFileType
from app.schemas.index_document import IndexDocumentRequest, IndexDocumentResult
from app.schemas.process_document import ProcessDocumentRequest, ProcessDocumentResult
from app.services.index_document_service import IndexDocumentService


def index_request(reindex: bool = True) -> IndexDocumentRequest:
    return IndexDocumentRequest(
        document_id=12,
        storage_key="documents/12/v1/source.pdf",
        file_type=DocumentFileType.PDF,
        reindex=reindex,
        metadata={
            "subject": "Database",
            "topic": "Normalization",
            "chapter": "Chapter 3",
            "tags": ["db", "rag", "db"],
        },
    )


class IndexDocumentServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.process_document_service = MagicMock()
        self.service = IndexDocumentService(
            process_document_service=self.process_document_service,
        )

    def test_index_reuses_full_process_pipeline_and_returns_ready(self) -> None:
        self.process_document_service.process.return_value = ProcessDocumentResult(
            document_id=12,
            page_count=2,
            chunk_count=8,
        )

        result = self.service.index(index_request(reindex=True))

        self.assertEqual(result.document_id, 12)
        self.assertEqual(result.rag_status, "READY")
        self.assertEqual(result.page_count, 2)
        self.assertEqual(result.chunk_count, 8)

        process_request = self.process_document_service.process.call_args.args[0]
        self.assertIsInstance(process_request, ProcessDocumentRequest)
        self.assertEqual(process_request.document_id, 12)
        self.assertEqual(process_request.storage_key, "documents/12/v1/source.pdf")
        self.assertEqual(process_request.file_type, DocumentFileType.PDF)
        self.assertTrue(process_request.reprocess)
        self.assertEqual(process_request.metadata.tags, ["db", "rag"])

    def test_pipeline_error_is_not_hidden_by_service(self) -> None:
        self.process_document_service.process.side_effect = ServiceError(
            ErrorCode.EMBEDDING_ERROR,
            "Không thể sinh embedding",
            status_code=503,
        )

        with self.assertRaises(ServiceError) as context:
            self.service.index(index_request())

        self.assertEqual(context.exception.code, ErrorCode.EMBEDDING_ERROR)


class IndexDocumentApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self.app = create_app()
        self.service = MagicMock()
        self.app.dependency_overrides[get_expected_internal_api_key] = (
            lambda: "test-secret"
        )
        self.app.dependency_overrides[get_index_document_service] = (
            lambda: self.service
        )
        self.client = TestClient(
            self.app,
            raise_server_exceptions=False,
        )

    def tearDown(self) -> None:
        self.client.close()
        self.app.dependency_overrides.clear()

    def test_index_endpoint_returns_ready_contract_response(self) -> None:
        self.service.index.return_value = IndexDocumentResult(
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
                "reindex": True,
                "metadata": {
                    "subject": "Database",
                    "topic": "  Normalization  ",
                    "chapter": "Chapter 3",
                    "tags": ["db", "", "rag", "db"],
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
                    "rag_status": "READY",
                    "page_count": 2,
                    "chunk_count": 8,
                },
                "message": "Tài liệu đã được lập chỉ mục RAG thành công",
            },
        )
        request = self.service.index.call_args.args[0]
        self.assertEqual(request.file_type, DocumentFileType.PDF)
        self.assertTrue(request.reindex)
        self.assertEqual(request.metadata.topic, "Normalization")
        self.assertEqual(request.metadata.tags, ["db", "rag"])

    def test_index_endpoint_requires_internal_key(self) -> None:
        response = self.client.post(
            "/v1/index-document",
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
        self.service.index.assert_not_called()

    def test_index_endpoint_validates_payload_and_rejects_legacy_lecture_id(
        self,
    ) -> None:
        response = self.client.post(
            "/v1/index-document",
            headers={"X-Internal-Key": "test-secret"},
            json={
                "document_id": 0,
                "lecture_id": 5,
                "storage_key": "   ",
                "file_type": "DOCX",
            },
        )

        self.assertEqual(response.status_code, 422)
        body = response.json()
        self.assertEqual(body["error"]["code"], "INVALID_INPUT")
        fields = {detail["field"] for detail in body["error"]["details"]}
        self.assertIn("body.document_id", fields)
        self.assertIn("body.storage_key", fields)
        self.assertIn("body.file_type", fields)
        self.assertIn("body.lecture_id", fields)
        self.service.index.assert_not_called()

    def test_service_error_is_mapped_to_contract_envelope(self) -> None:
        self.service.index.side_effect = ServiceError(
            ErrorCode.DATABASE_ERROR,
            "Không thể lưu document chunks vào PostgreSQL",
            status_code=503,
            details=[ErrorDetail(field="document_id", message="12")],
        )

        response = self.client.post(
            "/v1/index-document",
            headers={"X-Internal-Key": "test-secret"},
            json={
                "document_id": 12,
                "storage_key": "documents/12/v1/source.pdf",
                "file_type": "PDF",
            },
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["error"]["code"], "DATABASE_ERROR")
        self.assertEqual(
            response.json()["error"]["details"][0]["field"],
            "document_id",
        )


if __name__ == "__main__":
    unittest.main()
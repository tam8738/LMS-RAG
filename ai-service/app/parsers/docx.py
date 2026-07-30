"""Extract text from DOCX files without requiring external converters."""

from __future__ import annotations

import zipfile
from xml.etree import ElementTree

from app.core.errors import ErrorCode, ServiceError
from app.parsers.base import DocumentParser
from app.schemas.document import (
    DocumentFileType,
    ParsedDocument,
    ParsedPage,
    ValidatedDocument,
)

WORD_NAMESPACE = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
WORD_DOCUMENT_PATH = "word/document.xml"


class DocxDocumentParser(DocumentParser):
    """DOCX parser for text-based Word documents.

    DOCX does not store stable page numbers, so the extracted content is returned
    as a single logical page with ``page_number=None``.
    """

    supported_type = DocumentFileType.DOCX

    def _parse(self, document: ValidatedDocument) -> ParsedDocument:
        try:
            with zipfile.ZipFile(document.path) as archive:
                document_xml = archive.read(WORD_DOCUMENT_PATH)
        except (OSError, KeyError, zipfile.BadZipFile) as exc:
            raise ServiceError(
                ErrorCode.PARSER_ERROR,
                "Khong the doc noi dung hoc lieu DOCX",
                status_code=422,
            ) from exc

        try:
            root = ElementTree.fromstring(document_xml)
        except ElementTree.ParseError as exc:
            raise ServiceError(
                ErrorCode.PARSER_ERROR,
                "Khong the phan tich cau truc XML cua hoc lieu DOCX",
                status_code=422,
            ) from exc

        content = self._extract_body_text(root)
        if not content:
            raise ServiceError(
                ErrorCode.EMPTY_DOCUMENT,
                "Khong trich xuat duoc van ban tu hoc lieu DOCX",
                status_code=422,
            )

        return ParsedDocument(
            file_type=self.supported_type,
            page_count=1,
            pages=[ParsedPage(page_number=None, content=content)],
        )

    @classmethod
    def _extract_body_text(cls, root: ElementTree.Element) -> str:
        body = root.find(f".//{{{WORD_NAMESPACE}}}body")
        if body is None:
            return ""

        blocks: list[str] = []
        for child in body:
            tag = cls._local_name(child.tag)
            if tag == "p":
                paragraph = cls._extract_inline_text(child)
                if paragraph:
                    blocks.append(paragraph)
            elif tag == "tbl":
                table = cls._extract_table_text(child)
                if table:
                    blocks.append(table)

        return "\n\n".join(blocks).strip()

    @classmethod
    def _extract_table_text(cls, table: ElementTree.Element) -> str:
        rows: list[str] = []
        for row in table.findall(f".//{{{WORD_NAMESPACE}}}tr"):
            cells: list[str] = []
            for cell in row.findall(f"./{{{WORD_NAMESPACE}}}tc"):
                cell_text = cls._extract_inline_text(cell)
                if cell_text:
                    cells.append(cell_text)
            if cells:
                rows.append(" | ".join(cells))
        return "\n".join(rows).strip()

    @classmethod
    def _extract_inline_text(cls, element: ElementTree.Element) -> str:
        pieces: list[str] = []
        cls._collect_inline_text(element, pieces)
        text = "".join(pieces)
        return "\n".join(line.strip() for line in text.splitlines()).strip()

    @classmethod
    def _collect_inline_text(
        cls,
        element: ElementTree.Element,
        pieces: list[str],
    ) -> None:
        tag = cls._local_name(element.tag)
        if tag == "t" and element.text:
            pieces.append(element.text)
        elif tag == "tab":
            pieces.append("\t")
        elif tag in {"br", "cr"}:
            pieces.append("\n")

        for child in element:
            cls._collect_inline_text(child, pieces)

    @staticmethod
    def _local_name(tag: str) -> str:
        return tag.rsplit("}", 1)[-1]

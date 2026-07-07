"""Chạy toàn bộ kiểm thử local và document pipeline cho một PDF/TXT mới."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime
from html import escape
from pathlib import Path
import subprocess
import sys

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT_DIR))

# Chạy trực tiếp trên PowerShell Windows mà không cần cấu hình UTF-8 thủ công.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)

from app.core.config import settings
from app.schemas.document import DocumentFileType
from app.services.document_chunking_pipeline import DocumentChunkingPipeline
from app.services.document_validator import DocumentValidator
from app.services.storage import StorageResolver


BROKEN_TEXT_SAMPLES = (
    "nh\nững",
    "qu\nản",
    "nà y",
    "t ổng",
    "liệ u",
    "đ ược",
)


@dataclass(frozen=True)
class CheckResult:
    """Kết quả một điều kiện nghiệm thu tài liệu."""

    name: str
    passed: bool
    detail: str
    warning: bool = False


def parse_args() -> argparse.Namespace:
    """Đọc file cần test và các tùy chọn command line."""
    parser = argparse.ArgumentParser(
        description=(
            "Chạy unit/API tests, resolve, validate, parse, clean, chunk, "
            "kiểm tra toàn bộ chunks và tạo báo cáo HTML."
        )
    )
    parser.add_argument("file", type=Path, help="Đường dẫn PDF hoặc TXT mới.")
    parser.add_argument(
        "--skip-unit-tests",
        action="store_true",
        help="Bỏ qua 95 unit/API tests và chỉ kiểm tra tài liệu.",
    )
    parser.add_argument("--output", "-o", type=Path, help="File HTML kết quả.")
    return parser.parse_args()


def infer_file_type(path: Path) -> DocumentFileType:
    """Suy ra loại tài liệu từ extension."""
    try:
        return DocumentFileType(path.suffix.removeprefix(".").upper())
    except ValueError as exc:
        raise ValueError("Chỉ hỗ trợ file PDF hoặc TXT") from exc


def run_unit_tests() -> bool:
    """Chạy toàn bộ unittest bằng đúng Python interpreter hiện tại."""
    print("\n=== 1. UNIT/API TESTS ===")
    completed = subprocess.run(
        [sys.executable, "-m", "unittest", "discover", "-s", "tests"],
        cwd=ROOT_DIR,
        check=False,
    )
    return completed.returncode == 0


def process_document(path: Path):
    """Chạy resolve -> validate -> parse -> clean -> chunk cho file mới."""
    file_type = infer_file_type(path)
    resolver = StorageResolver(upload_root=path.parent)
    resolved_path = resolver.resolve(path.name)
    validated = DocumentValidator().validate(
        resolved_path,
        path.name,
        file_type,
    )
    return DocumentChunkingPipeline().run(validated)


def verify_result(result) -> list[CheckResult]:
    """Kiểm tra mọi chunk thay vì chỉ xem một vài chunk đầu."""
    chunks = result.chunks
    all_content = "\n".join(chunk.content for chunk in chunks)
    expected_indexes = list(range(result.chunk_count))
    actual_indexes = [chunk.chunk_index for chunk in chunks]

    if result.file_type is DocumentFileType.PDF:
        valid_pages = all(
            chunk.page_number is not None
            and 1 <= chunk.page_number <= result.page_count
            for chunk in chunks
        )
    else:
        valid_pages = all(chunk.page_number is None for chunk in chunks)

    broken_counts = {
        repr(sample): all_content.count(sample)
        for sample in BROKEN_TEXT_SAMPLES
    }
    broken_total = sum(broken_counts.values())
    replacement_count = all_content.count("\ufffd")
    replacement_limit = max(1, len(all_content) // 100_000)

    return [
        CheckResult(
            "Có nội dung",
            result.chunk_count > 0,
            f"{result.chunk_count} chunks",
        ),
        CheckResult(
            "Chunk index liên tục",
            actual_indexes == expected_indexes,
            f"0..{result.chunk_count - 1}",
        ),
        CheckResult(
            "Nội dung chunk không rỗng",
            all(bool(chunk.content.strip()) for chunk in chunks),
            "đã kiểm tra toàn bộ chunks",
        ),
        CheckResult(
            "Token trong giới hạn",
            all(
                1 <= chunk.token_count <= settings.chunk_size
                for chunk in chunks
            ),
            (
                f"max={max(chunk.token_count for chunk in chunks)}, "
                f"limit={settings.chunk_size}"
            ),
        ),
        CheckResult(
            "Page number hợp lệ",
            valid_pages,
            f"page_count={result.page_count}",
        ),
        CheckResult(
            "Ký tự Unicode thay thế trong ngưỡng",
            replacement_count <= replacement_limit,
            f"count={replacement_count}, limit={replacement_limit}",
            warning=0 < replacement_count <= replacement_limit,
        ),
        CheckResult(
            "Không có mẫu vỡ từ đã biết",
            broken_total == 0,
            ", ".join(
                f"{sample}={count}"
                for sample, count in broken_counts.items()
            ),
        ),
    ]


def render_html(path: Path, result) -> str:
    """Biến ChunkedDocument thành HTML tự chứa, không cần web server."""
    chunks = result.chunks
    token_counts = [chunk.token_count for chunk in chunks]
    all_content = "\n".join(chunk.content for chunk in chunks)
    average_tokens = sum(token_counts) / len(token_counts)
    pages_with_chunks = len({chunk.page_number for chunk in chunks})

    diagnostics = []
    for sample in BROKEN_TEXT_SAMPLES:
        count = all_content.count(sample)
        css_class = "diagnostic-pass" if count == 0 else "diagnostic-fail"
        diagnostics.append(
            "<li>"
            f"<code>{escape(repr(sample))}</code>"
            f'<strong class="{css_class}">{count}</strong>'
            "</li>"
        )

    chunk_sections = []
    for chunk in chunks:
        page_label = str(chunk.page_number) if chunk.page_number else "TXT"
        chunk_sections.append(
            f"""
            <details class="chunk" data-index="{chunk.chunk_index}"
                     data-page="{escape(page_label)}">
              <summary>
                <span class="chunk-index">Chunk {chunk.chunk_index}</span>
                <span>Trang {escape(page_label)}</span>
                <span>{chunk.token_count} token</span>
              </summary>
              <pre>{escape(chunk.content)}</pre>
            </details>
            """
        )

    style = """
    :root { color-scheme: light; font-family: Inter, "Segoe UI", Arial, sans-serif;
      color: #202522; background: #f4f6f4; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    header { padding: 24px max(20px, calc((100vw - 1180px) / 2));
      color: #fff; background: #244b3a; }
    h1 { margin: 0 0 8px; font-size: 24px; letter-spacing: 0; }
    header p { margin: 4px 0; overflow-wrap: anywhere; }
    main { width: min(1180px, calc(100% - 32px)); margin: 24px auto 48px; }
    h2 { margin: 28px 0 12px; font-size: 18px; letter-spacing: 0; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1px; border: 1px solid #cdd5d0; background: #cdd5d0; }
    .metric { min-height: 92px; padding: 16px; background: #fff; }
    .metric span { display: block; color: #5f6863; font-size: 13px; }
    .metric strong { display: block; margin-top: 8px; font-size: 24px; }
    .diagnostics { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 8px; padding: 0; list-style: none; }
    .diagnostics li { display: flex; justify-content: space-between; gap: 12px;
      padding: 10px 12px; border: 1px solid #d8ddd9; background: #fff; }
    .diagnostic-pass { color: #18794e; }
    .diagnostic-fail { color: #b42318; }
    .toolbar { position: sticky; top: 0; z-index: 2; display: grid;
      grid-template-columns: minmax(180px, 1fr) auto auto; gap: 8px;
      padding: 12px 0; background: #f4f6f4; }
    input, button { min-height: 40px; border: 1px solid #aeb8b2; border-radius: 4px;
      background: #fff; color: #202522; font: inherit; }
    input { width: 100%; padding: 8px 12px; }
    button { padding: 8px 12px; cursor: pointer; }
    button:hover { border-color: #244b3a; background: #edf3ef; }
    .result-count { margin: 0 0 8px; color: #5f6863; }
    .chunk { margin-bottom: 8px; border: 1px solid #ccd3ce; background: #fff; }
    .chunk[open] { border-color: #7d9688; }
    summary { display: grid; grid-template-columns: minmax(120px, 1fr) 120px 120px;
      gap: 12px; align-items: center; min-height: 48px; padding: 10px 14px;
      cursor: pointer; }
    .chunk-index { font-weight: 700; color: #244b3a; }
    pre { margin: 0; padding: 16px; border-top: 1px solid #e1e5e2;
      background: #fafbfa; font-family: "Cascadia Code", Consolas, monospace;
      font-size: 14px; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
    .hidden { display: none; }
    @media (max-width: 640px) {
      header { padding: 20px 16px; }
      main { width: min(100% - 20px, 1180px); margin-top: 16px; }
      .toolbar { grid-template-columns: 1fr 1fr; }
      .toolbar input { grid-column: 1 / -1; }
      summary { grid-template-columns: 1fr auto; }
      summary span:last-child { grid-column: 1 / -1; }
    }
    """

    javascript = """
    const search = document.querySelector("#search");
    const chunks = [...document.querySelectorAll(".chunk")];
    const count = document.querySelector("#result-count");
    function filterChunks() {
      const query = search.value.trim().toLocaleLowerCase("vi");
      let visible = 0;
      for (const chunk of chunks) {
        const matches = !query || chunk.textContent.toLocaleLowerCase("vi").includes(query);
        chunk.classList.toggle("hidden", !matches);
        if (matches) visible += 1;
      }
      count.textContent = `${visible}/${chunks.length} chunks đang hiển thị`;
    }
    search.addEventListener("input", filterChunks);
    document.querySelector("#expand").addEventListener("click", () => {
      chunks.filter(chunk => !chunk.classList.contains("hidden"))
        .forEach(chunk => chunk.open = true);
    });
    document.querySelector("#collapse").addEventListener("click", () => {
      chunks.forEach(chunk => chunk.open = false);
    });
    filterChunks();
    """

    generated_at = datetime.now().astimezone().isoformat(timespec="seconds")
    return f"""<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Kiểm tra chunks - {escape(path.name)}</title>
  <style>{style}</style>
</head>
<body>
  <header>
    <h1>Kết quả xử lý tài liệu</h1>
    <p><strong>File:</strong> {escape(str(path))}</p>
    <p><strong>Thời điểm:</strong> {escape(generated_at)}</p>
  </header>
  <main>
    <section class="metrics" aria-label="Thống kê">
      <div class="metric"><span>Loại file</span><strong>{result.file_type.value}</strong></div>
      <div class="metric"><span>Tổng số trang</span><strong>{result.page_count}</strong></div>
      <div class="metric"><span>Trang có chunks</span><strong>{pages_with_chunks}</strong></div>
      <div class="metric"><span>Tổng số chunks</span><strong>{result.chunk_count}</strong></div>
      <div class="metric"><span>Token trung bình</span><strong>{average_tokens:.1f}</strong></div>
      <div class="metric"><span>Token min / max</span><strong>{min(token_counts)} / {max(token_counts)}</strong></div>
    </section>
    <h2>Kiểm tra mẫu vỡ từ</h2>
    <ul class="diagnostics">{''.join(diagnostics)}</ul>
    <h2>Nội dung chunks</h2>
    <div class="toolbar">
      <input id="search" type="search" placeholder="Tìm nội dung, số trang hoặc chunk..."
             aria-label="Tìm chunks">
      <button id="expand" type="button">Mở tất cả</button>
      <button id="collapse" type="button">Đóng tất cả</button>
    </div>
    <p class="result-count" id="result-count"></p>
    <section id="chunks">{''.join(chunk_sections)}</section>
  </main>
  <script>{javascript}</script>
</body>
</html>
"""


def write_report(path: Path, output_path: Path, result) -> None:
    """Ghi báo cáo HTML trực quan cho kết quả kiểm thử."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(render_html(path, result), encoding="utf-8")


def main() -> None:
    """Điều phối toàn bộ quy trình test bằng một command."""
    args = parse_args()
    path = args.file.expanduser().resolve()
    output_path = args.output or (
        ROOT_DIR / ".reports" / f"{path.stem}-test-report.html"
    )

    unit_tests_passed = True
    if not args.skip_unit_tests:
        unit_tests_passed = run_unit_tests()

    print("\n=== 2. DOCUMENT PIPELINE ===")
    try:
        result = process_document(path)
        checks = verify_result(result)
        write_report(path, output_path, result)
    except Exception as exc:
        print(f"[FAIL] Không thể xử lý tài liệu: {exc}")
        raise SystemExit(1) from exc

    print(f"File: {path}")
    print(f"Loại: {result.file_type.value}")
    print(f"Trang: {result.page_count}")
    print(f"Chunks: {result.chunk_count}")

    print("\n=== 3. KIỂM TRA TOÀN BỘ CHUNKS ===")
    for check in checks:
        if not check.passed:
            status = "FAIL"
        elif check.warning:
            status = "WARN"
        else:
            status = "PASS"
        print(f"[{status}] {check.name}: {check.detail}")

    document_passed = all(check.passed for check in checks)
    overall_passed = unit_tests_passed and document_passed

    if args.skip_unit_tests:
        unit_tests_status = "SKIP"
    else:
        unit_tests_status = "PASS" if unit_tests_passed else "FAIL"

    print("\n=== KẾT QUẢ CUỐI ===")
    print(f"Unit/API tests: {unit_tests_status}")
    print(f"Document pipeline: {'PASS' if document_passed else 'FAIL'}")
    print(f"Report: {output_path.resolve()}")
    print(f"OVERALL: {'PASS' if overall_passed else 'FAIL'}")

    if not overall_passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()

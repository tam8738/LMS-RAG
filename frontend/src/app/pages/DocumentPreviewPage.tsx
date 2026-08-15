import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Download,
  FileText,
  LoaderCircle,
  Lock,
  LogIn,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ROUTES } from "../routes";

// Keep a deployment revision in the URL so browsers do not reuse worker
// response metadata cached before Nginx learned the .mjs MIME type.
GlobalWorkerOptions.workerSrc = `${pdfWorkerUrl}?v=20260815-mime-fix`;

type PreviewKind = "loading" | "pdf" | "text" | "download" | "error";

// A larger range substantially reduces JWT/database/filesystem round trips on
// high-latency server connections while still avoiding a full-file download.
const RANGE_CHUNK_SIZE = 512 * 1024;

function authHeaders(): Record<string, string> | undefined {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

function extractFilename(disposition: string | null): string {
  if (!disposition) return "document";

  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }

  return disposition.match(/filename="([^"]+)"/i)?.[1]
    ?? disposition.match(/filename=([^;]+)/i)?.[1]?.trim()
    ?? "document";
}

async function responseError(response: Response): Promise<string> {
  if (response.status === 401) {
    localStorage.removeItem("token");
    window.dispatchEvent(new Event("auth-unauthorized"));
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }

  try {
    const payload = await response.clone().json();
    return payload.error?.message || payload.message || `Không thể tải tài liệu (${response.status}).`;
  } catch {
    const text = await response.text();
    return text || `Không thể tải tài liệu (${response.status}).`;
  }
}

export function DocumentPreviewPage() {
  const navigate = useNavigate();
  const params = useParams<{ documentId: string }>();
  const documentId = Number(params.documentId);
  const contentUrl = useMemo(
    () => `/api/v1/documents/${documentId}/content`,
    [documentId],
  );
  const downloadUrl = useMemo(
    () => `/api/v1/documents/${documentId}/download`,
    [documentId],
  );
  const [canRequestDownload, setCanRequestDownload] = useState(
    Boolean(localStorage.getItem("token")),
  );
  const isPublicRef = useRef<boolean | null>(null);

  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [kind, setKind] = useState<PreviewKind>("loading");
  const [filename, setFilename] = useState("document");
  const [error, setError] = useState("");
  const [textContent, setTextContent] = useState("");
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [zoom, setZoom] = useState(1);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

  useEffect(() => {
    const updateViewportWidth = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", updateViewportWidth);
    return () => window.removeEventListener("resize", updateViewportWidth);
  }, []);

  // Monitor authentication state:
  // - For Public Library documents: logging out allows continued reading as guest (only download permission is revoked).
  // - For Private/Teacher Draft documents: logging out immediately locks the screen to protect confidentiality.
  useEffect(() => {
    let expiryTimer: number | undefined;
    let checking = false;

    const clearExpiryTimer = () => {
      if (expiryTimer !== undefined) {
        window.clearTimeout(expiryTimer);
        expiryTimer = undefined;
      }
    };

    const checkAuthStatus = async () => {
      if (checking) return;
      checking = true;
      clearExpiryTimer();

      try {
        const currentToken = localStorage.getItem("token");
        setCanRequestDownload(Boolean(currentToken));

        if (currentToken) {
          try {
            const payload = JSON.parse(atob(currentToken.split(".")[1]));
            const expiresAt = typeof payload.exp === "number" ? payload.exp * 1000 : null;

            if (expiresAt && expiresAt > Date.now()) {
              const delay = Math.min(expiresAt - Date.now() + 100, 2_147_000_000);
              expiryTimer = window.setTimeout(() => void checkAuthStatus(), delay);
              return;
            }

            if (!expiresAt) return;
          } catch {
            // Let the Backend reject malformed tokens on the next API request.
            return;
          }

          localStorage.removeItem("token");
          setCanRequestDownload(false);
          window.dispatchEvent(new Event("auth-unauthorized"));
        }

        if (isPublicRef.current === true) {
          return;
        }

        try {
          const checkRes = await fetch(contentUrl, { method: "HEAD" });
          if (checkRes.ok) {
            isPublicRef.current = true;
            return;
          }
        } catch {
          // Network or server error
        }

        // Document is private/unauthorized for anonymous viewers -> Lock screen
        setIsSessionExpired(true);
        setPdf(null);
        setTextContent("");
      } finally {
        checking = false;
      }
    };

    // Schedule one precise expiration check instead of polling the server.
    if (localStorage.getItem("token")) {
      void checkAuthStatus();
    }

    // Immediate detection when logout happens in another tab.
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "token" || e.key === null) {
        void checkAuthStatus();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Recheck when the preview regains focus.
    const handleFocus = () => {
      void checkAuthStatus();
    };
    window.addEventListener("focus", handleFocus);

    // Same-tab logout and Backend 401 notification.
    const handleUnauthorized = () => {
      void checkAuthStatus();
    };
    window.addEventListener("auth-unauthorized", handleUnauthorized);

    return () => {
      clearExpiryTimer();
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("auth-unauthorized", handleUnauthorized);
    };
  }, [contentUrl]);

  useEffect(() => {
    if (!Number.isSafeInteger(documentId) || documentId <= 0) {
      setError("Mã tài liệu không hợp lệ.");
      setKind("error");
      return;
    }

    const abortController = new AbortController();
    let loadingTask: ReturnType<typeof getDocument> | null = null;
    let loadedPdf: PDFDocumentProxy | null = null;

    const loadPreview = async () => {
      try {
        const headHeaders = authHeaders();
        const headResponse = await fetch(contentUrl, {
          method: "HEAD",
          headers: headHeaders,
          signal: abortController.signal,
        });
        if (!headResponse.ok) {
          throw new Error(await responseError(headResponse));
        }
        if (!headHeaders) isPublicRef.current = true;

        const detectedFilename = extractFilename(headResponse.headers.get("Content-Disposition"));
        const contentType = (headResponse.headers.get("Content-Type") || "").toLowerCase();
        const lowerFilename = detectedFilename.toLowerCase();
        setFilename(detectedFilename);
        document.title = `${detectedFilename} · Xem tài liệu`;

        const isPdf = contentType.includes("application/pdf") || lowerFilename.endsWith(".pdf");
        const isText = contentType.startsWith("text/") || lowerFilename.endsWith(".txt");

        if (isPdf) {
          setKind("pdf");
          loadingTask = getDocument({
            url: contentUrl,
            httpHeaders: authHeaders(),
            rangeChunkSize: RANGE_CHUNK_SIZE,
            disableStream: true,
            disableAutoFetch: true,
          });
          loadingTask.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
            setProgress(total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : null);
          };
          loadedPdf = await loadingTask.promise;
          setPdf(loadedPdf);
          setProgress(100);
          return;
        }

        if (isText) {
          const textResponse = await fetch(contentUrl, {
            headers: authHeaders(),
            signal: abortController.signal,
          });
          if (!textResponse.ok) {
            throw new Error(await responseError(textResponse));
          }
          setTextContent(await textResponse.text());
          setKind("text");
          return;
        }

        setKind("download");
      } catch (loadError) {
        if (abortController.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : "Không thể mở tài liệu.");
        setKind("error");
      }
    };

    void loadPreview();
    return () => {
      abortController.abort();
      void loadingTask?.destroy();
      if (!loadingTask) void loadedPdf?.destroy();
    };
  }, [contentUrl, documentId]);

  const downloadContent = async () => {
    setDownloadLoading(true);
    setError("");
    try {
      const headers = authHeaders();
      if (!headers) {
        throw new Error("Vui lòng đăng nhập bằng tài khoản có quyền để tải file gốc.");
      }
      const response = await fetch(downloadUrl, { headers });
      if (!response.ok) throw new Error(await responseError(response));
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Không thể tải tài liệu.");
    } finally {
      setDownloadLoading(false);
    }
  };

  if (isSessionExpired) {
    return (
      <PreviewShell filename={filename}>
        <div className="flex min-h-[75vh] flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-sm border border-amber-200">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-[20px] font-bold text-slate-900">Phiên làm việc đã kết thúc</h1>
          <p className="mt-2.5 max-w-md text-[14px] leading-6 text-slate-600">
            Bạn đã đăng xuất hoặc phiên đăng nhập đã hết hạn. Để bảo mật tài liệu vui lòng đăng nhập lại để tiếp tục xem.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                navigate(ROUTES.LOGIN, { state: { from: window.location } });
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-slate-800 shadow-sm cursor-pointer border-none"
            >
              <LogIn className="h-4 w-4" />
              Đăng nhập lại
            </button>
            <button
              onClick={() => window.close()}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[13.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              Đóng cửa sổ
            </button>
          </div>
        </div>
      </PreviewShell>
    );
  }

  if (kind === "loading" || (kind === "pdf" && !pdf)) {
    return (
      <PreviewShell filename={filename}>
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
          <LoaderCircle className="mb-4 h-9 w-9 animate-spin text-indigo-600" />
          <p className="text-[15px] font-semibold text-slate-900">Đang mở tài liệu…</p>
          <p className="mt-1 text-[13px] text-slate-500">
            {progress === null ? "Đang nhận thông tin từ máy chủ" : `Đã tải phần cần thiết: ${progress}%`}
          </p>
        </div>
      </PreviewShell>
    );
  }

  if (kind === "error") {
    return (
      <PreviewShell filename={filename}>
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
          <AlertTriangle className="mb-4 h-10 w-10 text-red-600" />
          <h1 className="text-[18px] font-semibold text-slate-900">Không thể mở tài liệu</h1>
          <p className="mt-2 max-w-lg text-[14px] leading-6 text-red-700">{error}</p>
          <button className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white" onClick={() => window.close()}>
            Đóng cửa sổ
          </button>
        </div>
      </PreviewShell>
    );
  }

  if (kind === "text") {
    return (
      <PreviewShell
        filename={filename}
        onDownload={canRequestDownload ? downloadContent : undefined}
        downloadLoading={downloadLoading}
      >
        {error && <InlineError message={error} />}
        <main className="mx-auto max-w-5xl p-4 sm:p-6">
          <pre className="min-h-[70vh] whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-white p-5 font-mono text-[13px] leading-6 text-slate-800 shadow-sm">
            {textContent}
          </pre>
        </main>
      </PreviewShell>
    );
  }

  if (kind === "download") {
    return (
      <PreviewShell filename={filename}>
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
          <FileText className="mb-4 h-12 w-12 text-indigo-600" />
          <h1 className="text-[18px] font-semibold text-slate-900">Định dạng chưa hỗ trợ xem trực tiếp</h1>
          <p className="mt-2 max-w-lg text-[14px] leading-6 text-slate-600">
            Tài liệu Word cần được tải xuống để mở bằng ứng dụng tương thích.
          </p>
          {error && <p className="mt-3 text-[13px] text-red-700">{error}</p>}
          {canRequestDownload ? (
            <button
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
              disabled={downloadLoading}
              onClick={downloadContent}
            >
              {downloadLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Tải file gốc
            </button>
          ) : (
            <p className="mt-4 text-[13px] font-medium text-amber-700">
              Vui lòng đăng nhập bằng tài khoản có quyền để tải file gốc.
            </p>
          )}
        </div>
      </PreviewShell>
    );
  }

  return (
    <PreviewShell
      filename={filename}
      onDownload={canRequestDownload ? downloadContent : undefined}
      downloadLoading={downloadLoading}
    >
      {error && <InlineError message={error} />}
      <div className="sticky top-[57px] z-10 flex flex-wrap items-center justify-center gap-2 border-b border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
        <span className="text-[13px] font-medium text-slate-700">
          {pdf?.numPages ?? 0} trang · Cuộn để xem
        </span>
        <div className="mx-1 h-6 w-px bg-slate-200" />
        <button
          aria-label="Thu nhỏ"
          className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
          disabled={zoom <= 0.6}
          onClick={() => setZoom((value) => Math.max(0.6, Number((value - 0.2).toFixed(1))))}
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="min-w-[48px] text-center text-[12px] text-slate-600">{Math.round(zoom * 100)}%</span>
        <button
          aria-label="Phóng to"
          className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
          disabled={zoom >= 2}
          onClick={() => setZoom((value) => Math.min(2, Number((value + 0.2).toFixed(1))))}
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>
      <main className="min-h-[calc(100vh-112px)] overflow-x-auto bg-slate-200 p-4 sm:p-6">
        <div className="mx-auto flex w-max min-w-full flex-col items-center gap-5">
          {pdf && Array.from({ length: pdf.numPages }, (_, index) => (
            <PdfPageCanvas
              key={index + 1}
              pdf={pdf}
              pageNumber={index + 1}
              zoom={zoom}
              viewportWidth={viewportWidth}
            />
          ))}
        </div>
      </main>
    </PreviewShell>
  );
}

function PdfPageCanvas({
  pdf,
  pageNumber,
  zoom,
  viewportWidth,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  zoom: number;
  viewportWidth: number;
}) {
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shouldRender, setShouldRender] = useState(pageNumber === 1);
  const [rendering, setRendering] = useState(false);
  const [pageError, setPageError] = useState("");
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  const estimatedWidth = Math.max(280, Math.min(viewportWidth - 32, 1080)) * zoom;
  const estimatedHeight = estimatedWidth * 1.414;

  useEffect(() => {
    if (shouldRender || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      // Keep the next page close enough for smooth scrolling without rendering
      // several high-resolution canvases during the initial page load.
      { rootMargin: "300px 0px" },
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [shouldRender]);

  useEffect(() => {
    if (!shouldRender || !canvasRef.current) return;

    let cancelled = false;
    let renderTask: RenderTask | null = null;

    const renderPage = async () => {
      setRendering(true);
      setPageError("");
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(280, Math.min(viewportWidth - 32, 1080));
        const fittedScale = availableWidth / baseViewport.width;
        const viewport = page.getViewport({ scale: fittedScale * zoom });
        // Capping the backing canvas prevents weak/high-DPI devices from
        // rendering multi-megapixel pages that are not visibly sharper.
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Trình duyệt không hỗ trợ canvas để hiển thị PDF.");

        const displayWidth = Math.floor(viewport.width);
        const displayHeight = Math.floor(viewport.height);
        setDimensions({ width: displayWidth, height: displayHeight });
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        renderTask = page.render({
          canvasContext: context,
          viewport,
          transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
        });
        await renderTask.promise;
      } catch (renderError) {
        if (!cancelled && (renderError as { name?: string })?.name !== "RenderingCancelledException") {
          setPageError(renderError instanceof Error ? renderError.message : "Không thể hiển thị trang PDF.");
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    };

    void renderPage();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pageNumber, pdf, shouldRender, viewportWidth, zoom]);

  return (
    <section ref={containerRef} className="flex flex-col items-center gap-2" aria-label={`Trang ${pageNumber}`}>
      <div
        className="relative bg-white shadow-lg"
        style={{
          width: dimensions?.width ?? estimatedWidth,
          height: dimensions?.height ?? estimatedHeight,
        }}
      >
        <canvas ref={canvasRef} className="block max-w-none" />
        {(!shouldRender || rendering) && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            {shouldRender ? (
              <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" />
            ) : (
              <span className="text-[12px] text-slate-400">Trang {pageNumber}</span>
            )}
          </div>
        )}
        {pageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 p-5 text-center text-[13px] text-red-700">
            {pageError}
          </div>
        )}
      </div>
      <span className="text-[12px] font-medium text-slate-600">Trang {pageNumber}</span>
    </section>
  );
}

function PreviewShell({
  filename,
  children,
  onDownload,
  downloadLoading = false,
}: {
  filename: string;
  children: React.ReactNode;
  onDownload?: () => void;
  downloadLoading?: boolean;
}) {
  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      <header className="sticky top-0 z-20 flex h-[57px] items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 shadow-sm">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold sm:text-[14px]">{filename}</p>
          <p className="text-[11px] text-slate-500">Trình xem tài liệu</p>
        </div>
        {onDownload && (
          <button
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
            disabled={downloadLoading}
            onClick={onDownload}
          >
            {downloadLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span className="hidden sm:inline">Tải xuống</span>
          </button>
        )}
      </header>
      {children}
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-[13px] text-red-700">
      {message}
    </div>
  );
}

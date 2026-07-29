import React from "react";
import { AlertTriangle, FileText, CheckCircle2, Clock, XCircle, UploadCloud, Archive, Info, Send } from "lucide-react";
import { Document, ProcessingStatus, PublicationStatus } from "../types";

export function NonRagNoticeBanner({
  reason,
  canSubmit,
  onSubmit
}: {
  reason?: string;
  canSubmit?: boolean;
  onSubmit?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-4 bg-amber-50/90 border border-amber-200 rounded-xl mb-6 text-amber-900 text-left shadow-xs">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="text-[14.5px] font-semibold text-amber-950">Tài liệu không hỗ trợ tính năng AI (Hỏi đáp & Sinh Quiz)</h4>
            <span className="text-[11px] font-medium bg-amber-100/90 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
              Đã xong Bước 2: Phân tích AI
            </span>
          </div>
          <p className="text-[13.5px] leading-relaxed text-amber-800/90 mb-2.5">
            Tài liệu dừng ở Bước 2 và không thể chuyển sang Bước 3 (Lập chỉ mục RAG) do nội dung tệp ở dạng <strong className="font-semibold text-amber-900">ảnh scan (không có văn bản chọn được)</strong>, file rỗng hoặc định dạng ngoài phạm vi trích xuất tự động của AI.
          </p>
          <div className="bg-white/80 border border-amber-200/80 rounded-lg p-3 text-[13px] text-amber-900 leading-normal">
            💡 <span className="font-semibold text-amber-950">Lưu ý:</span> Bạn <strong className="font-semibold text-amber-950">vẫn hoàn toàn có thể gửi duyệt tài liệu này</strong> để Admin kiểm duyệt thủ công và đưa vào Thư viện nhằm chia sẻ cho người dùng khác đọc/tải file trực tiếp.
          </div>
        </div>
      </div>
      {canSubmit && onSubmit && (
        <div className="flex justify-end pt-1">
          <button
            onClick={onSubmit}
            className="h-8.5 px-4 bg-[#0E0D0B] hover:bg-[#1C1A17] text-white text-[13px] font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border-none shadow-xs font-action"
          >
            <Send className="w-3.5 h-3.5" /> Gửi duyệt cho Admin
          </button>
        </div>
      )}
    </div>
  );
}

export function ProcessingErrorBanner({ reason, onRetry }: { reason: string, onRetry?: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-red-50 border border-red-100 rounded-xl mb-6">
      <div className="flex items-start gap-3 text-red-800 text-left">
        <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-[14.5px] font-semibold mb-1">Lỗi trích xuất AI</h4>
          <p className="text-[14px] leading-relaxed">{reason}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="h-8 px-4 bg-white border border-red-200 text-red-700 text-[13px] font-medium rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer"
        >
          Thử xử lý lại
        </button>
      )}
    </div>
  );
}

export function RejectionReasonBanner({ reason }: { reason: string }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl mb-6 text-red-800 text-left">
      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div>
        <h4 className="text-[14.5px] font-semibold mb-1">Tài liệu bị từ chối phê duyệt</h4>
        <p className="text-[11.5px] font-mono-label uppercase tracking-widest text-red-500 mb-1">Lý do từ chối</p>
        <p className="text-[14px] leading-relaxed">{reason}</p>
        <p className="text-[13px] mt-2 text-red-700/80">Vui lòng chỉnh sửa thông tin hoặc thay thế file trước khi gửi duyệt lại.</p>
      </div>
    </div>
  );
}

export function DocumentStatusTimeline({
  processing,
  publication,
  ragEligible
}: {
  processing: ProcessingStatus,
  publication: PublicationStatus,
  ragEligible?: boolean
}) {

  let step2Label = "Phân tích AI";
  if (processing === "ANALYZING") step2Label = "Đang phân tích";
  else if (processing === "ANALYZED") step2Label = "Đã phân tích";
  else if (processing === "FAILED" && !ragEligible) step2Label = "Lỗi phân tích";

  let step3Label = "Index RAG";
  if (processing === "PROCESSING") step3Label = "Đang index RAG";
  else if (processing === "PROCESSED") step3Label = "Đã index RAG";
  else if (processing === "FAILED" && ragEligible) step3Label = "Lỗi index RAG";

  const processingSteps = [
    { id: "UPLOADED", label: "Đã tải lên", icon: UploadCloud },
    { id: "ANALYZED", label: step2Label, icon: processing === "ANALYZING" ? Clock : CheckCircle2 },
    { id: "PROCESSED", label: step3Label, icon: processing === "PROCESSING" ? Clock : CheckCircle2 },
  ];

  const publicationSteps = [
    { id: publication === "REJECTED" ? "REJECTED" : "DRAFT", label: publication === "REJECTED" ? "Bị từ chối" : "Bản nháp", icon: FileText },
    { id: "PENDING_REVIEW", label: "Chờ duyệt", icon: Clock },
    { id: "PUBLISHED", label: "Đã xuất bản", icon: CheckCircle2 },
  ];
  if (publication === "ARCHIVED") {
    publicationSteps.push({ id: "ARCHIVED", label: "Đã lưu trữ", icon: Archive });
  }

  const getStepStatus = (current: string, stepId: string, type: "processing" | "publication") => {
    if (type === "publication") {
      if (current === stepId) return current === "REJECTED" ? "error" : "active";
      const pbOrder = ["DRAFT", "REJECTED", "PENDING_REVIEW", "PUBLISHED", "ARCHIVED"];
      const currIdx = pbOrder.indexOf(current);
      const stepIdx = pbOrder.indexOf(stepId);
      if (currIdx > stepIdx && current !== "REJECTED") return "completed";
      if (current === "REJECTED" && stepId === "DRAFT") return "completed";
      return "pending";
    }

    // For processing
    if (stepId === "UPLOADED") {
      return current === "UPLOADED" ? "active" : "completed";
    }

    if (stepId === "ANALYZED") {
      if (current === "ANALYZING") return "active";
      if (current === "FAILED" && !ragEligible) return "error";
      if (current === "ANALYZED" || current === "PROCESSING" || current === "PROCESSED") return "completed";
      if (current === "FAILED" && ragEligible) return "completed";
      return "pending";
    }

    if (stepId === "PROCESSED") {
      if (current === "PROCESSING") return "active";
      if (current === "PROCESSED") return "completed";
      if (current === "FAILED" && ragEligible) return "error";
      return "pending";
    }

    return "pending";
  };

  const renderTimeline = (steps: any[], current: string, type: "processing" | "publication", title: string) => (
    <div className="flex-1 text-left">
      <h4 className="text-[11.5px] font-mono-label text-[#AAAA9F] uppercase tracking-widest mb-4">{title}</h4>
      <div className="flex flex-col gap-4 relative">
        <div className="absolute left-[11px] top-3 bottom-4 w-px bg-[rgba(14,13,11,0.06)]" />
        {steps.map((step, i) => {
          const status = getStepStatus(current, step.id, type);
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex items-start gap-3 relative z-10">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${status === "completed" ? "bg-emerald-500 border-emerald-500 text-white" :
                  status === "active" ? "bg-white border-[#4F63D2] text-[#4F63D2]" :
                    status === "error" ? "bg-red-500 border-red-500 text-white" :
                      "bg-[#F8F7F4] border-[rgba(14,13,11,0.12)] text-[#C2BFB8]"
                }`}>
                {status === "completed" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3 h-3" />}
              </div>
              <div className="pt-0.5">
                <p className={`text-[14.5px] font-medium ${status === "active" ? "text-[#0E0D0B]" :
                    status === "error" ? "text-red-700" :
                      status === "completed" ? "text-[#0E0D0B]" : "text-[#AAAA9F]"
                  }`}>{step.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="bg-white border border-[rgba(14,13,11,0.07)] rounded-2xl p-6 flex flex-col sm:flex-row gap-8 sm:gap-4 mt-6">
      {renderTimeline(processingSteps, processing, "processing", "Tiến trình AI")}
      <div className="hidden sm:block w-px bg-[rgba(14,13,11,0.06)]" />
      {renderTimeline(publicationSteps, publication, "publication", "Xuất bản")}
    </div>
  );
}

export function DocumentMetadataPanel({ doc, isOwner }: { doc: Document, isOwner: boolean }) {
  const fields = [
    { label: "Môn học", value: doc.subject },
    { label: "Chủ đề", value: doc.topic },
    { label: "Chương", value: doc.chapter },
    { label: "Định dạng", value: `${doc.fileType} (${doc.fileSize})` },
    { label: "Tác giả / Tải lên bởi", value: doc.authorName },
    { label: "Ngày cập nhật", value: doc.updatedAt },
  ];

  if (doc.publishedAt) {
    fields.push({ label: "Ngày xuất bản", value: doc.publishedAt });
  }

  return (
    <div className="bg-white border border-[rgba(14,13,11,0.07)] rounded-2xl p-6 text-left">
      <h3 className="text-[17px] font-semibold text-[#0E0D0B] mb-5 font-sans-body">Thông tin học liệu</h3>
      <div className="space-y-4">
        {fields.filter(f => f.value).map(f => (
          <div key={f.label}>
            <p className="text-[12px] font-mono-label text-[#AAAA9F] uppercase tracking-widest mb-1">{f.label}</p>
            <p className="text-[14.5px] text-[#0E0D0B] font-sans">{f.value}</p>
          </div>
        ))}

        {doc.tags && doc.tags.length > 0 && (
          <div className="pt-2">
            <p className="text-[12px] font-mono-label text-[#AAAA9F] uppercase tracking-widest mb-2">Từ khóa (Tags)</p>
            <div className="flex flex-wrap gap-1.5">
              {doc.tags.map(t => (
                <span key={t} className="text-[12.5px] px-2 py-1 bg-[#F4F3F0] text-[#6B6963] rounded-md font-mono-label">
                  #{t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

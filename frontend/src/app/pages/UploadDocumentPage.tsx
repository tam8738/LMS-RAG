import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, X, ArrowRight, CheckCircle2, Clock, Loader2, AlertCircle } from "lucide-react";
import { UploadProgress, UploadStepper } from "../components/UploadProgress";
import { uploadService } from "../services/uploadService";
import { Document } from "../types";
import { ROUTES, myDocumentDetailPath } from "../routes";

export function UploadDocumentPage({
  onDone: propOnDone,
  onSuccess: propOnSuccess
}: {
  onDone?: () => void;
  onSuccess?: (id: number) => void;
}) {
  const navigate = useNavigate();
  const onDone = propOnDone ?? (() => navigate(ROUTES.MY_DOCUMENTS));
  const onSuccess = propOnSuccess ?? ((id: number) => navigate(myDocumentDetailPath(id)));
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [isSubmitActive, setIsSubmitActive] = useState(false);

  // Progress states
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedDoc, setUploadedDoc] = useState<Document | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [chapter, setChapter] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const abortUploadRef = useRef<(() => void) | null>(null);

  // Cleanup active upload on unmount
  useEffect(() => {
    return () => {
      if (abortUploadRef.current) {
        abortUploadRef.current();
      }
    };
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const validateAndSetFile = (f: File) => {
    const validTypes = ["application/pdf", "text/plain"];
    const fileExt = f.name.split(".").pop()?.toLowerCase();

    if (!validTypes.includes(f.type) && fileExt !== "pdf" && fileExt !== "txt") {
      setErrors({ file: "Chỉ hỗ trợ file PDF hoặc TXT." });
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setErrors({ file: "Kích thước file vượt quá 20MB." });
      return;
    }
    setErrors({});
    setFile(f);

    // Auto-fill title from filename without extension
    const nameWithoutExt = f.name.substring(0, f.name.lastIndexOf(".")) || f.name;
    setTitle(nameWithoutExt);
  };

  const handleNextToMetadata = () => {
    if (!file) {
      setErrors({ file: "Vui lòng chọn file trước khi tiếp tục." });
      return;
    }
    setStep(2);
  };

  const handleAddTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput("");
  };

  const handleUploadSubmit = async () => {
    if (isSubmitActive) return; // Prevent double submission
    if (!title.trim()) {
      setErrors({ title: "Tên tài liệu là bắt buộc." });
      return;
    }
    setErrors({});
    setStep(3);
    setUploadProgress(0);
    setUploadError(null);
    setIsSubmitActive(true);

    try {
      // 10. METADATA PAYLOAD VERIFICATION & TRIMMING
      const metadata: any = {
        title: title.trim(),
      };

      if (description.trim()) metadata.description = description.trim();
      if (subject.trim()) metadata.subject = subject.trim();
      if (topic.trim()) metadata.topic = topic.trim();
      if (chapter.trim()) metadata.chapter = chapter.trim();

      // Normalize tags: trim, filter empty, deduplicate
      const cleanTags = Array.from(
        new Set(tags.map((t) => t.trim()).filter(Boolean))
      );
      if (cleanTags.length > 0) {
        metadata.tags = cleanTags;
      }

      const { promise, abort } = uploadService.uploadDocument(
        file!,
        metadata,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      abortUploadRef.current = abort;

      const doc = await promise;

      // Cleanup ref and submission state
      abortUploadRef.current = null;
      setIsSubmitActive(false);
      setUploadedDoc(doc);
    } catch (err: any) {
      abortUploadRef.current = null;
      setIsSubmitActive(false);
      if (err.message === "YÊU_CẦU_BỊ_HỦY") {
        setStep(2);
        return;
      }
      setUploadError(err.message || "Tải lên thất bại. Vui lòng thử lại.");
    }
  };

  const handleCancelUpload = () => {
    if (abortUploadRef.current) {
      abortUploadRef.current();
      abortUploadRef.current = null;
    }
    setIsSubmitActive(false);
    setStep(2); // Go back to metadata editing
  };

  const handleReset = () => {
    if (abortUploadRef.current) {
      abortUploadRef.current();
      abortUploadRef.current = null;
    }
    setIsSubmitActive(false);
    setStep(1);
    setFile(null);
    setTitle("");
    setDescription("");
    setSubject("");
    setTopic("");
    setChapter("");
    setTags([]);
    setUploadProgress(0);
    setUploadError(null);
    setUploadedDoc(null);
  };

  return (
    <div className="w-full max-w-[600px] mx-auto py-8 text-left">
      <UploadStepper currentStep={step} />

      {step === 1 && (
        <div className="space-y-4">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed p-12 flex flex-col items-center gap-4 transition-all duration-200 ${dragging ? "border-[#4F63D2] bg-[#F0F2FF]" : "bg-white border-[rgba(14,13,11,0.12)] hover:border-[rgba(14,13,11,0.22)]"
              }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${dragging ? "bg-[#4F63D2]/10" : "bg-[#F4F3F0]"}`}>
              <Upload className={`w-5 h-5 transition-colors ${dragging ? "text-[#4F63D2]" : "text-[#6B6963]"}`} />
            </div>
            <div className="text-center font-sans-body">
              <p className="text-[14.5px] font-semibold text-[#0E0D0B] mb-1">
                Kéo thả file vào đây
              </p>
              <p className="text-[13px] text-[#AAAA9F]">hoặc click để chọn file (PDF, TXT - Tối đa 20MB)</p>
            </div>
            <label className="mt-2 h-9 px-4 bg-[#F4F3F0] hover:bg-[#ECEAE4] text-[#0E0D0B] text-[13px] font-medium rounded-lg transition-colors flex items-center justify-center cursor-pointer font-sans-body border-none">
              Chọn file từ máy
              <input type="file" accept=".pdf,.txt" className="hidden" onChange={e => {
                if (e.target.files && e.target.files[0]) validateAndSetFile(e.target.files[0]);
              }} />
            </label>
          </div>

          {errors.file && <p className="text-xs text-red-650 font-sans-body">{errors.file}</p>}

          {file && (
            <div className="flex items-center justify-between px-4 py-3 bg-white border border-[rgba(14,13,11,0.08)] rounded-xl shadow-sm">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText className="w-4 h-4 text-[#4F63D2] flex-shrink-0" />
                <div className="truncate">
                  <p className="text-[13.5px] text-[#0E0D0B] font-medium truncate font-sans-body">{file.name}</p>
                  <p className="text-[11.5px] text-[#AAAA9F] font-mono-label">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button onClick={() => setFile(null)} className="text-[#AAAA9F] hover:text-[#0E0D0B] p-1 rounded hover:bg-[#F4F3F0] transition-colors flex-shrink-0 border-none bg-transparent cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              onClick={handleNextToMetadata}
              disabled={!file}
              className={`flex items-center gap-2 h-10 px-5 text-[13px] font-medium rounded-xl transition-all cursor-pointer border-none font-sans-body ${file ? "bg-[#0E0D0B] text-white hover:bg-[#1C1A17]" : "bg-[#F4F3F0] text-[#C2BFB8] cursor-not-allowed"
                }`}
            >
              Tiếp tục <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-2xl border border-[rgba(14,13,11,0.07)] p-6 space-y-5 shadow-sm">
          <div>
            <label className="block mb-1.5 text-[13px] font-sans-body font-semibold text-[#6B6963] uppercase tracking-widest">
              Tên tài liệu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="VD: Lập trình Web với React"
              className="w-full h-10 px-3 bg-white border border-[rgba(14,13,11,0.12)] rounded-lg text-[13.5px] focus:outline-none focus:border-[#4F63D2] transition-colors text-slate-800 font-sans-body"
            />
            {errors.title && <p className="text-xs text-red-650 mt-1 font-sans-body">{errors.title}</p>}
          </div>

          <div>
            <label className="block mb-1.5 text-[13px] font-sans-body font-semibold text-[#6B6963] uppercase tracking-widest">Mô tả (Tùy chọn)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Tóm tắt nội dung tài liệu..."
              rows={3}
              className="w-full py-2 px-3 bg-white border border-[rgba(14,13,11,0.12)] rounded-lg text-[13.5px] resize-none focus:outline-none focus:border-[#4F63D2] transition-colors text-slate-800 font-sans-body"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-[13px] font-sans-body font-semibold text-[#6B6963] uppercase tracking-widest">Môn học</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="VD: Kỹ thuật phần mềm" className="w-full h-10 px-3 bg-white border border-[rgba(14,13,11,0.12)] rounded-lg text-[13.5px] focus:outline-none focus:border-[#4F63D2] text-slate-800 font-sans-body" />
            </div>
            <div>
              <label className="block mb-1.5 text-[13px] font-sans-body font-semibold text-[#6B6963] uppercase tracking-widest">Chủ đề</label>
              <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="VD: Frontend" className="w-full h-10 px-3 bg-white border border-[rgba(14,13,11,0.12)] rounded-lg text-[13.5px] focus:outline-none focus:border-[#4F63D2] text-slate-800 font-sans-body" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-[13px] font-sans-body font-semibold text-[#6B6963] uppercase tracking-widest">Chương (Tùy chọn)</label>
              <input type="text" value={chapter} onChange={e => setChapter(e.target.value)} placeholder="VD: Chương 1-3" className="w-full h-10 px-3 bg-white border border-[rgba(14,13,11,0.12)] rounded-lg text-[13.5px] focus:outline-none focus:border-[#4F63D2] text-slate-800 font-sans-body" />
            </div>
            <div>
              <label className="block mb-1.5 text-[13px] font-sans-body font-semibold text-[#6B6963] uppercase tracking-widest">Thẻ (Tags)</label>
              <div className="flex bg-white border border-[rgba(14,13,11,0.12)] rounded-lg overflow-hidden focus-within:border-[#4F63D2] transition-colors">
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                  placeholder="Nhập và Enter"
                  className="w-full h-10 px-3 text-[13.5px] focus:outline-none text-slate-800 font-sans-body"
                />
              </div>
            </div>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map(t => (
                <span key={t} className="flex items-center gap-1 bg-[#F4F3F0] text-[#6B6963] px-2 py-1 rounded-md text-[13px] font-mono-label">
                  #{t}
                  <button onClick={() => setTags(tags.filter(tag => tag !== t))} className="text-[#AAAA9F] hover:text-[#0E0D0B] border-none bg-transparent cursor-pointer"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-6 border-t border-[rgba(14,13,11,0.06)]">
            <button onClick={() => setStep(1)} className="h-10 px-4 text-[#6B6963] hover:text-[#0E0D0B] text-[13.5px] font-medium transition-colors border-none bg-transparent cursor-pointer font-sans-body">Quay lại</button>
            <button
              onClick={handleUploadSubmit}
              disabled={isSubmitActive}
              className="flex items-center gap-2 h-10 px-6 bg-[#0E0D0B] text-white text-[13.5px] font-medium rounded-xl hover:bg-[#1C1A17] transition-all shadow-sm cursor-pointer border-none font-sans-body disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              Tải lên
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-2xl border border-[rgba(14,13,11,0.07)] p-8 text-center shadow-sm">

          {/* Case 1: Uploading in progress */}
          {uploadProgress < 100 && !uploadError && !uploadedDoc && (
            <div className="max-w-[300px] mx-auto py-6">
              <Upload className="w-8 h-8 text-[#C2BFB8] mx-auto mb-4 animate-bounce" />
              <h3 className="text-[15.5px] font-medium text-[#0E0D0B] mb-2 font-sans-body font-semibold">Đang tải lên hệ thống...</h3>
              <UploadProgress progress={uploadProgress} />
              <p className="text-[13px] text-[#AAAA9F] mt-3 font-mono-label mb-6">{Math.floor(uploadProgress)}% hoàn tất</p>

              <button
                onClick={handleCancelUpload}
                className="h-9 px-4 bg-white border border-red-200 hover:bg-red-50 text-red-650 text-[13px] font-medium rounded-lg transition-colors cursor-pointer"
              >
                Hủy tải lên
              </button>
            </div>
          )}

          {/* Case 2: Upload failure */}
          {uploadError && (
            <div className="py-6 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-650" />
              </div>
              <h3 className="text-[18.5px] font-semibold text-[#0E0D0B] mb-2 font-sans-body">Tải lên thất bại</h3>
              <p className="text-[14px] text-[#6B6963] max-w-[400px] mb-8 font-sans-body">
                {uploadError}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="h-9 px-5 bg-[#0E0D0B] text-white text-[13.5px] font-medium rounded-lg hover:bg-[#1C1A17] transition-all shadow-sm cursor-pointer border-none font-sans-body">
                  Quay lại chỉnh sửa
                </button>
                <button onClick={handleReset} className="h-9 px-4 bg-white border border-[rgba(14,13,11,0.12)] text-[#0E0D0B] text-[13.5px] font-medium rounded-lg hover:border-[rgba(14,13,11,0.2)] transition-colors cursor-pointer font-sans-body">
                  Chọn file khác
                </button>
              </div>
            </div>
          )}

          {/* Case 3: Upload progress at 100% but document not yet set (Server processing) */}
          {uploadProgress >= 100 && !uploadError && !uploadedDoc && (
            <div className="max-w-[300px] mx-auto py-6">
              <Loader2 className="w-8 h-8 text-[#4F63D2] mx-auto mb-4 animate-spin" />
              <h3 className="text-[15.5px] font-medium text-[#0E0D0B] mb-2 font-sans-body font-semibold">Tải lên thành công!</h3>
              <p className="text-[13px] text-[#AAAA9F]">Đang xử lý phản hồi từ máy chủ...</p>
            </div>
          )}

          {/* Case 4: Upload completed with details */}
          {uploadedDoc && (
            <div className="py-6 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-[18.5px] font-semibold text-[#0E0D0B] mb-2 font-sans-body">Tải lên thành công!</h3>
              <p className="text-[14px] text-[#6B6963] max-w-[400px] mb-8 font-sans-body">
                Tài liệu "{uploadedDoc.title}" đã được tải lên hệ thống thành công. Hệ thống đang tiến hành phân tích nội dung.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => onSuccess && onSuccess(uploadedDoc.id)}
                  className="h-9 px-5 bg-[#0E0D0B] text-white text-[13.5px] font-medium rounded-lg hover:bg-[#1C1A17] transition-all shadow-sm cursor-pointer border-none font-sans-body"
                >
                  Xem chi tiết tài liệu
                </button>
                <button
                  onClick={onDone}
                  className="h-9 px-4 bg-white border border-[rgba(14,13,11,0.12)] text-[#0E0D0B] text-[13.5px] font-medium rounded-lg hover:border-[rgba(14,13,11,0.2)] transition-colors cursor-pointer font-sans-body"
                >
                  Quản lý tài liệu
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

import React, { useState } from "react";
import { Upload, FileText, X, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { UploadProgress, UploadStepper } from "../components/UploadProgress";

export function UploadDocumentPage({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [chapter, setChapter] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    if (!validTypes.includes(f.type)) {
      setErrors({ file: "Chỉ hỗ trợ file PDF hoặc TXT." });
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setErrors({ file: "Kích thước file vượt quá 20MB." });
      return;
    }
    setErrors({});
    setFile(f);
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

  const handleUploadSubmit = () => {
    if (!title.trim()) {
      setErrors({ title: "Tên tài liệu là bắt buộc." });
      return;
    }
    setErrors({});
    setStep(3);
    
    // Simulate upload progress
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 20;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
      }
      setUploadProgress(p);
    }, 200);
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
            className={`rounded-2xl border-2 border-dashed p-12 flex flex-col items-center gap-4 transition-all duration-200 ${
              dragging ? "border-[#4F63D2] bg-[#F0F2FF]" : "bg-white border-[rgba(14,13,11,0.12)] hover:border-[rgba(14,13,11,0.22)]"
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
              className={`flex items-center gap-2 h-10 px-5 text-[13px] font-medium rounded-xl transition-all cursor-pointer border-none font-sans-body ${
                file ? "bg-[#0E0D0B] text-white hover:bg-[#1C1A17]" : "bg-[#F4F3F0] text-[#C2BFB8] cursor-not-allowed"
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
            <button onClick={handleUploadSubmit} className="flex items-center gap-2 h-10 px-6 bg-[#0E0D0B] text-white text-[13.5px] font-medium rounded-xl hover:bg-[#1C1A17] transition-all shadow-sm cursor-pointer border-none font-sans-body">
              <Upload className="w-4 h-4" />
              Tải lên
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-2xl border border-[rgba(14,13,11,0.07)] p-8 text-center shadow-sm">
          {uploadProgress < 100 ? (
            <div className="max-w-[300px] mx-auto py-6">
              <Upload className="w-8 h-8 text-[#C2BFB8] mx-auto mb-4 animate-bounce" />
              <h3 className="text-[15.5px] font-medium text-[#0E0D0B] mb-2 font-sans-body font-semibold">Đang tải lên hệ thống...</h3>
              <UploadProgress progress={uploadProgress} />
              <p className="text-[13px] text-[#AAAA9F] mt-3 font-mono-label">{Math.floor(uploadProgress)}% hoàn tất</p>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-[18.5px] font-semibold text-[#0E0D0B] mb-2 font-sans-body">Tải lên thành công!</h3>
              <p className="text-[14px] text-[#6B6963] max-w-[300px] mb-6 font-sans-body">
                Tài liệu <strong>{title}</strong> đã được lưu thành bản nháp.
              </p>

              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl mb-8 text-left w-full max-w-[360px]">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <p className="text-[13.5px] text-amber-800 leading-relaxed font-sans-body">
                  Hệ thống AI đang xử lý file của bạn để trích xuất ngữ nghĩa. Bạn có thể kiểm tra trạng thái trong mục <strong>Tài liệu của tôi</strong>.
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setStep(1); setFile(null); setTitle(""); setTags([]); }} className="h-9 px-4 bg-white border border-[rgba(14,13,11,0.12)] text-[#0E0D0B] text-[13.5px] font-medium rounded-lg hover:border-[rgba(14,13,11,0.2)] transition-colors cursor-pointer font-sans-body">
                  Tải thêm file
                </button>
                <button onClick={onDone} className="h-9 px-5 bg-[#0E0D0B] text-white text-[13.5px] font-medium rounded-lg hover:bg-[#1C1A17] transition-all shadow-sm cursor-pointer border-none font-sans-body">
                  Về Tài liệu của tôi
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

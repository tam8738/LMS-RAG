import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Upload, Sparkles, ShieldCheck, Database, ArrowRight, CheckCircle2 } from "lucide-react";

interface LibraryProcessDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LibraryProcessDialog({ isOpen, onClose }: LibraryProcessDialogProps) {
  // ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const steps = [
    {
      number: "01",
      icon: Upload,
      title: "Biên soạn & Upload",
      subtitle: "Giảng viên",
      description: "Giảng viên tải lên tài liệu học liệu, slide bài giảng hoặc giáo trình PDF/Word.",
      badgeColor: "bg-indigo-50 text-indigo-600 border-indigo-100",
      accent: "from-indigo-500/10 to-indigo-500/0",
    },
    {
      number: "02",
      icon: Sparkles,
      title: "AI Phân tích",
      subtitle: "Hệ thống AI",
      description: "AI trích xuất cấu trúc chương mục, kiểm tra định dạng và đánh giá độ phù hợp.",
      badgeColor: "bg-purple-50 text-purple-600 border-purple-100",
      accent: "from-purple-500/10 to-purple-500/0",
    },
    {
      number: "03",
      icon: ShieldCheck,
      title: "Kiểm duyệt nội dung",
      subtitle: "Ban Quản trị",
      description: "Ban Quản trị thẩm định nội dung học liệu đảm bảo độ chuẩn xác trước khi công bố.",
      badgeColor: "bg-emerald-50 text-emerald-600 border-emerald-100",
      accent: "from-emerald-500/10 to-emerald-500/0",
    },
    {
      number: "04",
      icon: Database,
      title: "Xuất bản & RAG AI",
      subtitle: "Thư viện & Trợ lý",
      description: "Học liệu lên Thư viện đọc trực tuyến và được lập chỉ mục cho trợ lý AI Giảng viên.",
      badgeColor: "bg-blue-50 text-blue-600 border-blue-100",
      accent: "from-blue-500/10 to-blue-500/0",
    },
  ];

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-md transition-all duration-300 font-sans"
    >
      <style>{`
        @keyframes modalEnter {
          0% { opacity: 0; transform: scale(0.94) translateY(12px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-enter {
          animation: modalEnter 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Modal Dialog Content Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-4xl overflow-hidden relative text-left animate-modal-enter my-auto flex flex-col"
      >
        {/* Header Section */}
        <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-indigo-50/20">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold uppercase tracking-wider mb-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Quy trình quản lý học liệu chuẩn
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-heading">
              Vòng đời xuất bản Học liệu EduRAG
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-sans">
              4 bước khép kín đảm bảo chất lượng tri thức từ biên soạn đến tích hợp trợ lý RAG AI.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-all border-none cursor-pointer flex-shrink-0 ml-4"
            title="Đóng cửa sổ (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Horizontal Steps Stepper Grid */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
            {steps.map((step, idx) => {
              const StepIcon = step.icon;
              const isLast = idx === steps.length - 1;

              return (
                <div key={step.number} className="relative flex flex-col">
                  {/* Step Card */}
                  <div className="h-full p-5 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/50 via-white to-slate-50/20 hover:border-slate-300 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group relative overflow-hidden text-left">

                    {/* Background accent tint */}
                    <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${step.accent}`} />

                    <div>
                      {/* Step Header info */}
                      <div className="flex items-center justify-between mb-3.5">
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${step.badgeColor} shadow-3xs`}>
                          <StepIcon className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">
                          BƯỚC {step.number}
                        </span>
                      </div>

                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-0.5">
                        {step.subtitle}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 leading-snug mb-2 font-heading">
                        {step.title}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-sans font-normal">
                        {step.description}
                      </p>
                    </div>

                    {/* Step Indicator arrow on desktop */}
                    {!isLast && (
                      <div className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-400 items-center justify-center shadow-xs">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Footer Banner */}
          <div className="p-4 sm:p-4.5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 flex-shrink-0">
                <ShieldCheck className="w-5.5 h-5.5" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white mb-0.5">Cam kết chất lượng tri thức</h5>
                <p className="text-[12px] text-slate-300 leading-normal font-sans">
                  Tất cả học liệu xuất bản trên Thư viện công cộng đều được Ban Quản trị khoa CNTT kiểm duyệt trước khi đưa vào sử dụng.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full sm:w-auto h-10 px-6 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-xl transition-all border-none cursor-pointer flex-shrink-0 font-action shadow-sm"
            >
              Đóng cửa sổ
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

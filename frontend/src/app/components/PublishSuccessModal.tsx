import React, { useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Copy, Check, ExternalLink, Share2 } from "lucide-react";
import { QuizResponse, getPublicQuizUrl } from "../services/quizService";

interface PublishSuccessModalProps {
  quiz: QuizResponse;
  onClose: () => void;
}

export function PublishSuccessModal({ quiz, onClose }: PublishSuccessModalProps) {
  const [copied, setCopied] = useState(false);
  const publicUrl = getPublicQuizUrl(quiz.id);

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleOpenPublicPage = () => {
    window.open(publicUrl, "_blank");
  };

  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 animate-fadeIn">
      <div onClick={onClose} className="fixed inset-0 bg-[#0E0D0B]/50 backdrop-blur-sm" />

      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl relative z-50 text-left overflow-hidden border border-gray-100 animate-[fade-in_150ms_ease-out]">
        {/* Top Decorative Banner */}
        <div className="bg-gradient-to-br from-emerald-500 via-teal-600 to-indigo-600 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 blur-xl" />
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-3 shadow-inner">
            <CheckCircle2 className="w-8 h-8 text-white animate-bounce" />
          </div>
          <h3 className="text-[18px] font-bold tracking-tight">Sinh quiz thành công!</h3>
          <p className="text-[13px] text-emerald-100 mt-1">Đường dẫn ôn tập đã sẵn sàng để chia sẻ cho sinh viên</p>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-5">
          {/* Quiz Metadata */}
          <div className="bg-[#F8F7F4] rounded-xl p-3.5 border border-gray-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Mã Quiz #{quiz.id}</span>
              <span className="text-[11.5px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Đã công bố
              </span>
            </div>
            <h4 className="text-[14px] font-bold text-[#0E0D0B]">{quiz.title}</h4>
            <p className="text-[12px] text-[#6B6963] flex items-center gap-2 pt-0.5">
              <span>{quiz.questions ? quiz.questions.length : quiz.questionCount} câu hỏi</span>
              <span>•</span>
              <span>{quiz.language === "vi" ? "Tiếng Việt" : "Tiếng Anh"}</span>
            </p>
          </div>

          {/* Copy Share Link Field */}
          <div className="space-y-1.5">
            <label className="block text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Đường dẫn ôn tập chia sẻ (Public Link)</span>
            </label>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="flex-1 h-10 border border-gray-200 rounded-xl px-3 text-[13px] text-indigo-900 font-mono bg-gray-50 focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className={`h-10 px-3.5 rounded-xl border text-[12.5px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  copied
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                    : "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Đã sao chép!" : "Sao chép"}</span>
              </button>
            </div>
            {copied && (
              <p className="text-[12px] text-emerald-600 font-medium flex items-center gap-1 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Đã sao chép liên kết ôn tập vào bộ nhớ tạm!
              </p>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-[#F8F7F4]/60">
          <button
            onClick={onClose}
            className="h-9.5 px-4 border border-gray-300 rounded-xl text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
          >
            Đóng
          </button>

          <button
            onClick={handleOpenPublicPage}
            className="h-9.5 px-4 border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[13px] font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Mở trang làm bài</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}


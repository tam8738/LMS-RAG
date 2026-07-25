import React, { useState, useEffect } from "react";
import { X, Sparkles, BookOpen, Globe, Sliders, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { quizService, QuizResponse } from "../services/quizService";
import { libraryService } from "../services/libraryService";
import { LibraryDocument } from "../types";

interface GenerateQuizModalProps {
  initialDocumentId?: number;
  onClose: () => void;
  onSuccess: (quiz: QuizResponse) => void;
}

export function GenerateQuizModal({ initialDocumentId, onClose, onSuccess }: GenerateQuizModalProps) {
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | undefined>(initialDocumentId);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [language, setLanguage] = useState<"vi" | "en">("vi");

  const [loadingDocs, setLoadingDocs] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [error, setError] = useState("");

  // Load available documents if initialDocumentId is not provided
  useEffect(() => {
    async function loadDocs() {
      setLoadingDocs(true);
      try {
        const res = await libraryService.getLibrary({ page: 0, size: 100 });
        setDocuments(res.documents);
        if (!selectedDocId && res.documents.length > 0) {
          setSelectedDocId(res.documents[0].id);
        }
      } catch (err) {
        console.error("Failed to load documents for quiz generation", err);
      } finally {
        setLoadingDocs(false);
      }
    }
    loadDocs();
  }, [initialDocumentId]);

  // Simulate AI Generation loading steps
  useEffect(() => {
    let timer: any;
    if (generating) {
      setGenerationStep(1);
      timer = setInterval(() => {
        setGenerationStep(prev => (prev < 3 ? prev + 1 : prev));
      }, 1500);
    } else {
      setGenerationStep(0);
    }
    return () => clearInterval(timer);
  }, [generating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId) {
      setError("Vui lòng chọn tài liệu để sinh Quiz.");
      return;
    }

    setGenerating(true);
    setError("");

    try {
      const quiz = await quizService.generateQuiz({
        documentId: selectedDocId,
        questionCount,
        language,
      });
      onSuccess(quiz);
    } catch (err: any) {
      setError(err.message || "Không thể sinh Quiz từ tài liệu. Vui lòng thử lại.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-fadeIn">
      <div onClick={generating ? undefined : onClose} className="fixed inset-0 bg-[#0E0D0B]/40 backdrop-blur-sm" />

      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl relative z-50 text-left overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50/60 to-purple-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-[16.5px] font-bold text-[#0E0D0B]">Sinh Quiz tự động bằng AI</h3>
              <p className="text-[12px] text-[#6B6963]">Trích xuất câu hỏi trắc nghiệm từ tài liệu đã chọn</p>
            </div>
          </div>
          {!generating && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {generating ? (
          /* AI Generation Loading State */
          <div className="p-8 text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100 animate-ping opacity-75" />
              <div className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                <Sparkles className="w-8 h-8 animate-spin" />
              </div>
            </div>

            <div>
              <h4 className="text-[16px] font-bold text-[#0E0D0B]">AI đang xử lý & sinh Quiz...</h4>
              <p className="text-[13px] text-[#6B6963] mt-1">Quá trình này mất khoảng 5-10 giây tùy số lượng câu hỏi</p>
            </div>

            <div className="space-y-2.5 max-w-xs mx-auto text-left text-[12.5px]">
              <div className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-all ${generationStep >= 1 ? "bg-indigo-50 text-indigo-900 font-medium" : "text-gray-400"}`}>
                {generationStep > 1 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
                <span>Đang phân tích nội dung tài liệu...</span>
              </div>
              <div className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-all ${generationStep >= 2 ? "bg-indigo-50 text-indigo-900 font-medium" : "text-gray-400"}`}>
                {generationStep > 2 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : generationStep === 2 ? <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> : <div className="w-4 h-4 rounded-full border border-gray-300" />}
                <span>Đang trích xuất kiến thức trọng tâm...</span>
              </div>
              <div className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-all ${generationStep >= 3 ? "bg-indigo-50 text-indigo-900 font-medium" : "text-gray-400"}`}>
                {generationStep === 3 ? <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> : <div className="w-4 h-4 rounded-full border border-gray-300" />}
                <span>Đang hoàn thiện câu hỏi và lời giải...</span>
              </div>
            </div>
          </div>
        ) : (
          /* Form Controls */
          <form onSubmit={handleSubmit} className="p-6 space-y-4.5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[12.5px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Document Selection */}
            <div>
              <label className="block text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tài liệu nguồn</span>
              </label>
              {loadingDocs ? (
                <div className="h-10 border border-gray-200 rounded-xl bg-gray-50 animate-pulse flex items-center px-3.5 text-[13px] text-gray-400">
                  Đang tải danh sách tài liệu...
                </div>
              ) : (
                <select
                  value={selectedDocId || ""}
                  onChange={e => setSelectedDocId(Number(e.target.value))}
                  required
                  className="w-full h-10 border border-gray-200 rounded-xl px-3.5 text-[13.5px] text-[#0E0D0B] bg-white focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {documents.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title} ({doc.pageCount ? `${doc.pageCount} trang` : "Tài liệu"})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Question Count Slider & Counter */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Số lượng câu hỏi</span>
                </label>
                <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[12px] font-bold">
                  {questionCount} câu
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={questionCount}
                onChange={e => setQuestionCount(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[11px] text-[#AAAA9F] mt-1 font-mono-label">
                <span>1 câu</span>
                <span>5 câu</span>
                <span>10 câu (Tối đa)</span>
              </div>
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-600" />
                <span>Ngôn ngữ bộ Quiz</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setLanguage("vi")}
                  className={`h-10 rounded-xl border text-[13px] font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    language === "vi"
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span>🇻🇳 Tiếng Việt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`h-10 rounded-xl border text-[13px] font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    language === "en"
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span>🇬🇧 Tiếng Anh</span>
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-4 border border-gray-300 rounded-xl text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={!selectedDocId}
                className="h-10 px-5 border-none rounded-xl text-[13px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                <span>Bắt đầu sinh Quiz AI</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Sparkles, BookOpen, Globe, Sliders, CheckCircle2, AlertCircle, Loader2, Shuffle, ChevronDown, Check, FileText } from "lucide-react";
import { quizService, QuizResponse } from "../services/quizService";
import { libraryService } from "../services/libraryService";
import { LibraryDocument } from "../types";
import { canUseDocumentRag } from "../utils/documentHelpers";

interface GenerateQuizModalProps {
  initialDocumentId?: number;
  onClose: () => void;
  onSuccess: (quiz: QuizResponse) => void;
}

const MIN_QUIZ_QUESTION_COUNT = 1;
const MAX_QUIZ_QUESTION_COUNT = 20;

function clampQuestionCount(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_QUIZ_QUESTION_COUNT;
  }
  return Math.max(MIN_QUIZ_QUESTION_COUNT, Math.min(MAX_QUIZ_QUESTION_COUNT, value));
}

function DocumentSelectDropdown({
  documents,
  selectedDocId,
  onSelect,
}: {
  documents: LibraryDocument[];
  selectedDocId?: number;
  onSelect: (docId: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedDoc = documents.find(d => d.id === selectedDocId) || documents[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full min-h-[44px] sm:h-11 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-[13.5px] text-[#0E0D0B] font-medium transition-all flex items-center justify-between gap-2.5 cursor-pointer focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 ${isOpen ? "border-indigo-500 ring-4 ring-indigo-500/10" : "hover:border-gray-300"
          }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
          <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <span className="truncate font-semibold text-[#0E0D0B] text-[13.5px]">
            {selectedDoc ? selectedDoc.title : "Chọn tài liệu..."}
          </span>
          {selectedDoc?.pageCount ? (
            <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md flex-shrink-0">
              {selectedDoc.pageCount} trang
            </span>
          ) : null}
        </div>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-indigo-600" : ""
            }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-[150] max-h-60 overflow-y-auto rounded-2xl border border-gray-200/90 bg-white p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.14)] text-left font-sans animate-fadeIn">
          {documents.map(doc => {
            const isSelected = doc.id === selectedDocId;
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => {
                  onSelect(doc.id);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2.5 px-3 py-2.5 text-[13px] rounded-xl transition-all border-none cursor-pointer mb-0.5 last:mb-0 ${isSelected
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "bg-transparent text-slate-800 hover:bg-slate-50 font-medium"
                  }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-gray-100 text-gray-500"
                      }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] leading-snug">{doc.title}</p>
                    {doc.subject && (
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {doc.subject}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {doc.pageCount ? (
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${isSelected
                          ? "bg-indigo-100/80 text-indigo-700 font-bold"
                          : "bg-gray-100 text-gray-500 font-medium"
                        }`}
                    >
                      {doc.pageCount} trang
                    </span>
                  ) : null}
                  {isSelected && <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function GenerateQuizModal({ initialDocumentId, onClose, onSuccess }: GenerateQuizModalProps) {
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | undefined>(initialDocumentId);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const [shuffleAnswers, setShuffleAnswers] = useState(true);

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
        const eligibleDocs = res.documents.filter(doc => canUseDocumentRag(doc));
        setDocuments(eligibleDocs);
        if (!selectedDocId && eligibleDocs.length > 0) {
          setSelectedDocId(eligibleDocs[0].id);
        } else if (selectedDocId && !eligibleDocs.some(d => d.id === selectedDocId)) {
          setSelectedDocId(eligibleDocs.length > 0 ? eligibleDocs[0].id : undefined);
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
        questionCount: clampQuestionCount(questionCount),
        language,
        shuffleAnswers,
      });
      onSuccess(quiz);
    } catch (err: any) {
      setError(err.message || "Không thể sinh Quiz từ tài liệu. Vui lòng thử lại.");
    } finally {
      setGenerating(false);
    }
  };

  return createPortal(
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
                <span>Tài liệu nguồn (Đã lập chỉ mục AI)</span>
              </label>
              {loadingDocs ? (
                <div className="h-11 border border-gray-200 rounded-xl bg-gray-50 animate-pulse flex items-center px-3.5 text-[13px] text-gray-400">
                  Đang tải danh sách tài liệu...
                </div>
              ) : documents.length === 0 ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-[12.5px] text-amber-900 leading-relaxed font-medium">
                  ⚠️ Chưa có tài liệu nào hỗ trợ AI (đã được xuất bản & lập chỉ mục RAG) trong Thư viện để sinh Quiz.
                </div>
              ) : (
                <DocumentSelectDropdown
                  documents={documents}
                  selectedDocId={selectedDocId}
                  onSelect={(docId) => setSelectedDocId(docId)}
                />
              )}
            </div>

            {/* Question Count Section: Range + Direct Input + Quick Presets */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Số lượng câu hỏi</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={MAX_QUIZ_QUESTION_COUNT}
                    value={questionCount}
                    onChange={e => {
                      const val = parseInt(e.target.value, 10);
                      setQuestionCount(clampQuestionCount(val));
                    }}
                    className="w-16 h-7.5 text-center text-[13px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
                  />
                  <span className="text-[12.5px] font-semibold text-[#6B6963]">câu</span>
                </div>
              </div>

              {/* Slider for smooth dragging */}
              <input
                type="range"
                min={1}
                max={MAX_QUIZ_QUESTION_COUNT}
                value={questionCount}
                onChange={e => setQuestionCount(clampQuestionCount(Number(e.target.value)))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 my-2"
              />

              {/* Quick Presets */}
              <div className="flex items-center justify-between gap-1.5 mt-1 text-[11.5px]">
                <span className="text-[11px] text-[#AAAA9F] font-mono-label">Chọn nhanh:</span>
                <div className="flex items-center gap-1.5">
                  {[5, 10, 15, 20].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuestionCount(num)}
                      className={`px-2 py-0.5 rounded-md text-[11.5px] font-semibold transition-all cursor-pointer border ${questionCount === num
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                        }`}
                    >
                      {num} câu
                    </button>
                  ))}
                </div>
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
                  className={`h-10 rounded-xl border text-[13px] font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${language === "vi"
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  <span>🇻🇳 Tiếng Việt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`h-10 rounded-xl border text-[13px] font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${language === "en"
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  <span>🇬🇧 Tiếng Anh</span>
                </button>
              </div>
            </div>

            {/* Answer Shuffle */}
            <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={shuffleAnswers}
                onChange={e => setShuffleAnswers(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-indigo-600 cursor-pointer"
              />
              <span className="flex-1">
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#0E0D0B]">
                  <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
                  Xáo trộn đáp án sau khi sinh
                </span>
                <span className="block text-[12px] text-[#6B6963] mt-0.5 leading-relaxed">
                  Đổi vị trí A/B/C/D cho từng câu nhưng vẫn giữ đúng đáp án đúng.
                </span>
              </span>
            </label>
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
    </div>,
    document.body
  );
}

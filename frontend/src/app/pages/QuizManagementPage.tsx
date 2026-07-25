import React, { useState, useEffect, useRef } from "react";
import {
  HelpCircle, Plus, Search, Filter, RefreshCw, Sparkles, MoreVertical,
  Edit3, Eye, Send, CheckCircle2, AlertCircle, BookOpen, Clock, Globe, FileText
} from "lucide-react";
import { quizService, QuizResponse } from "../services/quizService";
import { GenerateQuizModal } from "../components/GenerateQuizModal";
import { QuizEditorModal } from "../components/QuizEditorModal";
import { QuizPreviewModal } from "../components/QuizPreviewModal";
import { PageLoading, EmptyState } from "../components/EmptyState";

export function QuizManagementPage() {
  const [quizzes, setQuizzes] = useState<QuizResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DRAFT" | "PUBLISHED">("ALL");

  // Modals state
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [activeQuizForEdit, setActiveQuizForEdit] = useState<QuizResponse | null>(null);
  const [activeQuizForPreview, setActiveQuizForPreview] = useState<QuizResponse | null>(null);

  // Kebab menu state
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load Quizzes on mount
  useEffect(() => {
    fetchQuizzes();
  }, []);

  // Close dropdown menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchQuizzes = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load saved quiz drafts from localStorage / cached responses
      const savedListStr = localStorage.getItem("saved_teacher_quizzes");
      let savedList: QuizResponse[] = savedListStr ? JSON.parse(savedListStr) : [];
      setQuizzes(savedList);
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách Quiz.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuizGenerated = (newQuiz: QuizResponse) => {
    setIsGenerateOpen(false);
    // Add to list
    const updated = [newQuiz, ...quizzes];
    setQuizzes(updated);
    try {
      localStorage.setItem("saved_teacher_quizzes", JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
    // Open editor for review
    setActiveQuizForEdit(newQuiz);
  };

  const handleQuizUpdated = (updatedQuiz: QuizResponse) => {
    const updated = quizzes.map(q => (q.id === updatedQuiz.id ? updatedQuiz : q));
    setQuizzes(updated);
    try {
      localStorage.setItem("saved_teacher_quizzes", JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };

  // Filtered quizzes
  const filteredQuizzes = quizzes.filter(q => {
    const matchesKeyword =
      !keyword.trim() ||
      q.title.toLowerCase().includes(keyword.trim().toLowerCase()) ||
      (q.description && q.description.toLowerCase().includes(keyword.trim().toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" || q.status === statusFilter;

    return matchesKeyword && matchesStatus;
  });

  const totalQuizzes = quizzes.length;
  const publishedCount = quizzes.filter(q => q.status === "PUBLISHED").length;
  const draftCount = quizzes.filter(q => q.status === "DRAFT").length;

  return (
    <div className="space-y-6 animate-fadeIn font-sans text-left pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h1 className="text-[22px] font-bold text-[#0E0D0B] tracking-tight">Quản lý Quiz AI</h1>
          </div>
          <p className="text-[13px] text-[#6B6963] mt-1">
            Sinh tự động bộ câu hỏi trắc nghiệm bằng AI từ tài liệu bài giảng, xem trích dẫn nguồn và công bố cho sinh viên.
          </p>
        </div>

        <button
          onClick={() => setIsGenerateOpen(true)}
          className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer border-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Sparkles className="w-4 h-4" />
          <span>Sinh Quiz bằng AI</span>
        </button>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[rgba(14,13,11,0.07)] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider">Tổng số bộ Quiz</p>
            <p className="text-[20px] font-bold text-[#0E0D0B] leading-none mt-1">{totalQuizzes}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[rgba(14,13,11,0.07)] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider">Đã công bố</p>
            <p className="text-[20px] font-bold text-emerald-700 leading-none mt-1">{publishedCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[rgba(14,13,11,0.07)] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider">Bản nháp</p>
            <p className="text-[20px] font-bold text-amber-700 leading-none mt-1">{draftCount}</p>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-[rgba(14,13,11,0.07)] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#AAAA9F] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="Tìm theo tiêu đề Quiz..."
            className="w-full h-10 pl-10 pr-4 bg-[#F8F7F4] border border-[#0E0D0B]/[0.08] rounded-xl text-[13.5px] text-[#0E0D0B] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-[#AAAA9F]"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center bg-[#F8F7F4] p-1 rounded-xl border border-[#0E0D0B]/[0.08] text-[12px] font-medium">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-2.5 py-1 rounded-lg border-none cursor-pointer transition-all ${
                statusFilter === "ALL" ? "bg-white text-[#0E0D0B] shadow-xs font-semibold" : "text-[#6B6963] hover:text-[#0E0D0B]"
              }`}
            >
              Tất cả ({totalQuizzes})
            </button>
            <button
              onClick={() => setStatusFilter("PUBLISHED")}
              className={`px-2.5 py-1 rounded-lg border-none cursor-pointer transition-all ${
                statusFilter === "PUBLISHED" ? "bg-white text-emerald-700 shadow-xs font-semibold" : "text-[#6B6963] hover:text-[#0E0D0B]"
              }`}
            >
              Đã công bố ({publishedCount})
            </button>
            <button
              onClick={() => setStatusFilter("DRAFT")}
              className={`px-2.5 py-1 rounded-lg border-none cursor-pointer transition-all ${
                statusFilter === "DRAFT" ? "bg-white text-amber-700 shadow-xs font-semibold" : "text-[#6B6963] hover:text-[#0E0D0B]"
              }`}
            >
              Bản nháp ({draftCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main Table / Quizzes view */}
      {loading ? (
        <PageLoading />
      ) : filteredQuizzes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[rgba(14,13,11,0.07)] p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-[#0E0D0B]">Chưa có bộ Quiz nào</h3>
            <p className="text-[13px] text-[#6B6963] mt-1 max-w-md mx-auto">
              Bấm nút bên dưới để chọn bài giảng và để AI tự động sinh bộ câu hỏi trắc nghiệm cho bạn.
            </p>
          </div>
          <button
            onClick={() => setIsGenerateOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold rounded-xl border-none cursor-pointer shadow-sm inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Sinh Quiz bằng AI ngay</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[rgba(14,13,11,0.07)] shadow-xs overflow-hidden min-h-[240px]">
          <div className="overflow-x-auto min-h-[240px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F7F4]/70 border-b border-[rgba(14,13,11,0.06)] text-[12px] font-semibold uppercase tracking-wider text-[#6B6963]">
                  <th className="py-3.5 px-5">Mã Quiz</th>
                  <th className="py-3.5 px-5">Tiêu đề Quiz</th>
                  <th className="py-3.5 px-5">Số câu hỏi</th>
                  <th className="py-3.5 px-5">Ngôn ngữ</th>
                  <th className="py-3.5 px-5">Trạng thái</th>
                  <th className="py-3.5 px-5">Ngày tạo</th>
                  <th className="py-3.5 px-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(14,13,11,0.05)] text-[13px]">
                {filteredQuizzes.map((quizItem, index) => {
                  const isPublished = quizItem.status === "PUBLISHED";
                  const isMenuOpen = activeMenuId === quizItem.id;
                  const isNearBottom = filteredQuizzes.length > 2 && index >= filteredQuizzes.length - 2;

                  return (
                    <tr key={quizItem.id} className="hover:bg-[#F8F7F4]/40 transition-colors group">
                      {/* Mã Quiz */}
                      <td className="py-3.5 px-5 font-mono-label text-[12.5px] font-semibold text-indigo-700">
                        QUIZ-#{quizItem.id}
                      </td>

                      {/* Tiêu đề & mô tả */}
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-[#0E0D0B] text-[13.5px] leading-tight">{quizItem.title}</p>
                        {quizItem.description && (
                          <p className="text-[12px] text-[#6B6963] truncate max-w-xs mt-0.5">{quizItem.description}</p>
                        )}
                      </td>

                      {/* Số câu */}
                      <td className="py-3.5 px-5 text-[#0E0D0B] font-medium">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[12px] font-bold">
                          {quizItem.questions ? quizItem.questions.length : quizItem.questionCount} câu
                        </span>
                      </td>

                      {/* Ngôn ngữ */}
                      <td className="py-3.5 px-5 text-[#6B6963]">
                        {quizItem.language === "vi" ? "🇻🇳 Tiếng Việt" : "🇬🇧 Tiếng Anh"}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border ${
                          isPublished ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? "bg-emerald-500" : "bg-amber-500"}`} />
                          {isPublished ? "Đã công bố" : "Bản nháp"}
                        </span>
                      </td>

                      {/* Ngày tạo */}
                      <td className="py-3.5 px-5 text-[#6B6963] text-[12.5px]">
                        {quizItem.createdAt ? new Date(quizItem.createdAt).toLocaleDateString("vi-VN") : "Hôm nay"}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-5 text-right relative">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setActiveMenuId(isMenuOpen ? null : quizItem.id);
                          }}
                          className="p-1.5 rounded-lg text-[#AAAA9F] hover:text-[#0E0D0B] hover:bg-[#F4F3F0] transition-colors border-none bg-transparent cursor-pointer outline-none"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {isMenuOpen && (
                          <div
                            ref={dropdownRef}
                            className={`absolute right-5 w-44 bg-white rounded-xl border border-[rgba(14,13,11,0.12)] shadow-xl py-1.5 z-50 text-left transition-all duration-100 ${
                              isNearBottom ? "bottom-10 origin-bottom-right" : "top-11 origin-top-right"
                            }`}
                          >
                            <button
                              onClick={() => { setActiveMenuId(null); setActiveQuizForEdit(quizItem); }}
                              className="w-full px-3.5 py-2 text-[13px] text-[#0E0D0B] hover:bg-[#F8F7F4] flex items-center gap-2 transition-all border-none bg-transparent cursor-pointer text-left"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                              Xem & Chỉnh sửa
                            </button>

                            <button
                              onClick={() => { setActiveMenuId(null); setActiveQuizForPreview(quizItem); }}
                              className="w-full px-3.5 py-2 text-[13px] text-[#0E0D0B] hover:bg-[#F8F7F4] flex items-center gap-2 transition-all border-none bg-transparent cursor-pointer text-left"
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-600" />
                              Làm thử Quiz
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Generate Quiz */}
      {isGenerateOpen && (
        <GenerateQuizModal
          onClose={() => setIsGenerateOpen(false)}
          onSuccess={handleQuizGenerated}
        />
      )}

      {/* MODAL: Quiz Editor */}
      {activeQuizForEdit && (
        <QuizEditorModal
          quiz={activeQuizForEdit}
          onClose={() => setActiveQuizForEdit(null)}
          onSuccess={handleQuizUpdated}
          onPreview={quizToPreview => {
            setActiveQuizForEdit(null);
            setActiveQuizForPreview(quizToPreview);
          }}
        />
      )}

      {/* MODAL: Quiz Preview */}
      {activeQuizForPreview && (
        <QuizPreviewModal
          quiz={activeQuizForPreview}
          onClose={() => setActiveQuizForPreview(null)}
        />
      )}
    </div>
  );
}

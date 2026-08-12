import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Save, Send, Eye, CheckCircle2, AlertCircle, FileText, BookOpen, Edit3, Plus, Trash2, Shuffle, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { quizService, QuizResponse, QuizQuestionResponse, shuffleQuestionAnswerOptions } from "../services/quizService";

interface QuizEditorModalProps {
  quiz: QuizResponse;
  onClose: () => void;
  onSuccess: (updatedQuiz: QuizResponse) => void;
  onPreview: (quiz: QuizResponse) => void;
  onPublishSuccess?: (publishedQuiz: QuizResponse) => void;
}

export function QuizEditorModal({ quiz, onClose, onSuccess, onPreview, onPublishSuccess }: QuizEditorModalProps) {
  const [title, setTitle] = useState(quiz.title || `Bộ Quiz tài liệu #${quiz.documentId}`);
  const [description, setDescription] = useState(quiz.description || "");
  const [studyNotes, setStudyNotes] = useState(
    quiz.studyNotes || "Tóm tắt kiến thức cốt lõi và nội dung ôn tập cho bài học."
  );
  const [questions, setQuestions] = useState<QuizQuestionResponse[]>(quiz.questions || []);

  const [activeTab, setActiveTab] = useState<number>(0);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const currentQ = questions[activeTab] || null;
  const isPublished = quiz.status === "PUBLISHED";

  const handleUpdateQuestionText = (val: string) => {
    if (isPublished) return;
    setQuestions(prev =>
      prev.map((q, idx) => (idx === activeTab ? { ...q, question: val } : q))
    );
  };


  const handleUpdateOptionText = (optionId: string, text: string) => {
    if (isPublished) return;
    setQuestions(prev =>
      prev.map((q, idx) => {
        if (idx !== activeTab) return q;
        const newOptions = q.options.map(opt =>
          opt.id === optionId ? { ...opt, text } : opt
        );
        return { ...q, options: newOptions };
      })
    );
  };

  const handleSetCorrectOption = (optionId: string) => {
    if (isPublished) return;
    setQuestions(prev =>
      prev.map((q, idx) =>
        idx === activeTab ? { ...q, correctOptionIds: [optionId] } : q
      )
    );
  };

  const handleUpdateExplanation = (val: string) => {
    if (isPublished) return;
    setQuestions(prev =>
      prev.map((q, idx) => (idx === activeTab ? { ...q, explanation: val } : q))
    );
  };

  const handleShuffleCurrentQuestionOptions = () => {
    if (isPublished || !currentQ) return;
    setQuestions(prev =>
      prev.map((q, idx) => (idx === activeTab ? shuffleQuestionAnswerOptions(q) : q))
    );
  };

  const handleAddQuestion = () => {
    if (isPublished) return;
    if (questions.length >= 20) {
      setError("Bộ Quiz chỉ tối đa 20 câu hỏi.");
      return;
    }
    const newQId = Date.now();
    const newQuestion: QuizQuestionResponse = {
      id: newQId,
      questionIndex: questions.length + 1,
      question: `Câu hỏi mới số ${questions.length + 1}`,
      type: "single_choice",
      options: [
        { id: "A", text: "Phương án A" },
        { id: "B", text: "Phương án B" },
        { id: "C", text: "Phương án C" },
        { id: "D", text: "Phương án D" },
      ],
      correctOptionIds: ["A"],
      explanation: "Giải thích cho câu hỏi mới.",
      citations: [],
    };

    setQuestions(prev => [...prev, newQuestion]);
    setActiveTab(questions.length);
  };

  const handleDeleteQuestion = (indexToDelete: number) => {
    if (isPublished) return;
    if (questions.length <= 1) {
      setError("Bộ Quiz phải có ít nhất 1 câu hỏi.");
      return;
    }
    const filtered = questions.filter((_, idx) => idx !== indexToDelete);
    setQuestions(filtered);
    setActiveTab(prev => Math.min(prev, filtered.length - 1));
  };

  const handleSaveDraft = async () => {
    if (isPublished) return;
    if (!title.trim()) {
      setError("Tiêu đề Quiz không được để trống.");
      return;
    }

    setSavingDraft(true);
    setError("");
    setToastMsg("");
    try {
      const updated = await quizService.updateQuiz(quiz.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        studyNotes: studyNotes.trim() || undefined,
        questions: questions.map(q => ({
          id: q.id,
          question: q.question.trim(),
          type: "single_choice",
          options: q.options.map(o => ({ id: o.id, text: o.text.trim() })),
          correctOptionIds: q.correctOptionIds,
          explanation: q.explanation.trim(),
        })),
      });

      setToastMsg("Đã lưu bản nháp thành công!");
      onSuccess(updated);
      setTimeout(() => setToastMsg(""), 3000);
    } catch (err: any) {
      setError(err.message || "Lưu nháp thất bại.");
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    if (isPublished) return;
    if (!title.trim()) {
      setError("Tiêu đề Quiz không được để trống.");
      return;
    }

    setPublishing(true);
    setError("");
    try {
      // 1. Update draft
      await quizService.updateQuiz(quiz.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        studyNotes: studyNotes.trim() || undefined,
        questions: questions.map(q => ({
          id: q.id,
          question: q.question.trim(),
          type: "single_choice",
          options: q.options.map(o => ({ id: o.id, text: o.text.trim() })),
          correctOptionIds: q.correctOptionIds,
          explanation: q.explanation.trim(),
        })),
      });

      // 2. Publish official Quiz
      const publishedQuiz = await quizService.publishQuiz(quiz.id);
      onSuccess(publishedQuiz);
      onClose();
      if (onPublishSuccess) {
        onPublishSuccess(publishedQuiz);
      }
    } catch (err: any) {
      setError(err.message || "Công bố Quiz thất bại.");
    } finally {
      setPublishing(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[160] flex items-start justify-center overflow-y-auto p-2 sm:p-4 md:p-6 animate-fadeIn">
      <div onClick={onClose} className="fixed inset-0 bg-[#0E0D0B]/40 backdrop-blur-sm" />

      <div className="relative z-50 flex w-full max-w-5xl h-[96vh] sm:h-auto sm:max-h-[calc(100vh-3.5rem)] flex-col overflow-hidden rounded-2xl bg-white text-left shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6 py-3 border-b border-gray-100 bg-white flex-shrink-0">
          <div className="min-w-0 flex items-center gap-2">
            <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] sm:text-[11.5px] font-bold uppercase shrink-0 ${
              isPublished ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              {isPublished ? "Đã công bố" : "Bản nháp"}
            </span>
            <span className="text-[11.5px] sm:text-[12px] text-[#AAAA9F] font-mono-label shrink-0">Quiz #{quiz.id}</span>
            <span className="text-[12px] sm:text-[12.5px] text-[#6B6963] truncate hidden sm:inline">
              {isPublished ? "Xem nội dung ôn tập, câu hỏi, đáp án và lời giải thích" : "Biên tập nội dung ôn tập, câu hỏi, đáp án và lời giải thích"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => onPreview({ ...quiz, title, description, studyNotes, questions })}
              className="h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[#0E0D0B] text-[12px] sm:text-[12.5px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
              <span>Làm thử</span>
            </button>
            <button onClick={onClose} className="p-1 sm:p-1.5 text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* DESKTOP Left Sidebar: General Info + Vertical Question List */}
          <div className="hidden md:flex w-72 lg:w-80 min-h-0 border-r border-gray-100 bg-[#F8F7F4]/30 p-4 flex-col flex-shrink-0 overflow-y-auto space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider mb-1">
                {isPublished ? "Tiêu đề Quiz" : "Tiêu đề Quiz *"}
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                readOnly={isPublished}
                className="w-full h-9 border border-gray-200 rounded-lg px-2.5 text-[12.5px] font-semibold text-[#0E0D0B] bg-white focus:outline-none focus:border-indigo-500 read-only:bg-gray-50 read-only:text-gray-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider mb-1">
                Tóm tắt kiến thức ôn tập
              </label>
              <textarea
                value={studyNotes}
                onChange={e => setStudyNotes(e.target.value)}
                readOnly={isPublished}
                rows={3}
                placeholder="Nhập nội dung tóm tắt cho sinh viên ôn tập..."
                className="w-full border border-gray-200 rounded-lg p-2 text-[12px] text-[#0E0D0B] bg-white focus:outline-none focus:border-indigo-500 resize-none read-only:bg-gray-50 read-only:text-gray-600"
              />
            </div>

            <div className="border-t border-gray-200 pt-3 space-y-2 flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between flex-shrink-0">
                <span className="text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider">
                  Câu hỏi ({questions.length}/20)
                </span>
                {!isPublished && (
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="text-[11.5px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 border-none bg-transparent cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm
                  </button>
                )}
              </div>

              <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                {questions.map((q, idx) => (
                  <button
                    key={q.id || idx}
                    type="button"
                    onClick={() => setActiveTab(idx)}
                    className={`w-full p-2.5 rounded-xl border text-left text-[12.5px] font-medium transition-all cursor-pointer flex items-center justify-between ${
                      activeTab === idx
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs font-semibold"
                        : "border-gray-100 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="truncate pr-3">Câu {idx + 1}: {q.question}</span>
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                      {q.correctOptionIds[0] || "A"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* MOBILE Top Header Area: Info Accordion & Horizontal Question Bar */}
          <div className="block md:hidden border-b border-gray-100 bg-[#F8F7F4]/50 flex-shrink-0">
            {/* Collapsible Info Drawer */}
            <div className="px-3.5 py-2 border-b border-gray-100 flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#0E0D0B] truncate max-w-[200px]">
                {title || "Bộ Quiz"}
              </span>
              <button
                type="button"
                onClick={() => setIsInfoExpanded(prev => !prev)}
                className="text-[11.5px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 border-none bg-transparent cursor-pointer px-1 py-0.5"
              >
                <span>{isInfoExpanded ? "Thu gọn thông tin" : "Sửa thông tin Quiz"}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isInfoExpanded ? "rotate-180" : ""}`} />
              </button>
            </div>

            {isInfoExpanded && (
              <div className="p-3.5 space-y-2.5 bg-white border-b border-gray-200 animate-fadeIn text-left">
                <div>
                  <label className="block text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider mb-1">
                    Tiêu đề Quiz
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    readOnly={isPublished}
                    className="w-full h-9 border border-gray-200 rounded-lg px-2.5 text-[13px] font-semibold text-[#0E0D0B] bg-white focus:outline-none focus:border-indigo-500 read-only:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider mb-1">
                    Tóm tắt kiến thức ôn tập
                  </label>
                  <textarea
                    value={studyNotes}
                    onChange={e => setStudyNotes(e.target.value)}
                    readOnly={isPublished}
                    rows={2}
                    placeholder="Nhập nội dung tóm tắt..."
                    className="w-full border border-gray-200 rounded-lg p-2 text-[12px] text-[#0E0D0B] bg-white focus:outline-none focus:border-indigo-500 resize-none read-only:bg-gray-50"
                  />
                </div>
              </div>
            )}

            {/* Mobile Question Horizontal Scrollable Selector */}
            <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto scrollbar-hide">
              {questions.map((q, idx) => {
                const isActive = activeTab === idx;
                return (
                  <button
                    key={q.id || idx}
                    type="button"
                    onClick={() => setActiveTab(idx)}
                    className={`flex-shrink-0 h-8 px-2.5 sm:px-3 rounded-lg text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span>Câu {idx + 1}</span>
                    <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      isActive ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-700"
                    }`}>
                      {q.correctOptionIds[0] || "A"}
                    </span>
                  </button>
                );
              })}

              {!isPublished && questions.length < 20 && (
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="flex-shrink-0 h-8 px-2.5 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 text-indigo-700 text-[12px] font-semibold flex items-center gap-1 cursor-pointer hover:bg-indigo-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Main Editor Area */}
          <div className="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[12.5px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {toastMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[12.5px] font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{toastMsg}</span>
              </div>
            )}

            {currentQ ? (
              <div className="space-y-4 sm:space-y-5 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[12.5px] font-bold">
                      Câu {activeTab + 1} / {questions.length}
                    </span>
                  </div>
                  {!isPublished && (
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(activeTab)}
                      className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 border-none bg-transparent cursor-pointer p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xóa câu này
                    </button>
                  )}
                </div>

                {/* Question Input */}
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider mb-1">
                    Nội dung câu hỏi
                  </label>
                  <textarea
                    value={currentQ.question}
                    onChange={e => handleUpdateQuestionText(e.target.value)}
                    readOnly={isPublished}
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl p-3 text-[13.5px] font-medium text-[#0E0D0B] bg-white focus:outline-none focus:border-indigo-500 leading-relaxed read-only:bg-gray-50 read-only:text-gray-600"
                  />
                </div>

                {/* Options List */}
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="block text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider">
                      {isPublished ? "Lựa chọn đáp án" : "Lựa chọn đáp án (Bấm radio để chọn đáp án đúng)"}
                    </label>
                    {!isPublished && (
                      <button
                        type="button"
                        onClick={handleShuffleCurrentQuestionOptions}
                        className="h-7.5 sm:h-8 px-2 sm:px-2.5 rounded-lg border border-indigo-100 bg-indigo-50 text-[11.5px] sm:text-[12px] font-semibold text-indigo-700 hover:bg-indigo-100 cursor-pointer flex items-center gap-1.5"
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                        <span>Xáo trộn</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:gap-2.5">
                    {currentQ.options.map(opt => {
                      const isCorrect = currentQ.correctOptionIds.includes(opt.id);

                      return (
                        <div
                          key={opt.id}
                          className={`flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl border transition-all ${
                            isCorrect
                              ? "border-emerald-500 bg-emerald-50/50 text-emerald-950"
                              : "border-gray-200 bg-white"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`correct_${activeTab}`}
                            checked={isCorrect}
                            onChange={() => handleSetCorrectOption(opt.id)}
                            disabled={isPublished}
                            className="w-4 h-4 sm:w-4.5 sm:h-4.5 accent-emerald-600 cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
                          />
                          <span className={`w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-lg font-bold text-[11.5px] sm:text-[12px] flex items-center justify-center flex-shrink-0 ${
                            isCorrect ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700"
                          }`}>
                            {opt.id}
                          </span>
                          <input
                            type="text"
                            value={opt.text}
                            onChange={e => handleUpdateOptionText(opt.id, e.target.value)}
                            readOnly={isPublished}
                            className="flex-1 min-w-0 border-none bg-transparent text-[13px] sm:text-[13.5px] font-medium text-[#0E0D0B] focus:outline-none read-only:text-gray-600"
                          />
                          {isCorrect && (
                            <span className="text-[10.5px] sm:text-[11.5px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex-shrink-0">
                              Đúng
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider mb-1.5">
                    Lời giải thích chi tiết
                  </label>
                  <textarea
                    value={currentQ.explanation || ""}
                    onChange={e => handleUpdateExplanation(e.target.value)}
                    readOnly={isPublished}
                    rows={2}
                    placeholder="Giải thích vì sao đáp án trên là chính xác..."
                    className="w-full border border-gray-200 rounded-xl p-3 text-[13px] text-[#0E0D0B] bg-white focus:outline-none focus:border-indigo-500 leading-relaxed read-only:bg-gray-50 read-only:text-gray-600"
                  />
                </div>

                {/* Citations / Source Excerpt */}
                {currentQ.citations && currentQ.citations.length > 0 && (
                  <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 text-[12px] font-bold uppercase tracking-wider">
                      <BookOpen className="w-4 h-4 text-amber-700" />
                      <span>Trích dẫn nguồn tài liệu</span>
                    </div>
                    {currentQ.citations.map((cit, cIdx) => (
                      <div key={cIdx} className="text-[12.5px] text-amber-950 space-y-1">
                        <span className="inline-block px-2 py-0.5 bg-amber-100 rounded-md text-[11px] font-bold text-amber-800">
                          Trang {cit.pageNumber || 1}
                        </span>
                        <p className="italic bg-white/70 p-2.5 rounded-lg border border-amber-200/50 text-[12px] leading-relaxed">
                          "{cit.excerpt}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                Chưa chọn câu hỏi nào để chỉnh sửa.
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-[#F8F7F4]/60 flex-shrink-0 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={onClose}
            className="h-9 sm:h-10 px-3.5 sm:px-4 border border-gray-300 rounded-xl text-[12.5px] sm:text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
          >
            Đóng
          </button>
          {!isPublished && (
            <div className="flex items-center gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingDraft || publishing}
                className="h-9 sm:h-10 px-3.5 sm:px-4 border border-gray-300 rounded-xl text-[12.5px] sm:text-[13px] font-semibold text-gray-800 bg-white hover:bg-gray-50 cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-gray-600" />
                <span>{savingDraft ? "Đang lưu..." : "Lưu nháp"}</span>
              </button>

              <button
                type="button"
                onClick={handlePublish}
                disabled={publishing || savingDraft}
                className="h-9 sm:h-10 px-4 sm:px-5 border-none rounded-xl text-[12.5px] sm:text-[13px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{publishing ? "Đang công bố..." : "Công bố Quiz"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

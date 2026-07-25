import React, { useState } from "react";
import { X, CheckCircle2, XCircle, RotateCcw, Award, ChevronRight, ChevronLeft, HelpCircle } from "lucide-react";
import { QuizResponse } from "../services/quizService";

interface QuizPreviewModalProps {
  quiz: QuizResponse;
  onClose: () => void;
}

export function QuizPreviewModal({ quiz, onClose }: QuizPreviewModalProps) {
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const questions = quiz.questions || [];
  const currentQ = questions[activeQuestion] || null;

  const handleSelectOption = (optId: string) => {
    if (submitted) return; // Prevent changing after submission
    setSelectedAnswers(prev => ({ ...prev, [activeQuestion]: optId }));
  };

  const calculateScore = () => {
    let correctCount = 0;
    questions.forEach((q, idx) => {
      const userChoice = selectedAnswers[idx];
      if (userChoice && q.correctOptionIds.includes(userChoice)) {
        correctCount++;
      }
    });
    return correctCount;
  };

  const handleSubmitQuiz = () => {
    setSubmitted(true);
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setSubmitted(false);
    setActiveQuestion(0);
  };

  const score = calculateScore();
  const scorePercentage = Math.round((score / (questions.length || 1)) * 100);

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 animate-fadeIn">
      <div onClick={onClose} className="fixed inset-0 bg-[#0E0D0B]/40 backdrop-blur-sm" />

      <div className="bg-white rounded-2xl max-w-3xl w-full h-[85vh] shadow-2xl relative z-50 text-left flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#F8F7F4]/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-[#0E0D0B]">{quiz.title}</h3>
              <p className="text-[12px] text-[#6B6963]">Chế độ làm thử Quiz tương tác ({questions.length} câu hỏi)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {submitted && (
              <button
                onClick={handleResetQuiz}
                className="h-8 px-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-[#0E0D0B] text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-gray-600" />
                <span>Làm lại</span>
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quiz Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Question Tabs */}
          <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-gray-100 bg-[#F8F7F4]/30 p-4 flex-shrink-0 flex md:flex-col overflow-x-auto md:overflow-y-auto gap-2">
            <span className="hidden md:block text-[11px] font-semibold text-[#6B6963] uppercase tracking-wider mb-2">
              Danh sách câu ({questions.length})
            </span>

            <div className="grid grid-cols-5 md:grid-cols-1 gap-2 w-full">
              {questions.map((q, idx) => {
                const isSelected = selectedAnswers[idx] !== undefined;
                const isCorrect = submitted && q.correctOptionIds.includes(selectedAnswers[idx]);
                const isWrong = submitted && isSelected && !isCorrect;

                return (
                  <button
                    key={q.id || idx}
                    onClick={() => setActiveQuestion(idx)}
                    className={`p-2.5 rounded-xl border text-left text-[12.5px] font-medium transition-all cursor-pointer flex items-center justify-between ${
                      activeQuestion === idx
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs font-semibold"
                        : "border-gray-100 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>Câu {idx + 1}</span>
                    {submitted ? (
                      isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : isWrong ? (
                        <XCircle className="w-4 h-4 text-red-600" />
                      ) : (
                        <span className="text-[11px] text-gray-400">Bỏ qua</span>
                      )
                    ) : (
                      isSelected && <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Question Display */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {submitted && activeQuestion === 0 && (
              /* Submission Score Banner */
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-[15px] font-bold text-emerald-950">Kết quả làm bài</h4>
                  <p className="text-[13px] text-emerald-800">
                    Bạn trả lời đúng <strong>{score} / {questions.length}</strong> câu hỏi ({scorePercentage}%)
                  </p>
                </div>
                <div className="text-2xl font-black text-emerald-700 bg-white px-4 py-2 rounded-xl border border-emerald-200 shadow-xs">
                  {scorePercentage}%
                </div>
              </div>
            )}

            {currentQ ? (
              <div className="space-y-5 text-left">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-[12.5px] font-bold">
                    Câu hỏi {activeQuestion + 1} / {questions.length}
                  </span>
                </div>

                <h4 className="text-[16px] font-bold text-[#0E0D0B] leading-relaxed">
                  {currentQ.question}
                </h4>

                {/* Options List */}
                <div className="space-y-2.5">
                  {currentQ.options.map(opt => {
                    const isSelected = selectedAnswers[activeQuestion] === opt.id;
                    const isCorrect = currentQ.correctOptionIds.includes(opt.id);

                    let optionBg = "border-gray-200 bg-white hover:bg-gray-50 text-gray-800";
                    if (submitted) {
                      if (isCorrect) {
                        optionBg = "border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold";
                      } else if (isSelected && !isCorrect) {
                        optionBg = "border-red-500 bg-red-50 text-red-950";
                      }
                    } else if (isSelected) {
                      optionBg = "border-indigo-600 bg-indigo-50/60 text-indigo-950 font-semibold shadow-xs";
                    }

                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectOption(opt.id)}
                        disabled={submitted}
                        className={`w-full p-3.5 rounded-xl border text-left text-[14px] transition-all cursor-pointer flex items-center justify-between ${optionBg}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-lg font-bold text-[13px] flex items-center justify-center flex-shrink-0 ${
                            isSelected ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"
                          }`}>
                            {opt.id}
                          </span>
                          <span>{opt.text}</span>
                        </div>

                        {submitted && isCorrect && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        )}
                        {submitted && isSelected && !isCorrect && (
                          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation (Shows after submission) */}
                {submitted && currentQ.explanation && (
                  <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-[13px] text-indigo-950 space-y-1">
                    <span className="font-bold block uppercase text-[11px] text-indigo-700 tracking-wider">
                      Lời giải thích chi tiết:
                    </span>
                    <p className="leading-relaxed">{currentQ.explanation}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-[#F8F7F4]/60 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              disabled={activeQuestion === 0}
              onClick={() => setActiveQuestion(p => Math.max(0, p - 1))}
              className="h-9 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[12.5px] font-semibold text-gray-700 disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Câu trước</span>
            </button>
            <button
              disabled={activeQuestion >= questions.length - 1}
              onClick={() => setActiveQuestion(p => Math.min(questions.length - 1, p + 1))}
              className="h-9 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[12.5px] font-semibold text-gray-700 disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <span>Câu tiếp</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!submitted ? (
            <button
              onClick={handleSubmitQuiz}
              disabled={Object.keys(selectedAnswers).length === 0}
              className="h-10 px-5 border-none rounded-xl text-[13px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              Nộp bài làm
            </button>
          ) : (
            <button
              onClick={onClose}
              className="h-10 px-5 border-none rounded-xl text-[13px] font-semibold text-white bg-[#0E0D0B] hover:bg-[#1C1A17] cursor-pointer"
            >
              Hoàn thành xem thử
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

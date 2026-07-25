import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  HelpCircle, BookOpen, CheckCircle2, XCircle, Award, RotateCcw,
  Sparkles, FileText, ChevronLeft, ChevronRight, Share2, Copy, Check, ArrowLeft
} from "lucide-react";
import { quizService, QuizResponse, getPublicQuizUrl } from "../services/quizService";
import { PageLoading } from "../components/EmptyState";
import { ROUTES } from "../routes";

export function PublicQuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const idNum = Number(quizId);

  const [quiz, setQuiz] = useState<QuizResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<"study" | "quiz">("quiz");
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    async function loadQuiz() {
      setLoading(true);
      setError("");
      try {
        // Try backend GET /api/v1/quiz/{quizId}
        const data = await quizService.getQuiz(idNum);
        setQuiz(data);
      } catch (err: any) {
        // Fallback: check saved local storage
        const savedListStr = localStorage.getItem("saved_teacher_quizzes");
        if (savedListStr) {
          const list: QuizResponse[] = JSON.parse(savedListStr);
          const found = list.find(q => q.id === idNum);
          if (found) {
            setQuiz(found);
            setLoading(false);
            return;
          }
        }
        setError(err.message || "Không tìm thấy bộ Quiz ôn tập.");
      } finally {
        setLoading(false);
      }
    }
    loadQuiz();
  }, [idNum]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  if (loading) return <PageLoading />;

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center p-6 text-center">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-gray-200 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h3 className="text-[18px] font-bold text-[#0E0D0B]">Không tìm thấy bài ôn tập</h3>
          <p className="text-[13.5px] text-[#6B6963]">{error || "Đường dẫn không hợp lệ hoặc bộ Quiz chưa được công bố."}</p>
          <button
            onClick={() => navigate(ROUTES.LIBRARY)}
            className="px-5 py-2.5 bg-[#0E0D0B] text-white font-semibold text-[13px] rounded-xl cursor-pointer border-none"
          >
            Về trang Thư viện
          </button>
        </div>
      </div>
    );
  }

  const questions = quiz.questions || [];
  const currentQ = questions[activeQuestionIndex] || null;

  const handleSelectOption = (optId: string) => {
    if (submitted) return;
    setSelectedAnswers(prev => ({ ...prev, [activeQuestionIndex]: optId }));
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, idx) => {
      const choice = selectedAnswers[idx];
      if (choice && q.correctOptionIds.includes(choice)) {
        correct++;
      }
    });
    return correct;
  };

  const score = calculateScore();
  const scorePercent = Math.round((score / (questions.length || 1)) * 100);

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-left font-sans flex flex-col">
      {/* Top Banner Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(ROUTES.LIBRARY)}
              className="p-2 rounded-xl text-gray-500 hover:text-[#0E0D0B] hover:bg-gray-100 border-none bg-transparent cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                  Bài ôn tập công khai
                </span>
                <span className="text-[12px] text-[#AAAA9F] font-mono-label">#{quiz.id}</span>
              </div>
              <h1 className="text-[16px] font-bold text-[#0E0D0B] truncate max-w-md">{quiz.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="h-9 px-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[12.5px] font-semibold text-gray-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-indigo-600" />}
              <span>{copiedLink ? "Đã sao chép" : "Chia sẻ link"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {/* Navigation Tabs (Study Summary vs Quiz Mode) */}
        <div className="flex border-b border-gray-200 space-x-6">
          <button
            onClick={() => setActiveTab("quiz")}
            className={`pb-3 text-[14px] font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer bg-transparent border-none ${
              activeTab === "quiz"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Làm bài trắc nghiệm ({questions.length} câu)</span>
          </button>

          <button
            onClick={() => setActiveTab("study")}
            className={`pb-3 text-[14px] font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer bg-transparent border-none ${
              activeTab === "study"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Tóm tắt kiến thức bài học</span>
          </button>
        </div>

        {activeTab === "study" ? (
          /* STUDY NOTES & LESSON SUMMARY TAB */
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-xs space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-[#0E0D0B]">Nội dung ôn tập & Tóm tắt trọng tâm</h3>
                <p className="text-[13px] text-[#6B6963]">Tổng hợp các điểm cốt lõi trước khi vào làm trắc nghiệm</p>
              </div>
            </div>

            <div className="prose max-w-none text-[14.5px] leading-relaxed text-[#0E0D0B] bg-indigo-50/40 p-6 rounded-2xl border border-indigo-100">
              <p>
                {quiz.studyNotes || quiz.description || "Nội dung ôn tập được trích xuất tự động từ hệ thống tài liệu giảng dạy EduRAG."}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-[14px] font-bold text-[#0E0D0B] uppercase tracking-wider text-[#6B6963]">
                Các chủ đề câu hỏi bao gồm:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {questions.map((q, idx) => (
                  <div key={q.id || idx} className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 text-[13px] flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-gray-800 line-clamp-2">{q.question}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setActiveTab("quiz")}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[13.5px] rounded-xl cursor-pointer shadow-sm flex items-center gap-2"
              >
                <span>Bắt đầu làm bài Quiz ngay</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* QUIZ PRACTICE TAB */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
            {/* Left Question Tabs */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
                <span className="block text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider">
                  Danh sách câu hỏi ({questions.length})
                </span>

                <div className="grid grid-cols-5 lg:grid-cols-1 gap-2">
                  {questions.map((q, idx) => {
                    const isSelected = selectedAnswers[idx] !== undefined;
                    const isCorrect = submitted && q.correctOptionIds.includes(selectedAnswers[idx]);
                    const isWrong = submitted && isSelected && !isCorrect;

                    return (
                      <button
                        key={q.id || idx}
                        onClick={() => setActiveQuestionIndex(idx)}
                        className={`p-3 rounded-xl border text-left text-[13px] font-medium transition-all cursor-pointer flex items-center justify-between ${
                          activeQuestionIndex === idx
                            ? "border-indigo-600 bg-indigo-50 text-indigo-900 shadow-xs font-semibold"
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
                          isSelected && <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {submitted && (
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-6 shadow-md text-center space-y-3">
                  <Award className="w-10 h-10 mx-auto text-emerald-200" />
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-wider text-emerald-200">Điểm ôn tập của bạn</p>
                    <h2 className="text-3xl font-black mt-1">{scorePercent}%</h2>
                    <p className="text-[13px] text-emerald-100 mt-1">Đúng {score} trên tổng {questions.length} câu hỏi</p>
                  </div>
                  <button
                    onClick={() => { setSubmitted(false); setSelectedAnswers({}); setActiveQuestionIndex(0); }}
                    className="w-full py-2 bg-white/20 hover:bg-white/30 text-white text-[12.5px] font-semibold rounded-xl transition-all cursor-pointer border-none flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Làm lại bài</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right Question Main Display */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 p-8 shadow-xs space-y-6">
              {currentQ ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-[12.5px] font-bold">
                      Câu hỏi {activeQuestionIndex + 1} / {questions.length}
                    </span>
                    {currentQ.difficulty && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[11.5px] font-bold uppercase ${
                        currentQ.difficulty === "EASY" ? "bg-emerald-100 text-emerald-800" : currentQ.difficulty === "HARD" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        Mức độ: {currentQ.difficulty === "EASY" ? "Dễ" : currentQ.difficulty === "HARD" ? "Khó" : "Trung bình"}
                      </span>
                    )}
                  </div>

                  <h3 className="text-[17px] font-bold text-[#0E0D0B] leading-relaxed">
                    {currentQ.question}
                  </h3>

                  {/* Options */}
                  <div className="space-y-3">
                    {currentQ.options.map(opt => {
                      const isSelected = selectedAnswers[activeQuestionIndex] === opt.id;
                      const isCorrect = currentQ.correctOptionIds.includes(opt.id);

                      let optionStyle = "border-gray-200 bg-white hover:bg-gray-50 text-gray-800";
                      if (submitted) {
                        if (isCorrect) {
                          optionStyle = "border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold";
                        } else if (isSelected && !isCorrect) {
                          optionStyle = "border-red-500 bg-red-50 text-red-950";
                        }
                      } else if (isSelected) {
                        optionStyle = "border-indigo-600 bg-indigo-50/80 text-indigo-950 font-semibold shadow-xs";
                      }

                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleSelectOption(opt.id)}
                          disabled={submitted}
                          className={`w-full p-4 rounded-xl border text-left text-[14.5px] transition-all cursor-pointer flex items-center justify-between ${optionStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-7 h-7 rounded-lg font-bold text-[13px] flex items-center justify-center flex-shrink-0 ${
                              isSelected ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"
                            }`}>
                              {opt.id}
                            </span>
                            <span>{opt.text}</span>
                          </div>

                          {submitted && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
                          {submitted && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation & Citations */}
                  {submitted && (
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                      {currentQ.explanation && (
                        <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-[13.5px] text-indigo-950 space-y-1">
                          <span className="font-bold block uppercase text-[11px] text-indigo-700 tracking-wider">
                            Lời giải thích chi tiết:
                          </span>
                          <p className="leading-relaxed">{currentQ.explanation}</p>
                        </div>
                      )}

                      {currentQ.citations && currentQ.citations.length > 0 && (
                        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                          <span className="font-bold block uppercase text-[11px] text-amber-800 tracking-wider flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-amber-700" />
                            Trích dẫn nguồn tài liệu gốc:
                          </span>
                          {currentQ.citations.map((c, cIdx) => (
                            <div key={cIdx} className="text-[12.5px] text-amber-950">
                              <span className="font-bold text-amber-800">Trang {c.pageNumber || 1}:</span> "{c.excerpt}"
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Question Controls */}
                  <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                    <button
                      disabled={activeQuestionIndex === 0}
                      onClick={() => setActiveQuestionIndex(p => Math.max(0, p - 1))}
                      className="h-10 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[13px] font-semibold text-gray-700 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Câu trước</span>
                    </button>

                    {!submitted ? (
                      <button
                        onClick={() => setSubmitted(true)}
                        disabled={Object.keys(selectedAnswers).length === 0}
                        className="h-10 px-6 border-none rounded-xl text-[13.5px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-sm"
                      >
                        Nộp bài ôn tập
                      </button>
                    ) : (
                      <span className="text-[13px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg">
                        Đã nộp bài
                      </span>
                    )}

                    <button
                      disabled={activeQuestionIndex >= questions.length - 1}
                      onClick={() => setActiveQuestionIndex(p => Math.min(questions.length - 1, p + 1))}
                      className="h-10 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[13px] font-semibold text-gray-700 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    >
                      <span>Câu tiếp</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

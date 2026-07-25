import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  HelpCircle, BookOpen, CheckCircle2, XCircle, Award, RotateCcw,
  Sparkles, FileText, ChevronLeft, ChevronRight, Share2, Copy, Check,
  ArrowLeft, User, GraduationCap, Play, ShieldCheck, Printer
} from "lucide-react";
import { quizService, QuizResponse } from "../services/quizService";
import { PageLoading } from "../components/EmptyState";
import { ROUTES } from "../routes";

export function PublicQuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const idNum = Number(quizId);

  const [quiz, setQuiz] = useState<QuizResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Student Information State
  const [studentName, setStudentName] = useState(() => localStorage.getItem("quiz_student_name") || "");
  const [studentClass, setStudentClass] = useState(() => localStorage.getItem("quiz_student_class") || "");
  const [isStarted, setIsStarted] = useState(false);
  const [nameError, setNameError] = useState("");

  // Quiz Form State
  const [activeTab, setActiveTab] = useState<"quiz" | "study">("quiz");
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    async function loadQuiz() {
      setLoading(true);
      setError("");
      try {
        const data = await quizService.getQuiz(idNum);
        setQuiz(data);
      } catch (err: any) {
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

  const handleStartQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setNameError("Vui lòng nhập Họ và tên sinh viên.");
      return;
    }
    setNameError("");
    localStorage.setItem("quiz_student_name", studentName.trim());
    localStorage.setItem("quiz_student_class", studentClass.trim());
    setIsStarted(true);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  if (loading) return <PageLoading />;

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center p-6 text-center font-sans">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-gray-200 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h3 className="text-[18px] font-bold text-[#0E0D0B]">Không tìm thấy bài Quiz</h3>
          <p className="text-[13.5px] text-[#6B6963]">{error || "Đường dẫn không tồn tại hoặc bài Quiz chưa công bố."}</p>
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

  // STEP 1: STUDENT REGISTRATION / WELCOME CARD
  if (!isStarted) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center p-4 font-sans text-left">
        <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden relative">
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-8 text-white relative">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider">
                EduRAG Public Assessment
              </span>
              <span className="text-[11.5px] text-indigo-200 font-mono-label">#{quiz.id}</span>
            </div>
            <h1 className="text-[22px] font-bold leading-tight">{quiz.title}</h1>
            <p className="text-[13px] text-indigo-100 mt-2 line-clamp-2">
              {quiz.description || "Bài trắc nghiệm kiểm tra và ôn tập kiến thức bài giảng công khai."}
            </p>

            <div className="flex items-center gap-4 mt-5 pt-4 border-t border-white/10 text-[12.5px] text-indigo-100 font-medium">
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-indigo-300" />
                <span>{questions.length} câu hỏi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-300" />
                <span>{quiz.language === "vi" ? "Tiếng Việt" : "Tiếng Anh"}</span>
              </div>
            </div>
          </div>

          {/* Student Form */}
          <form onSubmit={handleStartQuiz} className="p-8 space-y-5">
            <div>
              <h3 className="text-[15px] font-bold text-[#0E0D0B] mb-1">Thông tin sinh viên tham gia</h3>
              <p className="text-[12.5px] text-[#6B6963]">Nhập họ tên để ghi nhận kết quả và cấp báo cáo điểm sau bài làm</p>
            </div>

            {nameError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[12.5px] font-medium">
                {nameError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider mb-1.5">
                  Họ và tên sinh viên <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full h-11 pl-10 pr-4 border border-gray-200 rounded-xl text-[13.5px] text-[#0E0D0B] focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider mb-1.5">
                  Mã sinh viên / Lớp học (Không bắt buộc)
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentClass}
                    onChange={e => setStudentClass(e.target.value)}
                    placeholder="Ví dụ: B21DCCN001 - D21CQCN01-B"
                    className="w-full h-11 pl-10 pr-4 border border-gray-200 rounded-xl text-[13.5px] text-[#0E0D0B] focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[14px] rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border-none mt-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Bắt đầu làm bài Quiz ngay</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // STEP 2 & 3: STANDALONE QUIZ EXAM FORM & RESULT REPORT
  return (
    <div className="min-h-screen bg-[#F8F7F4] text-left font-sans flex flex-col pb-12">
      {/* Header Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                  Sinh viên: {studentName} {studentClass ? `(${studentClass})` : ""}
                </span>
                <button
                  onClick={() => setIsStarted(false)}
                  className="text-[11.5px] text-gray-500 hover:text-indigo-600 underline cursor-pointer border-none bg-transparent"
                >
                  Đổi thông tin
                </button>
              </div>
              <h1 className="text-[15px] font-bold text-[#0E0D0B] truncate max-w-md">{quiz.title}</h1>
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

        {/* SUBMITTED RESULT REPORT CARD */}
        {submitted ? (
          <div className="space-y-6 animate-fadeIn">
            {/* Score Summary Card */}
            <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-xl relative overflow-hidden text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <Award className="w-9 h-9" />
              </div>

              <div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[12px] font-bold uppercase tracking-wider">
                  Báo cáo kết quả bài ôn tập
                </span>
                <h2 className="text-[26px] font-black text-[#0E0D0B] mt-2">{scorePercent}% Chỉnh xác</h2>
                <p className="text-[14px] text-[#6B6963] mt-1">
                  Sinh viên <strong>{studentName}</strong> {studentClass ? `(${studentClass})` : ""} trả lời đúng <strong>{score} / {questions.length}</strong> câu hỏi.
                </p>
              </div>

              <div className="flex items-center justify-center gap-4 pt-3">
                <button
                  onClick={() => { setSubmitted(false); setSelectedAnswers({}); setActiveQuestionIndex(0); }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[13px] rounded-xl transition-all cursor-pointer border-none flex items-center gap-2 shadow-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Làm lại bài Quiz</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-semibold text-[13px] rounded-xl transition-all cursor-pointer flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>In / Lưu báo cáo</span>
                </button>
              </div>
            </div>

            {/* Detailed Answer Review */}
            <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-xs space-y-6">
              <h3 className="text-[16px] font-bold text-[#0E0D0B] uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-3">
                Chi tiết đáp án & Lời giải thích bài làm
              </h3>

              <div className="space-y-6">
                {questions.map((q, idx) => {
                  const userChoice = selectedAnswers[idx];
                  const isCorrect = userChoice && q.correctOptionIds.includes(userChoice);

                  return (
                    <div key={q.id || idx} className={`p-5 rounded-2xl border ${isCorrect ? "bg-emerald-50/40 border-emerald-200" : "bg-red-50/40 border-red-200"} space-y-4`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[13px] px-2.5 py-0.5 rounded-lg bg-gray-900 text-white">
                          Câu {idx + 1}
                        </span>
                        <span className={`text-[12px] font-bold px-2.5 py-0.5 rounded-full ${isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                          {isCorrect ? "Đúng (+1 điểm)" : "Chưa chính xác"}
                        </span>
                      </div>

                      <h4 className="text-[15.5px] font-bold text-[#0E0D0B] leading-relaxed">
                        {q.question}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {q.options.map(opt => {
                          const isUserSelected = userChoice === opt.id;
                          const isRight = q.correctOptionIds.includes(opt.id);

                          let optBadge = "bg-gray-100 text-gray-700";
                          let optBg = "bg-white border-gray-200 text-gray-800";
                          if (isRight) {
                            optBg = "bg-emerald-100/70 border-emerald-300 font-bold text-emerald-950";
                            optBadge = "bg-emerald-600 text-white";
                          } else if (isUserSelected && !isRight) {
                            optBg = "bg-red-100/70 border-red-300 text-red-950 font-bold";
                            optBadge = "bg-red-600 text-white";
                          }

                          return (
                            <div key={opt.id} className={`p-3 rounded-xl border flex items-center gap-3 text-[13.5px] ${optBg}`}>
                              <span className={`w-6 h-6 rounded-md font-bold text-[12px] flex items-center justify-center flex-shrink-0 ${optBadge}`}>
                                {opt.id}
                              </span>
                              <span>{opt.text}</span>
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <div className="p-3.5 bg-white rounded-xl border border-gray-200 text-[13px] text-gray-800 leading-relaxed">
                          <strong className="text-indigo-700 block text-[11.5px] uppercase font-bold mb-0.5">Lời giải thích:</strong>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ACTIVE QUIZ EXAM FORM */
          <div className="space-y-6 animate-fadeIn">
            {/* Tabs for Navigation */}
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
              /* LESSON SUMMARY */
              <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-[#0E0D0B]">Nội dung tóm tắt & Cốt lõi bài học</h3>
                    <p className="text-[13px] text-[#6B6963]">Nắm vững trọng tâm kiến thức trước khi làm trắc nghiệm</p>
                  </div>
                </div>

                <div className="prose max-w-none text-[14.5px] leading-relaxed text-[#0E0D0B] bg-indigo-50/40 p-6 rounded-2xl border border-indigo-100">
                  <p>{quiz.studyNotes || quiz.description || "Nội dung ôn tập được trích xuất tự động từ hệ thống bài giảng."}</p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setActiveTab("quiz")}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[13.5px] rounded-xl cursor-pointer shadow-sm flex items-center gap-2"
                  >
                    <span>Vào làm bài Quiz ngay</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* ACTIVE QUIZ QUESTION CARD */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Question Navigator */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider">
                        Danh sách câu hỏi
                      </span>
                      <span className="text-[12px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        Đã trả lời {Object.keys(selectedAnswers).length}/{questions.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 lg:grid-cols-1 gap-2">
                      {questions.map((q, idx) => {
                        const isSelected = selectedAnswers[idx] !== undefined;

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
                            {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Active Question Card */}
                <div className="lg:col-span-8 bg-white rounded-3xl border border-gray-200 p-8 shadow-xs space-y-6">
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

                      <h3 className="text-[17.5px] font-bold text-[#0E0D0B] leading-relaxed">
                        {currentQ.question}
                      </h3>

                      {/* Options */}
                      <div className="space-y-3">
                        {currentQ.options.map(opt => {
                          const isSelected = selectedAnswers[activeQuestionIndex] === opt.id;

                          return (
                            <button
                              key={opt.id}
                              onClick={() => handleSelectOption(opt.id)}
                              className={`w-full p-4 rounded-xl border text-left text-[14.5px] transition-all cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? "border-indigo-600 bg-indigo-50/90 text-indigo-950 font-bold shadow-xs"
                                  : "border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-medium"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`w-7 h-7 rounded-lg font-bold text-[13px] flex items-center justify-center flex-shrink-0 ${
                                  isSelected ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"
                                }`}>
                                  {opt.id}
                                </span>
                                <span>{opt.text}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Question Navigation Footer */}
                      <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                        <button
                          disabled={activeQuestionIndex === 0}
                          onClick={() => setActiveQuestionIndex(p => Math.max(0, p - 1))}
                          className="h-10 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[13px] font-semibold text-gray-700 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Câu trước</span>
                        </button>

                        <button
                          onClick={() => setSubmitted(true)}
                          disabled={Object.keys(selectedAnswers).length === 0}
                          className="h-11 px-6 border-none rounded-xl text-[14px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-md"
                        >
                          Nộp bài Quiz
                        </button>

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
          </div>
        )}
      </main>
    </div>
  );
}

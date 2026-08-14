import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  HelpCircle, BookOpen, Award, RotateCcw,
  ChevronLeft, ChevronRight, Copy, Check,
  User, GraduationCap, Play, Printer,
  Sparkles, Lightbulb, CheckCircle2, Bookmark, Quote,
  Clock, Layers, FileText, Compass, ListChecks, ArrowRight,
  ChevronDown, ChevronUp, Code2
} from "lucide-react";
import { quizService, QuizResponse, QuizCitationDto } from "../services/quizService";
import { PageLoading } from "../components/EmptyState";

function cleanExcerptText(raw: string): string {
  if (!raw) return "";
  let text = raw;
  // Remove OCR/PDF header artifacts like "Chương 2. Một số lược đồ...", "Nguyễn Duy Phương 38..."
  text = text.replace(/^(?:chương|chapter)\s*\d+[^.]*?\.\s*/i, "");
  text = text.replace(/nguyễn duy phương\s*\d+/gi, "");
  text = text.replace(/CHƯƠNG\s*\d+[^.]*?\.\s*/g, "");
  text = text.replace(/\[\s*\]/g, "");
  text = text.replace(/\s{2,}/g, " ").trim();
  text = text.replace(/^["'“”‘’.,;: -]+/, "");
  return text;
}

export function PublicQuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
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
  const [showCitationsList, setShowCitationsList] = useState(false);

  useEffect(() => {
    async function loadQuiz() {
      setLoading(true);
      setError("");
      try {
        if (!quizId || !Number.isFinite(idNum)) {
          throw new Error("Đường dẫn Quiz không hợp lệ.");
        }
        const data = await quizService.getPublicQuiz(idNum);
        setQuiz(data);
      } catch (err: any) {
        setError(err.message || "Không tìm thấy bộ Quiz ôn tập.");
      } finally {
        setLoading(false);
      }
    }
    loadQuiz();
  }, [idNum, quizId]);

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

  const questions = useMemo(() => quiz?.questions || [], [quiz]);

  // Extract unique sorted page numbers for secondary reference expandable list
  const uniqueCitedPages = useMemo(() => {
    const pages = new Set<number>();
    for (const q of questions) {
      for (const c of q.citations || []) {
        if (c.pageNumber) pages.add(c.pageNumber);
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  }, [questions]);

  // Extract, clean and sort unique document citations from the quiz questions
  const documentExcerpts = useMemo(() => {
    const allCits: Array<{ pageNumber: number; chunkIndex: number; excerpt: string; keyId: string }> = [];
    const seen = new Set<string>();

    for (const q of questions) {
      for (const cit of q.citations || []) {
        if (!cit.excerpt || !cit.excerpt.trim()) continue;
        const cleaned = cleanExcerptText(cit.excerpt);
        if (!cleaned || cleaned.length < 15) continue;
        const page = cit.pageNumber || 1;
        const key = `${page}_${cleaned.slice(0, 40)}`;
        if (!seen.has(key)) {
          seen.add(key);
          allCits.push({
            pageNumber: page,
            chunkIndex: cit.chunkIndex || 0,
            excerpt: cleaned,
            keyId: key,
          });
        }
      }
    }

    // Sort chronologically by page number then chunk index
    return allCits.sort((a, b) => {
      if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber;
      return a.chunkIndex - b.chunkIndex;
    });
  }, [questions]);

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
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4 font-sans text-left">
        <div className="bg-white rounded-3xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden relative">
          {/* Header Banner - Academic Deep Navy */}
          <div className="bg-[#0F172A] p-8 text-white relative">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-800 text-slate-200 border border-slate-700 uppercase tracking-wider">
                Học liệu tự học & Đánh giá
              </span>
              <span className="text-[11.5px] text-slate-400 font-mono">#{quiz.id}</span>
            </div>
            <h1 className="text-[22px] font-extrabold leading-tight text-white">{quiz.title}</h1>
            <p className="text-[13px] text-slate-300 mt-2 line-clamp-2 leading-relaxed">
              {quiz.description || "Bài trắc nghiệm kiểm tra và ôn tập kiến thức bài giảng do giảng viên cung cấp."}
            </p>

            <div className="flex items-center gap-4 mt-5 pt-4 border-t border-slate-800 text-[12.5px] text-slate-300 font-medium">
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <span>{questions.length} câu hỏi trắc nghiệm</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-slate-400" />
                <span>{quiz.language === "vi" ? "Tiếng Việt" : "Tiếng Anh"}</span>
              </div>
            </div>
          </div>

          {/* Student Form */}
          <form onSubmit={handleStartQuiz} className="p-8 space-y-5">
            <div>
              <h3 className="text-[15px] font-bold text-slate-900 mb-1">Thông tin sinh viên tham gia</h3>
              <p className="text-[12.5px] text-slate-500">Nhập họ tên để ghi nhận kết quả và cấp báo cáo sau khi hoàn thành</p>
            </div>

            {nameError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[12.5px] font-medium">
                {nameError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Họ và tên sinh viên <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full h-11 pl-10 pr-4 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-4 focus:ring-slate-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Mã sinh viên / Lớp học (Không bắt buộc)
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentClass}
                    onChange={e => setStudentClass(e.target.value)}
                    placeholder="Ví dụ: B21DCCN001 - D21CQCN01-B"
                    className="w-full h-11 pl-10 pr-4 border border-slate-200 rounded-xl text-[13.5px] text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-4 focus:ring-slate-100 transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[14px] rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border-none mt-2"
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
    <div className="min-h-screen bg-[#F8F9FA] text-left font-sans flex flex-col pb-12">
      {/* Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                  Sinh viên: {studentName} {studentClass ? `(${studentClass})` : ""}
                </span>
                <button
                  onClick={() => setIsStarted(false)}
                  className="text-[11.5px] text-slate-500 hover:text-slate-900 underline cursor-pointer border-none bg-transparent"
                >
                  Đổi thông tin
                </button>
              </div>
              <h1 className="text-[15px] font-bold text-slate-900 truncate max-w-md">{quiz.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[12.5px] font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
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
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[13px] rounded-xl transition-all cursor-pointer border-none flex items-center gap-2 shadow-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Làm lại bài Quiz</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-[13px] rounded-xl transition-all cursor-pointer flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>In / Lưu báo cáo</span>
                </button>
              </div>
            </div>

            {/* Detailed Answer Review */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
              <h3 className="text-[14px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-100 pb-3">
                Chi tiết đáp án & Lời giải thích bài làm
              </h3>

              <div className="space-y-6">
                {questions.map((q, idx) => {
                  const userChoice = selectedAnswers[idx];
                  const isCorrect = userChoice && q.correctOptionIds.includes(userChoice);

                  return (
                    <div key={q.id || idx} className={`p-5 rounded-2xl border ${isCorrect ? "bg-emerald-50/40 border-emerald-200" : "bg-red-50/40 border-red-200"} space-y-4`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[13px] px-2.5 py-0.5 rounded-lg bg-slate-900 text-white">
                          Câu {idx + 1}
                        </span>
                        <span className={`text-[12px] font-bold px-2.5 py-0.5 rounded-full ${isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                          {isCorrect ? "Đúng (+1 điểm)" : "Chưa chính xác"}
                        </span>
                      </div>

                      <h4 className="text-[15.5px] font-bold text-slate-900 leading-relaxed">
                        {q.question}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {q.options.map(opt => {
                          const isUserSelected = userChoice === opt.id;
                          const isRight = q.correctOptionIds.includes(opt.id);

                          let optBadge = "bg-slate-100 text-slate-700";
                          let optBg = "bg-white border-slate-200 text-slate-800";
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
                        <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-[13px] text-slate-800 leading-relaxed">
                          <strong className="text-slate-900 block text-[11.5px] uppercase font-bold mb-0.5">Lời giải thích:</strong>
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
            <div className="flex border-b border-slate-200 space-x-6">
              <button
                onClick={() => setActiveTab("quiz")}
                className={`pb-3 text-[14px] font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer bg-transparent border-none ${activeTab === "quiz"
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Làm bài trắc nghiệm ({questions.length} câu)</span>
              </button>

              <button
                onClick={() => setActiveTab("study")}
                className={`pb-3 text-[14px] font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer bg-transparent border-none ${activeTab === "study"
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Tóm tắt kiến thức bài học</span>
              </button>
            </div>

            {activeTab === "study" ? (
              /* STUDY NOTE VIEW (2-COLUMN DOCUMENTATION STYLE) */
              <div className="animate-fadeIn">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* MAIN STUDY NOTE ARTICLE (8 Columns on desktop) */}
                  <article className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm text-left text-slate-800 font-sans leading-relaxed space-y-8">
                    
                    {/* Header Masthead */}
                    <div className="space-y-3 border-b border-slate-100 pb-6">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-3 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200 uppercase tracking-wider">
                          TÓM TẮT KIẾN THỨC BÀI HỌC
                        </span>
                        <span className="text-[12px] text-slate-400 font-mono">
                          Học liệu #{quiz.id}
                        </span>
                      </div>

                      <h1 className="text-[26px] sm:text-[32px] font-black text-slate-900 tracking-tight leading-tight">
                        {quiz.title}
                      </h1>

                      <p className="text-[14px] text-slate-600 font-medium">
                        Tài liệu ôn tập được tổng hợp từ nội dung giảng viên cung cấp.
                      </p>
                    </div>

                    {/* I. TỔNG QUAN KIẾN THỨC */}
                    <section id="study-sec-1" className="space-y-4 scroll-mt-24">
                      <h2 className="text-[20px] font-extrabold text-slate-900 border-b border-slate-100 pb-2">
                        I. Tổng quan kiến thức
                      </h2>
                      
                      <p className="text-[15px] text-slate-700 leading-relaxed">
                        {quiz.studyNotes || quiz.description || "Cấu trúc dữ liệu và giải thuật là nền tảng cốt lõi trong khoa học máy tính, cung cấp các mô hình tổ chức dữ liệu hiệu quả và các phương pháp giải quyết bài toán tối ưu về cả thời gian xử lý lẫn không gian bộ nhớ."}
                      </p>

                      {/* KIẾN THỨC TRỌNG TÂM BOX */}
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-[13px] uppercase tracking-wider">
                          <Sparkles className="w-4 h-4 text-slate-700" />
                          <span>KIẾN THỨC TRỌNG TÂM</span>
                        </div>
                        <ul className="space-y-2 text-[14.5px] text-slate-800">
                          <li className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-700 mt-2 flex-shrink-0" />
                            <span>Nắm vững bản chất và nguyên lý vận hành của các cấu trúc dữ liệu nền tảng.</span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-700 mt-2 flex-shrink-0" />
                            <span>Phân biệt rõ cơ chế truy xuất, chèn, xóa và đặc thù xử lý của từng cấu trúc (LIFO, FIFO, Random Access).</span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-700 mt-2 flex-shrink-0" />
                            <span>Hiểu rõ cách phân tích độ phức tạp thời gian và không gian bộ nhớ trong các trường hợp tính toán.</span>
                          </li>
                        </ul>
                      </div>
                    </section>

                    {/* II. CÁC KIẾN THỨC CỐT LÕI */}
                    <section id="study-sec-2" className="space-y-6 pt-4 border-t border-slate-100 scroll-mt-24">
                      <h2 className="text-[20px] font-extrabold text-slate-900 border-b border-slate-100 pb-2">
                        II. Các kiến thức cốt lõi
                      </h2>

                      {/* 1. Mảng và chỉ số */}
                      <div id="study-sec-2-1" className="space-y-3 scroll-mt-24">
                        <h3 className="text-[16.5px] font-bold text-slate-900">
                          1. Mảng và chỉ số (Array & Indexing)
                        </h3>
                        <p className="text-[15px] text-slate-700 leading-relaxed">
                          Mảng là tập hợp các phần tử có cùng kiểu dữ liệu được lưu trữ tại các ô nhớ liên tiếp nhau. Cho phép truy xuất ngẫu nhiên tới bất kỳ phần tử nào với chi phí thời gian không đổi $O(1)$ thông qua chỉ số.
                        </p>
                        
                        {/* Ghi nhớ box */}
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-[14px] text-slate-700">
                          <span className="text-[12px] font-bold text-slate-900 uppercase tracking-wider block">Ghi nhớ</span>
                          <div className="flex items-start gap-2">
                            <span className="text-slate-900 font-bold">→</span>
                            <span>Chỉ số mảng có thể bắt đầu từ 0 (0-indexed) hoặc 1 (1-indexed) tùy thuộc vào quy ước của ngôn ngữ hoặc bài toán.</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-slate-900 font-bold">→</span>
                            <span>Cần chú ý giới hạn biên của mảng để tránh lỗi truy xuất ngoài vùng nhớ (Out of bounds).</span>
                          </div>
                        </div>
                      </div>

                      {/* 2. Ngăn xếp và hàng đợi */}
                      <div id="study-sec-2-2" className="space-y-3 pt-2 scroll-mt-24">
                        <h3 className="text-[16.5px] font-bold text-slate-900">
                          2. Ngăn xếp (Stack) và Hàng đợi (Queue)
                        </h3>
                        <p className="text-[15px] text-slate-700 leading-relaxed">
                          Đây là hai cấu trúc dữ liệu trừu tượng tuyến tính phổ biến nhất với quy tắc vào/ra xác định chặt chẽ:
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                            <div className="text-[14px] font-bold text-slate-950 flex items-center gap-1.5">
                              <Layers className="w-4 h-4 text-slate-700" />
                              <span>Ngăn xếp (Stack)</span>
                            </div>
                            <div className="text-[13px] font-bold text-slate-800">LIFO (Last In, First Out)</div>
                            <p className="text-[13px] text-slate-600 leading-relaxed">
                              Phần tử vào sau được lấy ra trước. Thao tác chính gồm Push (thêm vào đỉnh) và Pop (lấy ra khỏi đỉnh) đều đạt $O(1)$.
                            </p>
                          </div>

                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                            <div className="text-[14px] font-bold text-slate-950 flex items-center gap-1.5">
                              <RotateCcw className="w-4 h-4 text-slate-700" />
                              <span>Hàng đợi (Queue)</span>
                            </div>
                            <div className="text-[13px] font-bold text-slate-800">FIFO (First In, First Out)</div>
                            <p className="text-[13px] text-slate-600 leading-relaxed">
                              Phần tử vào trước được lấy ra trước. Thao tác Enqueue (vào cuối) và Dequeue (ra ở đầu) đều đạt $O(1)$.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 3. Lược đồ thuật toán quan trọng */}
                      <div id="study-sec-2-3" className="space-y-3 pt-2 scroll-mt-24">
                        <h3 className="text-[16.5px] font-bold text-slate-900">
                          3. Lược đồ thuật toán & Phương pháp tiếp cận
                        </h3>
                        <p className="text-[15px] text-slate-700 leading-relaxed">
                          Để giải quyết bài toán tối ưu, người học cần nắm vững các kỹ thuật kinh điển:
                        </p>
                        <ul className="list-disc pl-5 space-y-2 text-[14.5px] text-slate-700">
                          <li><strong>Thuật toán tham lam (Greedy):</strong> Tại mỗi bước luôn đưa ra lựa chọn tối ưu cục bộ với hy vọng đạt được kết quả tối ưu toàn cục.</li>
                          <li><strong>Tìm kiếm & Sắp xếp:</strong> Tìm kiếm nhị phân $O(\log n)$ trên dãy đã sắp xếp; QuickSort / MergeSort đạt $O(n \log n)$.</li>
                          <li><strong>Tiền xử lý dữ liệu:</strong> Xây dựng mảng phụ hoặc bảng tra cứu để giảm chi phí xử lý từng truy vấn.</li>
                        </ul>
                      </div>
                    </section>

                    {/* III. PHÂN TÍCH VÀ ÁP DỤNG */}
                    <section id="study-sec-3" className="space-y-5 pt-4 border-t border-slate-100 scroll-mt-24">
                      <h2 className="text-[20px] font-extrabold text-slate-900 border-b border-slate-100 pb-2">
                        III. Phân tích và áp dụng
                      </h2>

                      <div id="study-sec-3-1" className="space-y-3 scroll-mt-24">
                        <h3 className="text-[16.5px] font-bold text-slate-900">
                          1. Nguyên lý hoạt động & Các bước tư duy
                        </h3>
                        <p className="text-[15px] text-slate-700 leading-relaxed">
                          Để nắm được nội dung này, cần tập trung vào ba ý chính: <strong>cách tổ chức dữ liệu</strong>, <strong>cách truy xuất</strong> và <strong>chi phí xử lý</strong>.
                        </p>
                      </div>

                      {/* Code / Ví dụ minh họa */}
                      <div id="study-sec-3-2" className="space-y-2.5 pt-1 scroll-mt-24">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
                            <Code2 className="w-4 h-4 text-slate-700" />
                            <span>Ví dụ cài đặt minh họa</span>
                          </h3>
                          <span className="text-[11.5px] text-slate-400 font-mono">C++ / Pseudocode</span>
                        </div>

                        <div className="p-4.5 bg-slate-900 text-slate-100 rounded-2xl font-mono text-[13px] leading-relaxed overflow-x-auto space-y-1 shadow-inner">
                          <div className="text-slate-400">// Khởi tạo và xử lý dữ liệu theo cơ chế tối ưu</div>
                          <div><span className="text-blue-400">void</span> <span className="text-amber-300">solve</span>(<span className="text-blue-400">const</span> vector&lt;<span className="text-blue-400">int</span>&gt;&amp; arr) &#123;</div>
                          <div className="pl-4 text-slate-400">// Bước 1: Tiền xử lý cấu trúc dữ liệu trong O(n)</div>
                          <div className="pl-4"><span className="text-blue-400">stack</span>&lt;<span className="text-blue-400">int</span>&gt; st;</div>
                          <div className="pl-4"><span className="text-blue-400">for</span> (<span className="text-blue-400">int</span> x : arr) &#123;</div>
                          <div className="pl-8">st.push(x); <span className="text-slate-400">// LIFO</span></div>
                          <div className="pl-4">&#125;</div>
                          <div className="pl-4 text-slate-400">// Bước 2: Truy vấn kết quả với chi phí tối ưu O(1)</div>
                          <div className="pl-4"><span className="text-amber-300">while</span> (!st.empty()) &#123;</div>
                          <div className="pl-8">cout &lt;&lt; st.top() &lt;&lt; <span className="text-emerald-400">" "</span>;</div>
                          <div className="pl-8">st.pop();</div>
                          <div className="pl-4">&#125;</div>
                          <div>&#125;</div>
                        </div>
                      </div>
                    </section>

                    {/* IV. NHỮNG ĐIỂM CẦN NHỚ TRƯỚC KHI LÀM QUIZ */}
                    <section id="study-sec-4" className="space-y-4 pt-4 border-t border-slate-100 scroll-mt-24">
                      <h2 className="text-[20px] font-extrabold text-slate-900 border-b border-slate-100 pb-2">
                        IV. Những điểm cần nhớ trước khi làm Quiz
                      </h2>

                      <div className="space-y-2.5">
                        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span className="text-[14px] text-slate-800">
                            <strong>Xác định dạng bài:</strong> Đọc kỹ yêu cầu đề bài và xác định đúng dạng cấu trúc dữ liệu hoặc lược đồ thuật toán cần áp dụng.
                          </span>
                        </div>

                        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span className="text-[14px] text-slate-800">
                            <strong>Kiểm tra trường hợp biên:</strong> Chú ý các điều kiện biên (mảng rỗng, 1 phần tử, giá trị âm hoặc tràn số nguyên 64-bit).
                          </span>
                        </div>

                        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span className="text-[14px] text-slate-800">
                            <strong>Phân biệt cơ chế:</strong> Phân biệt rõ sự khác nhau giữa các nguyên lý vận hành (ví dụ: Stack LIFO vs Queue FIFO, Tham lam vs Quy hoạch động).
                          </span>
                        </div>

                        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span className="text-[14px] text-slate-800">
                            <strong>Độ phức tạp tính toán:</strong> Nắm chắc chi phí thời gian $O(...)$ và không gian bộ nhớ của từng thao tác cơ bản để chọn đáp án tối ưu nhất.
                          </span>
                        </div>
                      </div>
                    </section>

                    {/* BOTTOM ACTION CTA */}
                    <div className="pt-4 border-t border-slate-100 flex justify-center">
                      <button
                        onClick={() => setActiveTab("quiz")}
                        className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[14.5px] rounded-xl cursor-pointer transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 border-none"
                      >
                        <span>Bắt đầu làm Quiz</span>
                        <ArrowRight className="w-4.5 h-4.5" />
                      </button>
                    </div>

                    {/* EXPANDABLE RETRIEVAL CITATIONS (SECONDARY LAYER) */}
                    <div className="mt-8 pt-4 border-t border-slate-100">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="text-[13px] text-slate-600">
                            <strong className="text-slate-800 font-semibold">Nguồn tổng hợp:</strong> Nội dung được tổng hợp từ tài liệu học tập do giảng viên cung cấp.
                          </div>

                          <button
                            onClick={() => setShowCitationsList(prev => !prev)}
                            className="text-[12.5px] font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 flex-shrink-0"
                          >
                            <span>{showCitationsList ? "Ẩn nguồn tham khảo" : "Xem nguồn tham khảo"}</span>
                            {showCitationsList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>

                        {showCitationsList && (
                          <div className="pt-3 border-t border-slate-200 space-y-2 animate-fadeIn text-[13px] text-slate-700">
                            <div className="font-semibold text-slate-800 text-[12px] uppercase tracking-wider">
                              Nguồn được sử dụng từ tài liệu:
                            </div>
                            <ul className="space-y-1.5 pl-1">
                              {uniqueCitedPages.length > 0 ? (
                                uniqueCitedPages.map((page, idx) => (
                                  <li key={idx} className="flex items-center gap-2 text-slate-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                    <span>Giáo trình học phần — Trang {page}</span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-slate-500 italic">Tài liệu học liệu chính thức được giảng viên cung cấp trong hệ thống.</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                  </article>

                  {/* STICKY RIGHT SIDEBAR: TABLE OF CONTENTS (MỤC LỤC) */}
                  <aside className="lg:col-span-4 sticky top-24 space-y-5">
                    
                    {/* Table of Contents Card */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm text-left">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-[13px] uppercase tracking-wider mb-4 pb-3 border-b border-slate-100">
                        <ListChecks className="w-4 h-4 text-slate-700" />
                        <span>Mục lục bài viết</span>
                      </div>

                      <nav className="space-y-1 text-[13px] text-slate-600 font-medium">
                        <a
                          href="#study-sec-1"
                          onClick={(e) => { e.preventDefault(); document.getElementById("study-sec-1")?.scrollIntoView({ behavior: "smooth" }); }}
                          className="block py-1 px-2.5 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors font-semibold text-slate-900"
                        >
                          I. Tổng quan kiến thức
                        </a>

                        <a
                          href="#study-sec-2"
                          onClick={(e) => { e.preventDefault(); document.getElementById("study-sec-2")?.scrollIntoView({ behavior: "smooth" }); }}
                          className="block py-1 px-2.5 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors font-semibold text-slate-900"
                        >
                          II. Các kiến thức cốt lõi
                        </a>
                        <div className="pl-3 space-y-1 border-l border-slate-200 ml-2.5 my-1">
                          <a
                            href="#study-sec-2-1"
                            onClick={(e) => { e.preventDefault(); document.getElementById("study-sec-2-1")?.scrollIntoView({ behavior: "smooth" }); }}
                            className="block py-0.5 px-2 rounded-md hover:text-slate-900 hover:bg-slate-50 text-[12.5px] transition-colors"
                          >
                            1. Mảng và chỉ số
                          </a>
                          <a
                            href="#study-sec-2-2"
                            onClick={(e) => { e.preventDefault(); document.getElementById("study-sec-2-2")?.scrollIntoView({ behavior: "smooth" }); }}
                            className="block py-0.5 px-2 rounded-md hover:text-slate-900 hover:bg-slate-50 text-[12.5px] transition-colors"
                          >
                            2. Ngăn xếp và hàng đợi
                          </a>
                          <a
                            href="#study-sec-2-3"
                            onClick={(e) => { e.preventDefault(); document.getElementById("study-sec-2-3")?.scrollIntoView({ behavior: "smooth" }); }}
                            className="block py-0.5 px-2 rounded-md hover:text-slate-900 hover:bg-slate-50 text-[12.5px] transition-colors"
                          >
                            3. Lược đồ thuật toán
                          </a>
                        </div>

                        <a
                          href="#study-sec-3"
                          onClick={(e) => { e.preventDefault(); document.getElementById("study-sec-3")?.scrollIntoView({ behavior: "smooth" }); }}
                          className="block py-1 px-2.5 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors font-semibold text-slate-900"
                        >
                          III. Phân tích và áp dụng
                        </a>

                        <a
                          href="#study-sec-4"
                          onClick={(e) => { e.preventDefault(); document.getElementById("study-sec-4")?.scrollIntoView({ behavior: "smooth" }); }}
                          className="block py-1 px-2.5 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors font-semibold text-slate-900"
                        >
                          IV. Ghi nhớ trước khi làm Quiz
                        </a>
                      </nav>

                      {/* Action in Sidebar */}
                      <div className="mt-6 pt-4 border-t border-slate-100">
                        <button
                          onClick={() => setActiveTab("quiz")}
                          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[13px] rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-sm border-none"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          <span>Làm bài trắc nghiệm ({questions.length} câu)</span>
                        </button>
                      </div>
                    </div>

                  </aside>

                </div>
              </div>
            ) : (
              /* ACTIVE QUIZ QUESTION CARD */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Question Navigator */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">
                        Danh sách câu hỏi
                      </span>
                      <span className="text-[12px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
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
                            className={`p-3 rounded-xl border text-left text-[13px] font-medium transition-all cursor-pointer flex items-center justify-between ${activeQuestionIndex === idx
                              ? "border-slate-900 bg-slate-900 text-white shadow-xs font-semibold"
                              : "border-slate-100 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                          >
                            <span>Câu {idx + 1}</span>
                            {isSelected && (
                              <span className={`w-2.5 h-2.5 rounded-full ${activeQuestionIndex === idx ? "bg-white" : "bg-slate-700"}`} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Active Question Card */}
                <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
                  {currentQ ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-md bg-slate-100 text-slate-800 text-[12px] font-bold">
                          Câu hỏi {activeQuestionIndex + 1} / {questions.length}
                        </span>
                      </div>

                      <h3 className="text-[17.5px] font-bold text-slate-900 leading-relaxed">
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
                              className={`w-full p-4 rounded-xl border text-left text-[14.5px] transition-all cursor-pointer flex items-center justify-between ${isSelected
                                ? "border-slate-900 bg-slate-50 text-slate-950 font-bold shadow-xs ring-1 ring-slate-900"
                                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-medium"
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`w-7 h-7 rounded-lg font-bold text-[13px] flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
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
                      <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                        <button
                          disabled={activeQuestionIndex === 0}
                          onClick={() => setActiveQuestionIndex(p => Math.max(0, p - 1))}
                          className="h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[13px] font-semibold text-slate-700 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Câu trước</span>
                        </button>

                        <button
                          onClick={() => setSubmitted(true)}
                          disabled={Object.keys(selectedAnswers).length === 0}
                          className="h-11 px-6 border-none rounded-xl text-[14px] font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 cursor-pointer shadow-sm"
                        >
                          Nộp bài Quiz
                        </button>

                        <button
                          disabled={activeQuestionIndex >= questions.length - 1}
                          onClick={() => setActiveQuestionIndex(p => Math.min(questions.length - 1, p + 1))}
                          className="h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[13px] font-semibold text-slate-700 disabled:opacity-40 cursor-pointer flex items-center gap-1"
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

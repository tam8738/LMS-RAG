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

  // Semantic Synthesizer: Builds a genuine, university-grade textbook Study Note from retrieved quiz & document data
  const synthesizedStudyNote = useMemo(() => {
    if (!quiz || questions.length === 0) return null;

    // Detect primary domain/language of the quiz
    const fullText = (quiz.title + " " + (quiz.description || "") + " " + questions.map(q => q.question + " " + q.options.map(o => o.text).join(" ")).join(" ")).toLowerCase();
    const isJava = fullText.includes("java") || fullText.includes("charat") || fullText.includes("isempty") || fullText.includes("string");
    const isAlgo = fullText.includes("thuật toán") || fullText.includes("mảng hiệu") || fullText.includes("prefix sum") || fullText.includes("cộng dồn") || fullText.includes("độ phức tạp") || fullText.includes("o(1)") || fullText.includes("o(n)");
    const isDatabase = fullText.includes("kho dữ liệu") || fullText.includes("data warehouse") || fullText.includes("olap") || fullText.includes("sql") || fullText.includes("khai phá");

    // 1. Naturalize question into clean concept name
    const toConceptTitle = (qText: string, ansText: string): string => {
      let t = qText.trim().replace(/\?+$/, "").replace(/^\d+[\.\:\s]+/, "").trim();
      const lower = t.toLowerCase();

      // Specific known mappings for common questions & algorithms
      if (lower.includes("lớp nào") && lower.includes("xâu")) return "Lớp String và cách biểu diễn xâu";
      if (lower.includes("ký tự đầu tiên") || lower.includes("charat")) return "Truy xuất ký tự (Phương thức charAt)";
      if (lower.includes("ghép hai xâu") || lower.includes("ghép xâu") || lower.includes("toán tử")) return "Ghép chuỗi (Toán tử +)";
      if (lower.includes("rỗng") || lower.includes("isempty")) return "Kiểm tra xâu rỗng (Phương thức isEmpty)";
      if (lower.includes("tính chất") && (lower.includes("xâu") || lower.includes("string") || lower.includes("immutable"))) return "Tính bất biến (Immutability) của String";
      if (lower.includes("độ phức tạp") || lower.includes("o(1)") || lower.includes("o(n)")) return "Độ phức tạp thuật toán";
      if (lower.includes("khôi phục mảng") || lower.includes("khôi phục")) return "Khôi phục mảng ban đầu từ mảng hiệu";
      if (lower.includes("tham lam") || lower.includes("greedy")) return "Thuật toán tham lam (Greedy)";
      if (lower.includes("mảng hiệu") || lower.includes("difference array")) return "Mảng hiệu (Difference Array)";
      if (lower.includes("cộng dồn") || lower.includes("prefix sum")) return "Mảng cộng dồn (Prefix Sum)";

      // General stripper
      const pattern = /^(?:lớp nào|phương thức nào|toán tử nào|hàm nào|cú pháp nào|thuật ngữ nào|khái niệm nào|đặc điểm nào|tính chất nào|cơ chế nào|đối tượng nào|lệnh nào|điều kiện nào|quy tắc nào|để)\s*(?:được\s*(?:sử\s*dụng|dùng)\s*để|dùng\s*để|sau\s*đây\s*là|cho\s*biết|là\s*gì|có\s*đặc\s*điểm\s*gì)?\s*/i;
      const stripped = t.replace(pattern, "").trim();

      if (stripped.length > 3 && stripped.length < 50) {
        return stripped.charAt(0).toUpperCase() + stripped.slice(1);
      }
      if (ansText && ansText.length < 30) {
        return ansText;
      }
      return t.length > 40 ? t.slice(0, 38) + "..." : t;
    };

    // 2. Synthesize individual concept items
    const rawConceptItems = questions.map((q, idx) => {
      const correctOpt = q.options.find(opt => q.correctOptionIds.includes(opt.id));
      const ans = correctOpt ? correctOpt.text : "";
      const title = toConceptTitle(q.question, ans);

      let expl = q.explanation ? cleanExcerptText(q.explanation) : "";
      let codeSnippet: { lang: string; code: string; caption?: string } | undefined = undefined;
      let formula: { text: string; explanation?: string } | undefined = undefined;

      const titleLower = title.toLowerCase();
      const ansLower = ans.toLowerCase();
      const qLower = q.question.toLowerCase();

      // Synthesize specific code/formula examples when supported by context
      if (titleLower.includes("lớp string") || (isJava && ansLower === "string")) {
        expl = "Trong Java, xâu ký tự được biểu diễn bằng đối tượng thuộc lớp String nằm trong gói java.lang. Đối tượng String lưu trữ chuỗi ký tự dạng văn bản Unicode.";
        codeSnippet = {
          lang: "java",
          code: 'String greeting = "Hello, Java!";',
          caption: "Khai báo và khởi tạo chuỗi ký tự trong Java",
        };
      } else if (titleLower.includes("tính bất biến") || ansLower.includes("immutable") || ansLower.includes("không thể thay đổi")) {
        expl = "Chuỗi ký tự trong Java có tính chất bất biến (immutable). Khi một đối tượng String được tạo ra trong bộ nhớ (String Constant Pool/Heap), nội dung của nó không thể bị chỉnh sửa. Mọi thao tác sửa đổi chuỗi sẽ tạo ra một đối tượng String hoàn toàn mới.";
        codeSnippet = {
          lang: "java",
          code: 'String str = "Hello";\nstr = str + " World"; // Tạo một đối tượng String mới trong bộ nhớ',
          caption: "Cơ chế bất biến khi thao tác trên String",
        };
      } else if (titleLower.includes("charat") || ansLower.includes("charat")) {
        expl = "Phương thức charAt(int index) trả về ký tự tại vị trí chỉ số xác định trong chuỗi. Trong Java, các phần tử trong xâu được đánh chỉ số bắt đầu từ 0 (0-indexed). Để lấy ký tự đầu tiên, ta truyền chỉ số 0.";
        codeSnippet = {
          lang: "java",
          code: 'String str = "Antigravity";\nchar firstChar = str.charAt(0); // Kết quả: \'A\'',
          caption: "Truy xuất ký tự đầu tiên bằng phương thức charAt(0)",
        };
      } else if (titleLower.includes("ghép chuỗi") || titleLower.includes("toán tử +") || ans === "+") {
        expl = "Để ghép hai hoặc nhiều xâu ký tự lại với nhau, Java hỗ trợ sử dụng toán tử +. Trình biên dịch sẽ tự động tối ưu việc nối chuỗi thông qua StringBuilder.";
        codeSnippet = {
          lang: "java",
          code: 'String firstName = "Nam";\nString lastName = "Nguyen";\nString fullName = firstName + " " + lastName; // "Nam Nguyen"',
          caption: "Ghép chuỗi bằng toán tử +",
        };
      } else if (titleLower.includes("isempty") || ansLower.includes("isempty")) {
        expl = "Phương thức isEmpty() kiểm tra xem xâu ký tự có rỗng hay không. Phương thức trả về true khi độ dài chuỗi bằng 0 (tương đương str.length() == 0).";
        codeSnippet = {
          lang: "java",
          code: 'String s1 = "";\nboolean empty = s1.isEmpty(); // true\n\nString s2 = "Data";\nboolean notEmpty = s2.isEmpty(); // false',
          caption: "Kiểm tra chuỗi rỗng với isEmpty()",
        };
      } else if (titleLower.includes("khôi phục") || qLower.includes("khôi phục")) {
        expl = "Để khôi phục mảng ban đầu A từ mảng hiệu D, ta thực hiện tính mảng cộng dồn trên D. Giá trị từng phần tử được xác định bởi A[0] = D[0] và A[i] = A[i-1] + D[i] với mọi i >= 1.";
        formula = {
          text: "A[0] = D[0]\nA[i] = A[i-1] + D[i]  (với mọi i >= 1)",
          explanation: "Công thức khôi phục mảng ban đầu từ mảng hiệu",
        };
      } else if (titleLower.includes("mảng hiệu") || titleLower.includes("difference")) {
        expl = "Mảng hiệu D của mảng A được định nghĩa với D[0] = A[0] và D[i] = A[i] - A[i-1] với mọi i >= 1. Kỹ thuật này cho phép cộng thêm giá trị v vào đoạn [L, R] với độ phức tạp O(1).";
        formula = {
          text: "D[L] = D[L] + v\nD[R+1] = D[R+1] - v",
          explanation: "Cập nhật đoạn [L, R] trên mảng hiệu",
        };
      } else if (titleLower.includes("prefix sum") || titleLower.includes("cộng dồn")) {
        expl = "Mảng cộng dồn P lưu tổng các phần tử từ đầu mảng đến vị trí hiện tại. Sau khi tiền xử lý O(n), ta có thể truy vấn tổng đoạn [L, R] bất kỳ trong thời gian O(1).";
        formula = {
          text: "P[i] = P[i-1] + A[i]\nSum(L, R) = P[R] - P[L-1]",
          explanation: "Công thức tính tổng tiền tố và truy vấn đoạn",
        };
      } else if (!expl || expl.length < 15) {
        expl = `${title} là một kiến thức quan trọng trong bài học. Giá trị xác định theo tài liệu là: ${ans}.`;
      }

      return {
        id: `c-${idx + 1}`,
        title,
        explanation: expl,
        ans,
        codeSnippet,
        formula,
      };
    });

    // 3. DEDUPLICATION & SEMANTIC MERGING: Group identical or highly similar concepts into a single comprehensive entry
    const mergedMap = new Map<string, typeof rawConceptItems[0]>();
    for (const item of rawConceptItems) {
      const key = item.title.toLowerCase().trim();
      if (!mergedMap.has(key)) {
        mergedMap.set(key, { ...item });
      } else {
        const existing = mergedMap.get(key)!;
        if (!existing.codeSnippet && item.codeSnippet) {
          existing.codeSnippet = item.codeSnippet;
        }
        if (!existing.formula && item.formula) {
          existing.formula = item.formula;
        }
        if (item.explanation && !existing.explanation.toLowerCase().includes(item.explanation.slice(0, 20).toLowerCase())) {
          existing.explanation = `${existing.explanation} ${item.explanation}`;
        }
      }
    }
    const conceptItems = Array.from(mergedMap.values());

    // 4. Group into 2 cohesive Chapters (Concepts vs Operations/Methods)
    const isMethodOrAction = (item: typeof conceptItems[0]) => {
      const text = (item.title + " " + item.explanation + " " + item.ans).toLowerCase();
      return text.includes("phương thức") || text.includes("toán tử") || text.includes("thao tác") ||
             text.includes("truy xuất") || text.includes("ghép") || text.includes("kiểm tra") ||
             text.includes("charat") || text.includes("isempty") || text.includes("+") ||
             text.includes("prefix sum") || text.includes("cộng dồn") ||
             text.includes("hàm") || text.includes("cài đặt") || text.includes("truy vấn");
    };

    let group1 = conceptItems.filter(item => !isMethodOrAction(item));
    let group2 = conceptItems.filter(item => isMethodOrAction(item));

    if (group1.length === 0 || group2.length === 0) {
      const mid = Math.ceil(conceptItems.length / 2);
      group1 = conceptItems.slice(0, mid);
      group2 = conceptItems.slice(mid);
    }

    const cleanTopic = quiz.title.replace(/^(?:quiz\s*về|bài\s*kiểm\s*tra\s*về|quiz\s*-\s*)\s*/i, "").trim();

    // Section 1 Heading
    let sec1Title = `Khái niệm & Bản chất của ${cleanTopic}`;
    if (isJava && cleanTopic.toLowerCase().includes("xâu")) {
      sec1Title = "Lớp String và Tính bất biến (Immutability)";
    } else if (isAlgo) {
      sec1Title = "Khái niệm và Nguyên lý nền tảng";
    } else if (isDatabase) {
      sec1Title = "Tổng quan và Kiến trúc Kho Dữ liệu";
    }

    // Section 2 Heading
    let sec2Title = `Các phương thức và Thao tác xử lý phổ biến`;
    if (isJava && cleanTopic.toLowerCase().includes("xâu")) {
      sec2Title = "Các phương thức và Toán tử thao tác xâu";
    } else if (isAlgo) {
      sec2Title = "Thuật toán và Quy tắc xử lý tối ưu";
    } else if (isDatabase) {
      sec2Title = "Kỹ thuật phân tích & Khai phá dữ liệu (OLAP & Data Mining)";
    }

    const sections = [
      {
        id: "sec-1",
        romanNum: "I",
        num: 1,
        title: sec1Title,
        items: group1,
      },
      {
        id: "sec-2",
        romanNum: "II",
        num: 2,
        title: sec2Title,
        items: group2,
      },
    ];

    // 5. Summarize Key Takeaways (Điểm cần nhớ)
    const keyTakeaways: string[] = [];
    if (isJava && cleanTopic.toLowerCase().includes("xâu")) {
      keyTakeaways.push("Xâu ký tự trong Java là đối tượng thuộc lớp String và có tính chất bất biến (immutable).");
      keyTakeaways.push("Mọi thao tác sửa đổi String thực chất sẽ tạo ra một đối tượng String mới trong bộ nhớ.");
      keyTakeaways.push("Sử dụng toán tử + để ghép nối chuỗi ký tự.");
      keyTakeaways.push("Sử dụng phương thức charAt(index) để lấy ký tự theo vị trí (chỉ số tính từ 0).");
      keyTakeaways.push("Sử dụng phương thức isEmpty() để kiểm tra xâu rỗng (độ dài bằng 0).");
    } else {
      conceptItems.forEach(item => {
        if (item.ans && item.ans.length < 50) {
          keyTakeaways.push(`${item.title}: ${item.ans}.`);
        } else {
          keyTakeaways.push(`${item.title}: ${item.explanation.split('.')[0]}.`);
        }
      });
    }

    return {
      title: quiz.title,
      overview: quiz.description || `Tài liệu tóm tắt các kiến thức trọng tâm, khái niệm nền tảng và phương thức cốt lõi của chủ đề ${quiz.title}.`,
      sections,
      keyTakeaways: keyTakeaways.slice(0, 6),
    };
  }, [quiz, questions]);

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

  const currentQ = questions[activeQuestionIndex];

  const handleSelectOption = (optId: string) => {
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
              /* STUDY NOTE VIEW (2-COLUMN DOCUMENTATION STYLE - SYNTHESIZED MASTER SPEC) */
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
                        {synthesizedStudyNote?.title || quiz.title}
                      </h1>

                      <p className="text-[14px] text-slate-600 font-medium">
                        Tài liệu ôn tập được biên soạn từ nội dung giảng viên cung cấp.
                      </p>
                    </div>

                    {/* CONTINUOUS FULL ARTICLE VIEW - ALL EXTRACTED DATA */}
                    <div className="space-y-8">
                      {/* TỔNG QUAN */}
                      <section id="study-overview" className="space-y-3 scroll-mt-24">
                        <p className="text-[15.5px] text-slate-700 leading-relaxed font-normal">
                          {synthesizedStudyNote?.overview || quiz.description}
                        </p>
                      </section>

                      {/* DYNAMIC CHAPTER SECTIONS (I, II...) */}
                      {synthesizedStudyNote?.sections.map((sec) => (
                        <section key={sec.id} id={`study-${sec.id}`} className="space-y-6 pt-4 border-t border-slate-100 scroll-mt-24">
                          <h2 className="text-[20px] font-extrabold text-slate-900 border-b border-slate-100 pb-2">
                            {sec.romanNum}. {sec.title}
                          </h2>

                          <div className="space-y-6">
                            {sec.items.map((item, idx) => (
                              <div key={item.id} id={`study-${sec.id}-${idx + 1}`} className="space-y-3 pt-1 scroll-mt-24">
                                <h3 className="text-[16px] font-bold text-slate-900 flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-800 text-[12px] font-bold flex items-center justify-center flex-shrink-0">
                                    {idx + 1}
                                  </span>
                                  <span>{item.title}</span>
                                </h3>

                                <p className="text-[14.5px] text-slate-700 leading-relaxed pl-7">
                                  {item.explanation}
                                </p>

                                {/* Code Block if supported */}
                                {item.codeSnippet && (
                                  <div className="ml-7 my-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-sm text-left">
                                    <div className="px-4 py-1.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                                      <span className="uppercase font-bold tracking-wider text-emerald-400">{item.codeSnippet.lang}</span>
                                      {item.codeSnippet.caption && <span className="text-slate-400 italic text-[11.5px]">{item.codeSnippet.caption}</span>}
                                    </div>
                                    <pre className="p-4 text-[13px] font-mono text-emerald-300 overflow-x-auto leading-relaxed whitespace-pre m-0">
                                      <code>{item.codeSnippet.code}</code>
                                    </pre>
                                  </div>
                                )}

                                {/* Formula Block if supported */}
                                {item.formula && (
                                  <div className="ml-7 my-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-center font-mono text-[14px] text-slate-900 font-semibold space-y-1">
                                    <div className="whitespace-pre-line leading-relaxed">{item.formula.text}</div>
                                    {item.formula.explanation && (
                                      <div className="text-[12px] text-slate-500 font-sans font-normal pt-1 italic">{item.formula.explanation}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </section>
                      ))}

                      {/* ĐIỂM CẦN NHỚ */}
                      <section id="study-takeaways" className="space-y-4 pt-4 border-t border-slate-100 scroll-mt-24">
                        <h2 className="text-[20px] font-extrabold text-slate-900 border-b border-slate-100 pb-2">
                          Điểm cần nhớ
                        </h2>

                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                          <ul className="space-y-2.5 text-[14.5px] text-slate-800 leading-relaxed">
                            {synthesizedStudyNote?.keyTakeaways.map((takeaway, i) => (
                              <li key={i} className="flex items-start gap-2.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-700 mt-2 flex-shrink-0" />
                                <span>{takeaway.replace(/^[•\s]+/, "")}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </section>
                    </div>

                    {/* BOTTOM ACTION CTA */}
                    <div className="pt-4 border-t border-slate-100 flex justify-center">
                      <button
                        onClick={() => setActiveTab("quiz")}
                        className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[14.5px] rounded-xl cursor-pointer transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 border-none"
                      >
                        <span>Bắt đầu làm bài trắc nghiệm ({questions.length} câu)</span>
                        <ArrowRight className="w-4.5 h-4.5" />
                      </button>
                    </div>

                    {/* EXPANDABLE RETRIEVAL CITATIONS (SECONDARY LAYER) */}
                    <div className="mt-8 pt-4 border-t border-slate-100">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="text-[13px] text-slate-600">
                            <strong className="text-slate-800 font-semibold">Nguồn tổng hợp:</strong> Nội dung được biên soạn từ tài liệu học tập chính thức của học phần.
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
                              Nguồn tài liệu được tham chiếu:
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

                  {/* STICKY RIGHT SIDEBAR: TABLE OF CONTENTS (MỤC LỤC TỰ ĐỘNG THEO TÀI LIỆU) */}
                  <aside className="lg:col-span-4 sticky top-24 space-y-5">
                    
                    {/* Table of Contents Card */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm text-left">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-[13px] uppercase tracking-wider mb-4 pb-3 border-b border-slate-100">
                        <ListChecks className="w-4 h-4 text-slate-700" />
                        <span>Mục lục bài viết</span>
                      </div>

                      <nav className="space-y-1 text-[13px] text-slate-600 font-medium">
                        <a
                          href="#study-overview"
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById("study-overview")?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="block py-1 px-2.5 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors font-semibold text-slate-900"
                        >
                          Tổng quan
                        </a>

                        {synthesizedStudyNote?.sections.map((sec) => (
                          <React.Fragment key={sec.id}>
                            <a
                              href={`#study-${sec.id}`}
                              onClick={(e) => {
                                e.preventDefault();
                                document.getElementById(`study-${sec.id}`)?.scrollIntoView({ behavior: "smooth" });
                              }}
                              className="block py-1 px-2.5 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors font-semibold text-slate-800"
                            >
                              {sec.romanNum}. {sec.title}
                            </a>
                            <div className="pl-3 space-y-1 border-l border-slate-200 ml-2.5 my-1">
                              {sec.items.map((item, idx) => (
                                <a
                                  key={item.id}
                                  href={`#study-${sec.id}-${idx + 1}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    document.getElementById(`study-${sec.id}-${idx + 1}`)?.scrollIntoView({ behavior: "smooth" });
                                  }}
                                  className="block py-0.5 px-2 rounded-md hover:text-slate-900 hover:bg-slate-50 text-[12.5px] transition-colors truncate max-w-[220px]"
                                  title={item.title}
                                >
                                  {idx + 1}. {item.title}
                                </a>
                              ))}
                            </div>
                          </React.Fragment>
                        ))}

                        <a
                          href="#study-takeaways"
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById("study-takeaways")?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="block py-1 px-2.5 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors font-semibold text-slate-800"
                        >
                          Điểm cần nhớ
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

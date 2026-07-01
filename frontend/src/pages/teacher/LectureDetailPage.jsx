import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
import { ArrowLeft, Upload, FileText, Sparkles, Edit2, Check, X, Globe, Archive, Trash2, RefreshCw, AlertCircle, CheckCircle2, Clock, Loader2, Plus, Brain, Zap, BookOpen, HelpCircle, ChevronRight, Eye, Download, MoreVertical } from 'lucide-react';
import { MOCK_COURSES } from '../../data/mockData';

const PRIMARY = '#6C4DF6';

function DocStatusBadge({ status }) {
  const map = {
    processed: {
      label: 'Processed',
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-250',
      icon: CheckCircle2
    },
    processing: {
      label: 'Processing...',
      cls: 'bg-amber-50 text-amber-700 border-amber-250',
      icon: Loader2
    },
    uploaded: {
      label: 'Uploaded',
      cls: 'bg-blue-50 text-blue-700 border-blue-250',
      icon: Clock
    },
    failed: {
      label: 'Failed',
      cls: 'bg-rose-50 text-rose-700 border-rose-250',
      icon: AlertCircle
    }
  };
  const item = map[status] || map.uploaded;
  const Icon = item.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-medium ${item.cls}`}>
      <Icon className={`w-3.5 h-3.5 ${status === 'processing' ? 'animate-spin' : ''}`} />
      <span>{item.label}</span>
    </span>
  );
}

function SummaryStatusBadge({ status }) {
  const map = {
    draft: 'bg-amber-50 text-amber-700 border-amber-200',
    published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    archived: 'bg-slate-50 text-slate-500 border-slate-200'
  };
  const labels = {
    draft: 'Bản nháp',
    published: 'Đã công bố',
    archived: 'Lưu trữ'
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold ${map[status] || map.draft}`}>
      {labels[status] || labels.draft}
    </span>
  );
}

const SUMMARY_STEPS = [
  { label: 'Đọc và phân tích tài liệu', sub: 'Chunking & tokenization' },
  { label: 'Trích xuất nội dung chính', sub: 'Semantic extraction' },
  { label: 'Sinh tóm tắt bằng LLM', sub: 'RAG generation' },
  { label: 'Kiểm tra & định dạng', sub: 'Post-processing' }
];

const QUIZ_STEPS = [
  { label: 'Phân tích kiến thức cốt lõi', sub: 'Knowledge graph' },
  { label: 'Xác định điểm kiểm tra', sub: 'Learning objectives' },
  { label: 'Sinh câu hỏi & đáp án', sub: 'Question generation' },
  { label: 'Kiểm tra độ khó & cân bằng', sub: 'Quality scoring' }
];

const SUMMARY_PREVIEW = `## Tóm tắt bài giảng (AI đang sinh)

### Các khái niệm cốt lõi
Dựa trên phân tích tài liệu, bài giảng tập trung vào...

### Nội dung chính
- Định nghĩa và vai trò của các khái niệm cơ bản
- So sánh và đối chiếu các phương pháp tiếp cận
- Ứng dụng thực tế trong lập trình...

### Điểm ôn tập`;

const QUIZ_PREVIEW = `Câu 1 (Trắc nghiệm): Khái niệm nào sau đây...
  A. Lựa chọn đầu tiên
  B. Lựa chọn đúng ✓
  C. Lựa chọn thứ ba
  D. Lựa chọn cuối

Câu 2 (Tự luận): Giải thích cơ chế hoạt động...`;

function AIGeneratingView({ type, steps, onCancel }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [previewLen, setPreviewLen] = useState(0);
  const preview = type === 'summary' ? SUMMARY_PREVIEW : QUIZ_PREVIEW;
  const [dots, setDots] = useState('');

  useEffect(() => {
    const dotTimer = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 400);
    return () => clearInterval(dotTimer);
  }, []);

  useEffect(() => {
    const timings = [600, 1400, 2000, 2600];
    const timers = timings.map((t, i) => setTimeout(() => setCurrentStep(i + 1), t));
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (currentStep < 3) return;
    if (previewLen >= preview.length) return;
    const t = setTimeout(() => setPreviewLen(l => Math.min(l + 12, preview.length)), 18);
    return () => clearTimeout(t);
  }, [currentStep, previewLen, preview.length]);

  const color = type === 'summary' ? 'indigo' : 'violet';
  const label = type === 'summary' ? 'Sinh tóm tắt' : 'Sinh quiz';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md text-left">
      <div className="bg-gradient-to-r from-indigo-650 to-violet-650 px-6 py-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="text-white font-bold text-sm">AI Studio</div>
              <div className="text-white/70 text-[10px]">EduRAG · RAG-powered generation</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-white text-xs font-bold uppercase tracking-wider">{label}{dots}</span>
          </div>
        </div>
      </div>
      <div className="p-6 grid lg:grid-cols-2 gap-6">
        <div>
          <p className="text-slate-400 mb-4 text-[10px] font-bold uppercase tracking-wider">Pipeline xử lý</p>
          <div className="space-y-3">
            {steps.map((step, i) => {
              const done = currentStep > i + 1;
              const active = currentStep === i + 1;
              return (
                <div key={i} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-300 ${done ? 'bg-emerald-50 border-emerald-100' : active ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${done ? 'bg-emerald-500' : active ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                    {done ? (
                      <Check className="w-3.5 h-3.5 text-white" />
                    ) : active ? (
                      <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                    ) : (
                      <span className="text-slate-400 text-xs font-bold">{i + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-bold ${done ? 'text-emerald-800' : active ? 'text-indigo-900' : 'text-slate-500'}`}>{step.label}</div>
                    <div className={`text-[10px] ${done ? 'text-emerald-600' : active ? 'text-indigo-500' : 'text-slate-400'}`}>{step.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-slate-400 mb-4 text-[10px] font-bold uppercase tracking-wider">Xem trước kết quả</p>
          <div className="bg-slate-900 rounded-xl p-4 h-full min-h-[240px]">
            <div className="flex items-center gap-1.5 mb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-500 ml-2 text-[10px] font-mono">output.md</span>
            </div>
            {currentStep < 3 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <Zap className="w-5 h-5 text-slate-600 mb-2 animate-bounce" />
                <p className="text-slate-600 text-xs">Đang chuẩn bị...</p>
              </div>
            ) : (
              <pre className="text-emerald-400 whitespace-pre-wrap text-left text-xs font-mono leading-relaxed max-h-60 overflow-y-auto">
                {preview.slice(0, previewLen)}
                {previewLen < preview.length && <span className="animate-pulse text-emerald-300">▋</span>}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LectureDetailPage({
  lecture,
  docs,
  summary,
  quiz,
  navigate,
  onUpdateDocStatus,
  onAddDoc,
  onGenerateSummary,
  onUpdateSummary,
  onGenerateQuiz,
  onUpdateQuizStatus,
  onDeleteQuestion
}) {
  const [tab, setTab] = useState('documents');
  const [summarySubTab, setSummarySubTab] = useState('general');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryContent, setSummaryContent] = useState(summary?.content ?? '');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setSummaryContent(summary?.content ?? '');
  }, [summary]);

  const handleGenSummary = () => {
    setIsGeneratingSummary(true);
    setTimeout(() => {
      setIsGeneratingSummary(false);
      onGenerateSummary();
    }, 3200);
  };

  const handleGenQuiz = () => {
    setIsGeneratingQuiz(true);
    setTimeout(() => {
      setIsGeneratingQuiz(false);
      onGenerateQuiz();
    }, 3200);
  };

  const handleFileUpload = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    onAddDoc({
      id: `d${Date.now()}`,
      lectureId: lecture.id,
      filename: file.name,
      fileType: file.name.endsWith('.pdf') ? 'pdf' : 'txt',
      fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      status: 'uploaded',
      uploadedAt: new Date().toISOString().split('T')[0]
    });
  };

  const tabs = [
    { key: 'documents', label: 'Tài liệu', count: docs.length },
    { key: 'summary', label: 'Tóm tắt' },
    { key: 'quiz', label: 'Quiz', count: quiz?.questions.length }
  ];
  const processedDocs = docs.filter(d => d.status === 'processed');
  const course = MOCK_COURSES.find(c => c.id === lecture.courseId);

  return (
    <div className="p-6 max-w-screen-2xl mx-auto min-h-[calc(100vh-2rem)] text-left relative">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-5">
        <button onClick={() => navigate('teacher-courses')} className="hover:text-indigo-650 transition-colors border-none bg-transparent cursor-pointer font-medium text-slate-500">Khóa học</button>
        <span>&gt;</span>
        <button onClick={() => navigate('teacher-course-detail', { selectedCourseId: lecture.courseId })} className="hover:text-indigo-650 transition-colors border-none bg-transparent cursor-pointer font-medium text-slate-500">{course ? course.name : 'Chi tiết khóa học'}</button>
        <span>&gt;</span>
        <span className="text-slate-400 font-light">{lecture.title}</span>
      </div>

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
            {String(lecture.order).padStart(2, '0')}
          </span>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{lecture.title}</h1>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${summary?.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-amber-50 text-amber-700 border-amber-250'}`}>
            {summary?.status === 'published' ? 'Đã công bố' : 'Bản nháp'}
          </span>
        </div>
        <button className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 hover:border-slate-350 text-slate-650 px-4 py-2 rounded-xl transition-all font-semibold text-xs cursor-pointer shadow-sm bg-white">
          <Eye className="w-3.5 h-3.5 text-slate-450" />
          <span>Xem trước bài giảng</span>
        </button>
      </div>

      {/* Tab selectors with bottom outline */}
      <div className="flex border-b border-slate-200 mb-6">
        {tabs.map(({ key, label, count }) => {
          const active = tab === key;
          return (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all border-none bg-transparent cursor-pointer ${active ? 'border-indigo-650 text-indigo-650' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              <span>{label}</span>
              {count !== undefined && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${active ? 'bg-indigo-50 text-indigo-650' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab: Documents */}
      {tab === 'documents' && (
        <div className="space-y-6">
          {/* Upload card matching mockup dropzone */}
          <div onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { e.preventDefault(); setIsDragging(false); }}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all bg-white ${isDragging ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 hover:border-indigo-400'}`}>
            <div className="w-12 h-12 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
              <Upload className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-slate-700 text-xs font-semibold mb-1">
              Kéo thả file vào đây hoặc <span className="text-indigo-600 font-bold hover:underline cursor-pointer">chọn file</span> để upload
            </p>
            <p className="text-slate-400 text-[10px] mb-4">Hỗ trợ PDF, TXT. Tối đa 20MB/file</p>
            <label className="inline-flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl px-4 py-2 cursor-pointer transition-all font-semibold text-xs bg-white text-slate-650 shadow-sm">
              <Plus className="w-4 h-4 text-slate-500" />
              <span>Chọn file</span>
              <input type="file" accept=".pdf,.txt" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          {/* List of documents table */}
          {docs.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Danh sách tài liệu</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="py-3 px-5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tên file</th>
                      <th className="py-3 px-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider w-32">Kích thước</th>
                      <th className="py-3 px-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider w-36">Trạng thái</th>
                      <th className="py-3 px-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider w-44">Ngày upload</th>
                      <th className="py-3 px-4 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider w-32">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {docs.map(doc => (
                      <tr key={doc.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <FileText className="w-4 h-4 text-rose-500" />
                            <span className="text-slate-800 text-xs font-bold truncate max-w-xs">{doc.filename}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-500 text-xs font-medium">{doc.fileSize}</td>
                        <td className="px-4 py-4"><DocStatusBadge status={doc.status} /></td>
                        <td className="px-4 py-4 text-slate-450 text-xs font-mono">{doc.uploadedAt}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            {doc.status === 'uploaded' ? (
                              <button onClick={() => onUpdateDocStatus(doc.id, 'processing')}
                                className="flex items-center gap-1 text-white rounded-lg px-2.5 py-1.5 bg-[#6C4DF6] hover:opacity-90 transition-all text-[10px] font-bold shadow-sm cursor-pointer border-none uppercase tracking-wider">
                                <Sparkles className="w-3 h-3 text-white" />
                                <span>Xử lý AI</span>
                              </button>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <button className="p-1.5 rounded-lg text-slate-450 hover:text-indigo-650 hover:bg-slate-50 transition-colors border-none bg-transparent cursor-pointer" title="Xem tài liệu">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button className="p-1.5 rounded-lg text-slate-450 hover:text-indigo-650 hover:bg-slate-50 transition-colors border-none bg-transparent cursor-pointer" title="Tải xuống">
                                  <Download className="w-4 h-4" />
                                </button>
                                <button className="p-1.5 rounded-lg text-slate-450 hover:text-slate-700 hover:bg-slate-50 transition-colors border-none bg-transparent cursor-pointer" title="Menu">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Warning banner alert at bottom */}
          <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 flex items-start gap-2.5 text-amber-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed font-semibold">
              Lưu ý: Sau khi upload, hãy bấm "Xử lý AI" để hệ thống đọc tài liệu và tạo nội dung AI tương ứng.
            </p>
          </div>

          {processedDocs.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <button onClick={() => { setTab('summary'); if (!summary) handleGenSummary(); }}
                className="flex items-center gap-3.5 p-4 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-200 rounded-xl transition-all text-left group cursor-pointer">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center transition-colors shrink-0 shadow-sm group-hover:scale-105">
                  <BookOpen className="w-5 h-5 text-indigo-650" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-indigo-950 text-sm font-bold">Sinh tóm tắt AI</div>
                  <div className="text-indigo-500 text-[11px] mt-0.5 font-light">
                    {summary ? (summary.status === 'published' ? 'Đã công bố · Xem lại' : 'Bản nháp đã sẵn sàng') : 'Chưa tạo · Tạo ngay bằng RAG'}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button onClick={() => { setTab('quiz'); if (!quiz) handleGenQuiz(); }}
                className="flex items-center gap-3.5 p-4 bg-violet-50/50 hover:bg-violet-50 border border-violet-200 rounded-xl transition-all text-left group cursor-pointer">
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center transition-colors shrink-0 shadow-sm group-hover:scale-105">
                  <HelpCircle className="w-5 h-5 text-violet-650" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-violet-955 text-sm font-bold">Sinh quiz AI</div>
                  <div className="text-violet-500 text-[11px] mt-0.5 font-light">
                    {quiz ? `${quiz.questions.length} câu hỏi · ${quiz.status === 'published' ? 'Đã công bố' : 'Bản nháp'}` : 'Chưa tạo · Tạo ngay bằng RAG'}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-violet-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Summary */}
      {tab === 'summary' && (
        <div className="space-y-5">
          {isGeneratingSummary ? (
            <AIGeneratingView type="summary" steps={SUMMARY_STEPS} onCancel={() => setIsGeneratingSummary(false)} />
          ) : !summary ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-8 text-center text-white" style={{ background: 'linear-gradient(135deg, #6C4DF6, #9C7AF8)' }}>
                <div className="w-16 h-16 bg-white/15 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-white text-lg font-bold tracking-tight mb-2">AI Studio — Sinh tóm tắt</h2>
                <p className="text-white/80 text-xs font-light max-w-md mx-auto leading-relaxed mb-6">
                  Sử dụng công nghệ RAG để quét và tổng hợp nội dung cốt lõi từ tài liệu lớp học của bạn thành các điểm tóm tắt ôn tập khoa học.
                </p>
                {processedDocs.length === 0 ? (
                  <div className="inline-flex items-center gap-1.5 bg-amber-500/25 border border-amber-400/30 rounded-full px-4.5 py-1.5 text-amber-250 text-xs font-semibold mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>Cần xử lý ít nhất 1 tài liệu ở Tab Tài liệu</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 bg-emerald-500/25 border border-emerald-400/30 rounded-full px-4.5 py-1.5 text-emerald-250 text-xs font-semibold mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{processedDocs.length} tài liệu đã sẵn sàng</span>
                  </div>
                )}
                <div className="block mt-4">
                  <button onClick={handleGenSummary} disabled={processedDocs.length === 0}
                    className="inline-flex items-center gap-2 bg-white text-[#6C4DF6] rounded-xl px-6 py-2.5 hover:bg-slate-50 transition-all font-bold text-xs uppercase shadow-md disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer">
                    <Sparkles className="w-4 h-4 text-[#6C4DF6]" />
                    <span>Sinh tóm tắt</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4 text-left">
                {/* Summary Card Preview */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-wrap gap-3">
                    {/* Sub-tabs for General/Review */}
                    <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
                      {[
                        { key: 'general', label: 'Tóm tắt tổng quát' },
                        { key: 'review', label: 'Tóm tắt ôn tập' }
                      ].map(({ key, label }) => (
                        <button key={key} onClick={() => setSummarySubTab(key)}
                          className="px-3.5 py-1.5 rounded-md transition-all border-none bg-transparent cursor-pointer text-xs font-semibold"
                          style={{
                            background: summarySubTab === key ? 'white' : 'transparent',
                            color: summarySubTab === key ? '#1e293b' : '#64748b',
                            boxShadow: summarySubTab === key ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                          }}>
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={handleGenSummary} disabled={processedDocs.length === 0}
                        className="flex items-center gap-1 border border-slate-200 hover:bg-slate-50 text-slate-650 px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer bg-white">
                        <RefreshCw className="w-3 h-3 text-slate-500" />
                        <span>Sinh lại tóm tắt</span>
                      </button>

                      <div className="relative">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl border text-[11px] font-bold ${summary.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {summary.status === 'published' ? 'Đã công bố ▾' : 'Bản nháp ▾'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {editingSummary ? (
                    <textarea value={summaryContent} onChange={e => setSummaryContent(e.target.value)}
                      className="w-full p-6 resize-none focus:outline-none rounded-b-2xl min-h-[360px] text-xs font-mono leading-relaxed" />
                  ) : (
                    <div className="p-6 text-xs text-slate-700 leading-relaxed font-light font-mono max-h-[420px] overflow-y-auto whitespace-pre-wrap bg-slate-50/50">
                      {summarySubTab === 'general' ? summary.content : summary.content.split('\n').filter(l => l.includes('Điểm') || l.includes('ôn') || l.includes('key') || l.trim().startsWith('-')).join('\n') || summary.content}
                    </div>
                  )}
                </div>

                {/* Bottom summary actions */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-slate-400 text-[10px] font-semibold italic">✨ Sinh bởi AI - Vui lòng kiểm tra và chỉnh sửa trước khi công bố.</span>

                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditingSummary(!editingSummary)}
                      className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-650 px-4 py-2 rounded-xl font-bold text-xs transition-colors bg-white cursor-pointer shadow-sm">
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{editingSummary ? 'Đang chỉnh sửa' : 'Chỉnh sửa'}</span>
                    </button>

                    {editingSummary && (
                      <button onClick={() => { onUpdateSummary(summary.id, summaryContent, summary.status); setEditingSummary(false); }}
                        className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl px-4 py-2 transition-all font-bold text-xs bg-white cursor-pointer shadow-sm">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Lưu bản nháp</span>
                      </button>
                    )}

                    {summary.status !== 'published' ? (
                      <button onClick={() => onUpdateSummary(summary.id, summaryContent, 'published')}
                        className="flex items-center gap-1.5 text-white rounded-xl px-5 py-2 hover:opacity-90 transition-all font-bold text-xs border-none cursor-pointer shadow-md shadow-indigo-100 bg-[#6C4DF6]">
                        <span>Công bố</span>
                      </button>
                    ) : (
                      <button onClick={() => onUpdateSummary(summary.id, summary.content, 'draft')}
                        className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl px-4 py-2 transition-all font-bold text-xs bg-white cursor-pointer">
                        <span>Hạ bản nháp</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary sidebar guidelines */}
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Lưu ý kiểm duyệt</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {[
                      'Sinh viên chỉ xem được nội dung tóm tắt đã công bố.',
                      'Kiểm tra lại nội dung tóm tắt để tránh sai sót kiến thức AI.',
                      'Có thể bổ sung tài liệu và sinh lại bất kỳ lúc nào.'
                    ].map((note, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-indigo-50 border border-indigo-150 text-[#6C4DF6] flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold font-mono">{i + 1}</span>
                        <p className="text-slate-500 text-xs font-light leading-relaxed">{note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Quiz */}
      {tab === 'quiz' && (
        <div className="space-y-5">
          {isGeneratingQuiz ? (
            <AIGeneratingView type="quiz" steps={QUIZ_STEPS} onCancel={() => setIsGeneratingQuiz(false)} />
          ) : !quiz ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-8 text-center text-white" style={{ background: 'linear-gradient(135deg, #7C3AED, #9333EA)' }}>
                <div className="w-16 h-16 bg-white/15 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <HelpCircle className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-white text-lg font-bold tracking-tight mb-2">AI Studio — Sinh Quiz</h2>
                <p className="text-white/80 text-xs font-light max-w-md mx-auto leading-relaxed mb-6">
                  Tự động sinh các câu hỏi trắc nghiệm kiểm tra và đánh giá ngắn dựa trên việc đối chiếu RAG với tài liệu gốc bài giảng.
                </p>
                {processedDocs.length === 0 ? (
                  <div className="inline-flex items-center gap-1.5 bg-amber-500/25 border border-amber-400/30 rounded-full px-4.5 py-1.5 text-amber-250 text-xs font-semibold mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>Cần xử lý ít nhất 1 tài liệu ở Tab Tài liệu</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 bg-emerald-500/25 border border-emerald-400/30 rounded-full px-4.5 py-1.5 text-emerald-250 text-xs font-semibold mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{processedDocs.length} tài liệu đã sẵn sàng</span>
                  </div>
                )}
                <div className="block mt-4">
                  <button onClick={handleGenQuiz} disabled={processedDocs.length === 0}
                    className="inline-flex items-center gap-2 bg-white text-[#7C3AED] rounded-xl px-6 py-2.5 hover:bg-slate-50 transition-all font-bold text-xs uppercase shadow-md disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer">
                    <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                    <span>Sinh quiz bằng AI</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Quiz Summary Actions Bar */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-slate-600 text-xs font-bold uppercase tracking-wider bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5">
                  Tổng số câu: {quiz.questions.length} | Điểm tối đa: {quiz.questions.length} điểm
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={handleGenQuiz}
                    className="flex items-center gap-1 border border-slate-200 hover:bg-slate-50 text-slate-650 px-3 py-1.5 rounded-xl font-bold text-xs transition-all bg-white cursor-pointer">
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Sinh thử đề mới</span>
                  </button>

                  <div className="relative">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl border text-[11px] font-bold ${quiz.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {quiz.status === 'published' ? 'Đã công bố ▾' : 'Bản nháp ▾'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Questions list */}
              <div className="space-y-4">
                {quiz.questions.map((q, idx) => (
                  <div key={q.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 group text-left">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-xs bg-[#6C4DF6]">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="text-[10px] font-extrabold bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 uppercase tracking-wide mr-2">
                            {q.type === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'} (1 điểm)
                          </span>
                          <p className="text-slate-800 text-sm font-bold mt-1.5 leading-snug">{q.question}</p>
                        </div>
                      </div>

                      {/* Hover action icons */}
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button className="p-1 rounded-lg text-slate-400 hover:text-indigo-650 hover:bg-slate-55 transition-colors border-none bg-transparent cursor-pointer">
                          <Edit2 className="w-4.5 h-4.5" />
                        </button>
                        <button className="p-1 rounded-lg text-slate-400 hover:text-indigo-650 hover:bg-slate-55 transition-colors border-none bg-transparent cursor-pointer">
                          <RefreshCw className="w-4.5 h-4.5" />
                        </button>
                        <button onClick={() => onDeleteQuestion(quiz.id, q.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-55 transition-colors border-none bg-transparent cursor-pointer">
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>

                    {q.options && (
                      <div className="flex flex-col gap-2 ml-10 mb-4">
                        {q.options.map((opt, i) => {
                          const isCorrect = opt === q.correctAnswer;
                          const letter = ['A', 'B', 'C', 'D'][i];
                          return (
                            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${isCorrect ? 'bg-emerald-50/70 border-emerald-250 text-emerald-800 font-semibold' : 'bg-white border-slate-100 text-slate-650'}`}>
                              {/* Custom Radio Button */}
                              <div className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isCorrect ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-white'}`}>
                                {isCorrect && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <span className="text-xs leading-normal">
                                {letter}. {opt}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.explanation && (
                      <div className="mt-3 ml-10 p-3 bg-amber-50/50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed font-light">
                        <span className="font-bold">Giải thích:</span> {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Bottom Quiz Actions */}
              <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
                <button className="border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl px-5 py-2.5 font-bold text-xs uppercase tracking-wider bg-white cursor-pointer shadow-sm">
                  Xem trước
                </button>
                {quiz.status === 'draft' ? (
                  <button onClick={() => onUpdateQuizStatus(quiz.id, 'published')}
                    className="text-white rounded-xl px-6 py-2.5 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] transition-all font-bold text-xs uppercase tracking-wider border-none bg-[#6C4DF6] shadow-md shadow-indigo-100 cursor-pointer">
                    Công bố quiz
                  </button>
                ) : (
                  <button onClick={() => onUpdateQuizStatus(quiz.id, 'draft')}
                    className="border border-slate-205 text-slate-600 rounded-xl px-5 py-2.5 font-bold text-xs uppercase tracking-wider bg-white cursor-pointer">
                    Hạ xuống bản nháp
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

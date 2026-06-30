import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState } from 'react';
import { ArrowLeft, Plus, BookOpen, FileText, Copy, Check, Users, Pencil, Eye, X } from 'lucide-react';
import { MOCK_DOCUMENTS, MOCK_SUMMARIES, MOCK_QUIZZES } from '../../data/mockData';

const PRIMARY = '#6C4DF6';

function StatusBadge({ status }) {
  if (!status) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 font-semibold text-[10px]">
        Chưa có
      </span>
    );
  }
  if (status === 'published') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-[10px]">
        Đã công bố
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold text-[10px]">
      Bản nháp
    </span>
  );
}

export default function CourseDetailPage({
  course,
  navigate,
  lectures,
  onAddLecture
}) {
  const [showModal, setShowModal] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: ''
  });

  const copyCode = () => {
    setCodeCopied(true);
    navigator.clipboard.writeText(course.courseCode).catch(err => console.error(err));
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleCreate = e => {
    e.preventDefault();
    onAddLecture({
      id: `l${Date.now()}`,
      courseId: course.id,
      title: form.title,
      description: form.description,
      order: lectures.length + 1
    });
    setForm({
      title: '',
      description: ''
    });
    setShowModal(false);
  };

  const totalDocs = MOCK_DOCUMENTS.filter(d => lectures.some(l => l.id === d.lectureId)).length;

  return (
    <div className="py-4 px-6 max-w-6xl mx-auto text-left relative">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-3.5">
        <button onClick={() => navigate('teacher-courses')} className="hover:text-indigo-600 transition-colors border-none bg-transparent cursor-pointer font-medium text-slate-500">Khóa học</button>
        <span>&gt;</span>
        <span className="text-slate-400 font-light">{course.name}</span>
      </div>

      {/* Hero Card */}
      <div className="rounded-xl overflow-hidden shadow-sm mb-4.5 relative" style={{ background: 'linear-gradient(135deg, #6C4DF6, #9C7AF8)' }}>
        {/* Decorative glows */}
        <div className="w-56 h-56 rounded-full bg-white/5 blur-xl absolute -top-12 -right-12 pointer-events-none" />
        <div className="w-48 h-48 rounded-full bg-white/10 blur-xl absolute -bottom-10 -left-10 pointer-events-none animate-pulse" />

        <div className="p-5 relative z-10">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/95 rounded-lg flex items-center justify-center font-extrabold text-[#6C4DF6] text-lg shadow-sm shrink-0">
                W
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-white text-lg font-bold tracking-tight">{course.name}</h1>
                  <span className="bg-white/20 text-white border border-white/10 rounded-md px-1.5 py-0.5 text-[10px] font-bold font-mono tracking-wider">
                    {course.courseCode}
                  </span>
                </div>
                <p className="text-white/90 text-xs font-light max-w-2xl leading-relaxed mb-3">
                  {course.description || 'Khóa học chưa có mô tả chi tiết. Vui lòng chỉnh sửa để cập nhật.'}
                </p>

                {/* Hero Stats */}
                <div className="flex flex-wrap items-center gap-6 text-white/90 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-white/80" />
                    <span><strong className="font-semibold">{course.studentCount}</strong> sinh viên</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-white/80" />
                    <span><strong className="font-semibold">{lectures.length}</strong> bài giảng</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-white/80" />
                    <span><strong className="font-semibold">{totalDocs}</strong> tài liệu</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Actions */}
            <div className="flex md:flex-col gap-1.5 shrink-0 self-end md:self-start">
              <button className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg px-3 py-1.5 border border-white/10 transition-all font-semibold text-xs cursor-pointer shadow-sm">
                <Pencil className="w-3.5 h-3.5" />
                <span>Chỉnh sửa</span>
              </button>
              <button onClick={copyCode} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg px-3 py-1.5 border border-white/10 transition-all font-semibold text-xs cursor-pointer shadow-sm">
                {codeCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{codeCopied ? 'Đã sao chép' : 'Sao chép mã'}</span>
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-white/15 flex justify-end gap-6 text-white/70 text-[10px] font-mono">
            <span>Ngày tạo: 30/05/2026</span>
            <span>Cập nhật: 25/06/2026</span>
          </div>
        </div>
      </div>

      {/* Lectures Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between min-h-[300px]">
        <div>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800 tracking-tight">Danh sách bài giảng</h2>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 text-white rounded-lg px-3 py-1.5 transition-all hover:opacity-90 font-bold text-xs shadow-sm cursor-pointer border-none bg-[#6C4DF6]">
              <Plus className="w-4 h-4 text-white" />
              <span>Thêm bài giảng</span>
            </button>
          </div>

          {lectures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mb-3">
                <BookOpen className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-slate-500 mb-2 text-xs font-semibold">Chưa có bài giảng nào trong khóa học này</p>
              <button onClick={() => setShowModal(true)}
                className="text-xs transition-colors hover:underline border-none bg-transparent cursor-pointer text-[#6C4DF6] font-bold">
                Thêm bài giảng đầu tiên →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-5 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider w-14">#</th>
                    <th className="px-3.5 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tên bài giảng</th>
                    <th className="px-3.5 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mô tả</th>
                    <th className="px-3.5 py-2.5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider w-24">Tài liệu</th>
                    <th className="px-3.5 py-2.5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider w-28">Tóm tắt</th>
                    <th className="px-3.5 py-2.5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider w-28">Quiz</th>
                    <th className="px-3.5 py-2.5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider w-24">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {lectures.map((lecture, idx) => {
                    const docs = MOCK_DOCUMENTS.filter(d => d.lectureId === lecture.id);
                    const summary = MOCK_SUMMARIES.find(s => s.lectureId === lecture.id);
                    const quiz = MOCK_QUIZZES.find(q => q.lectureId === lecture.id);
                    const summaryStatus = summary ? (summary.status === 'published' ? 'published' : 'draft') : null;
                    const quizStatus = quiz ? (quiz.status === 'published' ? 'published' : 'draft') : null;

                    return (
                      <tr key={lecture.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-5 py-2.5">
                          <span className="w-7 h-7 bg-slate-50 border border-slate-100 text-slate-500 rounded-lg flex items-center justify-center text-xs font-bold font-mono">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="text-slate-800 text-xs font-bold hover:text-indigo-650 cursor-pointer"
                            onClick={() => navigate('teacher-lecture-detail', { selectedLectureId: lecture.id, selectedCourseId: course.id })}>
                            {lecture.title}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="text-slate-500 text-xs font-light max-w-xs truncate" title={lecture.description}>
                            {lecture.description || 'Chưa có mô tả ngắn...'}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1 text-slate-500">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-bold text-slate-700">{docs.length}</span>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <StatusBadge status={summaryStatus} />
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <StatusBadge status={quizStatus} />
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <button
                            onClick={() => navigate('teacher-lecture-detail', {
                              selectedLectureId: lecture.id,
                              selectedCourseId: course.id
                            })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-[#6C4DF6] hover:border-[#6C4DF6]/40 hover:bg-indigo-50/40 transition-all text-xs font-semibold cursor-pointer shadow-sm"
                          >
                            {/* <Eye className="w-3.5 h-3.5" /> */}
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Legend status indicators */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-4 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Đã công bố</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>Bản nháp</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <span>Chưa có</span>
          </div>
        </div>
      </div>

      {/* Create lecture modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden relative">
            <div className="px-6 py-5 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
              <div className="text-left">
                <h2 className="text-slate-900 text-base font-bold tracking-tight">Thêm bài giảng mới</h2>
                <p className="text-slate-500 text-xs mt-0.5 font-light">Trong khóa học: {course.name}</p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-650 transition-colors border-none bg-transparent cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5 text-xs uppercase tracking-wider">Tên bài giảng *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition placeholder:text-slate-300 text-sm"
                  placeholder="Ví dụ: Giới thiệu về Hooks" />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5 text-xs uppercase tracking-wider">Mô tả</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition resize-none placeholder:text-slate-300 text-sm"
                  placeholder="Mô tả tóm tắt nội dung bài giảng..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-slate-200 text-slate-600 rounded-xl py-2.5 hover:bg-slate-50 hover:border-slate-300 transition font-bold text-xs uppercase tracking-wider cursor-pointer bg-white">
                  Hủy
                </button>
                <button type="submit" className="flex-1 text-white rounded-xl py-2.5 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] transition font-bold text-xs uppercase tracking-wider cursor-pointer shadow-md shadow-indigo-100 border-none bg-[#6C4DF6]">
                  Thêm bài giảng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

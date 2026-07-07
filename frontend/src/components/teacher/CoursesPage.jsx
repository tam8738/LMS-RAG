import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Plus, Users, BookOpen, Copy, Check, Search, ChevronDown } from 'lucide-react';
import { MOCK_COURSES, MOCK_LECTURES } from '../../data/mockData';


const PRIMARY = '#6C4DF6';

const GRADIENT_COLORS = [
  { from: '#6C4DF6', to: '#9C7AF8', letter: '#fff' },
  { from: '#10B981', to: '#34D399', letter: '#fff' },
  { from: '#F59E0B', to: '#FCD34D', letter: '#fff' },
  { from: '#EF4444', to: '#F87171', letter: '#fff' },
  { from: '#0EA5E9', to: '#38BDF8', letter: '#fff' },
  { from: '#8B5CF6', to: '#A78BFA', letter: '#fff' },
];

const SORT_OPTIONS = ['Mới nhất', 'Cũ nhất', 'Tên A-Z', 'Nhiều sinh viên nhất'];

function CourseCodeBadge({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = (e) => {
    e.stopPropagation();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-colors"
      style={{ background: '#F1F5F9', color: '#475569' }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', fontFamily: 'monospace' }}>{code}</span>
      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

export default function CoursesPage({ navigate, onCreateCourse }) {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [sortIdx, setSortIdx] = useState(0);
  const [showSort, setShowSort] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const filtered = MOCK_COURSES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.courseCode.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = (e) => {
    e.preventDefault();
    const code = 'CRS' + Math.random().toString(36).substring(2, 7).toUpperCase();
    onCreateCourse({
      id: `c${Date.now()}`,
      name: form.name,
      description: form.description,
      courseCode: code,
      teacherId: 'u1',
      studentCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
    });
    setForm({ name: '', description: '' });
    setShowModal(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        {/* <div className="flex-1 text-left">
          <h1 className="text-slate-900" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Khóa học</h1>
          <p className="text-slate-500 mt-1" style={{ fontSize: '0.875rem' }}>
            Bạn đang quản lý {MOCK_COURSES.length} khóa học
          </p>
        </div> */}
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 text-white rounded-xl px-4 py-2.5 hover:opacity-90 transition-opacity"
          style={{ background: PRIMARY }}>
          <Plus className="w-4 h-4" />
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Tạo khóa học</span>
        </button>
      </div>

      {/* Search + Sort bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
            style={{ fontSize: '0.875rem' }} placeholder="Tìm kiếm khóa học..." />
        </div>
        {/* Sort dropdown */}
        <div className="relative">
          <button onClick={() => setShowSort(v => !v)}
            className="flex items-center gap-2 border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white hover:bg-slate-50 transition-colors"
            style={{ fontSize: '0.875rem', color: '#475569' }}>
            Sắp xếp: {SORT_OPTIONS[sortIdx]}
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showSort ? 'rotate-180' : ''}`} />
          </button>
          {showSort && (
            <div className="absolute right-0 top-11 w-44 bg-white rounded-xl shadow-lg border border-slate-100 z-20 overflow-hidden py-1">
              {SORT_OPTIONS.map((opt, i) => (
                <button key={opt} onClick={() => { setSortIdx(i); setShowSort(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors"
                  style={{ fontSize: '0.8125rem', fontWeight: i === sortIdx ? 600 : 400, color: i === sortIdx ? PRIMARY : '#475569' }}>
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((course, idx) => {
          const lectures = MOCK_LECTURES.filter(l => l.courseId === course.id);
          const grad = GRADIENT_COLORS[idx % GRADIENT_COLORS.length];
          return (
            <div key={course.id}
              onClick={() => navigate('teacher-course-detail', { selectedCourseId: course.id })}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md hover:border-indigo-200 cursor-pointer transition-all group">
              {/* Top color bar */}
              <div className="h-1.5" style={{ background: `linear-gradient(to right, ${grad.from}, ${grad.to})` }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${grad.from}, ${grad.to})`, fontSize: '1.125rem', fontWeight: 700 }}>
                    {course.name.charAt(0)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CourseCodeBadge code={course.courseCode} />
                    <button onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                      ···
                    </button>
                  </div>
                </div>

                <h3 className="text-slate-900 mb-1.5 group-hover:text-indigo-700 transition-colors"
                  style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.4 }}>
                  {course.name}
                </h3>
                <p className="text-slate-500 mb-4" style={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>
                  {course.description}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1 text-slate-500">
                    <Users className="w-3.5 h-3.5" />
                    <span style={{ fontSize: '0.8125rem' }}>{course.studentCount} sinh viên</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span style={{ fontSize: '0.8125rem' }}>{lectures.length} bài giảng</span>
                  </div>
                  <span className="text-slate-400" style={{ fontSize: '0.75rem' }}>Cập nhật: {course.createdAt}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Create new card */}
        <button onClick={() => setShowModal(true)}
          className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-5 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all group flex flex-col items-center justify-center gap-3 min-h-[200px]">
          <div className="w-11 h-11 bg-slate-100 group-hover:bg-indigo-100 rounded-xl flex items-center justify-center transition-colors">
            <Plus className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <span className="text-slate-400 group-hover:text-indigo-600 transition-colors" style={{ fontSize: '0.875rem' }}>
            Tạo khóa học mới
          </span>
        </button>
      </div>

      {/* Create course modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="text-slate-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>Tạo khóa học mới</h2>
              <p className="text-slate-500 mt-1" style={{ fontSize: '0.875rem' }}>Mã lớp sẽ được tự động tạo</p>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-slate-700 mb-1.5" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Tên khóa học *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                  style={{ fontSize: '0.875rem' }} placeholder="Ví dụ: Lập trình Web với React" />
              </div>
              <div>
                <label className="block text-slate-700 mb-1.5" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Mô tả</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition resize-none"
                  style={{ fontSize: '0.875rem' }} placeholder="Mô tả ngắn về khóa học..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-slate-200 text-slate-600 rounded-xl py-2.5 hover:bg-slate-50 transition-colors"
                  style={{ fontSize: '0.875rem' }}>
                  Hủy
                </button>
                <button type="submit" className="flex-1 text-white rounded-xl py-2.5 hover:opacity-90 transition-opacity"
                  style={{ background: PRIMARY, fontSize: '0.875rem', fontWeight: 500 }}>
                  Tạo khóa học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
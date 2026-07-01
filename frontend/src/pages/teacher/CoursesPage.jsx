import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Users, BookOpen, Copy, Check, Search, ChevronDown, X } from 'lucide-react';
import { MOCK_COURSES, MOCK_LECTURES } from '../../data/mockData';

const PRIMARY = '#6C4DF6';

const COURSE_VISUALS = {
  c1: {
    gradient: 'linear-gradient(135deg, #6C4DF6, #9C7AF8)',
    from: '#6C4DF6',
    to: '#9C7AF8',
    letter: 'W'
  },
  c2: {
    gradient: 'linear-gradient(135deg, #10B981, #34D399)',
    from: '#10B981',
    to: '#34D399',
    letter: 'D'
  },
  c3: {
    gradient: 'linear-gradient(135deg, #F59E0B, #FCD34D)',
    from: '#F59E0B',
    to: '#FCD34D',
    letter: 'M'
  }
};

const getCourseVisuals = (courseId, courseName) => {
  if (COURSE_VISUALS[courseId]) {
    return COURSE_VISUALS[courseId];
  }
  const colors = [
    { from: '#6C4DF6', to: '#9C7AF8' },
    { from: '#10B981', to: '#34D399' },
    { from: '#F59E0B', to: '#FCD34D' },
    { from: '#EF4444', to: '#F87171' },
    { from: '#0EA5E9', to: '#38BDF8' }
  ];
  let hash = 0;
  for (let i = 0; i < courseId.length; i++) {
    hash = courseId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = colors[Math.abs(hash) % colors.length];
  return {
    gradient: `linear-gradient(135deg, ${color.from}, ${color.to})`,
    from: color.from,
    to: color.to,
    letter: courseName ? courseName.charAt(0).toUpperCase() : '?'
  };
};

const SORT_OPTIONS = ['Mới nhất', 'Cũ nhất', 'Tên A-Z', 'Nhiều sinh viên nhất'];

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
    <div className="py-4 px-6 max-w-7xl mx-auto relative text-left">
      {/* Search + Sort + Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 relative z-20">
        {/* Search Input (Left) */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition duration-150 placeholder:text-slate-350 text-xs"
            placeholder="Tìm kiếm khóa học..." />
        </div>

        {/* Sort Dropdown + Create Button (Right) */}
        <div className="flex items-center gap-3 justify-end">
          {/* Sort dropdown */}
          <div className="relative">
            <button onClick={() => setShowSort(v => !v)}
              className="flex items-center gap-1 bg-transparent hover:bg-slate-50 border-none rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer text-xs font-medium text-slate-500">
              Sắp xếp: {SORT_OPTIONS[sortIdx]}
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showSort ? 'rotate-180' : ''}`} />
            </button>
            {showSort && (
              <div className="absolute right-0 top-9 w-48 bg-white rounded-lg shadow-lg border border-slate-100 z-20 overflow-hidden py-1">
                {SORT_OPTIONS.map((opt, i) => (
                  <button key={opt} onClick={() => { setSortIdx(i); setShowSort(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors border-none bg-transparent cursor-pointer text-xs font-medium"
                    style={{ fontWeight: i === sortIdx ? 600 : 400, color: i === sortIdx ? PRIMARY : '#475569' }}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Create Button */}
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 text-white rounded-lg px-3.5 py-1.5 hover:bg-[#5a3edb] transition-all shadow-sm border-none cursor-pointer text-xs font-semibold bg-[#6C4DF6]">
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>Tạo khóa học</span>
          </button>
        </div>
      </div>

      {/* Grid: 2 columns on desktop, 1 column on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10">
        {filtered.map((course, idx) => {
          const lectures = MOCK_LECTURES.filter(l => l.courseId === course.id);
          const visuals = getCourseVisuals(course.id, course.name);
          return (
            <div key={course.id}
              onClick={() => navigate('teacher-course-detail', { selectedCourseId: course.id })}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-sm cursor-pointer transition-all duration-200 group flex flex-col justify-between">
              {/* Top color bar */}
              <div className="h-1" style={{ background: `linear-gradient(to right, ${visuals.from}, ${visuals.to})` }} />
              <div className="p-4 flex-1 flex flex-col justify-between text-left">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center text-white flex-shrink-0 font-semibold shadow-sm"
                      style={{ background: visuals.gradient, fontSize: '0.75rem' }}>
                      {visuals.letter}
                    </div>
                    <button onClick={e => e.stopPropagation()} className="p-1 rounded-md hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors border-none bg-transparent cursor-pointer font-bold text-xs">
                      ···
                    </button>
                  </div>

                  <h3 className="text-slate-800 mb-0.5 group-hover:text-[#6C4DF6] transition-colors text-sm font-semibold leading-snug">
                    {course.name}
                  </h3>
                  <div className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1 font-mono">{course.courseCode}</div>

                  <p className="text-slate-500 mb-2.5 text-xs leading-relaxed font-normal line-clamp-2">
                    {course.description}
                  </p>
                </div>

                {/* Card footer details: students count, lectures count, updated date */}
                <div>
                  <div className="flex items-center gap-4 mb-2 text-slate-500 text-xs">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{course.studentCount} sinh viên</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>{lectures.length} bài giảng</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 text-slate-400 text-[11px]">
                    Cập nhật: {course.createdAt}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Create new card */}
        <button onClick={() => setShowModal(true)}
          className="bg-slate-50/50 rounded-xl border border-dashed border-slate-300 p-4 hover:border-indigo-400 hover:bg-indigo-50/10 transition-all duration-200 group flex flex-col items-center justify-center gap-2 h-full min-h-[145px] cursor-pointer">
          <div className="w-8 h-8 bg-white group-hover:bg-indigo-50 border border-slate-200 group-hover:border-indigo-200 rounded-lg flex items-center justify-center transition-all">
            <Plus className="w-4 h-4 text-slate-400 group-hover:text-[#6C4DF6] transition-colors" />
          </div>
          <span className="text-slate-500 group-hover:text-[#6C4DF6] font-semibold text-xs transition-colors">
            Tạo khóa học mới
          </span>
        </button>
      </div>

      {/* Create course modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 w-full max-w-md overflow-hidden relative">
            <div className="px-5 py-4 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
              <div className="text-left">
                <h2 className="text-slate-900 text-sm font-bold tracking-tight">Tạo khóa học mới</h2>
                <p className="text-slate-500 text-xs mt-0.5 font-light">Mã lớp học sẽ được hệ thống tạo tự động</p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-650 transition-colors border-none bg-transparent cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4 text-left">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5 text-xs uppercase tracking-wider">Tên khóa học *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition placeholder:text-slate-300 text-sm"
                  placeholder="Ví dụ: Lập trình Web với React" />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5 text-xs uppercase tracking-wider">Mô tả</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition resize-none placeholder:text-slate-350 text-sm"
                  placeholder="Mô tả tóm tắt nội dung chính lớp học..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-slate-200 text-slate-600 rounded-lg py-2 hover:bg-slate-50 transition font-semibold text-xs uppercase tracking-wider cursor-pointer bg-white">
                  Hủy
                </button>
                <button type="submit" className="flex-1 text-white rounded-lg py-2 hover:bg-[#5a3edb] transition font-semibold text-xs uppercase tracking-wider cursor-pointer border-none bg-[#6C4DF6] shadow-sm">
                  Tạo khóa học
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { BookMarked, Users, FileText, HelpCircle, Plus, BarChart3, ChevronRight, Sparkles, ArrowUpRight, ChevronLeft } from 'lucide-react';
import { MOCK_COURSES, MOCK_LECTURES } from '../../data/mockData';

const PRIMARY = '#6C4DF6';
const ROWS_PER_PAGE = 5;

const COURSE_DATES = [
  '20/05/2025 10:30', '18/05/2025 14:45', '17/05/2025 09:15',
  '16/05/2025 16:20', '15/05/2025 11:05',
];
const COURSE_STATUS_LIST = ['Đã công bố', 'Bản nháp', 'Đang xử lý', 'Đã công bố', 'Bản nháp'];
const STATUS_STYLES = {
  'Đã công bố': { bg: '#DCFCE7', text: '#16A34A' },
  'Bản nháp': { bg: '#FEF3C7', text: '#D97706' },
  'Đang xử lý': { bg: '#DBEAFE', text: '#2563EB' },
};

export default function TeacherDashboard({ navigate, user }) {
  const [page, setPage] = useState(1);

  const stats = [
    { label: 'Khóa học', value: 12, icon: BookMarked, bg: 'rgba(108,77,246,0.1)', iconColor: PRIMARY, growth: '+2 so với tháng trước ↑' },
    { label: 'Bài giảng', value: 86, icon: FileText, bg: 'rgba(16,185,129,0.1)', iconColor: '#10B981', growth: '+15 so với tháng trước ↑' },
    { label: 'Sinh viên', value: '1.248', icon: Users, bg: 'rgba(245,158,11,0.1)', iconColor: '#F59E0B', growth: '+136 so với tháng trước ↑' },
    { label: 'Quiz đang dùng', value: 24, icon: HelpCircle, bg: 'rgba(239,68,68,0.1)', iconColor: '#EF4444', growth: '+6 so với tháng trước ↑' },
  ];

  const totalPages = Math.ceil(MOCK_COURSES.length / ROWS_PER_PAGE);
  const paginated = MOCK_COURSES.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, icon: Icon, bg, iconColor, growth }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon className="w-5 h-5" style={{ color: iconColor }} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
            <div className="text-emerald-600 caption">{growth}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Recent courses table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="text-h4">Khóa học gần đây</h3>
            <button onClick={() => navigate('teacher-courses')}
              className="flex items-center gap-1 transition-colors hover:opacity-70 body-sm cursor-pointer"
              style={{ color: PRIMARY }}>
              Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                  {['Tên khóa học', 'Bài giảng', 'Cập nhật gần nhất', 'Trạng thái', 'Thao tác'].map((h, i) => (
                    <th key={h} className="py-3 text-slate-400 label"
                      style={{
                        textAlign: i === 1 || i === 4 ? 'center' : 'left',
                        paddingLeft: i === 0 ? 24 : 16, paddingRight: 16,
                        width: i === 1 ? 80 : i === 2 ? 160 : i === 3 ? 120 : i === 4 ? 90 : 'auto',
                      }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((course, idx) => {
                  const globalIdx = (page - 1) * ROWS_PER_PAGE + idx;
                  const lectureCount = MOCK_LECTURES.filter(l => l.courseId === course.id).length;
                  const status = COURSE_STATUS_LIST[globalIdx % COURSE_STATUS_LIST.length];
                  const dateStr = COURSE_DATES[globalIdx % COURSE_DATES.length];
                  const style = STATUS_STYLES[status] ?? { bg: '#F1F5F9', text: '#64748B' };
                  return (
                    <tr key={course.id} className="hover:bg-slate-50/60 transition-colors"
                      style={{ borderBottom: '1px solid #F8FAFC' }}>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                            style={{ background: PRIMARY, fontSize: '0.8125rem', fontWeight: 700 }}>
                            {course.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-slate-900 truncate body-md font-semibold-custom">{course.name}</div>
                            <div className="text-slate-400 body-xs">{course.courseCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-slate-700 body-md font-semibold-custom">{lectureCount}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 body-sm">{dateStr}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-block px-2.5 py-1 rounded-full label" style={{ background: style.bg, color: style.text }}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button onClick={() => navigate('teacher-course-detail', { selectedCourseId: course.id })}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors body-xs cursor-pointer">
                          Quản lý ▾
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-center gap-1.5 px-6 py-3.5 border-t border-slate-100">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="w-7 h-7 rounded flex items-center justify-center border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className="w-7 h-7 rounded flex items-center justify-center border transition-colors body-xs cursor-pointer"
                style={{
                  fontWeight: p === page ? 600 : 400,
                  background: p === page ? PRIMARY : 'transparent',
                  borderColor: p === page ? PRIMARY : '#E2E8F0',
                  color: p === page ? '#fff' : '#64748B',
                }}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="w-7 h-7 rounded flex items-center justify-center border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-h4">Thao tác nhanh</h3>
            </div>
            <div className="p-3 space-y-1">
              {[
                { icon: Plus, label: 'Tạo khóa học', desc: 'Tạo và quản lý khóa học mới →', action: () => navigate('teacher-courses'), iconColor: PRIMARY, bg: 'rgba(108,77,246,0.08)' },
                { icon: FileText, label: 'Thêm bài giảng', desc: 'Tải lên tài liệu bài giảng mới →', action: () => navigate('teacher-courses'), iconColor: '#10B981', bg: 'rgba(16,185,129,0.08)' },
                { icon: BarChart3, label: 'Xem thống kê', desc: 'Xem báo cáo & phân tích →', action: () => navigate('teacher-dashboard'), iconColor: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
              ].map(({ icon: Icon, label, desc, action, iconColor, bg }) => (
                <button key={label} onClick={action}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 hover:shadow-sm hover:translate-x-0.5 transition-all duration-200 text-left group cursor-pointer">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                    <Icon className="w-4 h-4" style={{ color: iconColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-800 body-md font-semibold-custom">{label}</div>
                    <div className="text-slate-400 body-xs">{desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Tip */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg,#6C4DF6,#9C7AF8)' }}>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-white body-sm">Gợi ý hôm nay 💡</span>
              </div>
              <p className="text-white/90 mb-1 body-sm">
                Hoàn thành khóa học <strong>Phân tích dữ liệu</strong>
              </p>
              <p className="text-white/70 mb-4 body-xs">
                đề tài học <strong>Phân tích dữ liệu</strong> chưa được công bố cho sinh viên.
              </p>
              <button onClick={() => navigate('teacher-courses')}
                className="w-full text-center py-2 rounded-xl transition-colors body-sm cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                Tiếp tục hoàn thiện →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
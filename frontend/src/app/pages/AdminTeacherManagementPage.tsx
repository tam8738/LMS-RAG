import React, { useState, useEffect, useRef } from "react";
import {
  Users, Search, Filter, Plus, FileSpreadsheet, MoreVertical,
  Edit3, Key, ShieldAlert, CheckCircle2, X, Upload, RefreshCw,
  ChevronLeft, ChevronRight, AlertCircle, Building2, Calendar, Mail, Phone
} from "lucide-react";
import {
  teacherAdminService,
  TeacherResponse,
  TeacherCreateRequest,
  TeacherUpdateRequest,
  TeacherBatchCreateResponse
} from "../services/teacherAdminService";
import { PageLoading, EmptyState } from "../components/EmptyState";

export function AdminTeacherManagementPage() {
  const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Search & Filter States
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [page, setPage] = useState(0); // 0-indexed
  const [size] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Active Kebab Menu Dropdown Row ID
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [editTeacher, setEditTeacher] = useState<TeacherResponse | null>(null);
  const [resetTeacher, setResetTeacher] = useState<TeacherResponse | null>(null);
  const [toggleTeacher, setToggleTeacher] = useState<TeacherResponse | null>(null);

  // Toast / Alert Notifications
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToastMsg({ type, msg });
    setTimeout(() => setToastMsg(null), 5000);
  };

  // Fetch teachers from backend
  const fetchTeachers = async () => {
    setLoading(true);
    setError(null);
    try {
      const isActive = statusFilter === "ALL" ? undefined : statusFilter === "ACTIVE";
      const res = await teacherAdminService.getTeachers({
        keyword: keyword.trim() || undefined,
        isActive,
        department: departmentFilter.trim() || undefined,
        page,
        size,
        sortBy: "createdAt",
        sortDirection: "DESC"
      });

      setTeachers(res.data.items || []);
      setTotalElements(res.data.totalElements || 0);
      setTotalPages(res.data.totalPages || 0);
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách giảng viên.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [page, statusFilter, departmentFilter]);

  // Debounced keyword search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      fetchTeachers();
    }, 350);
    return () => clearTimeout(timer);
  }, [keyword]);

  // Close kebab menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handler: Activate / Deactivate Toggle
  const handleToggleStatus = async () => {
    if (!toggleTeacher) return;
    try {
      if (toggleTeacher.status === "ACTIVE") {
        await teacherAdminService.deactivateTeacher(toggleTeacher.id);
        showToast(`Đã vô hiệu hóa tài khoản ${toggleTeacher.name}`);
      } else {
        await teacherAdminService.activateTeacher(toggleTeacher.id);
        showToast(`Đã kích hoạt tài khoản ${toggleTeacher.name}`);
      }
      setToggleTeacher(null);
      fetchTeachers();
    } catch (err: any) {
      showToast(err.message || "Thao tác thất bại", "error");
    }
  };

  // Handler: Reset Password
  const handleResetPassword = async () => {
    if (!resetTeacher) return;
    try {
      const res = await teacherAdminService.resetPassword(resetTeacher.id);
      setResetTeacher(null);
      if (res.emailSent) {
        showToast(`Đã đặt lại mật khẩu cho ${resetTeacher.name}. Mật khẩu mới đã gửi qua email!`);
      } else {
        showToast(
          `Đặt lại mật khẩu thành công cho ${resetTeacher.name}! (Lưu ý: Hệ thống chưa bật tự động gửi mail, vui lòng thông báo giảng viên kiểm tra hoặc đổi mật khẩu sau khi đăng nhập).`,
          "info"
        );
      }
    } catch (err: any) {
      showToast(err.message || "Đặt lại mật khẩu thất bại", "error");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans text-left pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-[150] max-w-md animate-[fade-in_200ms_ease-out]">
          <div className={`p-4 rounded-xl shadow-lg border flex items-start gap-3 text-[13.5px] ${toastMsg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-900" :
              toastMsg.type === "error" ? "bg-red-50 border-red-200 text-red-900" :
                "bg-blue-50 border-blue-200 text-blue-900"
            }`}>
            {toastMsg.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />}
            {toastMsg.type === "error" && <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
            {toastMsg.type === "info" && <ShieldAlert className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p className="font-medium leading-relaxed">{toastMsg.msg}</p>
            </div>
            <button onClick={() => setToastMsg(null)} className="text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[rgba(14,13,11,0.07)] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-[#0E0D0B] tracking-tight">Quản lý Giảng viên</h1>
              <p className="text-[13px] text-[#6B6963] mt-0.5">Quản lý danh sách tài khoản, kích hoạt và cấp quyền cho giảng viên</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCsvImportOpen(true)}
            className="h-10 px-4 bg-white border border-[#0E0D0B]/[0.12] hover:bg-[#F8F7F4] text-[#0E0D0B] text-[13px] font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="h-10 px-4 bg-[#0E0D0B] hover:bg-[#1C1A17] text-white text-[13px] font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer border-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm giảng viên</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-[rgba(14,13,11,0.07)] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#AAAA9F] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="Tìm theo tên, email..."
            className="w-full h-10 pl-10 pr-4 bg-[#F8F7F4] border border-[#0E0D0B]/[0.08] rounded-xl text-[13.5px] text-[#0E0D0B] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-[#AAAA9F]"
          />
          {keyword && (
            <button
              onClick={() => setKeyword("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center bg-[#F8F7F4] p-1 rounded-xl border border-[#0E0D0B]/[0.08] text-[12px] font-medium">
            <button
              onClick={() => { setStatusFilter("ALL"); setPage(0); }}
              className={`px-2.5 py-1 rounded-lg border-none cursor-pointer transition-all ${statusFilter === "ALL" ? "bg-white text-[#0E0D0B] shadow-xs font-semibold" : "text-[#6B6963] hover:text-[#0E0D0B]"
                }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => { setStatusFilter("ACTIVE"); setPage(0); }}
              className={`px-2.5 py-1 rounded-lg border-none cursor-pointer transition-all ${statusFilter === "ACTIVE" ? "bg-white text-emerald-700 shadow-xs font-semibold" : "text-[#6B6963] hover:text-[#0E0D0B]"
                }`}
            >
              Hoạt động
            </button>
            <button
              onClick={() => { setStatusFilter("INACTIVE"); setPage(0); }}
              className={`px-2.5 py-1 rounded-lg border-none cursor-pointer transition-all ${statusFilter === "INACTIVE" ? "bg-white text-red-700 shadow-xs font-semibold" : "text-[#6B6963] hover:text-[#0E0D0B]"
                }`}
            >
              Đã khóa
            </button>
          </div>

          <button
            onClick={() => fetchTeachers()}
            title="Tải lại danh sách"
            className="h-10 w-10 flex items-center justify-center bg-[#F8F7F4] hover:bg-[#F4F3F0] text-[#6B6963] hover:text-[#0E0D0B] rounded-xl border border-[#0E0D0B]/[0.08] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Table / State view */}
      {loading && teachers.length === 0 ? (
        <PageLoading />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-800">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="font-semibold">{error}</p>
          <button
            onClick={() => fetchTeachers()}
            className="mt-3 px-4 py-1.5 bg-red-600 text-white text-[13px] rounded-lg border-none cursor-pointer hover:bg-red-700 font-medium"
          >
            Thử lại
          </button>
        </div>
      ) : teachers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[rgba(14,13,11,0.07)] p-12">
          <EmptyState
            title="Không tìm thấy giảng viên nào"
            description="Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái để xem kết quả."
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[rgba(14,13,11,0.07)] shadow-xs overflow-hidden min-h-[240px]">
          <div className="overflow-x-auto min-h-[240px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F7F4]/70 border-b border-[rgba(14,13,11,0.06)] text-[12px] font-semibold uppercase tracking-wider text-[#6B6963]">
                  <th className="py-3.5 px-5">Mã giảng viên</th>
                  <th className="py-3.5 px-5">Giảng viên</th>
                  <th className="py-3.5 px-5">Khoa / Bộ môn</th>
                  <th className="py-3.5 px-5">Số điện thoại</th>
                  <th className="py-3.5 px-5">Ngày sinh</th>
                  <th className="py-3.5 px-5">Giới tính</th>
                  <th className="py-3.5 px-5">Trạng thái</th>
                  <th className="py-3.5 px-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(14,13,11,0.05)] text-[13px]">
                {teachers.map((teacher, index) => {
                  const isActive = teacher.status === "ACTIVE";
                  const isMenuOpen = activeMenuId === teacher.id;
                  const isNearBottom = teachers.length > 2 && index >= teachers.length - 2;
                  const teacherAvatar = localStorage.getItem(`user_avatar_${teacher.id}`) || (teacher as any).avatarUrl;

                  const formatGender = (g?: string) => {
                    if (g === "MALE") return "Nam";
                    if (g === "FEMALE") return "Nữ";
                    if (g === "OTHER") return "Khác";
                    return "Chưa cập nhật";
                  };

                  return (
                    <tr key={teacher.id} className="hover:bg-[#F8F7F4]/40 transition-colors group">
                      {/* Mã giảng viên */}
                      <td className="py-3.5 px-5 font-mono-label text-[12.5px] font-semibold text-indigo-700">
                        GV-{(teacher.role || "TEACHER").toUpperCase()}-{teacher.id}
                      </td>

                      {/* Teacher info (Avatar + Name + Email) */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          {teacherAvatar ? (
                            <img
                              src={teacherAvatar}
                              alt={teacher.name}
                              className="w-8.5 h-8.5 rounded-full object-cover border border-indigo-200 flex-shrink-0 shadow-xs"
                            />
                          ) : (
                            <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center flex-shrink-0 shadow-xs">
                              <span className="text-white text-[12.5px] font-bold">
                                {teacher.name ? teacher.name.charAt(0).toUpperCase() : "G"}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-[#0E0D0B] text-[13.5px] leading-tight">{teacher.name}</p>
                            <p className="text-[12px] text-[#6B6963] flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-[#AAAA9F]" />
                              {teacher.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-5">
                        <span className="text-[#0E0D0B] text-[13px] font-medium flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#AAAA9F]" />
                          {teacher.department || "Chưa cập nhật"}
                        </span>
                      </td>

                      {/* Phone Number */}
                      <td className="py-3.5 px-5 text-[#6B6963] text-[13px]">
                        {teacher.phoneNumber ? (
                          <span className="flex items-center gap-1.5 font-mono-label text-[12.5px] text-[#0E0D0B]">
                            <Phone className="w-3.5 h-3.5 text-[#AAAA9F]" />
                            {teacher.phoneNumber}
                          </span>
                        ) : (
                          "Chưa cập nhật"
                        )}
                      </td>

                      {/* Date of Birth */}
                      <td className="py-3.5 px-5 text-[#6B6963] text-[13px]">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#AAAA9F]" />
                          {teacher.dateOfBirth
                            ? new Date(teacher.dateOfBirth).toLocaleDateString("vi-VN")
                            : "Chưa cập nhật"}
                        </span>
                      </td>

                      {/* Gender */}
                      <td className="py-3.5 px-5 text-[#6B6963] text-[13px]">
                        {formatGender(teacher.gender)}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border ${isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-gray-100 text-gray-600 border-gray-200"
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                          {isActive ? "Hoạt động" : "Đã khóa"}
                        </span>
                      </td>

                      {/* Actions Kebab Menu */}
                      <td className="py-3.5 px-5 text-right relative">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setActiveMenuId(isMenuOpen ? null : teacher.id);
                          }}
                          className="p-1.5 rounded-lg text-[#AAAA9F] hover:text-[#0E0D0B] hover:bg-[#F4F3F0] transition-colors border-none bg-transparent cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu Popup - Smart positioning upward for bottom rows */}
                        {isMenuOpen && (
                          <div
                            ref={dropdownRef}
                            className={`absolute right-5 w-44 bg-white rounded-xl border border-[rgba(14,13,11,0.12)] shadow-xl py-1.5 z-50 text-left transition-all duration-100 ${
                              isNearBottom ? "bottom-10 origin-bottom-right" : "top-11 origin-top-right"
                            }`}
                          >
                            <button
                              onClick={() => { setActiveMenuId(null); setEditTeacher(teacher); }}
                              className="w-full px-3.5 py-2 text-[13px] text-[#0E0D0B] hover:bg-[#F8F7F4] flex items-center gap-2 transition-all border-none bg-transparent cursor-pointer text-left"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[#6B6963]" />
                              Chỉnh sửa
                            </button>

                            <button
                              onClick={() => { setActiveMenuId(null); setResetTeacher(teacher); }}
                              className="w-full px-3.5 py-2 text-[13px] text-[#0E0D0B] hover:bg-[#F8F7F4] flex items-center gap-2 transition-all border-none bg-transparent cursor-pointer text-left"
                            >
                              <Key className="w-3.5 h-3.5 text-amber-600" />
                              Đặt lại mật khẩu
                            </button>

                            <div className="my-1 border-t border-gray-100" />

                            <button
                              onClick={() => { setActiveMenuId(null); setToggleTeacher(teacher); }}
                              className={`w-full px-3.5 py-2 text-[13px] flex items-center gap-2 transition-all border-none bg-transparent cursor-pointer text-left ${isActive ? "text-red-600 hover:bg-red-50" : "text-emerald-700 hover:bg-emerald-50"
                                }`}
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              {isActive ? "Vô hiệu hóa" : "Kích hoạt"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-5 py-3 border-t border-[rgba(14,13,11,0.06)] bg-[#F8F7F4]/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px] text-[#6B6963]">
            <div>
              Hiển thị <span className="font-semibold text-[#0E0D0B]">{teachers.length}</span> trên tổng số{" "}
              <span className="font-semibold text-[#0E0D0B]">{totalElements}</span> giảng viên
            </div>

            <div className="flex items-center gap-2 text-[12px]">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="h-7.5 px-2.5 rounded-lg border border-[#0E0D0B]/[0.1] bg-white text-[#0E0D0B] hover:bg-[#F8F7F4] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 font-medium transition-all text-[12px]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Trang trước</span>
              </button>

              <span className="px-1.5 font-medium text-[#6B6963]">
                Trang <strong className="text-[#0E0D0B] font-semibold">{page + 1}</strong> / {totalPages || 1}
              </span>

              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="h-7.5 px-2.5 rounded-lg border border-[#0E0D0B]/[0.1] bg-white text-[#0E0D0B] hover:bg-[#F8F7F4] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 font-medium transition-all text-[12px]"
              >
                <span>Trang sau</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 1: Create Single Teacher --- */}
      {isCreateOpen && (
        <CreateTeacherModal
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {
            setIsCreateOpen(false);
            showToast("Tạo tài khoản giảng viên thành công!");
            fetchTeachers();
          }}
        />
      )}

      {/* --- MODAL 2: Batch CSV Import --- */}
      {isCsvImportOpen && (
        <BatchCsvImportModal
          onClose={() => setIsCsvImportOpen(false)}
          onSuccess={(res) => {
            showToast(`Import hoàn tất! Thành công: ${res.successCount}/${res.totalRequested}`);
            fetchTeachers();
          }}
        />
      )}

      {/* --- MODAL 3: Edit Teacher --- */}
      {editTeacher && (
        <EditTeacherModal
          teacher={editTeacher}
          onClose={() => setEditTeacher(null)}
          onSuccess={() => {
            setEditTeacher(null);
            showToast("Cập nhật thông tin giảng viên thành công!");
            fetchTeachers();
          }}
        />
      )}

      {/* --- MODAL 4: Reset Password Confirm --- */}
      {resetTeacher && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-fadeIn">
          <div onClick={() => setResetTeacher(null)} className="fixed inset-0 bg-[#0E0D0B]/40 backdrop-blur-sm" />
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative z-50 text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-[#0E0D0B]">Đặt lại mật khẩu</h3>
                <p className="text-[12px] text-[#6B6963]">{resetTeacher.name} ({resetTeacher.email})</p>
              </div>
            </div>

            <p className="text-[13.5px] text-[#6B6963] leading-relaxed bg-[#F8F7F4] p-3.5 rounded-xl border border-[#0E0D0B]/[0.06]">
              Mật khẩu mới ngẫu nhiên sẽ được khởi tạo trong hệ thống. Giảng viên có thể đăng nhập bằng mật khẩu mới này.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setResetTeacher(null)}
                className="h-9 px-4 border border-gray-300 rounded-xl text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleResetPassword}
                className="h-9 px-4 border-none rounded-xl text-[13px] font-semibold text-white bg-amber-600 hover:bg-amber-700 cursor-pointer"
              >
                Đặt lại mật khẩu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 5: Toggle Active Status Confirm --- */}
      {toggleTeacher && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-fadeIn">
          <div onClick={() => setToggleTeacher(null)} className="fixed inset-0 bg-[#0E0D0B]/40 backdrop-blur-sm" />
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative z-50 text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toggleTeacher.status === "ACTIVE" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                }`}>
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-[#0E0D0B]">
                  {toggleTeacher.status === "ACTIVE" ? "Vô hiệu hóa tài khoản" : "Kích hoạt tài khoản"}
                </h3>
                <p className="text-[12px] text-[#6B6963]">{toggleTeacher.name} ({toggleTeacher.email})</p>
              </div>
            </div>

            <p className="text-[13.5px] text-[#6B6963] leading-relaxed">
              {toggleTeacher.status === "ACTIVE"
                ? "Giảng viên sẽ không thể đăng nhập vào hệ thống sau khi bị vô hiệu hóa."
                : "Tài khoản giảng viên sẽ được khôi phục quyền đăng nhập bình thường."}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setToggleTeacher(null)}
                className="h-9 px-4 border border-gray-300 rounded-xl text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleToggleStatus}
                className={`h-9 px-4 border-none rounded-xl text-[13px] font-semibold text-white cursor-pointer ${toggleTeacher.status === "ACTIVE" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENT: Create Teacher Modal ---
function CreateTeacherModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("Khoa Công nghệ Thông tin");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Vui lòng nhập Họ tên và Email.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await teacherAdminService.createTeacher({
        name: name.trim(),
        email: email.trim(),
        role: "TEACHER",
        department: department.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        gender: gender || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Tạo tài khoản thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-fadeIn">
      <div onClick={onClose} className="fixed inset-0 bg-[#0E0D0B]/40 backdrop-blur-sm" />
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl relative z-50 text-left overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-[#F8F7F4]/50">
          <div>
            <h3 className="text-[16px] font-bold text-[#0E0D0B]">Thêm giảng viên mới</h3>
            <p className="text-[11.5px] text-[#AAAA9F]">Tạo tài khoản giảng viên đơn lẻ</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[12.5px]">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider mb-1">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full h-10 border border-gray-200 rounded-xl px-3.5 text-[13.5px] focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider mb-1">
              Email đăng nhập <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="teacher@ptit.edu.vn"
              className="w-full h-10 border border-gray-200 rounded-xl px-3.5 text-[13.5px] focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider mb-1">
              Khoa / Bộ môn
            </label>
            <input
              type="text"
              value={department}
              onChange={e => setDepartment(e.target.value)}
              placeholder="Khoa Công nghệ Thông tin"
              className="w-full h-10 border border-gray-200 rounded-xl px-3.5 text-[13.5px] focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider mb-1">
                Ngày sinh
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={e => setDateOfBirth(e.target.value)}
                className="w-full h-10 border border-gray-200 rounded-xl px-3.5 text-[13.5px] focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider mb-1">
                Giới tính
              </label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value as any)}
                className="w-full h-10 border border-gray-200 rounded-xl px-3 text-[13.5px] focus:outline-none focus:border-indigo-500 bg-white"
              >
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider mb-1">
              Số điện thoại
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              placeholder="0912345678"
              className="w-full h-10 border border-gray-200 rounded-xl px-3.5 text-[13.5px] focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 border border-gray-300 rounded-xl text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-5 border-none rounded-xl text-[13px] font-semibold text-white bg-[#0E0D0B] hover:bg-[#1C1A17] disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Đang xử lý..." : "Tạo tài khoản"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: Edit Teacher Modal ---
function EditTeacherModal({ teacher, onClose, onSuccess }: { teacher: TeacherResponse; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState(teacher.name || "");
  const [department, setDepartment] = useState(teacher.department || "");
  const [phoneNumber, setPhoneNumber] = useState(teacher.phoneNumber || "");
  const [dateOfBirth, setDateOfBirth] = useState(teacher.dateOfBirth || "");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">((teacher.gender as any) || "MALE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await teacherAdminService.updateTeacher(teacher.id, {
        name: name.trim() || undefined,
        department: department.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        gender: gender || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Cập nhật thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-fadeIn">
      <div onClick={onClose} className="fixed inset-0 bg-[#0E0D0B]/40 backdrop-blur-sm" />
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl relative z-50 text-left overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-[#F8F7F4]/50">
          <div>
            <h3 className="text-[16px] font-bold text-[#0E0D0B]">Chỉnh sửa giảng viên</h3>
            <p className="text-[11.5px] text-[#AAAA9F]">{teacher.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[12.5px]">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider mb-1">
              Họ và tên
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full h-10 border border-gray-200 rounded-xl px-3.5 text-[13.5px] focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider mb-1">
              Khoa / Bộ môn
            </label>
            <input
              type="text"
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="w-full h-10 border border-gray-200 rounded-xl px-3.5 text-[13.5px] focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider mb-1">
                Ngày sinh
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={e => setDateOfBirth(e.target.value)}
                className="w-full h-10 border border-gray-200 rounded-xl px-3.5 text-[13.5px] focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider mb-1">
                Giới tính
              </label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value as any)}
                className="w-full h-10 border border-gray-200 rounded-xl px-3 text-[13.5px] focus:outline-none focus:border-indigo-500 bg-white"
              >
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider mb-1">
              Số điện thoại
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              className="w-full h-10 border border-gray-200 rounded-xl px-3.5 text-[13.5px] focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 border border-gray-300 rounded-xl text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-5 border-none rounded-xl text-[13px] font-semibold text-white bg-[#0E0D0B] hover:bg-[#1C1A17] disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: Batch CSV Import Modal (Rule 5: FE parses CSV to JSON) ---
function BatchCsvImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (res: TeacherBatchCreateResponse) => void }) {
  const [csvContent, setCsvContent] = useState("");
  const [parsedTeachers, setParsedTeachers] = useState<TeacherCreateRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TeacherBatchCreateResponse | null>(null);

  // Simple CSV parser
  const parseCsvText = (text: string) => {
    setCsvContent(text);
    setError("");
    setResult(null);

    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      setParsedTeachers([]);
      return;
    }

    const items: TeacherCreateRequest[] = [];
    // Check if line 0 is header
    const hasHeader = lines[0].toLowerCase().includes("name") || lines[0].toLowerCase().includes("email") || lines[0].toLowerCase().includes("tên");
    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const cols = lines[i].split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
      if (cols.length >= 2) {
        const name = cols[0];
        const email = cols[1];
        const department = cols[2] || "Khoa Công nghệ Thông tin";
        const phoneNumber = cols[3] || undefined;
        if (name && email) {
          items.push({
            name,
            email,
            role: "TEACHER",
            department,
            phoneNumber
          });
        }
      }
    }

    setParsedTeachers(items);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseCsvText(content);
    };
    reader.readAsText(file);
  };

  const handleDownloadSampleCsv = () => {
    const sample = "Họ tên,Email,Khoa/Bộ môn,Số điện thoại\n" +
      "Nguyễn Văn A,teacher1@ptit.edu.vn,Khoa CNTT,0912345678\n" +
      "Trần Thị B,teacher2@ptit.edu.vn,Khoa Điện tử,0987654321";
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "danh_sach_giang_vien_mau.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBatchSubmit = async () => {
    if (parsedTeachers.length === 0) {
      setError("Vui lòng tải lên file CSV có định dạng hợp lệ.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await teacherAdminService.createTeachersBatch(parsedTeachers);
      setResult(res);
      if (res.successCount > 0) {
        onSuccess(res);
      }
    } catch (err: any) {
      setError(err.message || "Tạo hàng loạt thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-fadeIn">
      <div onClick={onClose} className="fixed inset-0 bg-[#0E0D0B]/40 backdrop-blur-sm" />
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl relative z-50 text-left overflow-hidden max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-[#F8F7F4]/50">
          <div>
            <h3 className="text-[16px] font-bold text-[#0E0D0B]">Import danh sách từ CSV</h3>
            <p className="text-[11.5px] text-[#AAAA9F]">Frontend tự chuyển đổi file CSV sang dữ liệu gửi API</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[12.5px]">
              {error}
            </div>
          )}

          {/* Download sample & File input */}
          <div className="flex items-center justify-between bg-indigo-50/60 border border-indigo-100 p-3.5 rounded-xl">
            <span className="text-[12.5px] text-indigo-900 font-medium">Chưa có file mẫu?</span>
            <button
              onClick={handleDownloadSampleCsv}
              className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 cursor-pointer"
            >
              📥 Tải CSV mẫu
            </button>
          </div>

          {/* File Drag Drop Zone */}
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-indigo-400 transition-colors bg-[#F8F7F4]/30">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-[13px] font-semibold text-[#0E0D0B]">Tải lên file .CSV</p>
            <p className="text-[11.5px] text-gray-500 mt-0.5">Định dạng: Họ tên, Email, Khoa, Số điện thoại</p>
            <label className="mt-3 inline-block px-4 py-2 bg-[#0E0D0B] text-white text-[12.5px] font-semibold rounded-xl cursor-pointer hover:bg-[#1C1A17]">
              Chọn file từ máy tính
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* CSV Text Area fallback */}
          <div>
            <label className="block text-[11.5px] font-semibold text-[#6B6963] uppercase tracking-wider mb-1">
              Hoặc dán nội dung CSV tại đây
            </label>
            <textarea
              rows={4}
              value={csvContent}
              onChange={e => parseCsvText(e.target.value)}
              placeholder="Nguyễn Văn A, teacher1@ptit.edu.vn, Khoa CNTT&#10;Trần Thị B, teacher2@ptit.edu.vn, Khoa Điện tử"
              className="w-full border border-gray-200 rounded-xl p-3 text-[12.5px] font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Preview Parsed Items */}
          {parsedTeachers.length > 0 && (
            <div className="space-y-2">
              <p className="text-[13px] font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Đã nhận diện {parsedTeachers.length} giảng viên hợp lệ:
              </p>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl text-[12px] divide-y divide-gray-100">
                {parsedTeachers.map((t, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between bg-white">
                    <span className="font-semibold text-[#0E0D0B]">{idx + 1}. {t.name}</span>
                    <span className="text-gray-500 font-mono">{t.email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Partial Success Result View */}
          {result && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
              <h4 className="font-bold text-[#0E0D0B] text-[14px]">Kết quả xử lý Batch:</h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                  <p className="text-[11px] text-gray-500 uppercase font-semibold">Yêu cầu</p>
                  <p className="text-[18px] font-bold text-gray-800">{result.totalRequested}</p>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  <p className="text-[11px] text-emerald-700 uppercase font-semibold">Thành công</p>
                  <p className="text-[18px] font-bold text-emerald-700">{result.successCount}</p>
                </div>
                <div className="bg-red-50 p-2.5 rounded-xl border border-red-200">
                  <p className="text-[11px] text-red-700 uppercase font-semibold">Thất bại</p>
                  <p className="text-[18px] font-bold text-red-700">{result.failureCount}</p>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[12px] font-bold text-red-700">Danh sách dòng bị lỗi:</p>
                  <div className="max-h-32 overflow-y-auto border border-red-200 rounded-xl bg-white p-2 text-[11.5px] space-y-1">
                    {result.errors.map((err, idx) => (
                      <p key={idx} className="text-red-700">
                        • Dòng {err.index + 1}: {err.email || err.name} — {err.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-[#F8F7F4]/50 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="h-10 px-4 border border-gray-300 rounded-xl text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
          >
            Đóng
          </button>
          {(!result || result.failureCount > 0) && (
            <button
              onClick={handleBatchSubmit}
              disabled={loading || parsedTeachers.length === 0}
              className="h-10 px-5 border-none rounded-xl text-[13px] font-semibold text-white bg-[#0E0D0B] hover:bg-[#1C1A17] disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Đang xử lý batch..." : `Import ${parsedTeachers.length} giảng viên`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

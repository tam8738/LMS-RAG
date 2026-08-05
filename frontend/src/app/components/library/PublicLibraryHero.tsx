import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  FileText,
  FileCheck2,
  ExternalLink,
  CheckCircle2,
  Cpu,
  Upload,
  FolderKanban,
  Clock,
  UserCheck,
  AlertCircle,
  Search,
  X,
} from "lucide-react";
import { LibraryDocument, User, Document } from "../../types";
import { LibraryProcessDialog } from "./LibraryProcessDialog";
import { ROUTES } from "../../routes";
import { teacherDocumentService } from "../../services/teacherDocumentService";

interface PublicLibraryHeroProps {
  user?: User | null;
  featuredDocument?: LibraryDocument | null;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit?: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement>;
  onExplore: () => void;
}

export function PublicLibraryHero({
  user,
  featuredDocument,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchInputRef,
  onExplore,
}: PublicLibraryHeroProps) {
  const navigate = useNavigate();
  const [isProcessOpen, setIsProcessOpen] = useState(false);

  // Teacher specific state
  const [teacherDocs, setTeacherDocs] = useState<Document[]>([]);
  const [teacherStats, setTeacherStats] = useState({
    total: 0,
    pending: 0,
    published: 0,
    ragReady: 0,
  });

  useEffect(() => {
    if (user?.role === "teacher") {
      teacherDocumentService.getMyDocuments(0, 50).then((res) => {
        const docs = res.documents || [];
        setTeacherDocs(docs);
        setTeacherStats({
          total: res.totalElements || docs.length,
          pending: docs.filter(d => d.publicationStatus === "PENDING_REVIEW").length,
          published: docs.filter(d => d.publicationStatus === "PUBLISHED").length,
          ragReady: docs.filter(d => d.ragEligible || d.processingStatus === "PROCESSED").length,
        });
      }).catch(err => console.error("Failed to load teacher stats in hero", err));
    }
  }, [user]);

  // Determine user role mode
  const isTeacher = user?.role === "teacher";
  const isAdmin = user?.role === "admin";

  // Document for Main Card display
  const latestTeacherDoc = teacherDocs[0];
  const activeDoc = isTeacher && latestTeacherDoc ? latestTeacherDoc : featuredDocument;

  const docTitle = activeDoc?.title || (isTeacher ? "Tài liệu giảng dạy gần đây" : "Lập trình Hướng đối tượng Java");
  const docSubject = activeDoc?.subject || "Công nghệ Phần mềm";
  const docAuthor = activeDoc?.authorName || (isTeacher ? (user?.name || "Giảng viên") : "Giảng viên Khoa CNTT");
  const docFileType = activeDoc?.fileType || "PDF";
  const docSize = activeDoc?.fileSize || "12 chương · 86 trang";
  const isPublished = activeDoc ? activeDoc.publicationStatus === "PUBLISHED" : true;
  const isRagReady = activeDoc ? (activeDoc.ragEligible || activeDoc.processingStatus === "PROCESSED") : true;

  return (
    <div className="relative w-full text-left font-sans animate-fadeIn">
      {/* CSS Micro-animations */}
      <style>{`
        @keyframes float-gentle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }
        @keyframes float-reverse-gentle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(7px); }
        }
        .animate-float-gentle {
          animation: float-gentle 5s ease-in-out infinite;
        }
        .animate-float-reverse-gentle {
          animation: float-reverse-gentle 6s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-float-gentle, .animate-float-reverse-gentle {
            animation: none !important;
          }
        }
      `}</style>

      {/* Main Agromind-style 2-Column Hero Container */}
      <div className="relative rounded-3xl p-6 sm:p-10 lg:p-12 border border-slate-200/80 bg-gradient-to-br from-[#F8F7F4] via-white to-[#F1F5F9]/60 shadow-premium overflow-hidden min-h-[540px] lg:min-h-[600px] flex items-center">

        {/* Ambient Background Blobs */}
        <div className="absolute -left-28 -top-28 w-96 h-96 bg-indigo-500/[0.07] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -right-28 -bottom-28 w-96 h-96 bg-violet-500/[0.06] rounded-full blur-3xl pointer-events-none" />

        <div className="w-full grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] items-center gap-10 xl:gap-14 relative z-10">

          {/* LEFT COLUMN: Content & Actions mapped by User Role */}
          <div className="space-y-6 text-left">

            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-white text-[11px] sm:text-[12px] font-bold tracking-wider uppercase shadow-xs">
              {isTeacher ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                  <span>WORKSPACE DÀNH CHO GIẢNG VIÊN</span>
                </>
              ) : isAdmin ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>QUẢN TRỊ VIÊN HỆ THỐNG</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-3.5 h-3.5 text-indigo-300" />
                  <span>THƯ VIỆN HỌC LIỆU CÔNG NGHỆ THÔNG TIN</span>
                </>
              )}
            </div>

            {/* H1 Heading */}
            {isTeacher ? (
              <h1 className="text-[32px] sm:text-[40px] lg:text-[44px] font-extrabold text-slate-900 tracking-tight leading-[1.15] font-raleway">
                Quản lý tài liệu hiệu quả  <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                  Khai thác tri thức cùng AI
                </span>
              </h1>
            ) : isAdmin ? (
              <h1 className="text-[32px] sm:text-[40px] lg:text-[44px] font-extrabold text-slate-900 tracking-tight leading-[1.15] font-raleway">
                Quản lý & Phê duyệt học liệu <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                  Đảm bảo chất lượng tri thức
                </span>
              </h1>
            ) : (
              <h1 className="text-[32px] sm:text-[40px] lg:text-[44px] font-extrabold text-slate-900 tracking-tight leading-[1.15] font-raleway">
                Khám phá tài liệu chính thống... <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                  Tiếp cận tri thức dễ dàng hơn
                </span>
              </h1>
            )}

            {/* Description Paragraph */}
            {isTeacher ? (
              <p className="text-[14.5px] sm:text-[15.5px] text-slate-600 max-w-xl leading-relaxed font-sans font-normal">
                Tải lên, theo dõi và xuất bản tài liệu giảng dạy; đồng thời sử dụng RAG AI để tra cứu và hỏi đáp trên các học liệu đã sẵn sàng.
              </p>
            ) : isAdmin ? (
              <p className="text-[14.5px] sm:text-[15.5px] text-slate-600 max-w-xl leading-relaxed font-sans font-normal">
                Thẩm định tài liệu giảng dạy từ các giảng viên, quản lý người dùng và theo dõi hoạt động RAG AI trên toàn bộ hệ thống.
              </p>
            ) : (
              <p className="text-[14.5px] sm:text-[15.5px] text-slate-600 max-w-xl leading-relaxed font-sans font-normal">
                EduRAG là hệ thống quản lý tài liệu Công nghệ thông tin được giảng viên xây dựng, kiểm duyệt và ứng dụng RAG AI hỗ trợ giảng dạy.
              </p>
            )}

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
              {isTeacher ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigate(ROUTES.UPLOAD)}
                    className="h-12 px-6 bg-slate-900 hover:bg-slate-800 text-white text-[13.5px] sm:text-[14px] font-bold rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer border-none font-action group w-full sm:w-auto whitespace-nowrap"
                  >
                    <Upload className="w-4.5 h-4.5 text-indigo-300 flex-shrink-0" />
                    <span>Tải tài liệu mới</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(ROUTES.MY_DOCUMENTS)}
                    className="h-12 px-6 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-[13.5px] sm:text-[14px] font-semibold rounded-2xl transition-all duration-200 shadow-xs flex items-center justify-center gap-2 cursor-pointer font-action w-full sm:w-auto whitespace-nowrap"
                  >
                    <FolderKanban className="w-4.5 h-4.5 text-slate-400 flex-shrink-0" />
                    <span>Quản lý tài liệu của tôi</span>
                  </button>
                </>
              ) : isAdmin ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigate(ROUTES.ADMIN_REVIEWS)}
                    className="h-12 px-6 bg-slate-900 hover:bg-slate-800 text-white text-[13.5px] sm:text-[14px] font-bold rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer border-none font-action group w-full sm:w-auto whitespace-nowrap"
                  >
                    <ShieldCheck className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0" />
                    <span>Duyệt tài liệu ngay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(ROUTES.ADMIN_TEACHERS)}
                    className="h-12 px-6 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-[13.5px] sm:text-[14px] font-semibold rounded-2xl transition-all duration-200 shadow-xs flex items-center justify-center gap-2 cursor-pointer font-action w-full sm:w-auto whitespace-nowrap"
                  >
                    <UserCheck className="w-4.5 h-4.5 text-slate-400 flex-shrink-0" />
                    <span>Quản lý Giảng viên</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onExplore}
                    className="h-12 px-6 bg-slate-900 hover:bg-slate-800 text-white text-[13.5px] sm:text-[14px] font-bold rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer border-none font-action group w-full sm:w-auto whitespace-nowrap"
                  >
                    <span>Khám phá thư viện</span>
                    <ArrowRight className="w-4.5 h-4.5 text-indigo-300 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsProcessOpen(true)}
                    className="h-12 px-6 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-[13.5px] sm:text-[14px] font-semibold rounded-2xl transition-all duration-200 shadow-xs flex items-center justify-center gap-2 cursor-pointer font-action w-full sm:w-auto whitespace-nowrap"
                  >
                    <span>Quy trình xuất bản</span>
                    <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </button>
                </>
              )}
            </div>

            {/* Bottom Value Badges */}
            <div className="pt-4 border-t border-slate-200/60 flex flex-wrap items-center gap-5 text-xs text-slate-500 font-medium font-sans">
              {isTeacher ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Tải lên & Quản lý</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>AI Analysis & RAG</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>Trực quan hóa & Quiz AI</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Giảng viên quản lý</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Đã kiểm duyệt</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>Số hóa RAG AI</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Visual Showcase & Dynamic Workstation Floating Cards */}
          <div className="relative w-full flex flex-col items-center justify-center">

            {/* Floating Card 1: Top Left Overlay */}
            <div className="hidden lg:flex items-start gap-3 p-3.5 pr-5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl absolute -top-4 -left-6 z-20 max-w-[270px] animate-float-gentle text-left">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                {isTeacher ? <FileText className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5 text-emerald-600" />}
              </div>
              <div>
                <h4 className="text-[12.5px] font-bold text-slate-900 leading-tight">
                  {isTeacher ? "TÀI LIỆU CỦA BẠN" : "HỌC LIỆU CHÍNH THỐNG"}
                </h4>
                <p className="text-[11px] text-slate-500 leading-snug mt-0.5 font-sans">
                  {isTeacher
                    ? `${teacherStats.total} học liệu đã tải lên · ${teacherStats.pending} chờ duyệt`
                    : "Được quản lý và phê duyệt trước khi xuất bản."}
                </p>
              </div>
            </div>

            {/* Floating Card 2: Bottom Right Overlay */}
            <div className="hidden lg:flex items-start gap-3 p-3.5 pr-5 rounded-2xl bg-white/95 backdrop-blur-md border border-indigo-100 shadow-xl absolute -bottom-5 -right-4 z-20 max-w-[270px] animate-float-reverse-gentle text-left">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[12.5px] font-bold text-slate-900 leading-tight">
                  {isTeacher ? "RAG AI SẴN SÀNG" : "TÍCH HỢP RAG AI"}
                </h4>
                <p className="text-[11px] text-slate-500 leading-snug mt-0.5 font-sans">
                  {isTeacher
                    ? `${teacherStats.ragReady} học liệu có thể hỏi đáp AI`
                    : "Học liệu được lập chỉ mục phục vụ trợ lý AI cho Giảng viên."}
                </p>
              </div>
            </div>

            {/* Main Featured Document / Workstation Card */}
            <div className="w-full bg-gradient-to-br from-slate-900 via-[#0F172A] to-[#1E1B4B] text-white rounded-3xl p-6 sm:p-7 border border-slate-800/80 shadow-2xl relative z-10 text-left overflow-hidden group">

              {/* Decorative Glow Blobs */}
              <div className="absolute top-0 right-0 w-56 h-56 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

              {/* Card Header Tag & Status */}
              <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/20 border border-indigo-400/30 px-2.5 py-0.5 rounded-md backdrop-blur-md">
                  {isTeacher ? "HỌC LIỆU GẦN ĐÂY CỦA BẠN" : docSubject}
                </span>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-0.5 rounded-md backdrop-blur-md">
                    <FileCheck2 className="w-3.5 h-3.5" /> {isPublished ? "Đã xuất bản" : "Đang xử lý"}
                  </span>
                  {isRagReady && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-indigo-200 bg-indigo-500/15 border border-indigo-400/25 px-2 py-0.5 rounded-md backdrop-blur-md">
                      <Cpu className="w-3 h-3 text-indigo-400" /> RAG Sẵn sàng
                    </span>
                  )}
                </div>
              </div>

              {/* Main Document Details */}
              <div className="my-3 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 mb-2 shadow-inner">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white leading-snug line-clamp-2 font-heading tracking-tight">
                  {docTitle}
                </h3>
                <p className="text-xs text-slate-300 font-sans">
                  Tác giả: <span className="text-white font-semibold">{docAuthor}</span>
                </p>
              </div>

              {/* Document Meta Stats */}
              <div className="pt-3 pb-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300 font-mono">
                <span>{docFileType} · {docSize}</span>
                <span className="text-emerald-400 font-semibold">Chính thức</span>
              </div>

              {/* BOTTOM STATUS BAR (Workstation Status Bar) */}
              <div className="mt-2 bg-slate-950/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-3.5 grid grid-cols-2 gap-3 text-xs">
                {isTeacher ? (
                  <>
                    <div className="border-r border-slate-800/80 pr-2">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-semibold">Đang chờ duyệt</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${teacherStats.pending > 0 ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                        <span className="text-white font-semibold">{teacherStats.pending} tài liệu</span>
                      </div>
                    </div>

                    <div className="pl-1">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-semibold">Hỏi đáp RAG AI</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-emerald-300 font-semibold">{teacherStats.ragReady} tài liệu</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="border-r border-slate-800/80 pr-2">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-semibold">Trạng thái học liệu</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-white font-semibold">{isPublished ? "Đã xuất bản" : "Đang cập nhật"}</span>
                      </div>
                    </div>

                    <div className="pl-1">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-semibold">Hệ thống RAG AI</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                        <span className="text-indigo-200 font-semibold">Đã sẵn sàng trên hệ thống</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

            </div>

            {/* Mobile/Tablet Stacked Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 w-full lg:hidden">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start gap-3 text-left">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  {isTeacher ? <FileText className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4 text-emerald-600" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{isTeacher ? "TÀI LIỆU CỦA BẠN" : "HỌC LIỆU CHÍNH THỐNG"}</h4>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                    {isTeacher ? `${teacherStats.total} tài liệu đã tải lên` : "Được quản lý và phê duyệt trước khi xuất bản."}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start gap-3 text-left">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{isTeacher ? "RAG AI SẴN SÀNG" : "TÍCH HỢP RAG AI"}</h4>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                    {isTeacher ? `${teacherStats.ragReady} tài liệu có thể hỏi đáp AI` : "Học liệu được lập chỉ mục phục vụ trợ lý AI cho Giảng viên."}
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Lifecycle Modal */}
      <LibraryProcessDialog
        isOpen={isProcessOpen}
        onClose={() => setIsProcessOpen(false)}
      />
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Document } from "../types";
import { MOCK_DOCUMENTS } from "../mockData";
import { DocumentMetadataPanel } from "../components/DetailWidgets";
import { RagChatPanel } from "../components/RagChatPanel";
import { PageLoading } from "../components/EmptyState";
import { ArrowLeft, Download, FileText } from "lucide-react";

export function LibraryDocumentDetailPage({ 
  documentId, 
  onBack 
}: { 
  documentId: number, 
  onBack: () => void 
}) {
  const [doc, setDoc] = useState<Document | null>(null);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      const found = MOCK_DOCUMENTS.find(d => d.id === documentId && d.publicationStatus === "PUBLISHED");
      setDoc(found || null);
    }, 400);
    return () => clearTimeout(timer);
  }, [documentId]);

  const [loading, setLoading] = useState(true);

  if (!doc) return <PageLoading />;

  return (
    <div className="w-full flex flex-col h-[calc(100vh-100px)] text-left">
      {/* Top Navigation */}
      <button 
        onClick={onBack}
        className="flex items-center gap-1.5 text-[13.5px] font-medium text-slate-500 hover:text-black transition-colors mb-5 w-fit border-none bg-transparent cursor-pointer font-action"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Trở về thư viện
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Left Column: Metadata & Actions */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6 overflow-y-auto pr-1 scrollbar-hide">
          <div className="bg-white border border-[rgba(14,13,11,0.07)] rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-[#F4F3F0] flex items-center justify-center mb-4">
              <FileText className="w-5 h-5 text-[#6B6963]" />
            </div>
            <h1 className="text-[24px] font-sans-body font-semibold text-[#0E0D0B] leading-snug mb-3">
              {doc.title}
            </h1>
            <p className="text-[14.5px] text-[#6B6963] leading-relaxed mb-6 font-sans">
              {doc.description || "Chưa có mô tả."}
            </p>
            
            <button className="w-full flex items-center justify-center gap-2 h-10 bg-[#0E0D0B] text-white text-[14.5px] font-medium rounded-xl hover:bg-[#1C1A17] transition-all shadow-sm border-none cursor-pointer font-action">
              <Download className="w-4 h-4" />
              Tải file gốc
            </button>
          </div>

          <DocumentMetadataPanel doc={doc} isOwner={false} />
        </div>

        {/* Right Column: Scoped RAG Chat */}
        <div className="lg:col-span-8 xl:col-span-9 h-[500px] lg:h-full">
          <RagChatPanel document={doc} isEligible={true} />
        </div>
        
      </div>
    </div>
  );
}

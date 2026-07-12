import React from "react";
import { Search, Filter, LayoutGrid, List } from "lucide-react";

export interface FilterState {
  q: string;
  subject: string;
  topic: string;
  tags: string[];
  uploadedBy: string;
}

interface SearchFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  availableSubjects: string[];
}

export function SearchFilters({ filters, onChange, viewMode, onViewModeChange, availableSubjects }: SearchFiltersProps) {

  return (
    <div className="flex flex-col gap-4 mb-8">
      {/* Top Row: Search and View Mode */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-[400px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C2BFB8]" />
          <input
            type="text"
            value={filters.q}
            onChange={e => onChange({ ...filters, q: e.target.value })}
            placeholder="Tìm kiếm tài liệu, giáo trình..."
            className="w-full h-10 pl-10 pr-4 bg-white border border-[rgba(14,13,11,0.08)] rounded-xl text-[13px] text-[#0E0D0B] placeholder:text-[#C2BFB8] focus:outline-none focus:ring-2 focus:ring-[#4F63D2]/20 focus:border-[#4F63D2] transition-all shadow-sm"
          />
        </div>

        <button className="flex items-center gap-2 h-10 px-4 bg-white border border-[rgba(14,13,11,0.08)] rounded-xl text-xs text-[#6B6963] hover:text-[#0E0D0B] hover:border-[rgba(14,13,11,0.15)] transition-all shadow-sm">
          <Filter className="w-3.5 h-3.5" />
          Bộ lọc nâng cao
        </button>

        <div className="ml-auto flex items-center gap-1 p-1 bg-white border border-[rgba(14,13,11,0.08)] rounded-xl shadow-sm">
          {([["grid", LayoutGrid], ["list", List]] as const).map(([mode, Icon]) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode as "grid" | "list")}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${viewMode === mode
                  ? "bg-[#F4F3F0] text-[#0E0D0B] shadow-sm"
                  : "text-[#C2BFB8] hover:text-[#6B6963]"
                }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Categories Row */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
        {["Tất cả", ...availableSubjects].map(sub => {
          const isSelected = (sub === "Tất cả" && !filters.subject) || filters.subject === sub;
          return (
            <button
              key={sub}
              onClick={() => onChange({ ...filters, subject: sub === "Tất cả" ? "" : sub })}
              className={`flex-shrink-0 h-8 px-4 rounded-full text-[13px] font-medium transition-all duration-150 ${isSelected
                  ? "bg-[#0E0D0B] text-white"
                  : "bg-white border border-[rgba(14,13,11,0.08)] text-[#6B6963] hover:text-[#0E0D0B] hover:border-[rgba(14,13,11,0.2)]"
                }`}
            >
              {sub}
            </button>
          );
        })}
      </div>
    </div>
  );
}

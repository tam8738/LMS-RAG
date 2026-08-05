import React, { useRef } from "react";
import { Calendar } from "lucide-react";
import { parseVietnameseDateToIso } from "../utils/formatDate";

interface VietnameseDateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function VietnameseDateInput({
  value,
  onChange,
  placeholder = "dd/mm/yyyy",
  className = "w-full h-10.5 border border-slate-200 rounded-xl px-3.5 pr-10 text-[13.5px] text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all bg-white font-medium",
}: VietnameseDateInputProps) {
  const hiddenDateRef = useRef<HTMLInputElement>(null);

  // Convert current text value (DD/MM/YYYY) to YYYY-MM-DD for native date picker if valid
  const isoValue = parseVietnameseDateToIso(value) || "";

  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // YYYY-MM-DD
    if (val) {
      const [yyyy, mm, dd] = val.split("-");
      onChange(`${dd}/${mm}/${yyyy}`);
    }
  };

  const handleIconClick = () => {
    const el = hiddenDateRef.current;
    if (el) {
      if ("showPicker" in el && typeof (el as any).showPicker === "function") {
        (el as any).showPicker();
      } else {
        el.click();
      }
    }
  };

  return (
    <div className="relative flex items-center w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
      <button
        type="button"
        onClick={handleIconClick}
        className="absolute right-3 text-slate-400 hover:text-indigo-600 transition-colors p-1 flex items-center justify-center cursor-pointer border-none bg-transparent"
        title="Mở lịch chọn ngày"
      >
        <Calendar className="w-4 h-4 text-slate-400 hover:text-indigo-600" />
      </button>
      <input
        ref={hiddenDateRef}
        type="date"
        value={isoValue}
        onChange={handleNativeDateChange}
        className="sr-only absolute pointer-events-none opacity-0 w-0 h-0"
        tabIndex={-1}
      />
    </div>
  );
}

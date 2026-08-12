import React, { useState, useEffect, useRef } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  RotateCcw,
  Check,
} from "lucide-react";
import { parseVietnameseDateToIso, formatIsoToVietnameseDate } from "../utils/formatDate";

export interface VietnameseDateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

const MONTH_NAMES = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

const WEEK_DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function parseDateComponents(str?: string | null): { day: number; month: number; year: number } | null {
  if (!str || !str.trim()) return null;
  const trimmed = str.trim();

  // DD/MM/YYYY or DD-MM-YYYY
  let match = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    const year = parseInt(match[3], 10);
    if (year >= 1900 && year <= 2100 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return { day, month, year };
    }
  }

  // YYYY-MM-DD
  match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    if (year >= 1900 && year <= 2100 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return { day, month, year };
    }
  }

  return null;
}

export function VietnameseDateInput({
  value,
  onChange,
  placeholder = "dd/mm/yyyy",
  className,
  disabled = false,
  id,
}: VietnameseDateInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"days" | "months" | "years">("days");

  const today = new Date();
  const parsed = parseDateComponents(value);

  const [viewYear, setViewYear] = useState<number>(parsed ? parsed.year : today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(parsed ? parsed.month : today.getMonth());
  const [decadeStart, setDecadeStart] = useState<number>(
    Math.floor((parsed ? parsed.year : today.getFullYear()) / 12) * 12
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal view with external value when value changes
  useEffect(() => {
    const p = parseDateComponents(value);
    if (p) {
      setViewYear(p.year);
      setViewMonth(p.month);
      setDecadeStart(Math.floor(p.year / 12) * 12);
    }
  }, [value]);

  // Click outside and Escape key handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setViewMode("days");
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setViewMode("days");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectDay = (day: number, month: number, year: number) => {
    const dd = day.toString().padStart(2, "0");
    const mm = (month + 1).toString().padStart(2, "0");
    const formatted = `${dd}/${mm}/${year}`;
    onChange(formatted);
    setIsOpen(false);
    setViewMode("days");
  };

  const handleSelectToday = () => {
    const dd = today.getDate().toString().padStart(2, "0");
    const mm = (today.getMonth() + 1).toString().padStart(2, "0");
    const yyyy = today.getFullYear();
    onChange(`${dd}/${mm}/${yyyy}`);
    setViewYear(yyyy);
    setViewMonth(today.getMonth());
    setIsOpen(false);
    setViewMode("days");
  };

  const handleClear = () => {
    onChange("");
    setIsOpen(false);
    setViewMode("days");
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handlePrevYear = () => {
    setViewYear((prev) => prev - 1);
  };

  const handleNextYear = () => {
    setViewYear((prev) => prev + 1);
  };

  // Generate day cells
  const getCalendarDays = () => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    // Monday is index 0
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = [];

    // Prev month overflow
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({ day: d, month: m, year: y, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ day: d, month: viewMonth, year: viewYear, isCurrentMonth: true });
    }

    // Next month overflow (fill 35 or 42 cells)
    const targetLength = days.length <= 35 ? 35 : 42;
    const extraNeeded = targetLength - days.length;
    for (let d = 1; d <= extraNeeded; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      days.push({ day: d, month: m, year: y, isCurrentMonth: false });
    }

    return days;
  };

  const isToday = (d: number, m: number, y: number) => {
    return d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
  };

  const isSelected = (d: number, m: number, y: number) => {
    return parsed !== null && d === parsed.day && m === parsed.month && y === parsed.year;
  };

  const defaultInputClass =
    "w-full h-10 sm:h-10.5 border border-slate-200 rounded-xl px-3.5 pr-10 text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all bg-white font-medium";

  const yearsGrid = Array.from({ length: 12 }, (_, i) => decadeStart + i);

  return (
    <div ref={containerRef} className="relative w-full text-left font-sans">
      {/* Input container */}
      <div className="relative flex items-center w-full">
        <input
          ref={inputRef}
          id={id}
          type="text"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onClick={() => {
            if (!disabled) setIsOpen(true);
          }}
          className={`${className || defaultInputClass} ${
            isOpen ? "border-indigo-500 ring-4 ring-indigo-500/10" : ""
          } ${disabled ? "bg-slate-100/70 text-slate-500 cursor-not-allowed" : ""}`}
        />

        {/* Action icons on right */}
        <div className="absolute right-2 flex items-center gap-0.5">
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer flex items-center justify-center"
              title="Xóa ngày đã chọn"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) setIsOpen((prev) => !prev);
            }}
            className={`p-1.5 rounded-lg transition-colors border-none bg-transparent flex items-center justify-center ${
              disabled
                ? "text-slate-300 cursor-not-allowed"
                : isOpen
                ? "text-indigo-600 bg-indigo-50 cursor-pointer"
                : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100 cursor-pointer"
            }`}
            title="Mở lịch chọn ngày"
          >
            <CalendarIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-[160] w-full min-w-[310px] sm:min-w-[330px] max-w-[350px] bg-white/98 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-[0_16px_44px_rgba(15,23,42,0.18)] p-3.5 sm:p-4 text-left select-none animate-fadeIn">
          {/* Header Navigation */}
          {viewMode === "days" && (
            <div>
              <div className="flex items-center justify-between gap-1 pb-3 mb-2 border-b border-slate-100">
                {/* Year jump back & Month back */}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={handlePrevYear}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
                    title="Năm trước"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
                    title="Tháng trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>

                {/* Center: Interactive Month & Year Buttons */}
                <div className="flex items-center gap-1.5 font-bold text-[13.5px] text-slate-900">
                  <button
                    type="button"
                    onClick={() => setViewMode("months")}
                    className="px-2 py-1 rounded-lg text-indigo-700 hover:bg-indigo-50 transition-colors border-none bg-transparent cursor-pointer font-bold tracking-tight"
                    title="Chọn tháng"
                  >
                    {MONTH_NAMES[viewMonth]}
                  </button>
                  <span className="text-slate-300 font-light">/</span>
                  <button
                    type="button"
                    onClick={() => {
                      setDecadeStart(Math.floor(viewYear / 12) * 12);
                      setViewMode("years");
                    }}
                    className="px-2 py-1 rounded-lg text-slate-800 hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer font-bold tracking-tight"
                    title="Chọn năm"
                  >
                    {viewYear}
                  </button>
                </div>

                {/* Month next & Year jump forward */}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
                    title="Tháng sau"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextYear}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
                    title="Năm sau"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                {WEEK_DAYS.map((w, idx) => (
                  <span
                    key={w}
                    className={`text-[11px] font-bold py-1 ${
                      idx >= 5 ? "text-rose-500/80" : "text-slate-400"
                    }`}
                  >
                    {w}
                  </span>
                ))}
              </div>

              {/* Day cells grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {getCalendarDays().map((cell, idx) => {
                  const selected = isSelected(cell.day, cell.month, cell.year);
                  const todayCell = isToday(cell.day, cell.month, cell.year);

                  let btnStyle =
                    "text-slate-800 hover:bg-indigo-50 hover:text-indigo-600 font-medium";
                  if (!cell.isCurrentMonth) {
                    btnStyle = "text-slate-300 hover:bg-slate-50 hover:text-slate-500 font-normal";
                  }
                  if (todayCell && !selected) {
                    btnStyle =
                      "border border-indigo-300 text-indigo-700 font-bold bg-indigo-50/60 hover:bg-indigo-100/70";
                  }
                  if (selected) {
                    btnStyle =
                      "bg-indigo-600 text-white font-bold shadow-xs hover:bg-indigo-700 ring-2 ring-indigo-300/40";
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectDay(cell.day, cell.month, cell.year)}
                      className={`h-8 sm:h-8.5 rounded-xl text-[12.5px] sm:text-[13px] flex items-center justify-center transition-all cursor-pointer border-none bg-transparent ${btnStyle}`}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Month Selection Mode (3x4 Grid) */}
          {viewMode === "months" && (
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <button
                  type="button"
                  onClick={handlePrevYear}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDecadeStart(Math.floor(viewYear / 12) * 12);
                    setViewMode("years");
                  }}
                  className="text-[14px] font-bold text-slate-900 hover:text-indigo-600 transition-colors border-none bg-transparent cursor-pointer"
                >
                  Năm {viewYear} ▾
                </button>
                <button
                  type="button"
                  onClick={handleNextYear}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 py-1">
                {MONTH_NAMES.map((name, idx) => {
                  const isCurrent = idx === viewMonth;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setViewMonth(idx);
                        setViewMode("days");
                      }}
                      className={`py-2.5 px-1.5 rounded-xl text-[12.5px] sm:text-[13px] font-semibold transition-all border-none cursor-pointer ${
                        isCurrent
                          ? "bg-indigo-600 text-white shadow-xs font-bold"
                          : "bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600"
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Year Selection Mode (Decade 3x4 Grid) */}
          {viewMode === "years" && (
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setDecadeStart((prev) => prev - 12)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
                  title="12 năm trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[13.5px] font-bold text-slate-900">
                  {decadeStart} - {decadeStart + 11}
                </span>
                <button
                  type="button"
                  onClick={() => setDecadeStart((prev) => prev + 12)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
                  title="12 năm sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 py-1">
                {yearsGrid.map((y) => {
                  const isCurrent = y === viewYear;
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                        setViewYear(y);
                        setViewMode("months");
                      }}
                      className={`py-2.5 px-1.5 rounded-xl text-[13px] font-semibold transition-all border-none cursor-pointer ${
                        isCurrent
                          ? "bg-indigo-600 text-white shadow-xs font-bold"
                          : "bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600"
                      }`}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-3 mt-2.5 border-t border-slate-100 text-[12px] font-semibold">
            <button
              type="button"
              onClick={handleClear}
              className="px-2.5 py-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors border-none bg-transparent cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Xóa</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectToday}
                className="px-2.5 py-1 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors border-none bg-transparent cursor-pointer font-bold"
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setViewMode("days");
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border-none cursor-pointer font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

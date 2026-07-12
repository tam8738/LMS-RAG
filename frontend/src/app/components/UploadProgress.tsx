import React from "react";
import { Check } from "lucide-react";

export function UploadProgress({ progress }: { progress: number }) {
  return (
    <div className="w-full bg-[#F4F3F0] rounded-full h-1.5 overflow-hidden">
      <div 
        className="bg-[#4F63D2] h-full transition-all duration-300 ease-out relative"
        style={{ width: `${progress}%` }}
      >
        <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_1.5s_infinite]" 
             style={{ backgroundImage: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)" }} />
      </div>
    </div>
  );
}

export function UploadStepper({ currentStep }: { currentStep: number }) {
  const steps = [
    { n: 1, label: "Chọn file" },
    { n: 2, label: "Thông tin (Metadata)" },
    { n: 3, label: "Hoàn tất" }
  ];

  return (
    <div className="flex items-center mb-10 w-full max-w-[400px] text-left">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-semibold transition-all duration-300 ${
              currentStep > s.n
                ? "bg-[#4F63D2] text-white"
                : currentStep === s.n
                ? "bg-[#0E0D0B] text-white"
                : "bg-white border border-[rgba(14,13,11,0.12)] text-[#C2BFB8]"
            }`}>
              {currentStep > s.n ? <Check className="w-3.5 h-3.5" /> : s.n}
            </div>
            <span className={`text-[13px] font-medium hidden sm:block transition-colors ${currentStep >= s.n ? "text-[#0E0D0B]" : "text-[#C2BFB8]"}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px mx-3 flex-1 transition-all duration-500 ${currentStep > s.n ? "bg-[#4F63D2]" : "bg-[rgba(14,13,11,0.1)]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

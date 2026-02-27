"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS = [
  { label: "Video Input", short: "Input" },
  { label: "Trim Video", short: "Trim" },
  { label: "Capture Snapshot", short: "Capture" },
  { label: "Generate Images", short: "Images" },
  { label: "Select Images", short: "Select" },
  { label: "Generate Videos", short: "Videos" },
  { label: "Results", short: "Results" },
];

interface StepIndicatorProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
  maxReachedStep: number;
}

export function StepIndicator({ currentStep, onStepClick, maxReachedStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isClickable = index <= maxReachedStep && onStepClick;

        return (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <div
                className={cn(
                  "w-6 h-px mx-1",
                  isCompleted ? "bg-primary" : "bg-border"
                )}
              />
            )}
            <button
              onClick={() => isClickable && onStepClick(index)}
              disabled={!isClickable}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                isCurrent && "bg-primary text-primary-foreground",
                isCompleted && !isCurrent && "bg-primary/10 text-primary",
                !isCompleted && !isCurrent && "bg-muted text-muted-foreground",
                isClickable && "cursor-pointer hover:opacity-80",
                !isClickable && "cursor-default"
              )}
            >
              {isCompleted ? (
                <Check className="w-3 h-3" />
              ) : (
                <span className="w-4 h-4 flex items-center justify-center rounded-full bg-current/10 text-[10px]">
                  {index + 1}
                </span>
              )}
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden">{step.short}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

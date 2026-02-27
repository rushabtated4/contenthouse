"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface SelectableImageCardProps {
  imageUrl: string;
  selected: boolean;
  onToggle: () => void;
}

export function SelectableImageCard({ imageUrl, selected, onToggle }: SelectableImageCardProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative aspect-[2/3] rounded-lg overflow-hidden border-2 transition-all",
        selected ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-border"
      )}
    >
      <img src={imageUrl} alt="Generated" className="w-full h-full object-cover" />
      <div
        className={cn(
          "absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all",
          selected ? "bg-primary text-primary-foreground" : "bg-black/40 text-white"
        )}
      >
        {selected && <Check className="w-4 h-4" />}
      </div>
    </button>
  );
}

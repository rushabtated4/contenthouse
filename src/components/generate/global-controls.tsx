"use client";

import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

interface GlobalControlsProps {
  firstSlidePrompt: string;
  otherSlidesPrompt: string;
  qualityInput: "low" | "high";
  qualityOutput: "low" | "medium" | "high";
  numSets: number;
  outputFormat: "png" | "jpeg" | "webp";
  isGenerating: boolean;
  canGenerate: boolean;
  onFirstPromptChange: (v: string) => void;
  onOtherPromptChange: (v: string) => void;
  onQualityInputChange: (v: "low" | "high") => void;
  onQualityOutputChange: (v: "low" | "medium" | "high") => void;
  onNumSetsChange: (v: number) => void;
  onOutputFormatChange: (v: "png" | "jpeg" | "webp") => void;
  onGenerate: () => void;
}

export function GlobalControls({
  firstSlidePrompt,
  otherSlidesPrompt,
  qualityInput,
  qualityOutput,
  numSets,
  outputFormat,
  isGenerating,
  canGenerate,
  onFirstPromptChange,
  onOtherPromptChange,
  onQualityInputChange,
  onQualityOutputChange,
  onNumSetsChange,
  onOutputFormatChange,
  onGenerate,
}: GlobalControlsProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-sm font-medium text-foreground">
        Generation Settings
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Default First Slide Prompt
          </label>
          <Textarea
            placeholder="Prompt for the first slide (hook/title)..."
            value={firstSlidePrompt}
            onChange={(e) => onFirstPromptChange(e.target.value)}
            className="min-h-[80px] text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Default Other Slides Prompt
          </label>
          <Textarea
            placeholder="Prompt for all other slides..."
            value={otherSlidesPrompt}
            onChange={(e) => onOtherPromptChange(e.target.value)}
            className="min-h-[80px] text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Input Quality
          </label>
          <Select value={qualityInput} onValueChange={(v) => onQualityInputChange(v as "low" | "high")}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Output Quality
          </label>
          <Select value={qualityOutput} onValueChange={(v) => onQualityOutputChange(v as "low" | "medium" | "high")}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Output Format
          </label>
          <Select value={outputFormat} onValueChange={(v) => onOutputFormatChange(v as "png" | "jpeg" | "webp")}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="jpeg">JPEG</SelectItem>
              <SelectItem value="webp">WebP</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Number of Sets
          </label>
          <Input
            type="number"
            min={1}
            max={20}
            value={numSets}
            onChange={(e) => onNumSetsChange(parseInt(e.target.value) || 1)}
            className="text-sm"
          />
        </div>
      </div>

      <Button
        onClick={onGenerate}
        disabled={!canGenerate || isGenerating}
        size="lg"
        className="w-full rounded-xl h-12 text-base gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate {numSets} Set{numSets > 1 ? "s" : ""}
          </>
        )}
      </Button>
    </div>
  );
}

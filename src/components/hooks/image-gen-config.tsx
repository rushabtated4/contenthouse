"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wand2 } from "lucide-react";

interface ImageGenConfigProps {
  prompt: string;
  numImages: number;
  aspectRatio: string;
  generating: boolean;
  onPromptChange: (prompt: string) => void;
  onNumImagesChange: (n: number) => void;
  onAspectRatioChange: (ar: string) => void;
  onGenerate: () => void;
}

export function ImageGenConfig({
  prompt,
  numImages,
  aspectRatio,
  generating,
  onPromptChange,
  onNumImagesChange,
  onAspectRatioChange,
  onGenerate,
}: ImageGenConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="hook-prompt">Prompt</Label>
        <Textarea
          id="hook-prompt"
          placeholder="Describe how the generated image should look..."
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          rows={3}
          disabled={generating}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Number of Images</Label>
          <Select
            value={String(numImages)}
            onValueChange={(v) => onNumImagesChange(parseInt(v))}
            disabled={generating}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} image{n > 1 ? "s" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Aspect Ratio</Label>
          <Select
            value={aspectRatio}
            onValueChange={onAspectRatioChange}
            disabled={generating}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2:3">2:3 (Portrait)</SelectItem>
              <SelectItem value="9:16">9:16 (TikTok)</SelectItem>
              <SelectItem value="1:1">1:1 (Square)</SelectItem>
              <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={onGenerate} disabled={generating || !prompt.trim()} className="w-full">
        {generating ? (
          <>
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4 mr-1" />
            Generate Images
          </>
        )}
      </Button>
    </div>
  );
}

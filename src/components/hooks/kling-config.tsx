"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface KlingConfigProps {
  characterOrientation: "image" | "video";
  prompt: string;
  keepOriginalSound: boolean;
  onOrientationChange: (v: "image" | "video") => void;
  onPromptChange: (v: string) => void;
  onSoundChange: (v: boolean) => void;
  disabled?: boolean;
}

export function KlingConfig({
  characterOrientation,
  prompt,
  keepOriginalSound,
  onOrientationChange,
  onPromptChange,
  onSoundChange,
  disabled,
}: KlingConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Character Orientation</Label>
        <RadioGroup
          value={characterOrientation}
          onValueChange={(v) => onOrientationChange(v as "image" | "video")}
          disabled={disabled}
          className="flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="image" id="orient-image" />
            <Label htmlFor="orient-image" className="font-normal">Image (keep image pose)</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="video" id="orient-video" />
            <Label htmlFor="orient-video" className="font-normal">Video (match video motion)</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="kling-prompt">Motion Prompt (optional)</Label>
        <Textarea
          id="kling-prompt"
          placeholder="Describe the desired motion..."
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          rows={2}
          disabled={disabled}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={keepOriginalSound}
          onCheckedChange={onSoundChange}
          disabled={disabled}
        />
        <Label className="font-normal">Keep original video sound</Label>
      </div>
    </div>
  );
}

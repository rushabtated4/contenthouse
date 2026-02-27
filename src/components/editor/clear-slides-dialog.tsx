"use client";

import { useState } from "react";
import { Eraser } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const CLEAR_OPTIONS = [
  { id: "text" as const, label: "Text Blocks", description: "Remove all text from every slide" },
  { id: "background" as const, label: "Backgrounds", description: "Reset backgrounds to default" },
  { id: "overlay" as const, label: "Overlays", description: "Remove all overlay images" },
];

export function ClearSlidesDialog() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({
    text: true,
    background: true,
    overlay: true,
  });
  const clearSlides = useEditorStore((s) => s.clearSlides);

  const anySelected = Object.values(selected).some(Boolean);

  const handleClear = () => {
    clearSlides({
      text: !!selected.text,
      background: !!selected.background,
      overlay: !!selected.overlay,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eraser className="h-3.5 w-3.5 mr-1.5" />
          Clear Slides
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Clear Slides</DialogTitle>
          <DialogDescription>
            Choose what to clear from all slides.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {CLEAR_OPTIONS.map((opt) => (
            <div key={opt.id} className="flex items-start gap-3">
              <Checkbox
                id={`clear-${opt.id}`}
                checked={!!selected[opt.id]}
                onCheckedChange={(checked) =>
                  setSelected((prev) => ({ ...prev, [opt.id]: !!checked }))
                }
              />
              <div className="grid gap-0.5 leading-none">
                <Label htmlFor={`clear-${opt.id}`} className="text-sm font-medium cursor-pointer">
                  {opt.label}
                </Label>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={!anySelected}
            onClick={handleClear}
          >
            Clear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

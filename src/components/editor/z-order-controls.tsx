"use client";

import { useEditorStore } from "@/stores/editor-store";
import { Button } from "@/components/ui/button";
import { ArrowUpToLine, ArrowDownToLine, ArrowUp, ArrowDown } from "lucide-react";

export function ZOrderControls() {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const activeSlideIndex = useEditorStore((s) => s.activeSlideIndex);
  const bringToFront = useEditorStore((s) => s.bringToFront);
  const sendToBack = useEditorStore((s) => s.sendToBack);
  const moveForward = useEditorStore((s) => s.moveForward);
  const moveBackward = useEditorStore((s) => s.moveBackward);

  if (selectedIds.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <h3 className="text-sm font-semibold">Layer Order</h3>
      <div className="grid grid-cols-4 gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => bringToFront(activeSlideIndex)}
          title="Bring to Front"
        >
          <ArrowUpToLine className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => moveForward(activeSlideIndex)}
          title="Move Forward"
        >
          <ArrowUp className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => moveBackward(activeSlideIndex)}
          title="Move Backward"
        >
          <ArrowDown className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => sendToBack(activeSlideIndex)}
          title="Send to Back"
        >
          <ArrowDownToLine className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

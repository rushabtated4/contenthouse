"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, Clapperboard, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface EditorActionsProps {
  compositionId: string | null;
  status: "draft" | "rendering" | "completed" | "failed";
  isDirty: boolean;
  onRender: () => void;
  onSave: () => void;
  onClose?: () => void;
}

export function EditorActions({
  compositionId,
  status,
  isDirty,
  onRender,
  onSave,
  onClose,
}: EditorActionsProps) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Actions</h3>
        <div className="flex items-center gap-1.5">
          {status === "completed" && (
            <Badge className="bg-green-500 text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              Rendered
            </Badge>
          )}
          {status === "failed" && (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="w-3 h-3 mr-1" />
              Failed
            </Badge>
          )}
          {status === "rendering" && (
            <Badge variant="secondary" className="text-xs">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Rendering
            </Badge>
          )}
          {isDirty && (
            <Badge variant="outline" className="text-xs">Unsaved</Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onSave}
          disabled={!isDirty}
        >
          <Save className="w-3.5 h-3.5 mr-1" />
          Save Draft
        </Button>

        <Button
          size="sm"
          onClick={onRender}
          disabled={status === "rendering" || !compositionId}
        >
          {status === "rendering" ? (
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
          ) : (
            <Clapperboard className="w-3.5 h-3.5 mr-1" />
          )}
          {status === "rendering" ? "Rendering..." : "Render Video"}
        </Button>

        {onClose && (
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="w-3.5 h-3.5 mr-1" />
            Close Editor
          </Button>
        )}
      </div>
    </div>
  );
}

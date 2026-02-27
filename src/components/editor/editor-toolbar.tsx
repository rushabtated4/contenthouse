"use client";

import { useEditorStore } from "@/stores/editor-store";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Type, Image, Download, Save, Loader2, Undo2, Redo2, Group, Ungroup, RefreshCw, Wand2 } from "lucide-react";
import { toast } from "sonner";

export function EditorToolbar() {
  const extractText = useEditorStore((s) => s.extractText);
  const generateAllBackgrounds = useEditorStore((s) => s.generateAllBackgrounds);
  const exportZip = useEditorStore((s) => s.exportZip);
  const extractionStatus = useEditorStore((s) => s.extractionStatus);
  const bgGenerationStatus = useEditorStore((s) => s.bgGenerationStatus);
  const exportStatus = useEditorStore((s) => s.exportStatus);
  const outputFormat = useEditorStore((s) => s.outputFormat);
  const setOutputFormat = useEditorStore((s) => s.setOutputFormat);
  const saveEditorState = useEditorStore((s) => s.saveEditorState);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const isDirty = useEditorStore((s) => s.isDirty);
  const savedSetId = useEditorStore((s) => s.savedSetId);
  const dirtySlideIndexes = useEditorStore((s) => s.dirtySlideIndexes);
  const hasGeneratedImages = useEditorStore((s) => s.hasGeneratedImages);
  const updateGeneration = useEditorStore((s) => s.updateGeneration);
  const createGeneration = useEditorStore((s) => s.createGeneration);
  const updateGenerationStatus = useEditorStore((s) => s.updateGenerationStatus);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const history = useEditorStore((s) => s.history);
  const future = useEditorStore((s) => s.future);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const activeSlideIndex = useEditorStore((s) => s.activeSlideIndex);
  const groupSelected = useEditorStore((s) => s.groupSelected);
  const ungroupSelected = useEditorStore((s) => s.ungroupSelected);

  const isBgLoading = Object.values(bgGenerationStatus).some((s) => s === "loading");

  const handleExtract = async () => {
    toast.info("Extracting text from slides...");
    await extractText();
  };

  const handleGenerateBgs = async () => {
    toast.info("Generating backgrounds...");
    await generateAllBackgrounds();
    toast.success("Backgrounds generated!");
  };

  const handleSave = async () => {
    await saveEditorState();
    if (useEditorStore.getState().saveStatus === "done") {
      toast.success("Editor state saved!");
    } else {
      toast.error("Failed to save editor state");
    }
  };

  const handleExport = async () => {
    toast.info("Exporting slides...");
    const blob = await exportZip();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "editor-export.zip";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download started!");
    } else {
      toast.error("Export failed");
    }
  };

  const handleUpdateGeneration = async () => {
    toast.info("Updating generation images...");
    await updateGeneration();
    const status = useEditorStore.getState().updateGenerationStatus;
    if (status === "done") {
      toast.success("Generation images updated!");
    } else {
      toast.error("Failed to update generation images");
    }
  };

  const handleCreateGeneration = async () => {
    toast.info("Creating generation images...");
    await createGeneration();
    const status = useEditorStore.getState().updateGenerationStatus;
    if (status === "done") {
      toast.success("Generation created!");
    } else {
      toast.error("Failed to create generation");
    }
  };

  const dirtyCount = dirtySlideIndexes.size;
  const showCreateGeneration = !!savedSetId && !hasGeneratedImages;
  const showUpdateGeneration = !!savedSetId && hasGeneratedImages && dirtyCount > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Undo/Redo */}
      <Button
        variant="outline"
        size="sm"
        onClick={undo}
        disabled={history.length === 0}
        title="Undo (Cmd+Z)"
      >
        <Undo2 className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={redo}
        disabled={future.length === 0}
        title="Redo (Cmd+Shift+Z)"
      >
        <Redo2 className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-border" />

      <Button
        variant="outline"
        size="sm"
        onClick={handleExtract}
        disabled={extractionStatus === "loading"}
      >
        {extractionStatus === "loading" ? (
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
        ) : (
          <Type className="w-4 h-4 mr-1" />
        )}
        Extract Text
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleGenerateBgs}
        disabled={isBgLoading}
      >
        {isBgLoading ? (
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
        ) : (
          <Image className="w-4 h-4 mr-1" />
        )}
        Generate Backgrounds
      </Button>

      {/* Group/Ungroup — shown when 2+ elements selected */}
      {selectedIds.length >= 2 && (
        <>
          <div className="w-px h-6 bg-border" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => groupSelected(activeSlideIndex)}
            title="Group (Cmd+G)"
          >
            <Group className="w-4 h-4 mr-1" />
            Group
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => ungroupSelected(activeSlideIndex)}
            title="Ungroup (Cmd+Shift+G)"
          >
            <Ungroup className="w-4 h-4 mr-1" />
            Ungroup
          </Button>
        </>
      )}

      <div className="ml-auto flex items-center gap-2">
        {showCreateGeneration && (
          <Button
            variant="default"
            size="sm"
            onClick={handleCreateGeneration}
            disabled={updateGenerationStatus === "loading"}
          >
            {updateGenerationStatus === "loading" ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4 mr-1" />
            )}
            Create Generation
          </Button>
        )}
        {showUpdateGeneration && (
          <Button
            variant="default"
            size="sm"
            onClick={handleUpdateGeneration}
            disabled={updateGenerationStatus === "loading"}
          >
            {updateGenerationStatus === "loading" ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            Update Generation ({dirtyCount})
          </Button>
        )}

        <Button
          variant={isDirty ? "default" : "outline"}
          size="sm"
          onClick={handleSave}
          disabled={saveStatus === "loading"}
        >
          {saveStatus === "loading" ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-1" />
          )}
          Save
        </Button>

        <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as "png" | "jpeg" | "webp")}>
          <SelectTrigger className="w-[100px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="png">PNG</SelectItem>
            <SelectItem value="jpeg">JPEG</SelectItem>
            <SelectItem value="webp">WebP</SelectItem>
          </SelectContent>
        </Select>

        <Button
          size="sm"
          onClick={handleExport}
          disabled={exportStatus === "loading"}
        >
          {exportStatus === "loading" ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-1" />
          )}
          Download ZIP
        </Button>
      </div>
    </div>
  );
}

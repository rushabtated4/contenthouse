"use client";

import { useReducer, useEffect, useCallback, useRef } from "react";
import { VideoPreviewCanvas } from "./video-preview-canvas";
import { EditorTimeline } from "./editor-timeline";
import { VideoTextPropertiesPanel } from "./video-text-properties-panel";
import { DemoVideoSection } from "./demo-video-section";
import { EditorActions } from "./editor-actions";
import type { VideoTextOverlay, DemoVideo } from "@/types/hook-editor";
import { DEFAULT_TEXT_BLOCK } from "@/lib/editor/defaults";
import { toast } from "sonner";

interface HookVideoEditorProps {
  videoId: string;
  videoUrl: string;
  onClose?: () => void;
}

interface HookEditorState {
  compositionId: string | null;
  sourceVideoUrl: string;
  sourceVideoDuration: number;
  textOverlays: VideoTextOverlay[];
  selectedOverlayId: string | null;
  demoVideoId: string | null;
  demoVideoUrl: string | null;
  demoThumbnailUrl: string | null;
  demoDuration: number | null;
  playheadTime: number;
  isPlaying: boolean;
  isDirty: boolean;
  status: "draft" | "rendering" | "completed" | "failed";
}

type Action =
  | { type: "SET_DURATION"; duration: number }
  | { type: "SET_COMPOSITION"; compositionId: string; textOverlays: VideoTextOverlay[]; demoVideoId: string | null; demoVideoUrl: string | null; demoThumbnailUrl: string | null; demoDuration: number | null; status: "draft" | "rendering" | "completed" | "failed" }
  | { type: "ADD_TEXT_OVERLAY" }
  | { type: "UPDATE_TEXT_OVERLAY"; id: string; updates: Partial<VideoTextOverlay> }
  | { type: "DELETE_TEXT_OVERLAY"; id: string }
  | { type: "SELECT_OVERLAY"; id: string | null }
  | { type: "SET_DEMO"; demo: DemoVideo | null }
  | { type: "SET_PLAYHEAD"; time: number }
  | { type: "SET_PLAYING"; playing: boolean }
  | { type: "SET_STATUS"; status: "draft" | "rendering" | "completed" | "failed" }
  | { type: "MARK_CLEAN" };

function reducer(state: HookEditorState, action: Action): HookEditorState {
  switch (action.type) {
    case "SET_DURATION":
      return { ...state, sourceVideoDuration: action.duration };
    case "SET_COMPOSITION":
      return {
        ...state,
        compositionId: action.compositionId,
        textOverlays: action.textOverlays,
        demoVideoId: action.demoVideoId,
        demoVideoUrl: action.demoVideoUrl,
        demoThumbnailUrl: action.demoThumbnailUrl,
        demoDuration: action.demoDuration,
        status: action.status,
        isDirty: false,
      };
    case "ADD_TEXT_OVERLAY": {
      if (state.textOverlays.length >= 3) return state;
      const newOverlay: VideoTextOverlay = {
        ...DEFAULT_TEXT_BLOCK,
        id: crypto.randomUUID(),
        startTime: 0,
        endTime: Math.min(3, state.sourceVideoDuration || 3),
      };
      return { ...state, textOverlays: [...state.textOverlays, newOverlay], selectedOverlayId: newOverlay.id, isDirty: true };
    }
    case "UPDATE_TEXT_OVERLAY":
      return {
        ...state,
        textOverlays: state.textOverlays.map((o) =>
          o.id === action.id ? { ...o, ...action.updates } : o
        ),
        isDirty: true,
      };
    case "DELETE_TEXT_OVERLAY":
      return {
        ...state,
        textOverlays: state.textOverlays.filter((o) => o.id !== action.id),
        selectedOverlayId: state.selectedOverlayId === action.id ? null : state.selectedOverlayId,
        isDirty: true,
      };
    case "SELECT_OVERLAY":
      return { ...state, selectedOverlayId: action.id };
    case "SET_DEMO":
      return {
        ...state,
        demoVideoId: action.demo?.id || null,
        demoVideoUrl: action.demo?.video_url || null,
        demoThumbnailUrl: action.demo?.thumbnail_url || null,
        demoDuration: action.demo?.duration || null,
        isDirty: true,
      };
    case "SET_PLAYHEAD":
      return { ...state, playheadTime: action.time };
    case "SET_PLAYING":
      return { ...state, isPlaying: action.playing };
    case "SET_STATUS":
      return { ...state, status: action.status };
    case "MARK_CLEAN":
      return { ...state, isDirty: false };
    default:
      return state;
  }
}

export function HookVideoEditor({ videoId, videoUrl, onClose }: HookVideoEditorProps) {
  const [state, dispatch] = useReducer(reducer, {
    compositionId: null,
    sourceVideoUrl: videoUrl,
    sourceVideoDuration: 0,
    textOverlays: [],
    selectedOverlayId: null,
    demoVideoId: null,
    demoVideoUrl: null,
    demoThumbnailUrl: null,
    demoDuration: null,
    playheadTime: 0,
    isPlaying: false,
    isDirty: false,
    status: "draft",
  });

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load or create composition for this video
  useEffect(() => {
    async function loadComposition() {
      try {
        // Check if a draft composition already exists for this video
        const res = await fetch(`/api/hooks/compositions?status=draft&limit=50`);
        if (!res.ok) return;
        const data = await res.json();
        const existing = (data.compositions || []).find(
          (c: { source_video_id: string }) => c.source_video_id === videoId
        );

        if (existing) {
          dispatch({
            type: "SET_COMPOSITION",
            compositionId: existing.id,
            textOverlays: existing.text_overlays || [],
            demoVideoId: existing.demo_video_id,
            demoVideoUrl: existing.demo_videos?.video_url || null,
            demoThumbnailUrl: existing.demo_videos?.thumbnail_url || null,
            demoDuration: existing.demo_videos?.duration || null,
            status: existing.status,
          });
        }
      } catch {
        // Will create on first save
      }
    }
    loadComposition();
  }, [videoId]);

  // Auto-save debounced
  const saveToServer = useCallback(async () => {
    if (!state.isDirty) return;

    try {
      if (state.compositionId) {
        // Update existing
        await fetch(`/api/hooks/compositions/${state.compositionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            textOverlays: state.textOverlays,
            demoVideoId: state.demoVideoId,
          }),
        });
      } else {
        // Create new
        const res = await fetch("/api/hooks/compositions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceVideoId: videoId,
            textOverlays: state.textOverlays,
            demoVideoId: state.demoVideoId,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          dispatch({
            type: "SET_COMPOSITION",
            compositionId: data.id,
            textOverlays: state.textOverlays,
            demoVideoId: state.demoVideoId,
            demoVideoUrl: state.demoVideoUrl,
            demoThumbnailUrl: state.demoThumbnailUrl,
            demoDuration: state.demoDuration,
            status: "draft",
          });
        }
      }
      dispatch({ type: "MARK_CLEAN" });
    } catch {
      // Silently fail auto-save
    }
  }, [state.compositionId, state.isDirty, state.textOverlays, state.demoVideoId, state.demoVideoUrl, state.demoThumbnailUrl, state.demoDuration, videoId]);

  useEffect(() => {
    if (!state.isDirty) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveToServer, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [state.isDirty, saveToServer]);

  const handleRender = async () => {
    // Force save first
    await saveToServer();

    if (!state.compositionId) {
      toast.error("Save draft first");
      return;
    }

    dispatch({ type: "SET_STATUS", status: "rendering" });
    try {
      const res = await fetch(`/api/hooks/compositions/${state.compositionId}/render`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Render failed");
      }
      dispatch({ type: "SET_STATUS", status: "completed" });
      toast.success("Video rendered successfully!");
    } catch (err) {
      dispatch({ type: "SET_STATUS", status: "failed" });
      toast.error(err instanceof Error ? err.message : "Render failed");
    }
  };

  const selectedOverlay = state.textOverlays.find((o) => o.id === state.selectedOverlayId) || null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Left: Video preview + Timeline */}
        <div className="space-y-3">
          <VideoPreviewCanvas
            videoUrl={state.sourceVideoUrl}
            textOverlays={state.textOverlays}
            playheadTime={state.playheadTime}
            isPlaying={state.isPlaying}
            selectedOverlayId={state.selectedOverlayId}
            onDurationLoaded={(d) => dispatch({ type: "SET_DURATION", duration: d })}
            onPlayheadChange={(t) => dispatch({ type: "SET_PLAYHEAD", time: t })}
            onPlayingChange={(p) => dispatch({ type: "SET_PLAYING", playing: p })}
            onSelectOverlay={(id) => dispatch({ type: "SELECT_OVERLAY", id })}
            onUpdateOverlay={(id, updates) => dispatch({ type: "UPDATE_TEXT_OVERLAY", id, updates })}
          />

          <EditorTimeline
            duration={state.sourceVideoDuration}
            playheadTime={state.playheadTime}
            isPlaying={state.isPlaying}
            textOverlays={state.textOverlays}
            selectedOverlayId={state.selectedOverlayId}
            onPlayheadChange={(t) => dispatch({ type: "SET_PLAYHEAD", time: t })}
            onPlayingChange={(p) => dispatch({ type: "SET_PLAYING", playing: p })}
            onSelectOverlay={(id) => dispatch({ type: "SELECT_OVERLAY", id })}
            onUpdateOverlay={(id, updates) => dispatch({ type: "UPDATE_TEXT_OVERLAY", id, updates })}
          />
        </div>

        {/* Right: Properties panel + Demo section + Actions */}
        <div className="space-y-3">
          <VideoTextPropertiesPanel
            overlay={selectedOverlay}
            maxOverlays={state.textOverlays.length >= 3}
            videoDuration={state.sourceVideoDuration}
            onUpdate={(updates) => {
              if (state.selectedOverlayId) {
                dispatch({ type: "UPDATE_TEXT_OVERLAY", id: state.selectedOverlayId, updates });
              }
            }}
            onDelete={() => {
              if (state.selectedOverlayId) {
                dispatch({ type: "DELETE_TEXT_OVERLAY", id: state.selectedOverlayId });
              }
            }}
            onAdd={() => dispatch({ type: "ADD_TEXT_OVERLAY" })}
          />

          <DemoVideoSection
            demoVideoId={state.demoVideoId}
            demoVideoUrl={state.demoVideoUrl}
            demoThumbnailUrl={state.demoThumbnailUrl}
            demoDuration={state.demoDuration}
            onSelectDemo={(demo) => dispatch({ type: "SET_DEMO", demo })}
            onRemoveDemo={() => dispatch({ type: "SET_DEMO", demo: null })}
          />

          <EditorActions
            compositionId={state.compositionId}
            status={state.status}
            isDirty={state.isDirty}
            onRender={handleRender}
            onSave={saveToServer}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}

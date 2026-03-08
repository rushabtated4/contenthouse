"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { AlignLeft, AlignCenter, AlignRight, Trash2, Plus, Type } from "lucide-react";
import type { VideoTextOverlay } from "@/types/hook-editor";

interface VideoTextPropertiesPanelProps {
  overlay: VideoTextOverlay | null;
  maxOverlays: boolean;
  videoDuration: number;
  onUpdate: (updates: Partial<VideoTextOverlay>) => void;
  onDelete: () => void;
  onAdd: () => void;
}

export function VideoTextPropertiesPanel({
  overlay,
  maxOverlays,
  videoDuration,
  onUpdate,
  onDelete,
  onAdd,
}: VideoTextPropertiesPanelProps) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Type className="w-4 h-4" />
          Text Overlays
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          onClick={onAdd}
          disabled={maxOverlays}
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Text
        </Button>
      </div>

      {!overlay ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          {maxOverlays ? "Max 3 text overlays" : "Click a text overlay or add one to edit"}
        </p>
      ) : (
        <div className="space-y-3">
          {/* Text content */}
          <div className="space-y-1.5">
            <Label className="text-xs">Text</Label>
            <Textarea
              value={overlay.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              rows={2}
              className="text-sm"
            />
          </div>

          {/* Timing */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Start (s)</Label>
              <Input
                type="number"
                min={0}
                max={overlay.endTime - 0.1}
                step={0.1}
                value={overlay.startTime.toFixed(1)}
                onChange={(e) => onUpdate({ startTime: Math.max(0, parseFloat(e.target.value) || 0) })}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End (s)</Label>
              <Input
                type="number"
                min={overlay.startTime + 0.1}
                max={videoDuration || 999}
                step={0.1}
                value={overlay.endTime.toFixed(1)}
                onChange={(e) => onUpdate({ endTime: Math.min(videoDuration || 999, parseFloat(e.target.value) || 3) })}
                className="h-8"
              />
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-1.5">
            <Label className="text-xs">Font Size</Label>
            <Input
              type="number"
              min={12}
              max={200}
              value={overlay.fontSize}
              onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) || 48 })}
              className="h-8"
            />
          </div>

          {/* Font Weight */}
          <div className="space-y-1.5">
            <Label className="text-xs">Font Weight</Label>
            <Select
              value={String(overlay.fontWeight)}
              onValueChange={(v) => onUpdate({ fontWeight: parseInt(v) as VideoTextOverlay["fontWeight"] })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="400">Regular</SelectItem>
                <SelectItem value="500">Medium</SelectItem>
                <SelectItem value="600">SemiBold</SelectItem>
                <SelectItem value="700">Bold</SelectItem>
                <SelectItem value="800">ExtraBold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label className="text-xs">Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={overlay.color}
                onChange={(e) => onUpdate({ color: e.target.value })}
                className="w-8 h-8 rounded border cursor-pointer"
              />
              <Input
                value={overlay.color}
                onChange={(e) => onUpdate({ color: e.target.value })}
                className="h-8 flex-1"
              />
            </div>
          </div>

          {/* Alignment */}
          <div className="space-y-1.5">
            <Label className="text-xs">Alignment</Label>
            <ToggleGroup
              type="single"
              value={overlay.alignment}
              onValueChange={(v) => v && onUpdate({ alignment: v as "left" | "center" | "right" })}
              className="justify-start"
            >
              <ToggleGroupItem value="left" className="h-8 w-8 p-0">
                <AlignLeft className="w-3.5 h-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="center" className="h-8 w-8 p-0">
                <AlignCenter className="w-3.5 h-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="right" className="h-8 w-8 p-0">
                <AlignRight className="w-3.5 h-3.5" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Text Transform */}
          <div className="space-y-1.5">
            <Label className="text-xs">Transform</Label>
            <Select
              value={overlay.textTransform}
              onValueChange={(v) => onUpdate({ textTransform: v as "none" | "uppercase" | "lowercase" })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="uppercase">UPPERCASE</SelectItem>
                <SelectItem value="lowercase">lowercase</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Shadow */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Shadow</Label>
              <Switch
                checked={overlay.hasShadow}
                onCheckedChange={(v) => onUpdate({ hasShadow: v })}
              />
            </div>
            {overlay.hasShadow && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">Color</Label>
                  <input
                    type="color"
                    value={overlay.shadowColor}
                    onChange={(e) => onUpdate({ shadowColor: e.target.value })}
                    className="w-full h-6 rounded border cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Blur</Label>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={overlay.shadowBlur}
                    onChange={(e) => onUpdate({ shadowBlur: parseInt(e.target.value) || 0 })}
                    className="h-6 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Stroke */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Stroke</Label>
              <Switch
                checked={overlay.hasStroke}
                onCheckedChange={(v) => onUpdate({ hasStroke: v })}
              />
            </div>
            {overlay.hasStroke && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">Color</Label>
                  <input
                    type="color"
                    value={overlay.strokeColor}
                    onChange={(e) => onUpdate({ strokeColor: e.target.value })}
                    className="w-full h-6 rounded border cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Width</Label>
                  <Input
                    type="number"
                    min={0}
                    max={15}
                    value={overlay.strokeWidth}
                    onChange={(e) => onUpdate({ strokeWidth: parseInt(e.target.value) || 0 })}
                    className="h-6 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Background */}
          <div className="space-y-1.5">
            <Label className="text-xs">Background Opacity</Label>
            <Input
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={overlay.backgroundOpacity}
              onChange={(e) => onUpdate({ backgroundOpacity: parseFloat(e.target.value) || 0 })}
              className="h-8"
            />
            {overlay.backgroundOpacity > 0 && (
              <div className="flex gap-2">
                <input
                  type="color"
                  value={overlay.backgroundColor}
                  onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
                  className="w-8 h-8 rounded border cursor-pointer"
                />
                <Input
                  type="number"
                  min={0}
                  max={32}
                  value={overlay.backgroundCornerRadius}
                  onChange={(e) => onUpdate({ backgroundCornerRadius: parseInt(e.target.value) || 0 })}
                  className="h-8"
                  placeholder="Radius"
                />
              </div>
            )}
          </div>

          {/* Delete */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Delete Overlay
          </Button>
        </div>
      )}
    </div>
  );
}

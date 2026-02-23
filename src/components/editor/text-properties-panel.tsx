"use client";

import { useEditorStore } from "@/stores/editor-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AlignLeft, AlignCenter, AlignRight, Trash2, RefreshCw } from "lucide-react";
import type { TextBlock } from "@/types/editor";

export function TextPropertiesPanel() {
  const slides = useEditorStore((s) => s.slides);
  const activeSlideIndex = useEditorStore((s) => s.activeSlideIndex);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const updateTextBlock = useEditorStore((s) => s.updateTextBlock);
  const deleteTextBlock = useEditorStore((s) => s.deleteTextBlock);

  const activeSlide = slides[activeSlideIndex];
  const block = selectedIds.length === 1
    ? activeSlide?.textBlocks.find((b) => b.id === selectedIds[0])
    : null;

  if (!block) return null;

  const update = (updates: Partial<TextBlock>) => {
    updateTextBlock(activeSlideIndex, block.id, updates);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Text Properties</h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive h-7"
          onClick={() => deleteTextBlock(activeSlideIndex, block.id)}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" />
          Delete
        </Button>
      </div>

      {/* Use Paraphrased Text */}
      {block.paraphrasedText && block.paraphrasedText !== block.text && (
        <div className="space-y-1.5">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => update({ text: block.paraphrasedText })}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Use Paraphrased Text
          </Button>
          <p className="text-[10px] text-muted-foreground leading-tight truncate" title={block.paraphrasedText}>
            {block.paraphrasedText}
          </p>
        </div>
      )}

      {/* Font Size */}
      <div className="space-y-1.5">
        <Label className="text-xs">Font Size</Label>
        <Input
          type="number"
          min={12}
          max={200}
          value={block.fontSize}
          onChange={(e) => update({ fontSize: parseInt(e.target.value) || 48 })}
          className="h-8"
        />
      </div>

      {/* Font Weight */}
      <div className="space-y-1.5">
        <Label className="text-xs">Font Weight</Label>
        <Select
          value={String(block.fontWeight)}
          onValueChange={(v) => update({ fontWeight: parseInt(v) as TextBlock["fontWeight"] })}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="400">Regular (400)</SelectItem>
            <SelectItem value="500">Medium (500)</SelectItem>
            <SelectItem value="600">SemiBold (600)</SelectItem>
            <SelectItem value="700">Bold (700)</SelectItem>
            <SelectItem value="800">ExtraBold (800)</SelectItem>
          </SelectContent>
        </Select>
        {block.segments && block.segments.length > 1 && block.segments.some((s) => s.bold) && (
          <p className="text-[10px] text-muted-foreground">
            Bold segments use weight {block.fontWeight >= 700 ? 800 : 700}. Edit bold with **markers** via double-click.
          </p>
        )}
      </div>

      {/* Text Transform */}
      <div className="space-y-1.5">
        <Label className="text-xs">Text Transform</Label>
        <Select
          value={block.textTransform ?? "none"}
          onValueChange={(v) => update({ textTransform: v as TextBlock["textTransform"] })}
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

      {/* Color */}
      <div className="space-y-1.5">
        <Label className="text-xs">Color</Label>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={block.color}
            onChange={(e) => update({ color: e.target.value })}
            className="w-8 h-8 rounded cursor-pointer border border-border"
          />
          <Input
            value={block.color}
            onChange={(e) => update({ color: e.target.value })}
            className="h-8 flex-1 font-mono text-xs"
            maxLength={7}
          />
        </div>
      </div>

      {/* Line Height */}
      <div className="space-y-1.5">
        <Label className="text-xs">Line Height</Label>
        <div className="flex gap-2 items-center">
          <input
            type="range"
            min={8}
            max={30}
            value={Math.round((block.lineHeight ?? 1.2) * 10)}
            onChange={(e) => update({ lineHeight: parseInt(e.target.value) / 10 })}
            className="flex-1 h-2 accent-primary"
          />
          <span className="text-xs text-muted-foreground w-8 text-right">{(block.lineHeight ?? 1.2).toFixed(1)}</span>
        </div>
      </div>

      {/* Letter Spacing */}
      <div className="space-y-1.5">
        <Label className="text-xs">Letter Spacing</Label>
        <div className="flex gap-2 items-center">
          <input
            type="range"
            min={0}
            max={30}
            value={block.letterSpacing ?? 0}
            onChange={(e) => update({ letterSpacing: parseInt(e.target.value) })}
            className="flex-1 h-2 accent-primary"
          />
          <span className="text-xs text-muted-foreground w-8 text-right">{block.letterSpacing ?? 0}px</span>
        </div>
      </div>

      {/* Text Outline */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="hasStroke"
            checked={block.hasStroke}
            onChange={(e) => update({ hasStroke: e.target.checked })}
            className="rounded"
          />
          <Label htmlFor="hasStroke" className="text-xs">Text Outline</Label>
        </div>
        {block.hasStroke && (
          <div className="space-y-2 ml-5">
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={block.strokeColor}
                onChange={(e) => update({ strokeColor: e.target.value })}
                className="w-7 h-7 rounded cursor-pointer border border-border"
              />
              <Input
                value={block.strokeColor}
                onChange={(e) => update({ strokeColor: e.target.value })}
                className="h-7 flex-1 font-mono text-xs"
                maxLength={7}
              />
            </div>
            <div className="flex gap-2 items-center">
              <Label className="text-xs w-12 shrink-0">Width</Label>
              <input
                type="range"
                min={1}
                max={15}
                value={block.strokeWidth}
                onChange={(e) => update({ strokeWidth: parseInt(e.target.value) })}
                className="flex-1 h-2 accent-primary"
              />
              <span className="text-xs text-muted-foreground w-6 text-right">{block.strokeWidth}</span>
            </div>
          </div>
        )}
      </div>

      {/* Alignment */}
      <div className="space-y-1.5">
        <Label className="text-xs">Alignment</Label>
        <ToggleGroup
          type="single"
          value={block.alignment}
          onValueChange={(v) => v && update({ alignment: v as TextBlock["alignment"] })}
          className="justify-start"
        >
          <ToggleGroupItem value="left" size="sm"><AlignLeft className="w-4 h-4" /></ToggleGroupItem>
          <ToggleGroupItem value="center" size="sm"><AlignCenter className="w-4 h-4" /></ToggleGroupItem>
          <ToggleGroupItem value="right" size="sm"><AlignRight className="w-4 h-4" /></ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Background */}
      <div className="space-y-1.5">
        <Label className="text-xs">Background</Label>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={block.backgroundColor}
            onChange={(e) => update({ backgroundColor: e.target.value })}
            className="w-8 h-8 rounded cursor-pointer border border-border"
          />
          <Input
            value={block.backgroundColor}
            onChange={(e) => update({ backgroundColor: e.target.value })}
            className="h-8 flex-1 font-mono text-xs"
            maxLength={7}
          />
        </div>
        <div className="flex gap-2 items-center">
          <Label className="text-xs w-16 shrink-0">Opacity</Label>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(block.backgroundOpacity * 100)}
            onChange={(e) => update({ backgroundOpacity: parseInt(e.target.value) / 100 })}
            className="flex-1 h-2 accent-primary"
          />
          <span className="text-xs text-muted-foreground w-8 text-right">{Math.round(block.backgroundOpacity * 100)}%</span>
        </div>
        <div className="flex gap-2 items-center">
          <Label className="text-xs w-16 shrink-0">Padding</Label>
          <input
            type="range"
            min={0}
            max={60}
            value={block.backgroundPadding ?? 20}
            onChange={(e) => update({ backgroundPadding: parseInt(e.target.value) })}
            className="flex-1 h-2 accent-primary"
          />
          <span className="text-xs text-muted-foreground w-8 text-right">{block.backgroundPadding ?? 20}px</span>
        </div>
        <div className="flex gap-2 items-center">
          <Label className="text-xs w-16 shrink-0">Radius</Label>
          <input
            type="range"
            min={0}
            max={50}
            value={block.backgroundCornerRadius ?? 16}
            onChange={(e) => update({ backgroundCornerRadius: parseInt(e.target.value) })}
            className="flex-1 h-2 accent-primary"
          />
          <span className="text-xs text-muted-foreground w-8 text-right">{block.backgroundCornerRadius ?? 16}px</span>
        </div>
        {/* Background Border */}
        <div className="flex gap-2 items-center">
          <Label className="text-xs w-16 shrink-0">Border</Label>
          <input
            type="range"
            min={0}
            max={8}
            value={block.backgroundBorderWidth ?? 0}
            onChange={(e) => update({ backgroundBorderWidth: parseInt(e.target.value) })}
            className="flex-1 h-2 accent-primary"
          />
          <span className="text-xs text-muted-foreground w-8 text-right">{block.backgroundBorderWidth ?? 0}px</span>
        </div>
        {(block.backgroundBorderWidth ?? 0) > 0 && (
          <div className="flex gap-2 items-center ml-5">
            <input
              type="color"
              value={block.backgroundBorderColor ?? "#000000"}
              onChange={(e) => update({ backgroundBorderColor: e.target.value })}
              className="w-7 h-7 rounded cursor-pointer border border-border"
            />
            <Input
              value={block.backgroundBorderColor ?? "#000000"}
              onChange={(e) => update({ backgroundBorderColor: e.target.value })}
              className="h-7 flex-1 font-mono text-xs"
              maxLength={7}
            />
          </div>
        )}
      </div>

      {/* Shadow */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="hasShadow"
            checked={block.hasShadow}
            onChange={(e) => update({ hasShadow: e.target.checked })}
            className="rounded"
          />
          <Label htmlFor="hasShadow" className="text-xs">Text Shadow</Label>
        </div>
        {block.hasShadow && (
          <div className="space-y-2 ml-5">
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={block.shadowColor}
                onChange={(e) => update({ shadowColor: e.target.value })}
                className="w-7 h-7 rounded cursor-pointer border border-border"
              />
              <Input
                value={block.shadowColor}
                onChange={(e) => update({ shadowColor: e.target.value })}
                className="h-7 flex-1 font-mono text-xs"
                maxLength={7}
              />
            </div>
            <div className="flex gap-2 items-center">
              <Label className="text-xs w-12 shrink-0">Blur</Label>
              <input
                type="range"
                min={0}
                max={20}
                value={block.shadowBlur}
                onChange={(e) => update({ shadowBlur: parseInt(e.target.value) })}
                className="flex-1 h-2 accent-primary"
              />
              <span className="text-xs text-muted-foreground w-6 text-right">{block.shadowBlur}</span>
            </div>
            <div className="flex gap-2 items-center">
              <Label className="text-xs w-12 shrink-0">X</Label>
              <input
                type="range"
                min={-10}
                max={10}
                value={block.shadowOffsetX}
                onChange={(e) => update({ shadowOffsetX: parseInt(e.target.value) })}
                className="flex-1 h-2 accent-primary"
              />
              <span className="text-xs text-muted-foreground w-6 text-right">{block.shadowOffsetX}</span>
            </div>
            <div className="flex gap-2 items-center">
              <Label className="text-xs w-12 shrink-0">Y</Label>
              <input
                type="range"
                min={-10}
                max={10}
                value={block.shadowOffsetY}
                onChange={(e) => update({ shadowOffsetY: parseInt(e.target.value) })}
                className="flex-1 h-2 accent-primary"
              />
              <span className="text-xs text-muted-foreground w-6 text-right">{block.shadowOffsetY}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle, Clock } from "lucide-react";
import type { ScheduledEvent } from "@/hooks/use-scheduled-events";

interface FullCalendarWrapperProps {
  events: ScheduledEvent[];
  onEventDrop: (setId: string, newDate: string, channelId: string | null) => void;
  onEventReceive?: (setId: string, date: string, channelId: string | null) => void;
}

interface HoverState {
  thumbnail: string | null;
  title: string;
  channelLabel: string | null;
  start: string;
  postedAt: string | null;
  rect: DOMRect;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function FullCalendarWrapper({
  events,
  onEventDrop,
  onEventReceive,
}: FullCalendarWrapperProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState<HoverState | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEventDrop = (info: any) => {
    const setId = info.event.extendedProps.setId;
    const channelId = info.event.extendedProps.channelId ?? null;
    const newDate = info.event.start?.toISOString();
    if (setId && newDate) {
      onEventDrop(setId, newDate, channelId);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEventClick = (info: any) => {
    const videoId = info.event.extendedProps.videoId;
    if (videoId) {
      router.push(`/generate/${videoId}`);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEventReceive = (info: any) => {
    const setId = info.event.extendedProps.setId;
    const channelId = info.event.extendedProps.channelId ?? null;
    const date = info.event.start?.toISOString();
    if (setId && date && onEventReceive) {
      info.event.remove();
      onEventReceive(setId, date, channelId);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEventMouseEnter = (info: any) => {
    const rect = info.el.getBoundingClientRect();
    setHovered({
      thumbnail: info.event.extendedProps.thumbnail,
      title: info.event.title,
      channelLabel: info.event.extendedProps.channelLabel,
      start: info.event.startStr,
      postedAt: info.event.extendedProps.postedAt,
      rect,
    });
  };

  const handleEventMouseLeave = () => {
    setHovered(null);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderEventContent = (eventInfo: any) => {
    const isPosted = !!eventInfo.event.extendedProps.postedAt;
    return (
      <div className="flex items-center gap-1 overflow-hidden px-1">
        <span className="text-xs shrink-0">{isPosted ? "✓" : "⏰"}</span>
        <span className="text-xs truncate">{eventInfo.event.title}</span>
      </div>
    );
  };

  // Position popover below the event element, flipping up if too close to bottom
  const getPopoverStyle = (rect: DOMRect): React.CSSProperties => {
    const popoverWidth = 220;
    const popoverHeight = 260;
    const gap = 6;

    let top = rect.bottom + gap + window.scrollY;
    let left = rect.left + window.scrollX;

    // Flip up if not enough room below
    if (rect.bottom + popoverHeight + gap > window.innerHeight) {
      top = rect.top - popoverHeight - gap + window.scrollY;
    }

    // Keep within viewport horizontally
    if (left + popoverWidth > window.innerWidth) {
      left = window.innerWidth - popoverWidth - 8;
    }

    return { position: "absolute", top, left, width: popoverWidth, zIndex: 9999 };
  };

  return (
    <>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={events}
        editable={true}
        droppable={true}
        eventDrop={handleEventDrop}
        eventReceive={handleEventReceive}
        eventClick={handleEventClick}
        eventMouseEnter={handleEventMouseEnter}
        eventMouseLeave={handleEventMouseLeave}
        eventContent={renderEventContent}
        height="auto"
        eventDisplay="block"
        dayMaxEvents={3}
      />

      {hovered && (
        <div
          style={getPopoverStyle(hovered.rect)}
          className="rounded-lg border border-border bg-popover shadow-lg overflow-hidden pointer-events-none"
        >
          {/* Thumbnail */}
          {hovered.thumbnail ? (
            <img
              src={hovered.thumbnail}
              alt=""
              className="w-full aspect-[4/5] object-cover"
            />
          ) : (
            <div className="w-full aspect-[4/5] bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">No preview</span>
            </div>
          )}

          {/* Info */}
          <div className="p-2.5 space-y-1">
            <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug">
              {hovered.title}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {formatDate(hovered.start)}
            </p>
            {hovered.channelLabel && (
              <p className="text-[11px] text-muted-foreground">
                @{hovered.channelLabel}
              </p>
            )}
            <div className="flex items-center gap-1 pt-0.5">
              {hovered.postedAt ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600">
                  <CheckCircle className="w-3 h-3" />
                  Posted
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Scheduled
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

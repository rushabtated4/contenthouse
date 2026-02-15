"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useRouter } from "next/navigation";
import type { ScheduledEvent } from "@/hooks/use-scheduled-events";

interface FullCalendarWrapperProps {
  events: ScheduledEvent[];
  onEventDrop: (setId: string, newDate: string) => void;
  onEventReceive?: (setId: string, date: string) => void;
}

export default function FullCalendarWrapper({
  events,
  onEventDrop,
  onEventReceive,
}: FullCalendarWrapperProps) {
  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEventDrop = (info: any) => {
    const setId = info.event.extendedProps.setId;
    const newDate = info.event.start?.toISOString();
    if (setId && newDate) {
      onEventDrop(setId, newDate);
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
    const date = info.event.start?.toISOString();
    if (setId && date && onEventReceive) {
      info.event.remove(); // Remove temp event — real one comes from refetch
      onEventReceive(setId, date);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderEventContent = (eventInfo: any) => {
    const isPosted = !!eventInfo.event.extendedProps.postedAt;
    return (
      <div className="flex items-center gap-1 overflow-hidden px-1">
        <span className="text-xs shrink-0">{isPosted ? "\u2713" : "\u23F0"}</span>
        <span className="text-xs truncate">{eventInfo.event.title}</span>
      </div>
    );
  };

  return (
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
      eventContent={renderEventContent}
      height="auto"
      eventDisplay="block"
      dayMaxEvents={3}
    />
  );
}

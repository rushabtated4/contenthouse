# Component Reference

> **Auto-update rule:** When any component is added, removed, or has its props/state changed, update this file. See `CLAUDE.md` for details.

## Component Tree

```
RootLayout (src/app/layout.tsx)
├── TooltipProvider
├── /login → LoginPage (login/page.tsx)  [password gate]
├── (app)/layout.tsx → AppShell (layout/app-shell.tsx)  [persists across pages]
│   ├── SidebarProvider
│   │   ├── AppSidebar (layout/app-sidebar.tsx)
│   │   │   └── 6 nav items: Dashboard, Sources, Generate, Generated, Calendar, Accounts
│   │   └── SidebarInset
│   │       ├── Header (SidebarTrigger + breadcrumb)
│   │       └── {children} ← page content
├── Toaster (sonner)
│
├── /dashboard → Dashboard (dashboard/dashboard.tsx)
│   ├── StatCard[] x8 (dashboard/stat-card.tsx)
│   ├── RecentActivity (dashboard/recent-activity.tsx)
│   └── QuickActions (dashboard/quick-actions.tsx)
│
├── /videos → VideoGrid (carousel/video-grid.tsx)
│   ├── LoadingSkeleton (shared/loading-skeleton.tsx)
│   ├── EmptyState (shared/empty-state.tsx)
│   └── VideoCard[] (carousel/video-card.tsx)
│       ├── ImageThumbnail (shared/image-thumbnail.tsx)
│       └── EngagementStats (shared/engagement-stats.tsx)
│
├── /generate → GeneratePage (generate/page.tsx)
│   ├── UrlInput (generate/url-input.tsx)
│   ├── ManualUpload (generate/manual-upload.tsx)  [UI only, no backend]
│   ├── VideoMetaBar (generate/video-meta-bar.tsx)
│   │   └── EngagementStats
│   ├── SlideFilmstrip (generate/slide-filmstrip.tsx)
│   │   └── SlideGrid → SlideCard[]
│   ├── GlobalControls (generate/global-controls.tsx)
│   ├── GenerationProgress (generate/generation-progress.tsx)
│   └── ResultsSection (generate/results-section.tsx)
│       ├── ComparisonCard[] (original ← → generated side-by-side per slide)
│       └── SetContent (status badge, Download ZIP, ScheduleControls)
│
├── /generate/[id] → GenerateDetailPage (generate/[id]/page.tsx)
│   ├── VideoMetaBar
│   ├── SlideFilmstrip (with SlideGrid)
│   ├── GlobalControls
│   ├── GenerationProgress
│   └── ResultsSection (with ScheduleControls per set)
│
├── /generated → GeneratedGrid (generated/generated-grid.tsx)
│   ├── Status filter tabs + sort dropdown
│   ├── GeneratedSetCard[] (generated/generated-set-card.tsx)
│   └── Pagination controls
│
├── /calendar → CalendarView (calendar/calendar-view.tsx)
│   ├── Filter tabs: All | Upcoming | Posted
│   ├── Unscheduled (N) toggle button
│   ├── Upload Post button → UploadPostDialog
│   ├── View toggle: Calendar | List
│   ├── Flex layout: calendar/list + UnscheduledPanel
│   ├── FullCalendarWrapper (calendar/fullcalendar-wrapper.tsx)  [dynamic, ssr:false]
│   ├── ScheduleList (calendar/schedule-list.tsx)  [list view with download + mark-as-done]
│   ├── UnscheduledPanel (calendar/unscheduled-panel.tsx)  [right sidebar, draggable items]
│   └── UploadPostDialog (calendar/upload-post-dialog.tsx)  [drag-drop upload]
│
└── /accounts → AccountList (accounts/account-list.tsx)
    ├── Loading skeleton
    ├── Empty state
    └── Project sections (color dot, name, account count)
        └── Account cards (user icon, @username, nickname, added date)
```

---

## Auth Components

### LoginPage
**File:** `src/app/login/page.tsx`
**Props:** none (page component)
**State:** `password`, `error`, `loading`
Client component with password input form. Uses Card, Input, Button from shadcn/ui. Lock icon header. Brown/beige color scheme matching app theme. On success, redirects to `/dashboard`. Calls `POST /api/auth/login`.

---

## Layout Components

### AppShell
**File:** `src/components/layout/app-shell.tsx`
**Props:** `{ children: React.ReactNode }`
Wraps content in `SidebarProvider` + `AppSidebar` + `SidebarInset`. Thin header with `SidebarTrigger` + breadcrumb navigation (auto-detected from pathname). Max-width content container. Lives in `(app)/layout.tsx` so it persists across page navigations (sidebar doesn't remount).

### AppSidebar
**File:** `src/components/layout/app-sidebar.tsx`
**Props:** none
Grouped nav sections: Content (Dashboard, Sources, Generate, Generated) + Schedule (Calendar, Accounts). No footer. Icons: `Gauge`, `GalleryHorizontalEnd`, `Wand2`, `FolderCheck`, `CalendarDays`, `Users`. Compact sizing (12.5rem width, 7px logo, text-sm title). Active state via `usePathname()`. Collapsible to icon-only mode. Auto-drawer on mobile.

### StatsBar (legacy)
**File:** `src/components/layout/stats-bar.tsx`
**Props:** none
**State:** Fetches `/api/stats` on mount.
Displays: total videos, total sets, total images, estimated cost. No longer in header; kept for reference.

---

## Carousel Components

### VideoGrid
**File:** `src/components/carousel/video-grid.tsx`
**Props:** none
**Hook:** `useVideos({ limit })`
**State:** Accumulates videos via load-more pattern (limit = 24 per batch). Shows loading skeleton, empty state, or grid with total count header and "Load more (N of T)" button.

### VideoCard
**File:** `src/components/carousel/video-card.tsx`
**Props:** `{ video: Video }`
Card with thumbnail, description (line-clamp-2), engagement stats, generation count badge. Links to `/generate/{id}`. Hover shows "Regenerate" button.

---

## Generate Components

### UrlInput
**File:** `src/components/generate/url-input.tsx`
**Props:** `{ onFetch: (url: string) => void, loading: boolean }`
Text input + fetch button. Disabled while loading.

### ManualUpload
**File:** `src/components/generate/manual-upload.tsx`
**Props:** `{ onUpload: (files: File[]) => void }`
Drag-and-drop zone. **Note:** Backend not implemented — UI placeholder only.

### VideoMetaBar
**File:** `src/components/generate/video-meta-bar.tsx`
**Props:** `{ video: Video }`
Description, posted date, engagement stats row, hashtag badges.

### SlideFilmstrip
**File:** `src/components/generate/slide-filmstrip.tsx`
**Props:** `{ images: string[], selectedSlides: Set<number>, perSlidePrompts, perSlideOverlays, onToggleSlide, onPromptChange, onOverlayUpload }`
Heading with slide count, renders SlideGrid directly (no filmstrip thumbnails, no collapsible).

### SlideGrid
**File:** `src/components/generate/slide-grid.tsx`
**Props:** `{ images: string[], selectedSlides: Set<number>, perSlidePrompts, perSlideOverlays, onToggleSlide, onPromptChange, onOverlayUpload }`
Responsive grid of SlideCards (`grid-cols-3 sm:4 md:5 lg:6`). Used inside SlideFilmstrip.

### SlideCard
**File:** `src/components/generate/slide-card.tsx`
**Props:** `{ imageUrl: string, index: number, selected: boolean, onToggle, prompt?, onPromptChange, overlay?, onOverlayChange }`
Image thumbnail with selection checkbox, slide number badge. When selected: expandable custom prompt textarea and overlay upload.

### GlobalControls
**File:** `src/components/generate/global-controls.tsx`
**Props:** `{ firstSlidePrompt, otherSlidesPrompt, qualityInput, qualityOutput, outputFormat, numSets, onGenerate, isGenerating, hasSelectedSlides, ...setters }`
Two prompt textareas, quality/format dropdowns, num sets input, generate button.

### GenerationProgress
**File:** `src/components/generate/generation-progress.tsx`
**Props:** `{ batchId: string | null }`
**Hook:** `useGenerationProgress(batchId)`
Overall progress bar, per-set progress bars with status badges, failed image list.

### ResultsSection
**File:** `src/components/generate/results-section.tsx`
**Props:** `{ sets: GenerationSetWithImages[], originalImages: string[], onRetryImage: (imageId: string) => void }`
Per-slide comparison grid with set tabs when 2+ sets. Each slide shows a side-by-side card with faded original on the left and generated image on the right (ComparisonCard). Grid layout: 3 cards per row on desktop, 2 on tablet, 1 on mobile. Actions card per set: status badge, Download ZIP button, ScheduleControls. Empty state with dashed border when no sets.

### OutputDisplay (legacy)
**File:** `src/components/generate/output-display.tsx`
**Props:** `{ sets: GenerationSetWithImages[], onRetry: (imageId: string) => void }`
Per-set cards with status badge, download ZIP button, scrollable slide thumbnails, retry buttons for failed images. **Superseded by GeneratedColumn** on generate pages but kept for other uses.

### ScheduleControls
**File:** `src/components/generate/schedule-controls.tsx`
**Props:** `{ setId: string, initialChannelId?, initialScheduledAt?, initialPostedAt? }`
**Hook:** `useProjects()`
Channel dropdown (grouped by project), datetime picker, save button. "Mark as Posted" / "Undo" toggle button. Green "Posted" badge when posted. Calls `POST /api/schedule` and `PATCH /api/schedule`.

---

## Calendar Components

### CalendarView
**File:** `src/components/calendar/calendar-view.tsx`
**Props:** none
**Hooks:** `useScheduledEvents(channelFilter, statusFilter)`, `useProjects()`, `useUnscheduledSets()`
**State:** `channelFilter`, `statusFilter`, `viewMode`, `uploadOpen`, `panelCollapsed`
Title, filter tabs (All/Upcoming/Posted), "Unscheduled (N)" toggle button, "Upload Post" button (opens UploadPostDialog), calendar/list view toggle, channel filter dropdown. Flex layout with calendar/list on left and UnscheduledPanel on right. Calendar mode renders FullCalendarWrapper; list mode renders ScheduleList. Handles event drop (PUT /api/schedule), external event receive (POST /api/schedule), and panel scheduling. Upload success refetches both scheduled events and unscheduled sets.

### FullCalendarWrapper
**File:** `src/components/calendar/fullcalendar-wrapper.tsx`
**Props:** `{ events: ScheduledEvent[], onEventDrop: (setId, newDate) => void, onEventReceive?: (setId, date) => void }`
**Import:** Dynamic (`next/dynamic`, `ssr: false`)
FullCalendar with dayGrid, timeGrid, interaction plugins. Custom `eventContent` with checkmark (posted) or clock (scheduled) icon. Posted events have green background. Month/week/day views. Draggable events. Max 3 events/day. Supports external event drops via `eventReceive` handler (removes temp event, delegates to `onEventReceive`).

### UnscheduledPanel
**File:** `src/components/calendar/unscheduled-panel.tsx`
**Props:** `{ sets: GenerationSetWithVideo[], loading: boolean, accounts: ProjectAccount[], collapsed: boolean, onToggleCollapse: () => void, onSchedule: (setId, scheduledAt, channelId?) => Promise<void> }`
Right sidebar (~280px) showing unscheduled completed/partial generation sets. Each item shows drag handle, thumbnail, title/description, slide count, and schedule popover button. Items are draggable via FullCalendar `Draggable` integration — drag onto calendar to schedule. Schedule popover has datetime-local input and channel select. Collapsed state shows thin strip with rotated label and expand button. Uses `ScrollArea` for scrollable list.

### ScheduleList
**File:** `src/components/calendar/schedule-list.tsx`
**Props:** `{ events: ScheduledEvent[], onRefetch: () => void }`
**State:** `loadingIds: Set<string>`, `downloadingIds: Set<string>`
List view of scheduled items sorted by date. Each row: thumbnail, description, scheduled date, Download ZIP button (with tooltip), status badge (Posted/Scheduled), "Done"/"Undo" toggle button. Download fetches `GET /api/images/{setId}/download` and triggers browser download. Calls `PATCH /api/schedule`.

### UploadPostDialog
**File:** `src/components/calendar/upload-post-dialog.tsx`
**Props:** `{ open: boolean, onOpenChange: (open: boolean) => void, onSuccess: () => void }`
**Hook:** `useProjectAccounts()`
**State:** `files: File[]`, `previews: string[]`, `title: string`, `channelId: string`, `scheduledAt: string`, `uploading: boolean`, `isDragging: boolean`
Dialog for uploading images directly to schedule a post without TikTok fetch + AI generation. Drag-and-drop zone with browse button, horizontal scrollable preview thumbnails with remove buttons, optional title input, channel select dropdown, datetime-local schedule picker. Submits via `POST /api/upload-post` with FormData. Resets state on close.

---

## Shared Components

### ImageThumbnail
**File:** `src/components/shared/image-thumbnail.tsx`
**Props:** `{ src: string, alt: string, className? }`
Next.js Image, unoptimized, aspect-ratio 4/5, object-cover.

### EngagementStats
**File:** `src/components/shared/engagement-stats.tsx`
**Props:** `{ views?, likes?, comments?, shares?, compact? }`
Icon + formatted count for each stat. Compact mode for smaller display.

### EmptyState
**File:** `src/components/shared/empty-state.tsx`
**Props:** `{ title: string, description: string, actionLabel?, actionHref? }`

### ErrorState
**File:** `src/components/shared/error-state.tsx`
**Props:** `{ message: string, onRetry? }`

### LoadingSkeleton
**File:** `src/components/shared/loading-skeleton.tsx`
Exports: `VideoGridSkeleton`, `GeneratePageSkeleton`

---

## Dashboard Components

### Dashboard
**File:** `src/components/dashboard/dashboard.tsx`
**Hook:** `useDashboardStats()`
4 stat cards (Generation Sets, Images Generated, Completed, Posted), full-width recent activity table. Loading skeleton state.

### StatCard
**File:** `src/components/dashboard/stat-card.tsx`
**Props:** `{ title: string, value: string | number, icon: LucideIcon, tint?: string }`
Stat card with icon + label row, large value. Optional `tint` background color for emphasis (e.g. warm, green, red tints).

### RecentActivity
**File:** `src/components/dashboard/recent-activity.tsx`
**Props:** `{ sets: RecentSet[] }`
Table of up to 10 recent generation sets. Columns: Description (with thumbnail), Slides, Status badge, Schedule status, Created time. Links to `/generate/[id]`.

### QuickActions
**File:** `src/components/dashboard/quick-actions.tsx`
**Props:** none
Quick Actions card with 3 nav buttons (Generate, Calendar, Generated). Not currently used in dashboard layout but available as a standalone component.

---

## Account Components

### AccountList
**File:** `src/components/accounts/account-list.tsx`
**Props:** none
**Hook:** `useProjects()`
Read-only list of project accounts grouped by project. Each project section has a color dot heading with account count. Account cards show user icon, @username, nickname, and added date. Loading skeleton and empty state.

---

## Generated Components

### GeneratedGrid
**File:** `src/components/generated/generated-grid.tsx`
**Hook:** `useGeneratedSets({ status, sort, page, limit })`
Table/grid view toggle (defaults to table), status filter tabs (All/Completed/Partial/Failed/Queued), sort dropdown, pagination controls. Table view shows rows with thumbnail, description, slides, status, schedule, date.

### GeneratedSetCard
**File:** `src/components/generated/generated-set-card.tsx`
**Props:** `{ set: GenerationSetWithVideo }`
Card with first completed image thumbnail, source video description, status badge, slide count, schedule/posted badge, relative date. Click navigates to `/generate/[videoId]`.

---

## shadcn/ui Components

Located in `src/components/ui/`. Standard shadcn primitives:

`badge`, `button`, `card`, `calendar`, `dialog`, `dropdown-menu`, `input`, `popover`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `tabs`, `textarea`, `tooltip`

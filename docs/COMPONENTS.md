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
│   ├── AppTabs (carousel/app-tabs.tsx)
│   ├── VideoFilterBar (carousel/video-filter-bar.tsx)
│   ├── LoadingSkeleton (shared/loading-skeleton.tsx)
│   ├── EmptyState (shared/empty-state.tsx)
│   └── VideoCard[] (carousel/video-card.tsx)
│       ├── ImageThumbnail (shared/image-thumbnail.tsx)
│       └── EngagementStats (shared/engagement-stats.tsx)
│
├── /generate → GeneratePage (generate/page.tsx)  [Tabs: Quick Generate | Editor Mode]
│   ├── [Quick Generate tab]
│   │   ├── UrlInput (generate/url-input.tsx)
│   │   ├── ManualUpload (generate/manual-upload.tsx)  [UI only, no backend]
│   │   ├── VideoMetaBar (generate/video-meta-bar.tsx)
│   │   │   └── EngagementStats
│   │   ├── SlideFilmstrip (generate/slide-filmstrip.tsx)
│   │   │   └── SlideGrid → SlideCard[]
│   │   ├── GlobalControls (generate/global-controls.tsx)
│   │   ├── GenerationProgress (generate/generation-progress.tsx)
│   │   └── ResultsSection (generate/results-section.tsx)
│   │       ├── ComparisonCard[] (original ← → generated side-by-side per slide)
│   │       └── SetContent (status badge, Download ZIP, ScheduleControls)
│   └── [Editor Mode tab]
│       └── CarouselEditor (editor/carousel-editor.tsx)
│           ├── Reference slides strip (original thumbnails + per-slide actions)
│           │   └── ReferenceSlide[] (extract text, use original as background, generate background w/ editable prompt)
│           ├── EditorFilmstrip (editor/editor-filmstrip.tsx)
│           ├── EditorToolbar (editor/editor-toolbar.tsx) [+undo/redo, group/ungroup]
│           ├── EditorCanvas (editor/editor-canvas.tsx) [z-order rendering, multi-select, shortcuts]
│           ├── ClearSlidesDialog (editor/clear-slides-dialog.tsx) [clear text/bg/overlays from all slides]
│           │   ├── CanvasBackground (editor/canvas-background.tsx)
│           │   ├── CanvasTextBlock[] (editor/canvas-text-block.tsx) [+Transformer width resize]
│           │   └── CanvasOverlayImage[] (editor/canvas-overlay-image.tsx) [NEW]
│           ├── TextPropertiesPanel (editor/text-properties-panel.tsx)
│           ├── ZOrderControls (editor/z-order-controls.tsx) [NEW]
│           ├── OverlayControls (editor/overlay-controls.tsx) [NEW]
│           │   └── OverlayLibraryDialog (editor/overlay-library-dialog.tsx) [NEW]
│           ├── BackgroundControls (editor/background-controls.tsx)
│           ├── BackgroundLibraryDialog (editor/background-library-dialog.tsx) [two-level: folders → contents]
│           │   ├── FolderGridView (editor/folder-grid-view.tsx)
│           │   └── FolderContentsView (editor/folder-contents-view.tsx)
│           │       └── BackgroundUploadZone (editor/background-upload-zone.tsx)
│           └── ExtractTextModal (editor/extract-text-modal.tsx)
│
├── /generate/[id] → GenerateDetailPage (generate/[id]/page.tsx)  [Tabs: Quick Generate | Editor Mode]
│   ├── [Quick Generate tab]
│   │   ├── VideoMetaBar
│   │   ├── SlideFilmstrip (with SlideGrid)
│   │   ├── GlobalControls
│   │   ├── GenerationProgress
│   │   └── ResultsSection (with ScheduleControls per set)
│   └── [Editor Mode tab]
│       └── CarouselEditor (same as above)
│
├── /generated → GeneratedGrid (generated/generated-grid.tsx)
│   ├── Status filter tabs + sort dropdown
│   ├── GeneratedSetCard[] (generated/generated-set-card.tsx)
│   ├── AssignChannelModal (generated/assign-channel-modal.tsx)
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
├── /hooks → HookLibraryPage (hooks/page.tsx)
│   ├── HookLibraryGrid (hooks/hook-library-grid.tsx)
│   │   └── HookVideoCard[] (hooks/hook-video-card.tsx)
│   └── NewHookButton → /hooks/new
│
├── /hooks/new → HookWizardPage (hooks/new/page.tsx)
│   └── HookWizard (hooks/hook-wizard.tsx)  [7-step wizard]
│       ├── Step 1: HookSourceStep (hooks/steps/hook-source-step.tsx)
│       │   ├── HookTikTokInput (hooks/hook-tiktok-input.tsx)
│       │   └── HookUploadInput (hooks/hook-upload-input.tsx)
│       ├── Step 2: HookSnapshotStep (hooks/steps/hook-snapshot-step.tsx)
│       │   └── HookVideoScrubber (hooks/hook-video-scrubber.tsx)
│       ├── Step 3: HookImagePromptStep (hooks/steps/hook-image-prompt-step.tsx)
│       ├── Step 4: HookGeneratingImagesStep (hooks/steps/hook-generating-images-step.tsx)
│       │   └── HookImageGrid (hooks/hook-image-grid.tsx)
│       ├── Step 5: HookSelectImagesStep (hooks/steps/hook-select-images-step.tsx)
│       │   └── HookImageGrid (selectable mode)
│       ├── Step 6: HookVideoPromptStep (hooks/steps/hook-video-prompt-step.tsx)
│       ├── Step 7: HookGeneratingVideosStep (hooks/steps/hook-generating-videos-step.tsx)
│       │   └── HookVideoGrid (hooks/hook-video-grid.tsx)
│       └── HookWizardNav (hooks/hook-wizard-nav.tsx)  [Back/Next/Finish buttons]
│
├── /hooks/[id] → HookSessionPage (hooks/[id]/page.tsx)
│   └── HookSessionDetail (hooks/hook-session-detail.tsx)
│       ├── HookImageGrid
│       └── HookVideoGrid
│
└── /accounts → AccountList (accounts/account-list.tsx)
    ├── Loading skeleton
    ├── Empty state
    └── AccountScheduleCard[] (accounts/account-schedule-card.tsx)
        ├── ScheduleConfigEditor (accounts/schedule-config-editor.tsx)
        └── AssignSetModal (accounts/assign-set-modal.tsx)
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
**State:** Accumulates videos via load-more pattern (limit = 24 per batch). Filter state (search, minViews, accountId, dateRange, sort, maxGenCount, appId) is synced to URL search params so filters persist across navigation (back button). Shows loading skeleton, empty state, or grid with total count header and "Load more (N of T)" button.

### VideoCard
**File:** `src/components/carousel/video-card.tsx`
**Props:** `{ video: Video }`
Card with thumbnail, description (line-clamp-2), engagement stats, generation count badge. Links to `/generate/{id}`. Hover shows "Regenerate" button.

### AppTabs
**File:** `src/components/carousel/app-tabs.tsx`
**Props:** `{ apps: AppWithAccounts[], selectedAppId: string | null, onSelect: (appId: string | null) => void, loading?: boolean }`
Horizontal scrollable pill tabs for filtering by app. "All Apps" tab + one tab per app with color dot and account count. Loading state shows skeleton pills.

### VideoFilterBar
**File:** `src/components/carousel/video-filter-bar.tsx`
**Props:** `{ search, onSearchChange, minViews, onMinViewsChange, accountId, onAccountIdChange, dateRange, onDateRangeChange, sort, onSortChange, maxGenCount, onMaxGenCountChange, accounts: Account[], loaded: number, total: number, hasActiveFilters?: boolean, onResetFilters?: () => void }`
Row of filter controls: debounced search input, min views dropdown, account dropdown, date range dropdown, sort dropdown, generation count dropdown. Shows "N of T videos" count. Shows a "Reset" button when any filter differs from defaults.

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
**Props:** `{ sets: GenerationSetWithImages[], originalImages: string[], onRetryImage: (imageId: string) => void, retryingId: string | null, onEditInEditor?: (setId: string) => void, onRefetch?: () => void }`
Per-slide comparison grid with set tabs when 2+ sets. Each slide shows a side-by-side card with faded original on the left and generated image on the right (ComparisonCard). Grid layout: 3 cards per row on desktop, 2 on tablet, 1 on mobile. Actions card per set: ReviewStatusBadge, ScheduleControls, Download ZIP button, "Edit in Editor" button (shown when set has completed images). Empty state with dashed border when no sets.

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

## Editor Components

### CarouselEditor
**File:** `src/components/editor/carousel-editor.tsx`
**Props:** `{ video: Video & { generation_sets?: GenerationSetWithImages[] }, editorSetId?: string | null }`
**Store:** `useEditorStore` (Zustand)
Top-level editor component. When `editorSetId` is provided, initializes from that generation set's completed images (via `initFromGeneratedSet`); otherwise initializes with blank working slides. Stores originals as read-only references. Shows a reference slides strip (non-editable thumbnails) above the working filmstrip. Right sidebar shows: TextPropertiesPanel (when single text block selected), ZOrderControls (when any element selected), OverlayControls, BackgroundControls.

### EditorFilmstrip
**File:** `src/components/editor/editor-filmstrip.tsx`
**Props:** none (reads from Zustand store)
Horizontal strip of slide thumbnails. Click to select active slide. Shows background overlay indicator.

### EditorToolbar
**File:** `src/components/editor/editor-toolbar.tsx`
**Props:** none (reads from Zustand store)
Action buttons: Undo/Redo (disabled when history/future empty), Extract Text, Generate All Backgrounds, Group/Ungroup (shown when 2+ elements selected), Save, output format dropdown, Download ZIP. Save button uses `variant="default"` when dirty, `variant="outline"` when clean.

### EditorCanvas
**File:** `src/components/editor/editor-canvas.tsx`
**Props:** none (reads from Zustand store)
Konva `Stage` + `Layer` rendering the active slide. Contains `CanvasBackground`, text blocks and overlay images sorted by zIndex, and snap guide `Line` elements. Canvas height is dynamic based on `aspectRatio` store state. Multi-select via shift-click. Keyboard shortcuts: Cmd+Z (undo), Cmd+Shift+Z (redo), Cmd+G (group), Cmd+Shift+G (ungroup), Delete/Backspace (delete selected), Escape (deselect).

### CanvasTextBlock
**File:** `src/components/editor/canvas-text-block.tsx`
**Props:** `{ block: TextBlock, slideIndex: number, isSelected: boolean, onSelect: (additive: boolean) => void, canvasHeight: number, onSnapLines: (lines) => void }`
Draggable Konva `Group` with mixed-bold support and horizontal width resize via `Transformer` (middle-left/middle-right anchors, min 50px). Shift-click for additive multi-select. When `block.segments` has multiple entries, renders via `<Shape>` with custom `sceneFunc`. Double-click opens inline textarea with `**bold**` markdown markers. Drag to reposition with auto-snap.

### CanvasBackground
**File:** `src/components/editor/canvas-background.tsx`
**Props:** `{ url: string, backgroundColor: string | null, backgroundTintColor: string | null, backgroundTintOpacity: number, canvasHeight: number }`
Konva `Image` node filling the full canvas. Loads image asynchronously. Uses dynamic `canvasHeight` prop. When `backgroundTintColor` is set and `backgroundTintOpacity > 0`, renders a semi-transparent color `Rect` overlay on top of the background image (useful for darkening/lightening images for text readability).

### CanvasOverlayImage
**File:** `src/components/editor/canvas-overlay-image.tsx`
**Props:** `{ overlay: OverlayImage, slideIndex: number, isSelected: boolean, onSelect: (additive: boolean) => void, canvasHeight: number, onSnapLines: (lines) => void }`
Draggable Konva overlay image with all-anchor resize and rotation via `Transformer`. Loads image with crossOrigin. Shift-click for multi-select. Converts position/size to/from percentage coordinates. Snap guides on drag.

### OverlayControls
**File:** `src/components/editor/overlay-controls.tsx`
**Props:** none (reads from Zustand store)
Sidebar panel for overlay image management. Upload button (POST /api/overlays), Library button (opens OverlayLibraryDialog). When a single overlay is selected, shows width/height numeric inputs (% of canvas), corner radius slider (0-100px), opacity slider, and delete button.

### OverlayLibraryDialog
**File:** `src/components/editor/overlay-library-dialog.tsx`
**Props:** `{ open: boolean, onOpenChange: (open: boolean) => void, slideIndex: number }`
Dialog listing overlay images from `GET /api/overlays`. Grid of thumbnails; click to add overlay to current slide via `addOverlayImage`.

### ZOrderControls
**File:** `src/components/editor/z-order-controls.tsx`
**Props:** none (reads from Zustand store)
Sidebar panel with 4 buttons: Bring to Front, Move Forward, Move Backward, Send to Back. Shown only when `selectedIds.length > 0`. Calls store z-order actions.

### TextPropertiesPanel
**File:** `src/components/editor/text-properties-panel.tsx`
**Props:** none (reads from Zustand store)
Side panel for editing selected text block properties: text content, font size, font weight (400/500/700/800), color picker, Text Transform (select: none/uppercase/lowercase), Line Height (range slider 0.8-3.0), Letter Spacing (range slider 0-30px), Word Spacing (range slider 0-30px), text outline toggle with color picker and width slider (1-10px), text alignment (left/center/right), background color picker with opacity slider (0-100%), Background Padding (range slider 0-60px), Background Corner Radius (range slider 0-50px), Background Border Width (range slider 0-8px) + border color picker, shadow toggle with color picker, blur slider (0-20), and X/Y offset sliders (-10 to 10). B/W background quick toggle buttons (black and white presets). Add/delete text block buttons. "Use Paraphrased Text" button swaps block text with AI-paraphrased version (shown only when `paraphrasedText` exists and differs from current text).

### BackgroundControls
**File:** `src/components/editor/background-controls.tsx`
**Props:** none (reads from Zustand store)
Background prompt textarea, "Regenerate" button (single slide), "Upload" button, "Library" button (opens BackgroundLibraryDialog). Calls `/api/editor/generate-background`. Includes an "Image Tint" section (shown only when slide has a background image, not solid color) with color picker, B/W quick-set buttons, clear button, and opacity slider (0-100%).

### BackgroundLibraryDialog
**File:** `src/components/editor/background-library-dialog.tsx`
**Props:** `{ open: boolean, onOpenChange: (open: boolean) => void }`
**Hooks:** `useBackgroundFolders()`, `useBackgrounds(folderId?)`
Two-level dialog (`max-w-4xl`). Top level shows `FolderGridView` (folder cards + unfiled images). Clicking a folder navigates to `FolderContentsView` showing that folder's contents with back navigation, auto-apply, and upload zone. Click any background to apply to active slide. Delete button per item.

### FolderGridView
**File:** `src/components/editor/folder-grid-view.tsx`
**Props:** none (internal to BackgroundLibraryDialog)
**Hooks:** `useBackgroundFolders()`, `useBackgrounds("unfiled")`
Grid of folder cards showing cover image and image count, plus unfiled background images. Supports creating new folders and renaming/deleting existing ones.

### FolderContentsView
**File:** `src/components/editor/folder-contents-view.tsx`
**Props:** `{ folderId: string, folderName: string, onBack: () => void }`
**Hook:** `useBackgrounds(folderId)`
Shows all backgrounds in a specific folder. Includes `BackgroundUploadZone` for drag-drop multi-upload. Auto-apply button randomly applies folder backgrounds to slides 1+ via `autoApplyBackgrounds` store action.

### BackgroundUploadZone
**File:** `src/components/editor/background-upload-zone.tsx`
**Props:** `{ folderId?: string, onUploaded: () => void }`
Drag-and-drop multi-file upload zone. Uploads via `POST /api/backgrounds/upload-batch`. Shows upload progress.

### ClearSlidesDialog
**File:** `src/components/editor/clear-slides-dialog.tsx`
**Props:** none (reads from Zustand store)
**Store fields:** `clearSlides`
Dialog with multi-select checkboxes (Text Blocks, Backgrounds, Overlays). Clears selected element types from all slides at once. Rendered below the canvas in the left column.

### ExtractTextModal
**File:** `src/components/editor/extract-text-modal.tsx`
**Props:** none (reads from Zustand store)
**Store fields:** `extractTextModalOpen`, `extractedResults`, `originalSlides`, `extractionStatus`
Modal dialog for reviewing/editing GPT-5.2 extracted text before applying to canvas. Side-by-side layout: original slide thumbnail on left, editable text blocks on right. Text input uses a monospace textarea showing `**bold**` markdown markers when segments with mixed bold exist. Editing with `**markers**` is parsed back into segments. Each block shows original text and paraphrased rewrite with a swap button. Info row displays textTransform, lineHeight, letterSpacing, stroke properties, and a "Mixed bold" amber badge when segments have mixed bold. "Add to canvas" applies all text blocks to working slides; "Cancel" discards. Opens automatically after `extractText()` completes.

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

### ReviewStatusBadge
**File:** `src/components/shared/review-status-badge.tsx`
**Props:** `{ setId: string, reviewStatus: "unverified" | "ready_to_post", onToggled?: () => void }`
Clickable badge that toggles review status between `unverified` and `ready_to_post` via `PATCH /api/generation-sets`. Green styling for ready, muted for unverified. Shows CheckCircle2/Circle icons.

### PromptTextarea
**File:** `src/components/shared/prompt-textarea.tsx`
**Props:** `{ value: string, onChange: (v: string) => void, placeholder?: string, className?: string }`
**Hook:** `usePromptHistory()`
Textarea with saved prompt history dropdown. On focus, shows filtered history as portal dropdown (positioned via getBoundingClientRect). Click to apply saved prompt, X to delete. Auto-saves on blur if prompt length >= 8.

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
Read-only list of project accounts grouped by project. Each project section has a color dot heading with account count. Renders `AccountScheduleCard` for each account. Loading skeleton and empty state.

### AccountScheduleCard
**File:** `src/components/accounts/account-schedule-card.tsx`
**Props:** `{ account: ProjectAccount, scheduledSets: ScheduledSetSummary[], onMutate: () => void }`
**Hooks:** `computeWeekGrid()`, `computeSlots()`
Expandable card per account with compact header (username, day-of-week pills, posts/day, empty slot warning). Expanded view shows a mini week-grid calendar with color-coded cells (green=posted, blue=scheduled, orange=empty). Click cells to open action popover (view post, download ZIP, mark as posted, unassign) or assign modal. Edit button opens `ScheduleConfigEditor` inline.

### ScheduleConfigEditor
**File:** `src/components/accounts/schedule-config-editor.tsx`
**Props:** `{ account: ProjectAccount, onSave: (account: ProjectAccount) => void, onCancel: () => void }`
Inline editor for posting schedule config. Day-of-week toggle buttons (S/M/T/W/T/F/S) + posts/day number input (1-3). Save calls `PATCH /api/project-accounts`.

### AssignSetModal
**File:** `src/components/accounts/assign-set-modal.tsx`
**Props:** `{ open: boolean, slot: { date: Date, slotIndex: number } | null, account: ProjectAccount, onClose: () => void, onAssigned: () => void }`
Dialog to assign an unscheduled completed set to a specific account/date/slot. Lists sets grouped by "Queued for @account" and "Unassigned". Each set shows thumbnail, title, date, and "Assign" button. Calls `POST /api/schedule`.

---

## Generated Components

### GeneratedGrid
**File:** `src/components/generated/generated-grid.tsx`
**Hook:** `useGeneratedSets({ status, reviewStatus, sort, page, limit })`
Table/grid view toggle (defaults to table), status filter tabs (All/Completed/Partial/Failed/Queued), review status filter tabs (All/Unverified/Ready to post), sort dropdown, pagination controls. Table view shows rows with thumbnail, description, slides, status, review status (shared `ReviewStatusBadge`), account, schedule, date.

### GeneratedSetCard
**File:** `src/components/generated/generated-set-card.tsx`
**Props:** `{ set: GenerationSetWithVideo }`
Card with first completed image thumbnail, source video description, status badge, slide count, schedule/posted badge, relative date. Click navigates to `/generate/[videoId]`.

### AssignChannelModal
**File:** `src/components/generated/assign-channel-modal.tsx`
**Props:** `{ open: boolean, set: GenerationSetWithVideo | null, onClose: () => void, onSaved: () => void }`
Dialog to assign/update channel for a generation set. Channel select dropdown, save/clear/cancel buttons. No date/time picker — only assigns account. Fetches accounts from `GET /api/project-accounts`. Calls `POST /api/schedule` with `scheduledAt: null`.

---

## Hook Creator Components

### HookWizard
**File:** `src/components/hooks/hook-wizard.tsx`
**Props:** `{ sessionId?: string }`
**State:** `session`, `step`, `loading`
Top-level 7-step wizard orchestrator. Creates or loads a `hook_session` on mount. Renders the active step component and `HookWizardNav`. Persists step progress to the session via `PATCH /api/hooks/sessions/[id]`.

### HookWizardNav
**File:** `src/components/hooks/hook-wizard-nav.tsx`
**Props:** `{ step: number, totalSteps: number, onBack: () => void, onNext: () => void, nextLabel?: string, nextDisabled?: boolean, loading?: boolean }`
Back/Next/Finish navigation bar shown at the bottom of each wizard step.

### HookSourceStep
**File:** `src/components/hooks/steps/hook-source-step.tsx`
**Props:** `{ session: HookSession, onUpdate: (session: HookSession) => void }`
Step 1 — Choose input source: TikTok URL or direct video upload. Renders `HookTikTokInput` or `HookUploadInput` based on selected mode.

### HookTikTokInput
**File:** `src/components/hooks/hook-tiktok-input.tsx`
**Props:** `{ onVideo: (videoUrl: string, sourceUrl: string) => void }`
URL input that calls `POST /api/hooks/tiktok-video` and returns the stored video URL.

### HookUploadInput
**File:** `src/components/hooks/hook-upload-input.tsx`
**Props:** `{ onVideo: (videoUrl: string) => void }`
Drag-and-drop video file upload. Uploads to `hook-videos` bucket via multipart form.

### HookSnapshotStep
**File:** `src/components/hooks/steps/hook-snapshot-step.tsx`
**Props:** `{ session: HookSession, onUpdate: (session: HookSession) => void }`
Step 2 — Preview the input video and scrub to select a snapshot frame. Renders `HookVideoScrubber`.

### HookVideoScrubber
**File:** `src/components/hooks/hook-video-scrubber.tsx`
**Props:** `{ videoUrl: string, onSnapshot: (time: number, snapshotUrl: string) => void }`
HTML5 `<video>` element with a range scrubber. "Use this frame" button calls `POST /api/hooks/sessions/[id]/snapshot` with the current `currentTime`.

### HookImagePromptStep
**File:** `src/components/hooks/steps/hook-image-prompt-step.tsx`
**Props:** `{ session: HookSession, onUpdate: (session: HookSession) => void }`
Step 3 — Write the image generation prompt and set `numImages`. Uses `PromptTextarea`. Calls `POST /api/hooks/sessions/[id]/generate-images` on Next.

### HookGeneratingImagesStep
**File:** `src/components/hooks/steps/hook-generating-images-step.tsx`
**Props:** `{ session: HookSession, onUpdate: (session: HookSession) => void }`
Step 4 — Polls session until all images are `completed` or `failed`. Renders `HookImageGrid` in status-only (non-selectable) mode.

### HookSelectImagesStep
**File:** `src/components/hooks/steps/hook-select-images-step.tsx`
**Props:** `{ session: HookSession, onUpdate: (session: HookSession) => void }`
Step 5 — Select generated images to use for video generation. Renders `HookImageGrid` in selectable mode. Calls `PATCH /api/hooks/sessions/[id]/select-images` on Next.

### HookImageGrid
**File:** `src/components/hooks/hook-image-grid.tsx`
**Props:** `{ images: HookGeneratedImage[], selectable?: boolean, selectedIds?: string[], onToggle?: (id: string) => void }`
Grid of hook generated images. Selectable mode adds a checkbox overlay. Shows status badge (pending/generating/completed/failed) and retry button for failed images.

### HookVideoPromptStep
**File:** `src/components/hooks/steps/hook-video-prompt-step.tsx`
**Props:** `{ session: HookSession, onUpdate: (session: HookSession) => void }`
Step 6 — Write the video generation prompt, set duration and aspect ratio. Calls `POST /api/hooks/sessions/[id]/generate-videos` on Next.

### HookGeneratingVideosStep
**File:** `src/components/hooks/steps/hook-generating-videos-step.tsx`
**Props:** `{ session: HookSession, onUpdate: (session: HookSession) => void }`
Step 7 — Polls session until all videos are `completed` or `failed`. Renders `HookVideoGrid`.

### HookVideoGrid
**File:** `src/components/hooks/hook-video-grid.tsx`
**Props:** `{ videos: HookGeneratedVideo[] }`
Grid of hook generated videos. Each card shows a `<video>` preview, status badge, and download button (calls `GET /api/hooks/videos/[id]/download`).

### HookLibraryGrid
**File:** `src/components/hooks/hook-library-grid.tsx`
**Props:** none
**Hook:** `useHookLibrary()`
Paginated grid of completed hook videos from across all sessions.

### HookVideoCard
**File:** `src/components/hooks/hook-video-card.tsx`
**Props:** `{ video: HookLibraryVideo }`
Card with video preview, session title, creation date, download button, and delete button (calls `DELETE /api/hooks/videos/[id]`).

### HookSessionDetail
**File:** `src/components/hooks/hook-session-detail.tsx`
**Props:** `{ session: HookSessionWithMedia }`
Detail view for a completed or in-progress hook session. Shows source info, snapshot, generated images, and generated videos side by side.

---

## shadcn/ui Components

Located in `src/components/ui/`. Standard shadcn primitives:

`badge`, `button`, `card`, `calendar`, `dialog`, `dropdown-menu`, `input`, `label`, `popover`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `tabs`, `textarea`, `toggle`, `toggle-group`, `tooltip`

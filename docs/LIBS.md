# Library Modules Reference

> **Auto-update rule:** When any lib function is added, removed, or has its signature changed, update this file. See `CLAUDE.md` for details.

---

## lib/supabase/client.ts

Browser-side Supabase client.

```typescript
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
// Uses: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## lib/supabase/server.ts

Server-side Supabase client with service role (bypasses RLS).

```typescript
import { createServerClient } from "@/lib/supabase/server";

const supabase = createServerClient();
// Uses: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
```

---

## lib/openai/client.ts

Lazy-initialized OpenAI singleton.

```typescript
import { getOpenAIClient } from "@/lib/openai/client";

const openai = getOpenAIClient();
// Uses: OPENAI_API_KEY
// WARNING: Singleton caches across requests — restart dev server after key change
```

## lib/openai/generate-image.ts

Wrapper around OpenAI `images.edit()` endpoint.

```typescript
interface GenerateImageParams {
  originalImageBuffer: Buffer;
  prompt: string;
  overlayImageBuffer?: Buffer;       // Optional overlay composited with original
  qualityInput: "low" | "high";      // Input image detail level
  qualityOutput: "low" | "medium" | "high";  // Output quality
  outputFormat: "png" | "jpeg" | "webp";     // Unused by OpenAI, used later by sharp
}

interface GenerateImageResult {
  imageBuffer: Buffer;  // Raw base64-decoded image
}

async function generateImage(params: GenerateImageParams): Promise<GenerateImageResult>
```

**Details:**
- Model: `gpt-image-1.5`
- Size: `1024x1536` (closest 4:5, resized to 1080x1350 after)
- Passes `input_fidelity` (from `qualityInput`) and `quality` (from `qualityOutput`) to OpenAI
- Input: Converts Buffer → Blob → File for API compatibility
- Multiple images supported (original + overlay sent as array)
- Returns base64-decoded Buffer

---

## lib/tiktok/parse-url.ts

URL parsing and validation for TikTok links.

```typescript
function parseTikTokUrl(url: string): {
  videoId: string | null;   // Extracted numeric ID (null for short URLs)
  isShortUrl: boolean;      // true for vm.tiktok.com or /t/ URLs
  cleanUrl: string;         // Normalized URL
}

function isValidTikTokUrl(url: string): boolean
```

## lib/tiktok/client.ts

TikTok data fetching via RapidAPI.

```typescript
interface TikTokPostData {
  videoId: string;
  description: string;
  hashtags: string[];
  views: number;
  likes: number;
  comments: number;
  shares: number;
  authorUsername: string;
  authorNickname: string;
  authorAvatar: string;
  postedAt: string;          // ISO timestamp
  imageUrls: string[];       // TikTok CDN URLs
  isCarousel: boolean;
}

async function fetchTikTokPost(url: string): Promise<TikTokPostData>
// Uses: RAPIDAPI_KEY, RAPIDAPI_TIKTOK_HOST
```

---

## lib/storage/upload.ts

Upload files to Supabase Storage.

```typescript
async function uploadToStorage(
  bucket: "originals" | "generated" | "overlays" | "backgrounds",
  buffer: Buffer,
  fileExtension: string,    // "png", "jpeg", "webp"
  folder?: string           // Optional subfolder (e.g., setId or videoId)
): Promise<{
  url: string;              // Public URL
  path: string;             // Storage path
}>
```

**Details:**
- Auto-generates UUID filenames
- Sets Content-Type based on extension
- Uses `upsert: false` (UUID filenames ensure uniqueness)

## lib/storage/download.ts

Download images from any URL.

```typescript
async function downloadImage(url: string): Promise<Buffer>
```

Supports Supabase Storage URLs, TikTok CDN URLs, and any HTTPS URL.

---

## lib/metadata/strip.ts

Strip AI provenance metadata from images. Does **not** resize — preserves original dimensions.

```typescript
async function stripMetadataAndResize(params: {
  imageBuffer: Buffer;
  outputFormat: "png" | "jpeg" | "webp";
}): Promise<Buffer>
```

**Processing:**
1. Remove all EXIF, XMP, C2PA, Synth ID metadata (sharp strips by default when `.withMetadata()` is not called)
2. Format-specific handling:
   - **PNG:** quality 90, keep alpha
   - **JPEG:** quality 95, mozjpeg optimization, remove alpha
   - **WebP:** quality 95, keep alpha

**Note:** Resizing to 1080x1350 happens in `lib/queue/processor.ts` during the generation pipeline, not in this function.

---

## lib/queue/processor.ts

Batch image processing logic for the queue.

```typescript
async function processBatch(
  setId: string,
  batchStart: number
): Promise<{
  processed: number;        // Images processed in this batch
  hasMore: boolean;         // Whether more images remain
  nextBatchStart: number;   // Offset for next batch
}>
```

**Constants:**
- `BATCH_SIZE = 5` — Images per queue invocation

**Error classification:**
- Rate limit (429) → "Rate limited. Will retry in next batch."
- Auth (401) → "Invalid OpenAI API key."
- Bad request (400) → "OpenAI rejected the request."
- Billing → "Check your OpenAI billing."
- Generic → Error message string

## lib/queue/rate-limiter.ts

Token bucket rate limiter for OpenAI calls.

```typescript
class RateLimiter {
  constructor(maxTokens: number, refillRate: number);
  async acquire(): Promise<void>;  // Blocks until a token is available
}

function getRateLimiter(): RateLimiter  // Singleton: 50 requests/minute
```

---

## lib/zip/create.ts

Create ZIP archives from URLs.

```typescript
async function createZipFromUrls(
  entries: Array<{
    url: string;       // Image URL to download
    filename: string;  // Name in ZIP (e.g., "slide_1.jpeg")
  }>
): Promise<Buffer>     // ZIP file as Buffer
```

Uses `archiver` library. Downloads each image, streams into ZIP.

---

## lib/utils/format.ts

Formatting utilities.

```typescript
function formatCount(count?: number | null): string
// 1200 → "1.2K", 1500000 → "1.5M", null → "0"

function formatDate(dateStr?: string | null): string
// ISO → "Jan 15, 2026", null → ""

function estimateCost(imageCount: number, quality: string): number
// Returns cost in USD
// Rates: low=$0.011, medium=$0.042, high=$0.167
```

## lib/utils.ts

Tailwind utility.

```typescript
function cn(...inputs: ClassValue[]): string
// Merges class names via clsx + tailwind-merge
```

---

## lib/editor/segment-layout.ts

Layout algorithm and markdown helpers for mixed-bold text segments.

```typescript
interface LayoutWord { text: string; bold: boolean; x: number; width: number }
interface LayoutLine { words: LayoutWord[]; width: number; y: number }

function computeSegmentLayout(
  segments: TextSegment[],
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: number,
  lineHeight: number,
  letterSpacing: number,
  alignment: "left" | "center" | "right",
  ctx: CanvasRenderingContext2D
): LayoutLine[]
// Word-wraps segments with per-word bold measurement, applies alignment offsets

function segmentsToMarkdown(segments: TextSegment[]): string
// Converts segments to markdown text with **bold** markers

function markdownToSegments(text: string): TextSegment[]
// Parses **bold** markers back into TextSegment array
```

---

## lib/editor/server-font.ts

Server-side font utilities for export parity. Uses opentype.js to load TikTok Sans fonts and measure text server-side.

```typescript
function loadFont(weight: number): opentype.Font
// Loads TikTok Sans TTF for given weight (400/500/700/800). Cached in module scope.

function measureText(text: string, fontSize: number, font: opentype.Font, letterSpacing?: number): number
// Measures string width using opentype.js font metrics. Accounts for kerning and letter-spacing.

function getFontBase64Css(): string
// Returns <style> block with @font-face declarations using base64 data URIs for all 4 weights.
// Suitable for embedding in SVG so sharp/libvips renders with the correct font.
```

**Dependencies:** `opentype.js`, font files at `public/fonts/TikTokSans-*.ttf`

---

## lib/editor/server-segment-layout.ts

Server-side port of `computeSegmentLayout` for export. Uses opentype.js instead of CanvasRenderingContext2D.

```typescript
function serverComputeSegmentLayout(
  segments: TextSegment[],
  maxWidth: number,
  fontSize: number,
  fontWeight: number,
  lineHeight: number,
  letterSpacing: number,
  alignment: "left" | "center" | "right"
): LayoutLine[]
// Word-wraps segments with per-word bold measurement using opentype.js.
// Same algorithm as client-side computeSegmentLayout.
```

Re-exports `LayoutLine` and `LayoutWord` types from `segment-layout.ts`.

---

## lib/editor/render-slide.ts

Shared server-side slide rendering used by both export and update-generation routes.

```typescript
function escapeXml(str: string): string
function hexToRgb(hex: string): { r: number; g: number; b: number }
function applyTextTransform(text: string, transform: TextBlock["textTransform"]): string
function buildSingleBlockSvg(block: TextBlock, canvasHeight: number): string
async function processOverlay(overlay: OverlayImage, canvasHeight: number): Promise<{ buffer: Buffer; top: number; left: number } | null>
async function renderSlide(slide: SlideInput, outputFormat: "png" | "jpeg" | "webp", aspectRatio: AspectRatio): Promise<Buffer | null>
// Renders a single editor slide (background + text blocks + overlays) to an image buffer
```

---

## lib/editor/defaults.ts

Editor constants and default values for the canvas editor.

```typescript
import type { TextBlock, OverlayImage } from "@/types/editor";

const DEFAULT_BG_PROMPT: string
// Default prompt for generating text-free backgrounds via OpenAI

const DEFAULT_TEXT_BLOCK: Omit<TextBlock, "id">
// Default text block properties: centered, white, 48px, bold, zIndex 0

const DEFAULT_OVERLAY_IMAGE: Omit<OverlayImage, "id">
// Default overlay: x:20, y:20, width:30, height:30, rotation:0, opacity:1, cornerRadius:0, zIndex:100

const MAX_HISTORY = 50  // max undo/redo steps

const CANVAS_WIDTH = 1080
const CANVAS_HEIGHT = 1350
const FONT_FAMILY = "TikTok Sans"

type AspectRatio = "2:3" | "9:16" | "4:5"
const ASPECT_RATIOS: Record<AspectRatio, { width: number; height: number; label: string }>
// 2:3 → 1080×1620, 9:16 → 1080×1920, 4:5 → 1080×1350

const SNAP_THRESHOLD = 10  // px proximity for auto-snap guides

const BLOCK_PADDING = 20   // px at 1080 canvas scale, padding inside background pill
const BLOCK_CORNER_RADIUS = 16  // px at 1080 canvas scale, rounded corners

```

---

## lib/defaults.ts

Default values for generation settings. Can be overridden via environment variables.

```typescript
const DEFAULT_FIRST_SLIDE_PROMPT: string   // From env or hardcoded
const DEFAULT_OTHER_SLIDES_PROMPT: string  // From env or hardcoded
const DEFAULT_INPUT_QUALITY = "low"        // From env or "low"
const DEFAULT_OUTPUT_QUALITY = "medium"    // From env or "medium"
const DEFAULT_OUTPUT_FORMAT = "jpeg"       // From env or "jpeg"
const DEFAULT_NUM_SETS = 1                 // Always 1
```

---

## lib/swr/fetcher.ts

Shared SWR fetcher for client-side data hooks.

```typescript
import { fetcher } from "@/lib/swr/fetcher";

const fetcher: (url: string) => Promise<any>
// Calls fetch(url), throws on non-ok response, returns parsed JSON
// Used by all useSWR/useSWRInfinite hooks
```

**Dependency:** `swr` (installed as a project dependency)

---

## hooks/use-prompt-history.ts

Client-side localStorage hook for persisting and retrieving saved prompt strings.

```typescript
const { history, savePrompt, deletePrompt } = usePromptHistory();

// history: string[]          — ordered newest-first, max 30 entries
// savePrompt(prompt: string) — saves if trimmed length >= 8; deduplicates
// deletePrompt(prompt: string) — removes from history
```

Storage key: `ch:prompt-history`. Used by `PromptTextarea`.

---

## lib/client/download-zip.ts

Client-side ZIP download utility using fflate. Downloads images directly from CDN in the browser (faster than server-side route).

```typescript
async function downloadSetAsZip(setId: string, filename: string): Promise<void>
// Fetches image URLs from /api/images/{setId}/download?urls=1,
// downloads all in parallel from CDN, creates ZIP with fflate,
// triggers browser download

function formatDateForFilename(dateStr: string): string
// "2026-02-20T10:00:00.000Z" → "2026-02-20"

function sanitizeFilename(name: string): string
// Replaces special characters and spaces with underscores
```

**Dependency:** `fflate` (browser-side ZIP creation)

---

## hooks/use-mobile.ts

Responsive breakpoint hook.

```typescript
function useIsMobile(): boolean
// Returns true when viewport width < 768px
// Uses window.matchMedia for efficient change detection
```

Used by sidebar and other layout components for responsive behavior.

---

## hooks/use-account-overview.ts

Account scheduling overview with week grid computation.

```typescript
function useAccountOverview(): {
  projects: ProjectWithAccounts[];
  scheduledSets: ScheduledSetSummary[];
  loading: boolean;
  mutate: () => Promise<void>;
}

function computeWeekGrid(
  account: ProjectAccount,
  scheduledSets: ScheduledSetSummary[],
  weeks?: number
): WeekRow[]

function computeSlots(
  account: ProjectAccount,
  scheduledSets: ScheduledSetSummary[],
  weeks?: number
): PostingSlot[]
```

Fetches projects and schedule data, computes posting slot grids for account schedule cards.

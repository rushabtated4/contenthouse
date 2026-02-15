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
  bucket: "originals" | "generated" | "overlays",
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
- Uses `upsert: true`

## lib/storage/download.ts

Download images from any URL.

```typescript
async function downloadImage(url: string): Promise<Buffer>
```

Supports Supabase Storage URLs, TikTok CDN URLs, and any HTTPS URL.

---

## lib/metadata/strip.ts

Strip AI provenance metadata and resize to TikTok dimensions.

```typescript
async function stripMetadataAndResize(params: {
  imageBuffer: Buffer;
  outputFormat: "png" | "jpeg" | "webp";
}): Promise<Buffer>
```

**Processing:**
1. Resize to **1080x1350** (TikTok carousel standard, 4:5 ratio)
2. Remove all EXIF, XMP, C2PA, Synth ID metadata
3. Format-specific handling:
   - **PNG:** quality 100, keep alpha
   - **JPEG:** quality 95, mozjpeg optimization, flatten alpha
   - **WebP:** quality 95, keep alpha

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

function getRateLimiter(): RateLimiter  // Singleton: 5 tokens, 1 token/12s
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

"use client";

import { HookLibrary } from "@/components/hooks/hook-library";

export default function HookLibraryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hook Library</h1>
        <p className="text-sm text-muted-foreground">
          Browse, download, and manage all your generated hook videos.
        </p>
      </div>
      <HookLibrary />
    </div>
  );
}

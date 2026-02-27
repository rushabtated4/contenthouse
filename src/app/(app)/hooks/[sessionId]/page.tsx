"use client";

import { use } from "react";
import { HookCreatorWizard } from "@/components/hooks/hook-creator-wizard";

export default function HookSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  return <HookCreatorWizard sessionId={sessionId} />;
}

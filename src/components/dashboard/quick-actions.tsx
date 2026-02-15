"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wand2, CalendarDays, FolderCheck } from "lucide-react";

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button asChild variant="outline" className="w-full justify-start gap-2 transition-colors duration-150 ease-out">
          <Link href="/generate">
            <Wand2 className="w-4 h-4" />
            Generate New Carousel
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start gap-2 transition-colors duration-150 ease-out">
          <Link href="/calendar">
            <CalendarDays className="w-4 h-4" />
            View Calendar
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start gap-2 transition-colors duration-150 ease-out">
          <Link href="/generated">
            <FolderCheck className="w-4 h-4" />
            Browse Generated
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

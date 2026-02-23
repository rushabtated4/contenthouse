"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { GenerationSetWithVideo } from "@/types/api";

interface ProjectAccount {
  id: string;
  username: string;
  nickname: string | null;
}

interface Props {
  open: boolean;
  set: GenerationSetWithVideo | null;
  onClose: () => void;
  onSaved: () => void;
}

export function AssignChannelModal({ open, set, onClose, onSaved }: Props) {
  const [accounts, setAccounts] = useState<ProjectAccount[]>([]);
  const [channelId, setChannelId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/project-accounts")
      .then((r) => r.json())
      .then((data: ProjectAccount[]) => setAccounts(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!set) return;
    setChannelId(set.channel_id ?? "");
  }, [set]);

  async function handleSave() {
    if (!set) return;
    setSaving(true);
    try {
      await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setId: set.id,
          channelId: channelId || null,
          scheduledAt: null,
          notes: null,
        }),
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    if (!set) return;
    setSaving(true);
    try {
      await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setId: set.id,
          channelId: null,
          scheduledAt: null,
          notes: null,
        }),
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Channel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Account</label>
            <Select value={channelId} onValueChange={setChannelId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account…" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    @{a.username}
                    {a.nickname ? ` (${a.nickname})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={saving}
            className="text-muted-foreground"
          >
            Clear
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

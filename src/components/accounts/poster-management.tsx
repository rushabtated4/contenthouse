"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { ProjectAccount } from "@/types/database";

interface PosterRow {
  id: string;
  username: string;
  display_name: string;
  created_at: string;
  updated_at: string;
  project_accounts: { id: string; username: string; nickname: string | null; project_id: string }[];
}

export function PosterManagement() {
  const [posters, setPosters] = useState<PosterRow[]>([]);
  const [allChannels, setAllChannels] = useState<ProjectAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPoster, setEditingPoster] = useState<PosterRow | null>(null);
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Channel assignment dialog
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [channelPoster, setChannelPoster] = useState<PosterRow | null>(null);
  const [selectedChannelIds, setSelectedChannelIds] = useState<Set<string>>(new Set());
  const [savingChannels, setSavingChannels] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [postersRes, channelsRes] = await Promise.all([
        fetch("/api/posters"),
        fetch("/api/project-accounts"),
      ]);
      const postersData = await postersRes.json();
      const channelsData = await channelsRes.json();
      setPosters(Array.isArray(postersData) ? postersData : []);
      setAllChannels(Array.isArray(channelsData) ? channelsData : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openCreateDialog() {
    setEditingPoster(null);
    setFormUsername("");
    setFormPassword("");
    setFormDisplayName("");
    setFormError("");
    setDialogOpen(true);
  }

  function openEditDialog(poster: PosterRow) {
    setEditingPoster(poster);
    setFormUsername(poster.username);
    setFormPassword("");
    setFormDisplayName(poster.display_name);
    setFormError("");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formUsername || !formDisplayName) {
      setFormError("Username and display name are required");
      return;
    }
    if (!editingPoster && !formPassword) {
      setFormError("Password is required");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      if (editingPoster) {
        // Delete old and recreate (simple approach since no PATCH endpoint)
        await fetch("/api/posters", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [editingPoster.id] }),
        });
        const res = await fetch("/api/posters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: formUsername,
            password: formPassword || "unchanged",
            displayName: formDisplayName,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setFormError(data.error || "Failed to update poster");
          return;
        }
        // Re-assign the same channels to the new poster
        const newPoster = await res.json();
        const oldChannelIds = editingPoster.project_accounts.map((c) => c.id);
        if (oldChannelIds.length > 0) {
          await fetch(`/api/posters/${newPoster.id}/channels`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ channelIds: oldChannelIds }),
          });
        }
      } else {
        const res = await fetch("/api/posters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: formUsername,
            password: formPassword,
            displayName: formDisplayName,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setFormError(data.error || "Failed to create poster");
          return;
        }
      }

      setDialogOpen(false);
      fetchData();
    } catch {
      setFormError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(poster: PosterRow) {
    if (!confirm(`Delete poster "${poster.display_name}"?`)) return;

    try {
      await fetch("/api/posters", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [poster.id] }),
      });
      fetchData();
    } catch {
      // ignore
    }
  }

  function openChannelDialog(poster: PosterRow) {
    setChannelPoster(poster);
    setSelectedChannelIds(new Set(poster.project_accounts.map((c) => c.id)));
    setChannelDialogOpen(true);
  }

  async function handleSaveChannels() {
    if (!channelPoster) return;
    setSavingChannels(true);
    try {
      await fetch(`/api/posters/${channelPoster.id}/channels`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelIds: Array.from(selectedChannelIds) }),
      });
      setChannelDialogOpen(false);
      fetchData();
    } catch {
      // ignore
    } finally {
      setSavingChannels(false);
    }
  }

  function toggleChannel(channelId: string) {
    setSelectedChannelIds((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  }

  function copyLoginUrl(poster: PosterRow) {
    const url = `${window.location.origin}/posting`;
    navigator.clipboard.writeText(url);
  }

  return (
    <div className="rounded-lg border border-border">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 bg-muted/30">
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Posters</span>
        <span className="text-xs text-muted-foreground">
          ({posters.length})
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-xs gap-1 ml-auto"
          onClick={openCreateDialog}
        >
          <Plus className="h-3 w-3" />
          Add Poster
        </Button>
      </div>

      {expanded && (
        <div className="p-4">
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading...</p>
          ) : posters.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No posters yet. Add one to give employees access to download and mark posts.
            </p>
          ) : (
            <div className="space-y-2">
              {posters.map((poster) => (
                <div
                  key={poster.id}
                  className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{poster.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      @{poster.username}
                      <span className="mx-1.5">·</span>
                      {poster.project_accounts.length} channel{poster.project_accounts.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => copyLoginUrl(poster)}
                    title="Copy login URL"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => openChannelDialog(poster)}
                  >
                    Channels
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => openEditDialog(poster)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(poster)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingPoster ? "Edit Poster" : "Add Poster"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Display Name
              </label>
              <Input
                value={formDisplayName}
                onChange={(e) => setFormDisplayName(e.target.value)}
                placeholder="e.g. John"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Username
              </label>
              <Input
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                placeholder="e.g. john"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Password{editingPoster ? " (leave blank to keep)" : ""}
              </label>
              <Input
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder={editingPoster ? "Leave blank to keep current" : "Enter password"}
              />
            </div>
            {formError && (
              <p className="text-xs text-red-600">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : null}
              {editingPoster ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Channel Assignment Dialog */}
      <Dialog open={channelDialogOpen} onOpenChange={setChannelDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Assign Channels — {channelPoster?.display_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1 py-2 max-h-[300px] overflow-y-auto">
            {allChannels.length === 0 ? (
              <p className="text-xs text-muted-foreground">No channels available.</p>
            ) : (
              allChannels.map((ch) => {
                // Check if channel is assigned to another poster
                const assignedTo = posters.find(
                  (p) =>
                    p.id !== channelPoster?.id &&
                    p.project_accounts.some((c) => c.id === ch.id)
                );
                return (
                  <label
                    key={ch.id}
                    className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedChannelIds.has(ch.id)}
                      onCheckedChange={() => toggleChannel(ch.id)}
                    />
                    <span className="text-sm">
                      @{ch.username}
                      {ch.nickname && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          {ch.nickname}
                        </span>
                      )}
                    </span>
                    {assignedTo && (
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        ({assignedTo.display_name})
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChannelDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveChannels} disabled={savingChannels}>
              {savingChannels ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

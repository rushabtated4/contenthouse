"use client";

import { useState } from "react";
import { useBackgroundFolders } from "@/hooks/use-background-folders";
import { useBackgrounds } from "@/hooks/use-backgrounds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FolderPlus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { BackgroundFolder } from "@/types/editor";

interface FolderGridViewProps {
  onOpenFolder: (folderId: string, folderName: string) => void;
  onSelectBackground: (bg: { id: string; image_url: string }) => void;
}

export function FolderGridView({ onOpenFolder, onSelectBackground }: FolderGridViewProps) {
  const { folders, loading, createFolder, renameFolder, deleteFolder, mutate } = useBackgroundFolders();
  const { backgrounds: unfiledBgs, loading: unfiledLoading, hasMore, loadMore, mutate: mutateUnfiled } = useBackgrounds("unfiled");

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<BackgroundFolder | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createFolder(newName.trim());
      setNewName("");
      setCreating(false);
      toast.success("Folder created");
    } catch {
      toast.error("Failed to create folder");
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await renameFolder(id, editName.trim());
      setEditingId(null);
      toast.success("Folder renamed");
    } catch {
      toast.error("Failed to rename");
    }
  };

  const handleDelete = async (keepImages: boolean) => {
    if (!deleteTarget) return;
    try {
      await deleteFolder(deleteTarget.id, !keepImages);
      setDeleteTarget(null);
      if (keepImages) mutateUnfiled();
      toast.success("Folder deleted");
    } catch {
      toast.error("Failed to delete folder");
    }
  };

  const handleDeleteBg = async (id: string) => {
    try {
      const res = await fetch(`/api/backgrounds/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      mutateUnfiled();
      toast.success("Background deleted");
    } catch {
      toast.error("Failed to delete background");
    }
  };

  return (
    <div className="space-y-4">
      {/* Folders section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Folders</h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {folders.map((folder) => (
              <div key={folder.id} className="relative group">
                <button
                  onClick={() => onOpenFolder(folder.id, folder.name)}
                  className="w-full aspect-square rounded-lg border border-border hover:border-primary transition-colors overflow-hidden bg-muted flex flex-col"
                >
                  {folder.cover_url ? (
                    <div className="flex-1 overflow-hidden">
                      <img src={folder.cover_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <FolderPlus className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="p-2 text-left">
                    {editingId === folder.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter") handleRename(folder.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onBlur={() => handleRename(folder.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-6 text-xs px-1"
                        autoFocus
                      />
                    ) : (
                      <p
                        className="text-xs font-medium truncate"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingId(folder.id);
                          setEditName(folder.name);
                        }}
                      >
                        {folder.name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">{folder.image_count} images</p>
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(folder); }}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* New folder card */}
            {creating ? (
              <div className="aspect-square rounded-lg border-2 border-dashed border-primary/50 flex items-center justify-center p-3">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") { setCreating(false); setNewName(""); }
                  }}
                  placeholder="Folder name"
                  className="text-sm"
                  autoFocus
                />
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center justify-center gap-1"
              >
                <FolderPlus className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">New Folder</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Unfiled section */}
      {unfiledBgs.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Unfiled</h3>
          <div className="grid grid-cols-4 gap-3">
            {unfiledBgs.map((bg) => (
              <div key={bg.id} className="relative group">
                <button
                  onClick={() => onSelectBackground(bg)}
                  className="w-full aspect-[4/5] rounded-md overflow-hidden border border-border hover:border-primary transition-colors"
                >
                  <img src={bg.image_url} alt="Background" className="w-full h-full object-cover" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteBg(bg.id); }}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          {hasMore && (
            <Button variant="outline" size="sm" className="w-full mt-3" onClick={loadMore} disabled={unfiledLoading}>
              {unfiledLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load More"}
            </Button>
          )}
        </div>
      )}

      {/* Delete folder dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This folder has {deleteTarget?.image_count || 0} images. What would you like to do with them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(true)} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
              Keep Images
            </AlertDialogAction>
            <AlertDialogAction onClick={() => handleDelete(false)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Images
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

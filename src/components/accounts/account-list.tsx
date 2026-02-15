"use client";

import { useProjects } from "@/hooks/use-projects";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { User, FolderOpen } from "lucide-react";

export function AccountList() {
  const { projects, loading } = useProjects();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const totalAccounts = projects.reduce(
    (sum, p) => sum + p.project_accounts.length,
    0
  );

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">
        Accounts{" "}
        <span className="text-muted-foreground font-normal">
          ({totalAccounts})
        </span>
      </h1>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              No projects found.
            </p>
          </CardContent>
        </Card>
      ) : (
        projects.map((project) => (
          <div key={project.id} className="space-y-3">
            <div className="flex items-center gap-2">
              {project.color && (
                <span
                  className="inline-block h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: project.color }}
                />
              )}
              <h2 className="text-sm font-medium">{project.name}</h2>
              <span className="text-xs text-muted-foreground">
                ({project.project_accounts.length})
              </span>
            </div>

            {project.project_accounts.length === 0 ? (
              <p className="text-xs text-muted-foreground pl-5">
                No accounts in this project.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {project.project_accounts.map((account) => (
                  <Card key={account.id}>
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          @{account.username}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {account.nickname && (
                            <span className="text-xs text-muted-foreground truncate">
                              {account.nickname}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Added{" "}
                            {new Date(account.added_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

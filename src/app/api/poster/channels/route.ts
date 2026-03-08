import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const cookieVal = req.cookies.get("ch_poster")?.value;
  if (!cookieVal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let posterId: string;
  try {
    posterId = JSON.parse(cookieVal).id;
  } catch {
    return NextResponse.json({ error: "Invalid cookie" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Get channels assigned to this poster, grouped by project
  const { data: channels, error } = await supabase
    .from("project_accounts")
    .select("*, projects(*)")
    .eq("poster_id", posterId)
    .order("username", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by project
  const projectMap = new Map<string, { project: Record<string, unknown>; accounts: Record<string, unknown>[] }>();

  for (const ch of channels || []) {
    const project = ch.projects as Record<string, unknown>;
    const projectId = project.id as string;
    if (!projectMap.has(projectId)) {
      projectMap.set(projectId, { project, accounts: [] });
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { projects: _, ...account } = ch;
    projectMap.get(projectId)!.accounts.push(account);
  }

  const result = Array.from(projectMap.values()).map(({ project, accounts }) => ({
    ...project,
    project_accounts: accounts,
  }));

  return NextResponse.json(result);
}

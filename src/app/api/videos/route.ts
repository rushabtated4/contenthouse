import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = request.nextUrl;

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "24", 10), 50);
    const offset = (page - 1) * limit;

    // Filter params
    const appId = searchParams.get("app_id");
    const accountId = searchParams.get("account_id");
    const search = searchParams.get("search");
    const minViews = searchParams.get("min_views");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const sort = searchParams.get("sort") || "newest";
    const maxGenCount = searchParams.get("max_gen_count")
      ? parseInt(searchParams.get("max_gen_count")!, 10)
      : null;
    const minGenCount = searchParams.get("min_gen_count")
      ? parseInt(searchParams.get("min_gen_count")!, 10)
      : null;

    // If filtering by generation count, find video IDs to exclude/include
    let excludeVideoIds: string[] | null = null;
    let includeVideoIds: string[] | null = null;
    if (maxGenCount !== null || minGenCount !== null) {
      const { data: genRows } = await supabase
        .from("generation_sets")
        .select("video_id")
        .not("video_id", "is", null);

      const countMap = new Map<string, number>();
      for (const row of genRows || []) {
        if (row.video_id) {
          countMap.set(row.video_id, (countMap.get(row.video_id) || 0) + 1);
        }
      }

      if (maxGenCount !== null) {
        excludeVideoIds = [...countMap.entries()]
          .filter(([, n]) => n >= maxGenCount)
          .map(([id]) => id);
      }

      if (minGenCount !== null) {
        includeVideoIds = [...countMap.entries()]
          .filter(([, n]) => n >= minGenCount)
          .map(([id]) => id);
        if (includeVideoIds.length === 0) {
          return NextResponse.json({
            videos: [],
            total: 0,
            page,
            limit,
            hasMore: false,
          });
        }
      }
    }

    // If filtering by app, resolve account IDs first
    let appAccountIds: string[] | null = null;
    if (appId) {
      const { data: appAccounts } = await supabase
        .from("accounts")
        .select("id")
        .eq("app_id", appId);
      appAccountIds = appAccounts?.map((a) => a.id) || [];
      if (appAccountIds.length === 0) {
        return NextResponse.json({
          videos: [],
          total: 0,
          page,
          limit,
          hasMore: false,
        });
      }
    }

    const orderColumn =
      sort === "most_views" ? "views" : "posted_at";
    const ascending = sort === "oldest";

    let query = supabase
      .from("videos")
      .select(
        `
        *,
        generation_sets(id),
        accounts(id, username, nickname, app_id, apps(id, name, color))
      `,
        { count: "exact" }
      )
      .not("original_images", "is", null)
      .order(orderColumn, { ascending, nullsFirst: false });

    // Apply filters
    if (appAccountIds) {
      query = query.in("account_id", appAccountIds);
    }
    if (accountId) {
      query = query.eq("account_id", accountId);
    }
    if (search) {
      query = query.ilike("description", `%${search}%`);
    }
    if (minViews) {
      query = query.gte("views", parseInt(minViews, 10));
    }
    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }
    if (dateTo) {
      query = query.lte("created_at", dateTo);
    }
    if (excludeVideoIds && excludeVideoIds.length > 0) {
      query = query.not("id", "in", `(${excludeVideoIds.join(",")})`);
    }
    if (includeVideoIds) {
      query = query.in("id", includeVideoIds);
    }

    const { data: videos, error, count } = await query.range(
      offset,
      offset + limit - 1
    );

    if (error) throw error;

    const total = count || 0;

    const videosWithCount = (videos || []).map((v: any) => {
      const account = v.accounts
        ? {
            id: v.accounts.id,
            username: v.accounts.username,
            nickname: v.accounts.nickname,
            app: v.accounts.apps || null,
          }
        : null;

      return {
        ...v,
        generation_count: v.generation_sets?.length || 0,
        generation_sets: undefined,
        accounts: undefined,
        account,
      };
    });

    return NextResponse.json({
      videos: videosWithCount,
      total,
      page,
      limit,
      hasMore: offset + limit < total,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

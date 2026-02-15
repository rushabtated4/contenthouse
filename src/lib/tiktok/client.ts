import { parseTikTokUrl } from "./parse-url";

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
  postedAt: string;
  imageUrls: string[];
  isCarousel: boolean;
}

export async function fetchTikTokPost(
  url: string
): Promise<TikTokPostData> {
  const { videoId } = parseTikTokUrl(url);

  if (!videoId) {
    throw new Error(
      "Could not extract video ID from URL. Try pasting the full TikTok URL."
    );
  }

  const response = await fetch(
    `https://${process.env.RAPIDAPI_TIKTOK_HOST}/api/post/detail?videoId=${videoId}`,
    {
      headers: {
        "x-rapidapi-key": process.env.RAPIDAPI_KEY!,
        "x-rapidapi-host": process.env.RAPIDAPI_TIKTOK_HOST!,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `TikTok API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  if (!data?.itemInfo?.itemStruct) {
    throw new Error("Invalid response from TikTok API");
  }

  const item = data.itemInfo.itemStruct;

  // Extract carousel images
  const imageUrls: string[] = [];
  const isCarousel = !!item.imagePost;

  if (isCarousel && item.imagePost?.images) {
    for (const img of item.imagePost.images) {
      const imgUrl =
        img.imageURL?.urlList?.[0] ||
        img.imageURL?.urlList?.[1] ||
        null;
      if (imgUrl) {
        imageUrls.push(imgUrl);
      }
    }
  }

  // Extract hashtags from challenges
  const hashtags: string[] = [];
  if (item.challenges) {
    for (const challenge of item.challenges) {
      if (challenge.title) {
        hashtags.push(challenge.title);
      }
    }
  }

  // Parse creation time
  const createdTimestamp = item.createTime
    ? new Date(item.createTime * 1000).toISOString()
    : new Date().toISOString();

  return {
    videoId,
    description: item.desc || "",
    hashtags,
    views: item.stats?.playCount || 0,
    likes: item.stats?.diggCount || 0,
    comments: item.stats?.commentCount || 0,
    shares: item.stats?.shareCount || 0,
    authorUsername: item.author?.uniqueId || "",
    authorNickname: item.author?.nickname || "",
    authorAvatar: item.author?.avatarThumb || "",
    postedAt: createdTimestamp,
    imageUrls,
    isCarousel,
  };
}

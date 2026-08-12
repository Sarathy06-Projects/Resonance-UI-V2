export interface Author {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  verified: boolean;
  role: string | null;
}

export interface Post {
  id: string;
  authorId: string;
  type: "discussion" | "showcase" | "feedback";
  // Only set for type="discussion" - showcase/feedback posts have no slug
  // and keep their /post/:id URL forever. See lib/urls.ts's postUrl().
  slug: string | null;
  content: string;
  images: string[];
  visibility: "public" | "followers" | "private";
  linkedArticleId: string | null;
  toolsUsed: string | null;
  portfolioLink: string | null;
  feedbackType: string | null;
  urgency: string | null;
  figmaLink: string | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  bookmarksCount: number;
  createdAt: string;
  updatedAt: string;
  author: Author;
  hashtags: string[];
  isLiked: boolean;
  isBookmarked: boolean;
  linkedArticle?: ArticlePreview | null;
  threadId: string | null;
  threadPosition: number | null;
  // Only present on GET /api/posts/:id - every post in the chain, in order.
  thread?: Post[];
}

export interface ArticlePreview {
  id: string;
  slug: string;
  // Needed to build the /@username/slug link - see lib/urls.ts's
  // articleUrl(). Null only in the pathological case of a deleted-username
  // author; articleUrl() falls back to the legacy /article/:id route then.
  authorUsername: string | null;
  title: string;
  preview: string | null;
  coverImage: string | null;
  readTime: string | null;
}

export interface Article {
  id: string;
  authorId: string;
  title: string;
  slug: string;
  preview: string | null;
  content: string;
  coverImage: string | null;
  images: string[];
  tags: string[];
  status: "draft" | "published";
  readTime: string | null;
  seriesId: string | null;
  seriesPosition: number | null;
  likesCount: number;
  commentsCount: number;
  bookmarksCount: number;
  viewsCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: Author;
  isLiked: boolean;
  isBookmarked: boolean;
}

export interface Series {
  id: string;
  authorId: string;
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  articlesCount: number;
  createdAt: string;
  updatedAt: string;
  // Only present on GET /api/series/by-slug/:username/:slug - the plain
  // GET /api/series/:id and GET /api/series?authorId= list don't join it
  // (both are only ever called with the author already known from
  // context), so it's optional rather than required.
  author?: Author;
}

export interface SeriesArticle {
  id: string;
  slug: string;
  title: string;
  preview: string | null;
  coverImage: string | null;
  readTime: string | null;
  seriesPosition: number | null;
  publishedAt: string | null;
}

export interface SeriesWithArticles extends Series {
  articles: SeriesArticle[];
}

// GET /api/content/by-slug/:username/:slug - articles and discussion-posts
// share the /@username/[slug] namespace (see backend lib/slug.ts), so the
// resolver route needs one call that disambiguates which this is.
export type ResolvedContent = { type: "article"; article: Article } | { type: "post"; post: Post };

export type CommentSort = "relevant" | "newest" | "oldest" | "liked";
export type CommentReportReason = "spam" | "harassment" | "hate_speech" | "misinformation" | "other";

export interface Comment {
  id: string;
  targetType: "post" | "article";
  targetId: string;
  parentId: string | null;
  depth: number;
  authorId: string;
  content: string;
  likesCount: number;
  repliesCount: number;
  isPinned: boolean;
  editedAt: string | null;
  createdAt: string;
  author: Author;
  isLiked: boolean;
  isBookmarked: boolean;
  likedByCreator: boolean;
  isTargetAuthor: boolean;
  replies: Comment[];
  hasMoreReplies: boolean;
  nextRepliesCursor: string | null;
  hashtags?: string[];
}

export interface CommentSearchResult {
  id: string;
  targetType: "post" | "article";
  targetId: string;
  content: string;
  createdAt: string;
  author: Author;
}

export interface Profile {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  bio: string | null;
  role: string | null;
  company: string | null;
  location: string | null;
  websiteUrl: string | null;
  coverImage: string | null;
  toolbox: string[];
  interests: string[];
  badges: string[];
  verified: boolean;
  postsCount: number;
  articlesCount: number;
  followersCount: number;
  followingCount: number;
  totalLikesCount: number;
  articleReadsCount: number;
  createdAt: string;
  isFollowing: boolean;
  isSelf: boolean;
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  actorId: string | null;
  type: "like" | "reply" | "mention" | "follow" | "repost" | "article_published" | "system";
  targetType: "post" | "article" | "comment" | "user" | null;
  targetId: string | null;
  data: { title: string; description: string; cta: string; commentId?: string } | null;
  isRead: boolean;
  createdAt: string;
  actor: Author | null;
}

export interface HashtagStat {
  tag: string;
  postsCount: number;
  articlesCount: number;
  windowCount: number;
  previousWindowCount: number;
  growthPct: number;
  updatedAt: string;
}

export interface Draft {
  id: string;
  authorId: string;
  mode: "discussion" | "showcase" | "feedback" | "article";
  title: string | null;
  content: string | null;
  coverImage: string | null;
  status: string;
  meta: Record<string, unknown>;
  updatedAt: string;
  createdAt: string;
}

export interface Paginated<T> {
  nextCursor: string | null;
}

export interface Community {
  id: string;
  name: string;
  icon: string | null;
  membersCount: number;
}

export interface EventItem {
  id: string;
  title: string;
  date: string;
  attendeesCount: number;
}

export interface DesignChallenge {
  id: string;
  title: string;
  participants: string | null;
  deadline: string | null;
}

export interface Resource {
  id: string;
  title: string;
  type: string;
}

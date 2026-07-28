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
}

export interface ArticlePreview {
  id: string;
  title: string;
  preview: string | null;
  coverImage: string | null;
  readTime: string | null;
}

export interface Article {
  id: string;
  authorId: string;
  title: string;
  preview: string | null;
  content: string;
  coverImage: string | null;
  tags: string[];
  status: "draft" | "published";
  readTime: string | null;
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

export interface Comment {
  id: string;
  targetType: "post" | "article";
  targetId: string;
  parentId: string | null;
  authorId: string;
  content: string;
  likesCount: number;
  isPinned: boolean;
  createdAt: string;
  author: Author;
  isLiked: boolean;
  isBookmarked: boolean;
  likedByCreator: boolean;
  isTargetAuthor: boolean;
  replies: Comment[];
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

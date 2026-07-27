import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mockPosts, mockArticles } from '@/lib/mock-data';

export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio?: string;
  role?: string;
}

export interface PostComment {
  id: string;
  postId: string;
  parentId?: string;
  author: User;
  content: string;
  timestamp: string;
  likes: number;
  likedByCreator?: boolean;
  isPinned?: boolean;
}

export interface DataState {
  posts: typeof mockPosts;
  articles: typeof mockArticles;
  comments: PostComment[];
  followedUsers: string[];
  likedPosts: string[];
  bookmarkedPosts: string[];
  likedComments: string[];
  addPost: (post: typeof mockPosts[0]) => void;
  addArticle: (article: typeof mockArticles[0]) => void;
  addComment: (postId: string, content: string, author: User) => void;
  addReply: (postId: string, parentId: string, content: string, author: User) => void;
  toggleLike: (postId: string) => void;
  toggleBookmark: (postId: string) => void;
  toggleFollow: (userId: string) => void;
  toggleCommentLike: (commentId: string, isPostCreator: boolean) => void;
  togglePinComment: (postId: string, commentId: string) => void;
}

export const useDataStore = create<DataState>()(
  persist(
    (set) => ({
      posts: mockPosts,
      articles: mockArticles,
      comments: [
        {
          id: "c1",
          postId: "p1",
          author: mockPosts[0].author, // Alex Rivera
          content: "This is completely accurate. I've been saying this for years!",
          timestamp: "1h ago",
          likes: 12,
          isPinned: true,
          likedByCreator: true,
        },
        {
          id: "c2",
          postId: "p1",
          author: mockArticles[1].author, // Sarah Chen
          content: "Agreed. Contrast is key for accessibility.",
          timestamp: "45m ago",
          likes: 5,
        },
        {
          id: "c3",
          postId: "p1",
          parentId: "c2", // Reply to Sarah
          author: mockPosts[0].author,
          content: "Yes! AAA standards are so important.",
          timestamp: "30m ago",
          likes: 2,
          likedByCreator: true,
        }
      ],
      followedUsers: [],
      likedPosts: [],
      bookmarkedPosts: [],
      likedComments: [],
      addPost: (post) => set((state) => ({ posts: [post, ...state.posts] })),
      addArticle: (article) => set((state) => ({ articles: [article, ...state.articles] })),
      addComment: (postId, content, author) => set((state) => {
        const newComment: PostComment = {
          id: `c_${Date.now()}`,
          postId,
          author,
          content,
          timestamp: "Just now",
          likes: 0,
        };
        return {
          comments: [...state.comments, newComment],
          posts: state.posts.map(post => post.id === postId ? { ...post, comments: post.comments + 1 } : post)
        };
      }),
      addReply: (postId, parentId, content, author) => set((state) => {
        const newReply: PostComment = {
          id: `c_${Date.now()}`,
          postId,
          parentId,
          author,
          content,
          timestamp: "Just now",
          likes: 0,
        };
        return {
          comments: [...state.comments, newReply],
          posts: state.posts.map(post => post.id === postId ? { ...post, comments: post.comments + 1 } : post)
        };
      }),
      toggleCommentLike: (commentId, isPostCreator) => set((state) => {
        const isLiked = state.likedComments.includes(commentId);
        return {
          likedComments: isLiked
            ? state.likedComments.filter((id) => id !== commentId)
            : [...state.likedComments, commentId],
          comments: state.comments.map(c => 
            c.id === commentId 
              ? { 
                  ...c, 
                  likes: isLiked ? c.likes - 1 : c.likes + 1,
                  likedByCreator: isPostCreator ? !isLiked : c.likedByCreator 
                }
              : c
          )
        };
      }),
      togglePinComment: (postId, commentId) => set((state) => {
        return {
          comments: state.comments.map(c => {
            if (c.postId !== postId) return c;
            if (c.id === commentId) {
              return { ...c, isPinned: !c.isPinned };
            }
            return { ...c, isPinned: false };
          })
        };
      }),
      toggleLike: (postId) => set((state) => {
        const isLiked = state.likedPosts.includes(postId);
        return {
          likedPosts: isLiked
            ? state.likedPosts.filter((id) => id !== postId)
            : [...state.likedPosts, postId],
          posts: state.posts.map(post => 
            post.id === postId 
              ? { ...post, likes: isLiked ? post.likes - 1 : post.likes + 1 }
              : post
          )
        };
      }),
      toggleBookmark: (postId) => set((state) => {
        const isBookmarked = state.bookmarkedPosts.includes(postId);
        return {
          bookmarkedPosts: isBookmarked
            ? state.bookmarkedPosts.filter((id) => id !== postId)
            : [...state.bookmarkedPosts, postId],
          posts: state.posts.map(post => 
            post.id === postId 
              ? { ...post, bookmarks: isBookmarked ? post.bookmarks - 1 : post.bookmarks + 1 }
              : post
          )
        };
      }),
      toggleFollow: (userId) => set((state) => {
        const isFollowed = state.followedUsers.includes(userId);
        return {
          followedUsers: isFollowed
            ? state.followedUsers.filter((id) => id !== userId)
            : [...state.followedUsers, userId]
        };
      })
    }),
    {
      name: 'resonance-data-storage',
    }
  )
);

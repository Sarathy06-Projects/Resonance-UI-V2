"use client";

import { useState } from "react";
import * as articlesApi from "@/lib/api/articles";
import type { Article } from "@/lib/api/types";

export function useArticleInteractions(article: Article) {
  const [isLiked, setIsLiked] = useState(article.isLiked);
  const [likesCount, setLikesCount] = useState(article.likesCount);
  const [isBookmarked, setIsBookmarked] = useState(article.isBookmarked);
  const [bookmarksCount, setBookmarksCount] = useState(article.bookmarksCount);

  const toggleLike = async () => {
    const next = !isLiked;
    setIsLiked(next);
    setLikesCount((c) => c + (next ? 1 : -1));
    try {
      await (next ? articlesApi.likeArticle(article.id) : articlesApi.unlikeArticle(article.id));
    } catch {
      setIsLiked(!next);
      setLikesCount((c) => c + (next ? -1 : 1));
    }
  };

  const toggleBookmark = async () => {
    const next = !isBookmarked;
    setIsBookmarked(next);
    setBookmarksCount((c) => c + (next ? 1 : -1));
    try {
      await (next ? articlesApi.bookmarkArticle(article.id) : articlesApi.unbookmarkArticle(article.id));
    } catch {
      setIsBookmarked(!next);
      setBookmarksCount((c) => c + (next ? -1 : 1));
    }
  };

  return { isLiked, likesCount, isBookmarked, bookmarksCount, toggleLike, toggleBookmark };
}

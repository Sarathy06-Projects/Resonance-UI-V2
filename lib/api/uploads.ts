import { apiUpload } from "./client";

export function uploadPostImage(file: File) {
  return apiUpload<{ url: string; key: string }>("/api/uploads/image?folder=post-images", file);
}

export function uploadArticleCover(file: File) {
  return apiUpload<{ url: string; key: string }>("/api/uploads/image?folder=article-covers", file);
}

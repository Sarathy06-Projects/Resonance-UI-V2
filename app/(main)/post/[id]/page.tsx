import { permanentRedirect, notFound } from "next/navigation";
import { getPost } from "@/lib/api/posts";
import { ApiError } from "@/lib/api/client";
import { postUrl } from "@/lib/urls";
import { PostDetailView } from "@/components/content/PostDetailView";

// Unlike article/[id] and series/[id] (pure route.ts redirect stubs -
// every article/series always has a slug), this stays a real page:
// discussion posts redirect to /@username/slug (their new canonical home),
// but showcase/feedback posts have no slug at all - too thin for an SEO
// landing page, see lib/slug.ts on the backend - and keep rendering here
// permanently.
export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const post = await getPost(id).catch((err) => {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  });

  if (post.type === "discussion" && post.slug && post.author.username) {
    permanentRedirect(postUrl(post));
  }

  return <PostDetailView post={post} />;
}

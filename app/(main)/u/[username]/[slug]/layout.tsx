import { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";
import { getContentBySlug } from "@/lib/api/content";
import { articleUrl, postUrl } from "@/lib/urls";

// Thin-content guard for discussion posts, matching the sitemap's own
// heuristic (backend posts.ts sitemap-feed) - computed here rather than
// stored, so the threshold stays tunable without a migration. Showcase/
// feedback posts never reach this at all (no slug - see lib/slug.ts on the
// backend - so this route never resolves to one).
const MIN_INDEXABLE_POST_LENGTH = 200;

export async function generateMetadata({ params }: { params: Promise<{ username: string; slug: string }> }): Promise<Metadata> {
  const { username, slug } = await params;

  try {
    const resolved = await getContentBySlug(username, slug);

    if (resolved.type === "article") {
      const { article } = resolved;
      return constructMetadata({
        title: `${article.title} - Resonance`,
        description: article.preview || article.title,
        image: article.coverImage || "/og-image.png",
        canonical: articleUrl(article),
      });
    }

    const { post } = resolved;
    const description = post.content.length > 150 ? `${post.content.slice(0, 150)}...` : post.content;
    return constructMetadata({
      title: `Post by ${post.author.name} - Resonance`,
      description,
      canonical: postUrl(post),
      noIndex: post.content.length < MIN_INDEXABLE_POST_LENGTH,
    });
  } catch {
    return constructMetadata({ title: "Not Found - Resonance", noIndex: true });
  }
}

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return children;
}

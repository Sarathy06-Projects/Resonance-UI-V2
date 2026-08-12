import { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";
import { getPost } from "@/lib/api/posts";
import { postUrl } from "@/lib/urls";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;

  try {
    const post = await getPost(id);

    // Discussion posts redirect away to /@username/slug (see page.tsx) -
    // noindex here so this URL itself never competes with the canonical
    // one for search visibility.
    if (post.type === "discussion" && post.slug) {
      return constructMetadata({ title: `Post by ${post.author.name} - Resonance`, noIndex: true });
    }

    const description = post.content.length > 150 ? `${post.content.slice(0, 150)}...` : post.content;
    return constructMetadata({
      title: `Post by ${post.author.name} - Resonance`,
      description,
      canonical: postUrl(post),
    });
  } catch {
    return constructMetadata({ title: "Post Not Found - Resonance", noIndex: true });
  }
}

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return children;
}

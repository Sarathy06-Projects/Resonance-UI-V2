import { notFound } from "next/navigation";
import { getContentBySlug } from "@/lib/api/content";
import { getSeries } from "@/lib/api/series";
import { ApiError } from "@/lib/api/client";
import { profileUrl } from "@/lib/urls";
import { ArticleDetailView } from "@/components/content/ArticleDetailView";
import { PostDetailView } from "@/components/content/PostDetailView";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://resonance.design";

export default async function ContentPage({ params }: { params: Promise<{ username: string; slug: string }> }) {
  const { username, slug } = await params;

  const resolved = await getContentBySlug(username, slug).catch((err) => {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  });

  if (resolved.type === "article") {
    const { article } = resolved;
    // seriesId is an opaque id (articles reference it directly, not by
    // slug - see db schema comment), so this is a plain GET /:id, not the
    // by-slug resolver.
    const series = article.seriesId ? await getSeries(article.seriesId).catch(() => null) : null;

    const articleJsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      image: article.coverImage ? [article.coverImage] : [],
      datePublished: article.publishedAt || article.createdAt,
      dateModified: article.updatedAt,
      author: [{ "@type": "Person", name: article.author.name, url: `${siteUrl}${profileUrl(article.author)}` }],
    };

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
        <ArticleDetailView article={article} series={series} />
      </>
    );
  }

  const { post } = resolved;
  const postJsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: `Post by ${post.author.name}`,
    author: { "@type": "Person", name: post.author.name, url: `${siteUrl}${profileUrl(post.author)}` },
    datePublished: post.createdAt,
    articleBody: post.content,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(postJsonLd) }} />
      <PostDetailView post={post} />
    </>
  );
}

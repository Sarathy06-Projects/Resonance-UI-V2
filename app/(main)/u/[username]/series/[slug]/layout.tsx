import { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";
import { getSeriesBySlug } from "@/lib/api/series";
import { seriesUrl } from "@/lib/urls";

// Series previously had no layout.tsx / generateMetadata at all - every
// series page got the identical generic site-wide metadata regardless of
// which series it was. New gap fix, not just a URL-scheme change.
export async function generateMetadata({ params }: { params: Promise<{ username: string; slug: string }> }): Promise<Metadata> {
  const { username, slug } = await params;

  try {
    const series = await getSeriesBySlug(username, slug);
    return constructMetadata({
      title: `${series.title} - Resonance`,
      description: series.description || `A ${series.articlesCount}-part series by ${series.author.name} on Resonance.`,
      image: series.coverImage || "/og-image.png",
      canonical: seriesUrl(series),
    });
  } catch {
    return constructMetadata({ title: "Series Not Found - Resonance", noIndex: true });
  }
}

export default function SeriesLayout({ children }: { children: React.ReactNode }) {
  return children;
}

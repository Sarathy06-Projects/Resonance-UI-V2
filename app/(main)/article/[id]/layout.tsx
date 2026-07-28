import { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";
import { getArticle } from "@/lib/api/articles";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  
  try {
    const article = await getArticle(resolvedParams.id);
    return constructMetadata({
      title: `${article.title} - Resonance`,
      description: article.preview || article.title,
      image: article.coverImage || "/og-image.png",
    });
  } catch (error) {
    return constructMetadata({ title: "Article Not Found - Resonance" });
  }
}

export default function ArticleLayout({ children }: { children: React.ReactNode }) {
  return children;
}

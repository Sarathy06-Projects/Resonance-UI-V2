import { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";
import { getPost } from "@/lib/api/posts";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  
  try {
    const post = await getPost(resolvedParams.id);
    return constructMetadata({
      title: `Post by ${post.author.name} - Resonance`,
      description: post.content.slice(0, 150) + "...",
    });
  } catch (error) {
    return constructMetadata({ title: "Post Not Found - Resonance" });
  }
}

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return children;
}

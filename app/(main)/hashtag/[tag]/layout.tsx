import { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const tag = resolvedParams.tag;

  return constructMetadata({
    title: `#${tag} - Resonance`,
    description: `Explore the latest design ideas, articles, and discussions about #${tag} on Resonance.`,
  });
}

export default function HashtagLayout({ children }: { children: React.ReactNode }) {
  return children;
}

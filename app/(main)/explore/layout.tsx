import { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Explore - Resonance",
  description: "Discover trending topics, popular articles, and featured designers on Resonance.",
});

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}

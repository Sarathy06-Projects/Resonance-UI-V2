import { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";
import { getProfile } from "@/lib/api/users";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  
  try {
    const user = await getProfile(resolvedParams.username);
    return constructMetadata({
      title: `${user.name} (@${user.username}) - Resonance`,
      description: user.bio || `Profile of ${user.name} on Resonance.`,
      image: user.image || "/og-image.png",
    });
  } catch (error) {
    return constructMetadata({ title: "Profile Not Found - Resonance" });
  }
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}

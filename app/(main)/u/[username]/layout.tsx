import { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";
import { getProfile } from "@/lib/api/users";
import { profileUrl } from "@/lib/urls";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;

  try {
    const user = await getProfile(username);
    return constructMetadata({
      title: `${user.name} (@${user.username}) - Resonance`,
      description: user.bio || `Profile of ${user.name} on Resonance.`,
      image: user.image || "/og-image.png",
      canonical: profileUrl(user),
    });
  } catch {
    return constructMetadata({ title: "Profile Not Found - Resonance", noIndex: true });
  }
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}

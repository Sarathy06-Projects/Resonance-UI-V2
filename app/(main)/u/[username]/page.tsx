import { notFound } from "next/navigation";
import { getProfile } from "@/lib/api/users";
import { getUserPosts } from "@/lib/api/posts";
import { ApiError } from "@/lib/api/client";
import { profileUrl } from "@/lib/urls";
import { ProfileView } from "@/components/profile/ProfileView";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://resonance.design";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const profile = await getProfile(username).catch((err) => {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  });

  // Default tab ("posts") is fetched server-side so it's actually present
  // in the initial HTML - the other tabs (articles/collections/etc.) stay
  // client-fetched on demand when switched to, same as before. That's the
  // one tab a crawler (or a visitor with JS disabled) ever sees, so it's
  // the one worth paying for server-side.
  const initialPosts = await getUserPosts(profile.id).catch(() => null);

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    url: `${siteUrl}${profileUrl(profile)}`,
    image: profile.image,
    description: profile.bio,
    jobTitle: profile.role,
    ...(profile.company && { worksFor: { "@type": "Organization", name: profile.company } }),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
      <ProfileView profile={profile} initialPosts={initialPosts} />
    </>
  );
}

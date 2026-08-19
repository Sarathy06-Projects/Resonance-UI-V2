import { notFound } from "next/navigation";
import { getProfile } from "@/lib/api/users";
import { getUserPosts } from "@/lib/api/posts";
import { ApiError } from "@/lib/api/client";
import { profileUrl } from "@/lib/urls";
import { ProfileView } from "@/components/profile/ProfileView";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSiteUrl } from "@/lib/siteUrl";

const siteUrl = getSiteUrl();

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
      {/* Via JsonLd, never a hand-rolled script tag: name, bio, role and
          company are free text the profile owner controls, and raw
          JSON.stringify would let any of them close this element. */}
      <JsonLd id="person-json-ld" data={personJsonLd} />
      <ProfileView profile={profile} initialPosts={initialPosts} />
    </>
  );
}

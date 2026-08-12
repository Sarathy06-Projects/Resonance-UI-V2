import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

// Renders fine from either a Server or Client Component - no state, no
// handlers, purely presentational (Next server-renders the full tree
// either way, so this being imported into a "use client" detail view
// doesn't cost the SEO benefit - see the ArticleCard fix's comment for why).
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mb-4 flex-wrap">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5 min-w-0">
          {i > 0 && <ChevronRight className="w-3 h-3 text-zinc-300 dark:text-zinc-700 shrink-0" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors truncate">
              {item.label}
            </Link>
          ) : (
            <span className="text-zinc-900 dark:text-zinc-200 font-medium truncate">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

// Separate from the visible component above because JSON-LD needs absolute
// URLs (siteUrl-prefixed) while the visible nav uses relative hrefs -
// callers build both from the same underlying crumb data.
export function breadcrumbJsonLd(items: { label: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      item: item.url,
    })),
  };
}

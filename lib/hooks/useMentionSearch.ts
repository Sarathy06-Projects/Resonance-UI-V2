"use client";

import { useEffect, useState } from "react";
import { search } from "@/lib/api/search";
import type { Author } from "@/lib/api/types";

// Debounced wrapper over the existing unified search endpoint scoped to
// users (GET /api/search?type=users) - no dedicated mention-search endpoint
// needed, this is exactly what the composer's @-autocomplete needs.
export function useMentionSearch(query: string) {
  const [results, setResults] = useState<Author[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setIsLoading(true);
      search(query, "users")
        .then((res) => {
          if (!cancelled) setResults(res.users.slice(0, 8));
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Empty query is derived directly rather than reset via effect+setState -
  // avoids a synchronous setState-in-effect for a value that's just `[]`.
  return { results: query ? results : [], isLoading: query ? isLoading : false };
}

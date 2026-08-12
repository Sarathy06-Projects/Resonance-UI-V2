interface JsonLdProps {
  // Each call site must pass its own unique id (used only as a React key /
  // DOM id, not for any next/script dedup behavior - see below).
  id: string;
  data: Record<string, any>;
}

// Deliberately a plain <script> tag, not next/script's <Script>. Structured
// data needs to exist in the raw server-rendered HTML for crawlers that
// don't execute JavaScript, and for the reliability of ones that do.
// next/script's "beforeInteractive" strategy does NOT put the tag in the
// initial HTML at all - it serializes it into a `self.__next_s.push(...)`
// array that only gets turned into a real <script> element client-side
// after hydration, which was confirmed live on this app (curl'd prod HTML
// for "/" showed exactly that JS-array encoding, no actual
// <script type="application/ld+json"> tag present). A plain element in the
// JSX tree, by contrast, is unconditionally part of SSR output.
export function JsonLd({ id, data }: JsonLdProps) {
  return <script id={id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

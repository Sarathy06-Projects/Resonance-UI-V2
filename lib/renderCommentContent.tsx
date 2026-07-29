import type { ReactNode } from "react";

// Small hand-rolled markdown-subset + mention/hashtag renderer for comment
// content. Deliberately not a general markdown engine (no nesting, no
// lists/headings - comments are short-form) and it renders straight to
// React elements rather than HTML, so there's no dangerouslySetInnerHTML /
// sanitization step to get wrong.

const TOKEN_RE =
  /(\*\*([^*\n]+)\*\*)|(\*([^*\n]+)\*)|(`([^`\n]+)`)|(\[([^\]\n]+)\]\(((?:https?:\/\/)[^\s)]+)\))|(@([a-zA-Z0-9_]{2,30}))|(#([a-zA-Z][a-zA-Z0-9_]{0,49}))|(\n)/g;

export interface RenderCommentContentOptions {
  onMentionClick?: (username: string) => void;
  onHashtagClick?: (tag: string) => void;
}

export function renderCommentContent(content: string, opts: RenderCommentContentOptions = {}): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  const re = new RegExp(TOKEN_RE);
  while ((match = re.exec(content))) {
    if (match.index > lastIndex) {
      nodes.push(content.slice(lastIndex, match.index));
    }

    if (match[2] !== undefined) {
      nodes.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[4] !== undefined) {
      nodes.push(<em key={key++}>{match[4]}</em>);
    } else if (match[6] !== undefined) {
      nodes.push(
        <code key={key++} className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[0.9em] font-mono">
          {match[6]}
        </code>
      );
    } else if (match[8] !== undefined && match[9] !== undefined) {
      nodes.push(
        <a
          key={key++}
          href={match[9]}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-blue-600 dark:text-blue-400 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {match[8]}
        </a>
      );
    } else if (match[11] !== undefined) {
      const username = match[11];
      nodes.push(
        <button
          key={key++}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            opts.onMentionClick?.(username);
          }}
          className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
        >
          @{username}
        </button>
      );
    } else if (match[13] !== undefined) {
      const tag = match[13];
      nodes.push(
        <button
          key={key++}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            opts.onHashtagClick?.(tag);
          }}
          className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
        >
          #{tag}
        </button>
      );
    } else if (match[14] !== undefined) {
      nodes.push(<br key={key++} />);
    }

    lastIndex = re.lastIndex;
  }

  if (lastIndex < content.length) {
    nodes.push(content.slice(lastIndex));
  }

  return nodes;
}

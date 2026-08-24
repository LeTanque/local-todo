export type TextPart =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string };

const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"'`]+/gi;
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

function trimUrlMatch(raw: string): { url: string; trailing: string } {
  let url = raw;
  let trailing = "";
  const punctuation = url.match(TRAILING_PUNCTUATION);
  if (punctuation) {
    url = url.slice(0, -punctuation[0].length);
    trailing = punctuation[0];
  }

  const closingParens = url.split(")").length - 1;
  const openingParens = url.split("(").length - 1;
  if (url.endsWith(")") && closingParens > openingParens) {
    url = url.slice(0, -1);
    trailing = `)${trailing}`;
  }

  return { url, trailing };
}

export function toSafeHref(raw: string): string | null {
  const candidate = raw.startsWith("www.") ? `https://${raw}` : raw;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

function pushText(parts: TextPart[], value: string) {
  if (!value) return;
  const last = parts.at(-1);
  if (last?.type === "text") {
    last.value += value;
    return;
  }
  parts.push({ type: "text", value });
}

export function parseLinkedText(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const raw = match[0];
    const index = match.index ?? 0;
    const { url, trailing } = trimUrlMatch(raw);
    const href = toSafeHref(url);

    if (index > lastIndex) {
      pushText(parts, text.slice(lastIndex, index));
    }

    if (href) {
      parts.push({ type: "link", value: url, href });
      pushText(parts, trailing);
    } else {
      pushText(parts, raw);
    }

    lastIndex = index + raw.length;
  }

  if (lastIndex < text.length) {
    pushText(parts, text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [{ type: "text", value: text }];
}

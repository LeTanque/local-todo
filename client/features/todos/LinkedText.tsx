"use client";

import type { MouseEvent } from "react";
import { parseLinkedText } from "./linkify";

type LinkedTextProps = {
  text: string;
};

function handleLinkClick(event: MouseEvent<HTMLAnchorElement>) {
  event.stopPropagation();
}

export function LinkedText({ text }: LinkedTextProps) {
  return (
    <>
      {parseLinkedText(text).map((part, index) =>
        part.type === "link" ? (
          <a
            className="todo-link"
            href={part.href}
            key={`${index}-${part.href}`}
            onClick={handleLinkClick}
            rel="noopener noreferrer"
            target="_blank"
          >
            {part.value}
          </a>
        ) : (
          <span key={`${index}-${part.value}`}>{part.value}</span>
        ),
      )}
    </>
  );
}

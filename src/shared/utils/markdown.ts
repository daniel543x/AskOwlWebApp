import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true, async: false });

export function renderMarkdown(text: string): string {
  return marked.parse(text, { async: false });
}

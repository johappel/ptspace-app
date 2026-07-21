import { describe, expect, it } from "vitest";
import { markdownToHtml, htmlToMarkdown, escapeHtml } from "../src/lib/markdown";

/**
 * Regression coverage for the reported symptom "kernel data is not or only
 * partially rendered". Conversation and Denkstand content is written into the
 * DOM via `{@html markdownToHtml(...)}`. These tests assert that the content
 * actually becomes visible DOM nodes and that user text stays escaped.
 */

function renderIntoDom(markdown: string): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = markdownToHtml(markdown);
  return host;
}

describe("markdownToHtml", () => {
  it("renders a Critical Friend paragraph as visible text in the DOM", () => {
    const host = renderIntoDom("Lass uns das Lernanliegen klären.");
    expect(host.querySelector("p")).not.toBeNull();
    expect(host.textContent).toContain("Lass uns das Lernanliegen klären.");
  });

  it("renders headings and bullet lists from the Denkstand", () => {
    const host = renderIntoDom("# Lernanliegen\n## Lernreise\n- Einstieg\n- Vertiefung");
    expect(host.querySelector("h1")?.textContent).toBe("Lernanliegen");
    expect(host.querySelector("h2")?.textContent).toBe("Lernreise");
    const items = Array.from(host.querySelectorAll("ul li")).map((item) => item.textContent);
    expect(items).toEqual(["Einstieg", "Vertiefung"]);
  });

  it("escapes user-supplied HTML so content cannot inject markup", () => {
    const host = renderIntoDom("<script>alert('x')<\/script> und & Zeichen");
    expect(host.querySelector("script")).toBeNull();
    expect(host.textContent).toContain("<script>");
    expect(host.textContent).toContain("& Zeichen");
  });

  it("drops empty lines instead of rendering empty paragraphs", () => {
    const host = renderIntoDom("Erste Zeile\n\nZweite Zeile");
    expect(host.querySelectorAll("p")).toHaveLength(2);
  });
});

describe("escapeHtml", () => {
  it("encodes the five sensitive characters", () => {
    expect(escapeHtml("<a href=\"x\">&'")).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  });
});

describe("htmlToMarkdown round trip", () => {
  it("keeps headings and lists stable when editing the Denkstand", () => {
    const markdown = "# Titel\n## Abschnitt\n- Punkt A\n- Punkt B";
    expect(htmlToMarkdown(markdownToHtml(markdown))).toBe(markdown);
  });
});

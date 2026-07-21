// Gemeinsame, testbare Darstellungshelfer für Gesprächsbeiträge und Denkstand.
// Diese Funktionen entscheiden, welcher Text tatsächlich als HTML im Denkraum
// erscheint. Sie liegen bewusst außerhalb der großen Seitenkomponente, damit
// automatische Tests prüfen können, dass Inhalte wirklich gerendert werden.

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export function markdownToHtml(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) => {
      const safeLine = escapeHtml(line);
      return safeLine.startsWith("## ")
        ? `<h2>${safeLine.slice(3)}</h2>`
        : safeLine.startsWith("# ")
          ? `<h1>${safeLine.slice(2)}</h1>`
          : safeLine.startsWith("- ")
            ? `<li>${safeLine.slice(2)}</li>`
            : safeLine
              ? `<p>${safeLine}</p>`
              : "";
    })
    .join("")
    .replace(/(<li>.*?<\/li>)+/g, (items) => `<ul>${items}</ul>`);
}

export function htmlToMarkdown(html: string): string {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  return Array.from(parsed.body.children)
    .map((node) =>
      node.tagName === "H1"
        ? `# ${node.textContent}`
        : node.tagName === "H2"
          ? `## ${node.textContent}`
          : node.tagName === "UL"
            ? Array.from(node.querySelectorAll("li")).map((item) => `- ${item.textContent}`).join("\n")
            : node.textContent?.trim() || ""
    )
    .filter(Boolean)
    .join("\n");
}

import { requestUrl } from "obsidian";
import * as cheerio from "cheerio";

export async function getShamelaContent(startIndex: number, endIndex: number): Promise<string> {
  let markdown = "";

  for (let index = startIndex; index <= endIndex; index++) {
    const url = `https://shamela.ws/book/3722/${index}`;
    const html = await getHtmlContent(url);
    markdown += extractMarkdownFromHtml(html);
  }

  return markdown;
}

function extractMarkdownFromHtml(html: string): string {
  const data = cheerio.load(html);

  let markdown = "";

  // Convert each <p> block, excluding .hamesh
  data(".nass p").each((_: any, el: any) => {
    const $el = data(el);
    if ($el.hasClass("hamesh")) return; // Exclude hamesh

    // Remove anchor and button from text
    $el.find(".anchor, .btn_tag").remove();
    let text = $el.text().trim();

    // Bold for .c5
    $el.find(".c5").each((_: any, span: any) => {
      const spanText = data(span).text();
      text = text.replace(spanText, `**${spanText}**`);
    });

    // Superscript for .c2 (for numbers)
    $el.find(".c2").each((_: any, span: any) => {
      const spanText = data(span).text();
      text = text.replace(spanText, `(${spanText})`);
    });

    // Replace repeated brackets with a single bracket (handles (), [], {}, Arabic brackets)
    text = text
      .replace(/\(\(+/g, "(")
      .replace(/\)+/g, ")")
      .replace(/\[\[+/g, "[")
      .replace(/\]+/g, "]")
      .replace(/\{\{+/g, "{")
      .replace(/\}+/g, "}")
      // Arabic brackets: (( -> ( and )) -> )
      .replace(/\u06dd+/g, ""); // Remove Arabic end of ayah if repeated (optional)
    // For Arabic parentheses (U+FD3E, U+FD3F)
    text = text.replace(/[\uFD3E]{2,}/g, "\uFD3E").replace(/[\uFD3F]{2,}/g, "\uFD3F");
    markdown += `${text}\n\n`;
  });

  return markdown.trim();
}

async function getHtmlContent(url: string): Promise<string> {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const response = await requestUrl({
        url,
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Obsidian plugin)",
        },
      });
      return response.text;
    } catch (err) {
      lastError = err;
      if (attempt < 5) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }
  throw lastError;
}

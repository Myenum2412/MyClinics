import sanitizeHtml from "sanitize-html";

const DANGEROUS_CSS =
  /(@import[^;]+;?|expression\s*\([^)]*\)|(?:javascript|vbscript)\s*:|\bbehavior\s*:[^;]+;?|-moz-binding\s*:[^;]+;?|<\/?style[^>]*>)/gi;

const DANGEROUS_INLINE_STYLE =
  /(?:javascript|vbscript)\s*:|expression\s*\(|-moz-binding\s*:|behavior\s*:/i;

/** Decodes numeric HTML entities so `java&#115;cript:` cannot slip through. */
function decodeNumericEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec) => String.fromCodePoint(Number(dec)));
}

/**
 * sanitize-html scrubs tags and attributes, but `style` values are opaque to
 * it. Strip event-bearing URLs and CSS expressions from inline styles too.
 */
function sanitizeInlineStyles(html: string): string {
  return html.replace(/\sstyle="([^"]*)"/gi, (match, css: string) => {
    if (DANGEROUS_INLINE_STYLE.test(decodeNumericEntities(css))) return "";
    const cleaned = css.replace(
      /url\s*\(\s*(['"]?)\s*(?!https?:)[^)]*\)/gi,
      "none"
    );
    return cleaned === css ? match : ` style="${cleaned}"`;
  });
}

/**
 * GrapesJS stores the editable HTML and CSS separately from its project JSON.
 * The HTML is rendered on the public site with `dangerouslySetInnerHTML`, so it
 * has to be scrubbed even though only clinic admins can publish it.
 */
export function sanitizeWebsitePageData(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;

  const record = data as Record<string, unknown>;
  const next: Record<string, unknown> = { ...record };

  if (typeof record.html === "string") {
    const cleaned = sanitizeHtml(record.html, {
      allowedTags: [
        "a",
        "abbr",
        "address",
        "article",
        "aside",
        "audio",
        "b",
        "blockquote",
        "br",
        "button",
        "caption",
        "code",
        "col",
        "colgroup",
        "dd",
        "div",
        "dl",
        "dt",
        "em",
        "figcaption",
        "figure",
        "footer",
        "form",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "header",
        "hr",
        "i",
        "iframe",
        "img",
        "input",
        "label",
        "li",
        "main",
        "mark",
        "nav",
        "ol",
        "option",
        "p",
        "picture",
        "pre",
        "s",
        "section",
        "select",
        "small",
        "source",
        "span",
        "strong",
        "sub",
        "sup",
        "table",
        "tbody",
        "td",
        "textarea",
        "tfoot",
        "th",
        "thead",
        "tr",
        "u",
        "ul",
        "video",
      ],
      allowedAttributes: {
        "*": [
          "class",
          "id",
          "style",
          "title",
          "role",
          "aria-*",
          "data-*",
          "hidden",
          "tabindex",
        ],
        a: ["href", "target", "rel", "name"],
        img: ["src", "alt", "width", "height", "loading", "srcset", "sizes"],
        iframe: [
          "src",
          "width",
          "height",
          "title",
          "allow",
          "allowfullscreen",
          "frameborder",
          "loading",
          "referrerpolicy",
        ],
        video: [
          "src",
          "width",
          "height",
          "controls",
          "autoplay",
          "loop",
          "muted",
          "poster",
          "playsinline",
        ],
        audio: ["src", "controls", "autoplay", "loop", "muted"],
        source: ["src", "srcset", "type", "media", "sizes"],
        form: ["action", "method", "name", "target"],
        input: [
          "type",
          "name",
          "value",
          "placeholder",
          "required",
          "disabled",
          "checked",
          "readonly",
          "min",
          "max",
          "step",
          "pattern",
          "autocomplete",
        ],
        button: ["type", "name", "value", "disabled"],
        select: ["name", "required", "disabled", "multiple"],
        option: ["value", "selected", "disabled"],
        textarea: [
          "name",
          "placeholder",
          "required",
          "disabled",
          "readonly",
          "rows",
          "cols",
        ],
        label: ["for"],
      },
      allowedSchemes: ["http", "https", "mailto", "tel"],
      allowedSchemesByTag: {
        img: ["http", "https", "data"],
        iframe: ["http", "https"],
        video: ["http", "https"],
        audio: ["http", "https"],
        source: ["http", "https"],
      },
      allowProtocolRelative: false,
      disallowedTagsMode: "discard",
      transformTags: {
        a: (tagName, attribs) => {
          if (attribs.target === "_blank") {
            attribs.rel = "noopener noreferrer";
          }
          return { tagName, attribs };
        },
      },
    });
    next.html = sanitizeInlineStyles(cleaned);
  }

  if (typeof record.css === "string") {
    next.css = record.css
      .replace(
        /url\s*\(\s*(['"]?)\s*(?:javascript|vbscript|data):[^)]*\)/gi,
        "none"
      )
      .replace(DANGEROUS_CSS, "")
      .replace(/none\)/g, "none");
  }

  return next;
}

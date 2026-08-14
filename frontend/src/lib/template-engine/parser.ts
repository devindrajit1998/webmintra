import type {
  AssetRef,
  Confidence,
  DetectedForm,
  EditableField,
  FieldKind,
  Issue,
  NavGroup,
  NavItem,
  PageAnalysis,
  Repeater,
  SectionNode,
  SeoData,
  TemplateAnalysis,
  ThemeTokens,
} from "./types";

const SKIP_TAGS = new Set(["HTML", "HEAD", "META", "LINK", "TITLE", "SCRIPT", "STYLE", "BASE"]);
const SOCIAL = ["twitter", "x.com", "facebook", "instagram", "linkedin", "dribbble", "github", "youtube", "tiktok", "behance"];

let uid = 0;
const nid = (p: string) => `${p}${++uid}`;

/* ---------------------------------- utils --------------------------------- */

const text = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ").trim();
const cls = (el: Element) => (el.getAttribute("class") ?? "").toLowerCase();
const teid = (el: Element) => el.getAttribute("data-te-id") ?? "";
const isCurrency = (s: string) => /^[^\d]{0,3}\s?[\d][\d.,]*\s?(usd|eur|gbp|inr|\/\s?\w+)?$/i.test(s) && /[$€£₹]/.test(s);
const isNumberish = (s: string) => /^[\d][\d.,%+x×]*$/i.test(s) && s.length < 12;
const isDateish = (s: string) =>
  /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s*\d{0,4}$/i.test(s) ||
  /^\d{4}-\d{2}-\d{2}$/.test(s);

function classSignature(el: Element) {
  const c = cls(el)
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
  return `${el.tagName}|${c}|${el.children.length}`;
}

function looksLikeButton(el: Element) {
  if (el.tagName === "BUTTON") return true;
  if (el.getAttribute("role") === "button") return true;
  if (el.tagName === "A" && /\b(btn|button|cta)\b/.test(cls(el))) return true;
  if (el.tagName === "INPUT" && ["submit", "button"].includes((el.getAttribute("type") ?? "").toLowerCase())) return true;
  return false;
}

function buttonVariant(el: Element) {
  const c = cls(el);
  const style = (el.getAttribute("style") ?? "").toLowerCase();
  if (/primary|solid|filled/.test(c) || /background:\s*#(0|1|2)/.test(style)) return "primary";
  if (/secondary|outline|ghost|link/.test(c)) return "secondary";
  return "cta";
}

function imageRole(el: Element): string {
  const hint = `${cls(el)} ${el.getAttribute("alt") ?? ""} ${el.getAttribute("src") ?? ""}`.toLowerCase();
  const w = Number(el.getAttribute("width") ?? 0);
  if (/logo|brand|wordmark/.test(hint)) return "logo";
  if (/avatar|portrait|headshot|team|profile/.test(hint)) return "avatar";
  if (/icon/.test(hint) || (w > 0 && w <= 48)) return "icon";
  if (/hero|banner|cover|og/.test(hint)) return "banner";
  if (/gallery|work|portfolio|screenshot/.test(hint)) return "gallery";
  if (el.closest(".card,[class*=card]")) return "card";
  return "content";
}

function classifyText(el: Element, value: string): { kind: FieldKind; confidence: Confidence } | null {
  if (!value || value.length > 900) return null;
  const tag = el.tagName;
  if (isCurrency(value)) return { kind: "currency", confidence: "High" };
  if (isDateish(value)) return { kind: "date", confidence: "Medium" };
  if (isNumberish(value)) return { kind: "number", confidence: "Medium" };
  if (tag === "H1") return { kind: "title", confidence: "High" };
  if (tag === "H2" || tag === "H3") return { kind: "subtitle", confidence: "High" };
  if (tag === "H4" || tag === "H5" || tag === "H6") return { kind: "subtitle", confidence: "Medium" };
  if (tag === "BLOCKQUOTE" || tag === "Q") return { kind: "quote", confidence: "High" };
  if (tag === "P") {
    if (value.length > 320) return { kind: "longtext", confidence: "High" };
    if (el.querySelector("a,strong,em,b,i")) return { kind: "richtext", confidence: "Medium" };
    return { kind: "description", confidence: "High" };
  }
  if (tag === "FIGCAPTION" || tag === "SMALL") return { kind: "caption", confidence: "High" };
  if (tag === "LABEL") return { kind: "caption", confidence: "High" };
  if (tag === "LI" && el.children.length === 0) return { kind: "description", confidence: "Medium" };
  if (tag === "SPAN" || tag === "STRONG" || tag === "EM" || tag === "DIV") {
    if (el.children.length > 0) return null;
    if (value.length < 40) return { kind: "badge", confidence: value.length < 24 ? "Medium" : "Low" };
    return { kind: "description", confidence: "Low" };
  }
  return null;
}

const kindLabels: Record<FieldKind, string> = {
  title: "Title",
  subtitle: "Subtitle",
  description: "Description",
  longtext: "Long text",
  richtext: "Rich text",
  caption: "Caption",
  quote: "Quote",
  badge: "Badge",
  number: "Number",
  currency: "Currency",
  date: "Date",
  link: "Link",
  button: "Button",
  image: "Image",
  video: "Video",
  svg: "SVG",
  table: "Table",
};

/* -------------------------------- repeaters ------------------------------- */

function repeaterType(sampleText: string, container: Element, item: Element): string {
  const section = container.closest("section,main,article,div[id],div[class]");
  const heading = section?.querySelector(":scope > h1,:scope > h2,:scope > h3,header h1,header h2,header h3");
  const headingText = heading ? text(heading).toLowerCase() : "";
  const t = `${headingText} ${sampleText} ${cls(container)} ${cls(item)} ${section?.getAttribute("id") ?? ""}`.toLowerCase();

  if (/faq|frequently asked|questions|q&a|\?/.test(t)) return "FAQ";
  if (/testimonial|review|“|"|says|rating|feedback/.test(t)) return "Testimonials";
  if (/pricing|plan|tier|\/mo|\/yr|billed|month/.test(t) || (/\$|usd|eur|gbp|inr/.test(sampleText) && /\/|per|month|year/.test(sampleText))) return "Pricing";
  if (/team|founder|director|lead|principal|staff|member/.test(t)) return "Team";
  if (/blog|article|read more|post|news/.test(t)) return "Blog posts";
  if (/product|buy|add to cart|sku|shop/.test(t)) return "Products";
  if (/service|what we do|offering/.test(t)) return "Services";
  if (/feature|benefit|why choose/.test(t)) return "Features";
  if (/gallery|work|portfolio|shots/.test(t)) return "Gallery";
  if (/logo|trusted by|clients|partners/.test(t)) return "Logo wall";
  return "Cards";
}

function truncateLabel(value: string, limit = 48) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > limit ? `${normalized.slice(0, limit - 1).trimEnd()}…` : normalized;
}

function meaningfulItemLabel(item: Element, index: number, type: string) {
  const heading = item.querySelector("h1,h2,h3,h4,h5,h6,summary,button,strong");
  const labelled = item.getAttribute("aria-label") ?? item.getAttribute("title") ?? item.querySelector("[aria-label],[title]")?.getAttribute("aria-label") ?? item.querySelector("[aria-label],[title]")?.getAttribute("title");
  const imageAlt = item.querySelector("img[alt]")?.getAttribute("alt");
  const value = text(heading ?? item) || labelled || imageAlt;
  if (value) return truncateLabel(value);
  const singular = type.replace(/ies$/i, "y").replace(/s$/i, "") || "Content item";
  return `${singular} ${index + 1}`;
}

function meaningfulRepeaterLabel(type: string, container: Element, firstItem: Element) {
  const section = container.closest("section,main,article,div[id],div[class]");
  const heading = section?.querySelector(":scope > h1,:scope > h2,:scope > h3,header h1,header h2,header h3");
  if (heading && !firstItem.contains(heading)) {
    const headingVal = truncateLabel(text(heading));
    if (headingVal.length > 2) return headingVal;
  }
  if (type !== "Cards") return type;
  if (firstItem.querySelector("img[alt]")) return "Image collection";
  const firstLabel = meaningfulItemLabel(firstItem, 0, "Content item");
  return `${firstLabel} collection`;
}

function meaningfulSectionName(container: Element): string {
  // 1. Check direct tags
  const headerEl = container.closest("header, nav, [id*='header'], [class*='header'], [id*='nav'], [class*='nav']");
  if (headerEl) return "Header";

  const footerEl = container.closest("footer, [id*='footer'], [class*='footer']");
  if (footerEl) return "Footer";

  // 2. Search upwards for enclosing section or block
  let curr: Element | null = container;
  while (curr && curr !== document.body) {
    // Check heading inside this container or previous sibling
    const heading = curr.querySelector(":scope > h1, :scope > h2, :scope > h3, :scope > div > h1, :scope > div > h2, :scope > div > h3, :scope > header > h1, :scope > header > h2, :scope > header > h3");
    if (heading && text(heading).length > 2) {
      const hText = text(heading);
      const hLower = hText.toLowerCase();
      if (/faq|frequently asked|questions/.test(hLower)) return "FAQ";
      if (/pricing|plans|packages|investment/.test(hLower)) return "Pricing";
      if (/review|testimonial|client stories|praise/.test(hLower)) return "Testimonials";
      if (/service|what we do|offering/.test(hLower)) return "Services";
      if (/gallery|portfolio|featured work|celebration/.test(hLower)) return "Portfolio & Gallery";
      if (/about|story|team|meet/.test(hLower)) return "About & Story";
      if (/feature|why choose|highlights/.test(hLower)) return "Features";
      if (/contact|booking|get in touch/.test(hLower)) return "Contact & Booking";
      return truncateLabel(hText, 30);
    }

    const t = `${cls(curr)} ${curr.getAttribute("id") ?? ""}`.toLowerCase();
    if (/hero|banner|intro|welcome/.test(t)) return "Hero";
    if (/faq|questions/.test(t)) return "FAQ";
    if (/pricing|packages|price/.test(t)) return "Pricing";
    if (/testimonial|reviews/.test(t)) return "Testimonials";
    if (/service/.test(t)) return "Services";
    if (/gallery|portfolio|work/.test(t)) return "Portfolio & Gallery";
    if (/about|team/.test(t)) return "About & Story";
    if (/feature/.test(t)) return "Features";
    if (/contact|booking/.test(t)) return "Contact & Booking";

    curr = curr.parentElement;
  }

  return "Page Section";
}

function detectRepeaters(doc: Document): Repeater[] {
  const out: Repeater[] = [];
  // Traverse DOM in document order
  const allContainers = Array.from(doc.querySelectorAll("*"));
  allContainers.forEach((container) => {
    const kids = Array.from(container.children).filter((k) => !SKIP_TAGS.has(k.tagName));
    if (kids.length < 2) return;
    const groups = new Map<string, Element[]>();
    kids.forEach((k) => {
      const sig = classSignature(k);
      groups.set(sig, [...(groups.get(sig) ?? []), k]);
    });
    for (const [, items] of groups) {
      const first = items[0];
      if (items.length < 2 || items.length !== kids.length || !first) continue;
      const depth = first.querySelectorAll("*").length;
      const sample = text(first);
      const fieldsPerItem = Math.max(1, first.querySelectorAll("h1,h2,h3,h4,p,span,img,a,blockquote,li,td").length);
      const type = repeaterType(sample, container, first);
      const label = meaningfulRepeaterLabel(type, container, first);
      const sectionName = meaningfulSectionName(container);
      const confidence: Confidence = depth >= 2 && sample.length > 4 ? "High" : depth >= 1 ? "Medium" : "Low";
      out.push({
        id: nid("rep"),
        containerId: teid(container),
        label,
        type,
        sectionName,
        itemIds: items.map((i) => teid(i)),
        itemLabels: items.map((item, index) => meaningfulItemLabel(item, index, type)),
        fieldsPerItem,
        confidence,
      });
    }
  });
  // drop nested and overlapping duplicates (keep top-level distinct repeaters)
  const seenContainers = new Set<string>();
  const filtered = out.filter((r) => {
    if (seenContainers.has(r.containerId)) return false;
    seenContainers.add(r.containerId);
    return !out.some((o) => o !== r && o.itemIds.some((id) => r.containerId === id));
  });
  return filtered;
}

/* ------------------------------- navigation ------------------------------- */

function navItemsFrom(list: Element): NavItem[] {
  return Array.from(list.children)
    .map((li) => {
      const a = li.querySelector("a");
      if (!a) return null;
      const href = a.getAttribute("href") ?? "#";
      const sub = li.querySelector("ul");
      return {
        id: teid(a),
        label: text(a),
        href,
        external: /^https?:\/\//.test(href),
        children: sub ? navItemsFrom(sub) : [],
      } as NavItem;
    })
    .filter(Boolean) as NavItem[];
}

function detectNav(doc: Document): NavGroup[] {
  const groups: NavGroup[] = [];
  const seen = new Set<Element>();
  const push = (list: Element, kind: NavGroup["kind"], label: string) => {
    if (seen.has(list)) return;
    const items = navItemsFrom(list);
    if (items.length < 2) return;
    seen.add(list);
    groups.push({ id: nid("nav"), label, kind, items });
  };
  doc.querySelectorAll("header ul, nav ul").forEach((ul, i) => push(ul, "header", i === 0 ? "Header navigation" : `Header menu ${i + 1}`));
  doc.querySelectorAll("footer ul").forEach((ul, i) => push(ul, "footer", `Footer menu ${i + 1}`));
  doc.querySelectorAll("aside ul").forEach((ul) => push(ul, "side", "Side navigation"));
  return groups;
}

/* ---------------------------------- forms --------------------------------- */

function formType(form: Element): string {
  const t = `${text(form)} ${cls(form)} ${form.closest("section")?.getAttribute("id") ?? ""}`.toLowerCase();
  if (/newsletter|subscribe|sign up for/.test(t)) return "Newsletter";
  if (/book|booking|reserve/.test(t)) return "Booking";
  if (/appointment|schedule/.test(t)) return "Appointment";
  if (/register|create account|sign up/.test(t)) return "Registration";
  if (/quote|estimate|budget/.test(t)) return "Quote request";
  return "Contact form";
}

function detectForms(doc: Document): DetectedForm[] {
  return Array.from(doc.querySelectorAll("form")).map((form) => {
    const fields = Array.from(form.querySelectorAll("input,textarea,select"))
      .filter((f) => !["submit", "button", "hidden"].includes((f.getAttribute("type") ?? "").toLowerCase()))
      .map((f) => {
        const id = f.getAttribute("id");
        const label = id ? text(form.querySelector(`label[for="${id}"]`) ?? f) : f.getAttribute("name") ?? "Field";
        return {
          id: teid(f),
          label: label || f.getAttribute("name") || "Field",
          placeholder: f.getAttribute("placeholder") ?? "",
          type: f.tagName === "TEXTAREA" ? "textarea" : f.getAttribute("type") ?? "text",
          required: f.hasAttribute("required"),
        };
      });
    const submit = form.querySelector("button,input[type=submit]");
    const type = formType(form);
    return {
      id: nid("form"),
      label: type,
      type,
      fields,
      submitId: submit ? teid(submit) : undefined,
      submitLabel: submit ? text(submit) || "Submit" : "Submit",
      confidence: fields.length >= 2 ? "High" : ("Medium" as Confidence),
    };
  });
}

/* ----------------------------------- seo ---------------------------------- */

function detectSeo(doc: Document): SeoData {
  const meta = (sel: string, attr = "content") => doc.querySelector(sel)?.getAttribute(attr) ?? "";
  return {
    title: doc.querySelector("title")?.textContent?.trim() ?? "",
    description: meta('meta[name="description"]'),
    keywords: meta('meta[name="keywords"]'),
    canonical: meta('link[rel="canonical"]', "href"),
    ogTitle: meta('meta[property="og:title"]'),
    ogDescription: meta('meta[property="og:description"]'),
    ogImage: meta('meta[property="og:image"]'),
    twitterCard: meta('meta[name="twitter:card"]'),
    robots: meta('meta[name="robots"]'),
    favicon: meta('link[rel="icon"]', "href"),
    schema: !!doc.querySelector('script[type="application/ld+json"]'),
  };
}

/* ---------------------------------- theme --------------------------------- */

function detectTheme(docs: Document[]): { theme: ThemeTokens; sourceColors: string[] } {
  const counts = new Map<string, number>();
  const fonts: string[] = [];
  let radius = "";
  docs.forEach((doc) => {
    const styleText = Array.from(doc.querySelectorAll("style")).map((s) => s.textContent ?? "").join("\n");
    const inline = Array.from(doc.querySelectorAll("[style]")).map((e) => e.getAttribute("style") ?? "").join(";");
    const all = `${styleText};${inline}`;
    (all.match(/#[0-9a-f]{6}\b/gi) ?? []).forEach((hex) => {
      const h = hex.toLowerCase();
      counts.set(h, (counts.get(h) ?? 0) + 1);
    });
    (all.match(/font-family:\s*([^;}]+)/gi) ?? []).forEach((f) => fonts.push((f.split(":")[1] ?? "").trim()));
    const r = all.match(/border-radius:\s*([\d.]+px)/i);
    if (r?.[1] && !radius) radius = r[1];
  });
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([h]) => h);
  const rgb = (h: string): [number, number, number] => {
    const v = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) || 0);
    return [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0];
  };
  const lum = (h: string) => {
    const [r, g, b] = rgb(h);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  };
  const sat = (h: string) => {
    const [r, g, b] = rgb(h);
    return (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
  };
  const vivid = ranked.filter((h) => sat(h) > 0.25);
  const lights = ranked.filter((h) => lum(h) > 0.9);
  const darks = ranked.filter((h) => lum(h) < 0.28);
  const mids = ranked.filter((h) => lum(h) >= 0.28 && lum(h) <= 0.9 && sat(h) <= 0.25);
  const theme: ThemeTokens = {
    primary: vivid[0] ?? "#0ea5a4",
    secondary: darks[0] ?? "#0f172a",
    accent: vivid[1] ?? vivid[0] ?? "#f59e0b",
    background: lights[0] ?? "#f8fafc",
    surface: lights[1] ?? lights[0] ?? "#ffffff",
    text: darks[0] ?? "#0f172a",
    muted: mids[0] ?? "#64748b",
    border: lights.find((h) => lum(h) < 0.97) ?? mids[1] ?? "#e2e8f0",
    radius: radius || "12px",
    fontHeading: (fonts.find((f) => f !== fonts[0]) ?? fonts[0] ?? "Sora, sans-serif").replace(/"/g, ""),
    fontBody: (fonts[0] ?? "Manrope, sans-serif").replace(/"/g, ""),
    container: "1140px",
    shadow: "0 18px 40px -24px rgba(15,23,42,.28)",
  };
  const source = [theme.primary, theme.secondary, theme.accent, theme.background, theme.surface, theme.text, theme.muted, theme.border];
  return { theme, sourceColors: [...new Set(source)] };
}

/* --------------------------------- assets --------------------------------- */

function collectAssets(pages: { name: string; doc: Document }[], available: string[]): AssetRef[] {
  const map = new Map<string, AssetRef>();
  const kindOf = (url: string, tag?: string): AssetRef["kind"] => {
    if (tag === "IMG") return "image";
    if (tag === "VIDEO") return "video";
    if (tag === "IFRAME") return "video";
    const u = url.toLowerCase().split(/[?#]/)[0] ?? "";
    if (/\.(png|jpe?g|webp|gif|avif)$/.test(u)) return "image";
    if (/\.svg$/.test(u)) return "svg";
    if (/\.(mp4|webm|mov)$/.test(u)) return "video";
    if (/\.(woff2?|ttf|otf)$/.test(u)) return "font";
    if (/\.(ico)$/.test(u)) return "icon";
    if (/\.json$/.test(u)) return "json";
    if (/\.js$/.test(u)) return "script";
    return "other";
  };
  const add = (url: string, page: string, tag?: string) => {
    if (!url || url.startsWith("data:") || url.startsWith("#")) return;
    const existing = map.get(url);
    if (existing) {
      if (!existing.usedOn.includes(page)) existing.usedOn.push(page);
      return;
    }
    map.set(url, {
      name: url.split("/").pop() ?? url,
      url,
      kind: kindOf(url, tag),
      usedOn: [page],
      missing: available.length > 0 && !available.some((a) => a === url || a.endsWith(url.replace(/^\.?\//, ""))),
    });
  };
  pages.forEach(({ name, doc }) => {
    doc.querySelectorAll("img,video,source,script[src],link[href],iframe").forEach((el) => {
      add(el.getAttribute("src") ?? el.getAttribute("href") ?? "", name, el.tagName);
      const poster = el.getAttribute("poster");
      if (poster) add(poster, name, "VIDEO");
    });
    doc.querySelectorAll("[style*='url(']").forEach((el) => {
      const m = (el.getAttribute("style") ?? "").match(/url\(['"]?([^'")]+)/);
      if (m?.[1]) add(m[1], name);
    });
  });
  const assets = [...map.values()];
  const byName = new Map<string, string>();
  assets.forEach((a) => {
    const prev = byName.get(a.name);
    if (prev && prev !== a.url) a.duplicateOf = prev;
    else byName.set(a.name, a.url);
  });
  return assets;
}

/* -------------------------------- structure ------------------------------- */

function buildTree(doc: Document, repeaters: Repeater[]): SectionNode[] {
  const repByContainer = new Map(repeaters.map((r) => [r.containerId, r]));
  const sectionLabel = (el: Element) => {
    const h = el.querySelector("h1,h2,h3");
    const id = el.getAttribute("id");
    return (h && text(h).slice(0, 42)) || (id ? `#${id}` : el.tagName.toLowerCase());
  };
  const walk = (el: Element, depth: number): SectionNode | null => {
    const rep = repByContainer.get(teid(el));
    if (rep) {
      return {
        id: teid(el),
        label: `${rep.label} repeater · ${rep.itemIds.length} items`,
        kind: "repeater",
        children: rep.itemIds.map((id, i) => ({ id, label: rep.itemLabels[i] ?? `${rep.label} ${i + 1}`, kind: "item", children: [] })),
      };
    }
    if (depth > 3) return null;
    const kids = Array.from(el.children)
      .filter((k) => !SKIP_TAGS.has(k.tagName) && k.children.length > 0)
      .map((k) => walk(k, depth + 1))
      .filter(Boolean) as SectionNode[];
    if (depth === 0 || kids.length) {
      return { id: teid(el), label: sectionLabel(el), kind: el.tagName.toLowerCase(), children: kids };
    }
    return null;
  };
  const roots = Array.from(doc.body.children).filter((c) => !SKIP_TAGS.has(c.tagName));
  return roots.map((r) => walk(r, 0)).filter(Boolean) as SectionNode[];
}

/* --------------------------------- page ----------------------------------- */

function annotate(doc: Document) {
  let n = 0;
  doc.querySelectorAll("*").forEach((el) => {
    if (SKIP_TAGS.has(el.tagName)) return;
    el.setAttribute("data-te-id", `e${++n}`);
  });
}

function detectFields(doc: Document, repeaters: Repeater[]): EditableField[] {
  const fields: EditableField[] = [];
  const repMap = new Map<Element, string>();
  repeaters.forEach((r) => {
    r.itemIds.forEach((itemId) => {
      const item = doc.querySelector(`[data-te-id="${itemId}"]`);
      if (!item) return;
      repMap.set(item, r.id);
      item.querySelectorAll("*").forEach((d) => repMap.set(d, r.id));
    });
  });
  const repeaterOf = (el: Element) => repMap.get(el);
  const push = (
    el: Element,
    kind: FieldKind,
    value: string,
    confidence: Confidence,
    role?: string,
    attrs: Record<string, string> = {},
  ) => {
    fields.push({
      id: teid(el),
      kind,
      label: role ? `${kindLabels[kind]} · ${role}` : kindLabels[kind],
      value,
      tag: el.tagName.toLowerCase(),
      role,
      confidence,
      enabled: true,
      attrs,
      inRepeater: repeaterOf(el),
    });
  };

  doc.querySelectorAll("*").forEach((el) => {
    if (SKIP_TAGS.has(el.tagName) || !teid(el)) return;
    const tag = el.tagName;

    if (tag === "IMG") {
      push(el, "image", el.getAttribute("src") ?? "", el.getAttribute("alt") ? "High" : "Medium", imageRole(el), {
        alt: el.getAttribute("alt") ?? "",
        loading: el.getAttribute("loading") ?? "eager",
      });
      return;
    }
    if (tag === "VIDEO" || (tag === "IFRAME" && /youtube|vimeo|player/.test(el.getAttribute("src") ?? ""))) {
      push(el, "video", el.getAttribute("src") ?? "", "High", tag === "IFRAME" ? "embed" : "html5", {
        poster: el.getAttribute("poster") ?? "",
      });
      return;
    }
    if (tag === "SVG" || tag === "svg") {
      push(el, "svg", "", "Medium", "graphic", {});
      return;
    }
    if (tag === "I" || (tag === "SPAN" && /icon|fa-|lucide|svg|emoji/i.test(el.className + " " + (el.getAttribute("aria-label") || "")))) {
      push(el, "svg", text(el) || el.className || "Icon", "High", "icon", {});
      return;
    }
    if (tag === "TABLE") {
      const rows = el.querySelectorAll("tbody tr").length;
      const cols = el.querySelectorAll("thead th").length;
      push(el, "table", `${rows} rows × ${cols} columns`, "High", "data table", {});
      return;
    }
    if (looksLikeButton(el)) {
      push(el, "button", text(el), "High", buttonVariant(el), {
        href: el.getAttribute("href") ?? "",
        target: el.getAttribute("target") ?? "_self",
      });
      return;
    }
    if (tag === "A") {
      const href = el.getAttribute("href") ?? "";
      const role = SOCIAL.some((s) => href.includes(s))
        ? "social"
        : el.closest("footer")
          ? "footer link"
          : el.closest("header,nav")
            ? "navigation"
            : /^https?:/.test(href)
              ? "external"
              : "internal";
      push(el, "link", text(el) || el.getAttribute("aria-label") || "link", "High", role, {
        href,
        target: el.getAttribute("target") ?? "_self",
      });
      return;
    }
    const value = text(el);
    const ownText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? "").trim().length > 0);
    if (!ownText) return;
    const c = classifyText(el, value);
    if (c) push(el, c.kind, value, c.confidence);
  });

  return fields;
}

/* ------------------------------- validation ------------------------------- */

function validate(pages: PageAnalysis[], assets: AssetRef[]): Issue[] {
  const issues: Issue[] = [];
  const add = (severity: Issue["severity"], category: string, message: string, fix: string, page?: string, elementId?: string) =>
    issues.push({ id: nid("iss"), severity, category, message, fix, page, elementId });

  assets.filter((a) => a.missing).forEach((a) => add("error", "Assets", `Missing asset “${a.url}”`, "Add the file to the template package or repoint the reference.", a.usedOn[0]));
  assets.filter((a) => a.duplicateOf).forEach((a) => add("info", "Assets", `Duplicate asset name “${a.name}”`, "Deduplicate to keep the package light.", a.usedOn[0]));

  pages.forEach((p) => {
    const doc = new DOMParser().parseFromString(p.html, "text/html");
    const ids = new Map<string, number>();
    doc.querySelectorAll("[id]").forEach((el) => {
      const id = el.getAttribute("id")!;
      ids.set(id, (ids.get(id) ?? 0) + 1);
    });
    [...ids.entries()].filter(([, n]) => n > 1).forEach(([id]) => add("error", "Accessibility", `Duplicate element id “${id}” on ${p.name}`, "Make every id unique.", p.name));

    p.fields.filter((f) => f.kind === "image" && !f.attrs["alt"]).forEach((f) => add("warning", "Accessibility", `Image without alt text on ${p.name}`, "Add descriptive alt text.", p.name, f.id));
    p.fields.filter((f) => f.kind === "image" && !f.value).forEach((f) => add("error", "Images", `Image with empty src on ${p.name}`, "Upload or link an image.", p.name, f.id));
    p.fields
      .filter((f) => (f.kind === "link" || f.kind === "button") && (!f.attrs["href"] || f.attrs["href"] === "#"))
      .forEach((f) => add("warning", "Links", `“${f.value || "Untitled"}” has no destination on ${p.name}`, "Set a valid URL or in-page anchor.", p.name, f.id));
    p.fields.filter((f) => ["title", "subtitle"].includes(f.kind) && !f.value).forEach((f) => add("warning", "Content", `Empty heading on ${p.name}`, "Add heading copy or hide the element.", p.name, f.id));
    p.fields
      .filter((f) => f.kind === "link" && /^https?:/.test(f.attrs["href"] ?? "") && f.attrs["target"] !== "_blank")
      .slice(0, 3)
      .forEach((f) => add("info", "Links", `External link “${f.value}” opens in the same tab`, "Consider target=\"_blank\" with rel=\"noopener\".", p.name, f.id));

    if (!p.seo.title) add("error", "SEO", `${p.name} has no <title>`, "Add a unique 50–60 character title.", p.name);
    if (!p.seo.description) add("warning", "SEO", `${p.name} has no meta description`, "Add a 150–160 character description.", p.name);
    if (!p.seo.canonical) add("info", "SEO", `${p.name} has no canonical URL`, "Add a self-referencing canonical link.", p.name);
    if (!p.seo.ogImage) add("info", "SEO", `${p.name} has no og:image`, "Add a 1200×630 social preview.", p.name);
    if (!p.seo.schema) add("info", "SEO", `${p.name} has no schema markup`, "Add JSON-LD for richer results.", p.name);
    if (doc.querySelectorAll("h1").length !== 1) add("warning", "SEO", `${p.name} has ${doc.querySelectorAll("h1").length} H1 headings`, "Use exactly one H1 per page.", p.name);
    if (!doc.querySelector('meta[name="viewport"]')) add("error", "Responsive", `${p.name} is missing the viewport meta tag`, "Add width=device-width, initial-scale=1.", p.name);
    const styleText = Array.from(doc.querySelectorAll("style")).map((st) => st.textContent ?? "").join("\n");
    if (!/@media/.test(styleText)) {
      add("warning", "Responsive", `${p.name} declares no media queries`, "Verify layout at tablet and mobile widths.", p.name);
    }
    if (p.forms.length && p.forms.some((f) => !f.submitId)) add("warning", "Forms", `A form on ${p.name} has no submit button`, "Add a submit action.", p.name);
    if (!p.fields.some((f) => f.kind === "button")) add("info", "Conversion", `${p.name} has no CTA button`, "Add a primary call to action.", p.name);
  });
  return issues;
}

/* ---------------------------------- main ---------------------------------- */

export function analyzeTemplate(
  files: { name: string; content: string }[],
  assetNames: string[] = [],
  templateName = "Imported template",
): TemplateAnalysis {
  uid = 0;
  const parsed = files.map((f) => {
    const doc = new DOMParser().parseFromString(f.content, "text/html");
    annotate(doc);
    return { name: f.name, doc };
  });

  const pages: PageAnalysis[] = parsed.map(({ name, doc }, i) => {
    const repeaters = detectRepeaters(doc);
    const fields = detectFields(doc, repeaters);
    const linksTo = [...new Set(Array.from(doc.querySelectorAll("a[href$='.html']")).map((a) => a.getAttribute("href")!))];
    return {
      id: `page-${i}`,
      name,
      route: name === "index.html" ? "/" : `/${name.replace(/\.html$/, "")}`,
      title: doc.querySelector("title")?.textContent?.trim() || name,
      html: `<!DOCTYPE html>${doc.documentElement.outerHTML}`,
      isHome: name === "index.html" || i === 0,
      fields,
      repeaters,
      navGroups: detectNav(doc),
      forms: detectForms(doc),
      tables: Array.from(doc.querySelectorAll("table")).map((t) => teid(t)),
      seo: detectSeo(doc),
      tree: buildTree(doc, repeaters),
      linksTo,
    };
  });

  const assets = collectAssets(parsed, assetNames);
  const { theme, sourceColors } = detectTheme(parsed.map((p) => p.doc));
  const issues = validate(pages, assets);

  const count = (fn: (f: EditableField) => boolean) => pages.reduce((n, p) => n + p.fields.filter(fn).length, 0);
  const stats: Record<string, number> = {
    Pages: pages.length,
    "Editable fields": pages.reduce((n, p) => n + p.fields.length, 0),
    Repeaters: pages.reduce((n, p) => n + p.repeaters.length, 0),
    "Repeater items": pages.reduce((n, p) => n + p.repeaters.reduce((m, r) => m + r.itemIds.length, 0), 0),
    Forms: pages.reduce((n, p) => n + p.forms.length, 0),
    "CTA buttons": count((f) => f.kind === "button"),
    Links: count((f) => f.kind === "link"),
    Images: count((f) => f.kind === "image"),
    Videos: count((f) => f.kind === "video"),
    Tables: count((f) => f.kind === "table"),
    "Navigation menus": pages.reduce((n, p) => n + p.navGroups.length, 0),
    Assets: assets.length,
    "Theme tokens": Object.keys(theme).length,
    "SEO fields": pages.length * 11,
    Errors: issues.filter((i) => i.severity === "error").length,
    Warnings: issues.filter((i) => i.severity === "warning").length,
  };

  return { name: templateName, pages, assets, theme, themeSourceColors: sourceColors, issues, stats };
}

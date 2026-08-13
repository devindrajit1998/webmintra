export type Confidence = "High" | "Medium" | "Low";

export type FieldKind =
  | "title"
  | "subtitle"
  | "description"
  | "longtext"
  | "richtext"
  | "caption"
  | "quote"
  | "badge"
  | "number"
  | "currency"
  | "date"
  | "link"
  | "button"
  | "image"
  | "video"
  | "svg"
  | "table";

export interface EditableField {
  id: string;
  kind: FieldKind;
  label: string;
  value: string;
  tag: string;
  role?: string | undefined;
  confidence: Confidence;
  enabled: boolean;
  attrs: Record<string, string>;
  inRepeater?: string | undefined;
}

export interface RepeaterItemRef {
  key: string;
  srcIndex: number;
}

export interface Repeater {
  id: string;
  containerId: string;
  label: string;
  type: string;
  itemIds: string[];
  itemLabels: string[];
  fieldsPerItem: number;
  confidence: Confidence;
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  external: boolean;
  children: NavItem[];
}

export interface NavGroup {
  id: string;
  label: string;
  kind: "header" | "footer" | "side" | "dropdown";
  items: NavItem[];
}

export interface FormField {
  id: string;
  label: string;
  placeholder: string;
  type: string;
  required: boolean;
}

export interface DetectedForm {
  id: string;
  label: string;
  type: string;
  fields: FormField[];
  submitId?: string | undefined;
  submitLabel: string;
  confidence: Confidence;
}

export interface SeoData {
  title: string;
  description: string;
  keywords: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  robots: string;
  favicon: string;
  schema: boolean | string;
}

export interface SectionNode {
  id: string;
  label: string;
  kind: string;
  children: SectionNode[];
}

export interface AssetRef {
  name: string;
  url: string;
  kind: "image" | "video" | "font" | "svg" | "icon" | "json" | "script" | "other";
  usedOn: string[];
  missing: boolean;
  duplicateOf?: string | undefined;
}

export interface Issue {
  id: string;
  severity: "error" | "warning" | "info";
  category: string;
  message: string;
  fix: string;
  page?: string | undefined;
  elementId?: string | undefined;
}

export interface PageAnalysis {
  id: string;
  name: string;
  route: string;
  title: string;
  html: string;
  isHome: boolean;
  fields: EditableField[];
  repeaters: Repeater[];
  navGroups: NavGroup[];
  forms: DetectedForm[];
  tables: string[];
  seo: SeoData;
  tree: SectionNode[];
  linksTo: string[];
}

export interface ThemeTokens {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  radius: string;
  fontHeading: string;
  fontBody: string;
  container: string;
  shadow: string;
}

export interface TemplateAnalysis {
  name: string;
  pages: PageAnalysis[];
  assets: AssetRef[];
  theme: ThemeTokens;
  themeSourceColors: string[];
  issues: Issue[];
  stats: Record<string, number>;
}

export interface ElementEdit {
  text?: string;
  src?: string;
  alt?: string;
  title?: string;
  href?: string;
  target?: string;
  hidden?: boolean;
  loading?: string;
  fill?: string;
  stroke?: string;
  autoplay?: boolean;
  controls?: boolean;
  muted?: boolean;
  loop?: boolean;
  poster?: string;
  placeholder?: string;
  style?: Record<string, string>;
}

export interface SitemapSettings {
  excludedPageIds: string[];
  priorities: Record<string, number>;
  changefreq: Record<string, string>;
}

export interface RedirectRule {
  from: string;
  to: string;
}

export interface EditorState {
  edits: Record<string, Record<string, ElementEdit>>; // pageId -> elementId -> edit
  repeaters: Record<string, RepeaterItemRef[]>; // repeaterId -> items
  theme: ThemeTokens;
  themes: { name: string; tokens: ThemeTokens }[];
  seo: Record<string, Partial<SeoData>>;
  globalSeo?: Partial<SeoData> | undefined;
  sitemap?: SitemapSettings | undefined;
  googleVerification?: string | undefined;
  searchConsole?: string | undefined;
  googleAnalytics?: string | undefined;
  redirects?: RedirectRule[] | undefined;
  custom404?: { pageId: string } | undefined;
}

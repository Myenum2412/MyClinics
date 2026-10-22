export type ThemePreset = "medical" | "dental" | "orthopaedic" | "hospital";

export type FontChoice =
  | "theme"
  | "manrope"
  | "merriweather"
  | "lato"
  | "jakarta"
  | "dm"
  | "playfair"
  | "space"
  | "inter"
  | "system";

export type RadiusChoice = "theme" | "none" | "sm" | "md" | "lg" | "xl" | "pill";

export type ButtonShape = "theme" | "rounded" | "pill" | "square";

export type HeaderStyle = "theme" | "light" | "dark" | "brand" | "transparent";

export type ThemePresetConfig = {
  label: string;
  description: string;
  primary: string;
  primaryText: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  radius: Exclude<RadiusChoice, "theme">;
  buttonRadius: string;
  headingFont: FontChoice;
  bodyFont: FontChoice;
  headerStyle: Exclude<HeaderStyle, "theme">;
  heroOverlay: string;
  heroImage: string;
};

export type ResolvedTheme = {
  primary: string;
  primaryText: string;
  onPrimary: string;
  accent: string;
  onAccent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  radius: string;
  buttonRadius: string;
  headingFont: string;
  bodyFont: string;
  headerStyle: Exclude<HeaderStyle, "theme">;
  heroOverlay: string;
  heroImage: string;
};

export const THEME_PRESETS: Record<ThemePreset, ThemePresetConfig> = {
  medical: {
    label: "Medical blue",
    description: "Clean, trustworthy and calm. Inspired by modern ENT and general practice sites.",
    primary: "#1563ab",
    primaryText: "#1563ab",
    accent: "#31a14e",
    background: "#f5f9fd",
    surface: "#ffffff",
    text: "#102a43",
    muted: "#5b7186",
    border: "#d9e5f0",
    radius: "md",
    buttonRadius: "0.55rem",
    headingFont: "manrope",
    bodyFont: "manrope",
    headerStyle: "light",
    heroOverlay:
      "linear-gradient(100deg, rgba(9, 44, 78, 0.92) 0%, rgba(21, 99, 171, 0.68) 48%, rgba(21, 99, 171, 0.18) 100%)",
    heroImage: "/website/medical-hero.webp",
  },
  dental: {
    label: "Dental navy",
    description: "Deep navy with a soft sky accent and elegant serif headings.",
    primary: "#003366",
    primaryText: "#003366",
    accent: "#b3e5fc",
    background: "#f6fbfe",
    surface: "#ffffff",
    text: "#0b2545",
    muted: "#587086",
    border: "#d6e9f5",
    radius: "lg",
    buttonRadius: "9999px",
    headingFont: "merriweather",
    bodyFont: "lato",
    headerStyle: "light",
    heroOverlay:
      "linear-gradient(100deg, rgba(0, 31, 63, 0.92) 0%, rgba(0, 51, 102, 0.7) 52%, rgba(0, 51, 102, 0.16) 100%)",
    heroImage: "/website/dental-hero.webp",
  },
  orthopaedic: {
    label: "Orthopaedic teal",
    description: "Fresh teal, strong red accents and confident, sport-inspired typography.",
    primary: "#83c5c8",
    primaryText: "#2f7c7e",
    accent: "#b41e1e",
    background: "#f6fbfb",
    surface: "#ffffff",
    text: "#102f31",
    muted: "#587072",
    border: "#d3e8e8",
    radius: "md",
    buttonRadius: "0.55rem",
    headingFont: "space",
    bodyFont: "dm",
    headerStyle: "light",
    heroOverlay:
      "linear-gradient(100deg, rgba(16, 47, 49, 0.92) 0%, rgba(47, 124, 126, 0.68) 52%, rgba(47, 124, 126, 0.14) 100%)",
    heroImage: "/website/orthopaedic-hero.webp",
  },
  hospital: {
    label: "Hospital blue",
    description: "Bright clinical blue, red emergency accents and rounded, friendly cards.",
    primary: "#2563eb",
    primaryText: "#1d4ed8",
    accent: "#dc2626",
    background: "#f8fafc",
    surface: "#ffffff",
    text: "#0f172a",
    muted: "#64748b",
    border: "#e2e8f0",
    radius: "xl",
    buttonRadius: "9999px",
    headingFont: "jakarta",
    bodyFont: "jakarta",
    headerStyle: "light",
    heroOverlay:
      "linear-gradient(100deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 64, 175, 0.72) 48%, rgba(37, 99, 235, 0.16) 100%)",
    heroImage: "/website/hospital-hero.webp",
  },
};

export const THEME_PRESET_OPTIONS = (
  Object.keys(THEME_PRESETS) as ThemePreset[]
).map((value) => ({
  value,
  label: THEME_PRESETS[value].label,
}));

export const FONT_STACKS: Record<Exclude<FontChoice, "theme">, string> = {
  manrope: "'Manrope', ui-sans-serif, system-ui, sans-serif",
  merriweather: "'Merriweather', Georgia, serif",
  lato: "'Lato', ui-sans-serif, system-ui, sans-serif",
  jakarta: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
  dm: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
  playfair: "'Playfair Display', Georgia, serif",
  space: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
  inter: "'Inter', ui-sans-serif, system-ui, sans-serif",
  system: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
};

export const FONT_OPTIONS = [
  { label: "Theme default", value: "theme" },
  { label: "Manrope", value: "manrope" },
  { label: "Merriweather (serif)", value: "merriweather" },
  { label: "Lato", value: "lato" },
  { label: "Plus Jakarta Sans", value: "jakarta" },
  { label: "DM Sans", value: "dm" },
  { label: "Playfair Display (serif)", value: "playfair" },
  { label: "Space Grotesk", value: "space" },
  { label: "Inter", value: "inter" },
  { label: "System UI", value: "system" },
];

export const HEADING_FONT_OPTIONS = FONT_OPTIONS.filter((option) =>
  ["theme", "manrope", "merriweather", "jakarta", "playfair", "space", "dm", "system"].includes(
    option.value
  )
);

export const BODY_FONT_OPTIONS = FONT_OPTIONS.filter((option) =>
  ["theme", "manrope", "lato", "jakarta", "dm", "inter", "system"].includes(option.value)
);

export const RADIUS_OPTIONS = [
  { label: "Theme default", value: "theme" },
  { label: "Square", value: "none" },
  { label: "Small", value: "sm" },
  { label: "Medium", value: "md" },
  { label: "Large", value: "lg" },
  { label: "Extra large", value: "xl" },
  { label: "Pill", value: "pill" },
];

export const BUTTON_SHAPE_OPTIONS = [
  { label: "Theme default", value: "theme" },
  { label: "Rounded", value: "rounded" },
  { label: "Pill", value: "pill" },
  { label: "Square", value: "square" },
];

export const HEADER_STYLE_OPTIONS = [
  { label: "Theme default", value: "theme" },
  { label: "Light surface", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "Brand colour", value: "brand" },
  { label: "Frosted glass", value: "transparent" },
];

export const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Lato:wght@300;400;700;900&family=Manrope:wght@400;500;600;700;800&family=Merriweather:wght@400;700;900&family=Playfair+Display:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap";

const RADIUS_VALUES: Record<Exclude<RadiusChoice, "theme">, string> = {
  none: "0px",
  sm: "0.35rem",
  md: "0.75rem",
  lg: "1.1rem",
  xl: "1.5rem",
  pill: "9999px",
};

const BUTTON_RADIUS_VALUES: Record<Exclude<ButtonShape, "theme">, string> = {
  rounded: "0.55rem",
  pill: "9999px",
  square: "0.2rem",
};

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isValidHex(value: string | undefined): boolean {
  return typeof value === "string" && HEX_RE.test(value.trim());
}

export function normalizeHex(value: string | undefined, fallback: string): string {
  return isValidHex(value) ? (value as string).trim() : fallback;
}

function expandHex(value: string): string {
  const hex = value.replace("#", "");
  return hex.length === 3
    ? `#${hex
        .split("")
        .map((char) => `${char}${char}`)
        .join("")}`
    : value;
}

export function withAlpha(value: string, alpha: string): string {
  return `${expandHex(normalizeHex(value, "#000000"))}${alpha}`;
}

export function contrastColor(value: string): string {
  const hex = expandHex(normalizeHex(value, "#000000")).replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#0b1f33" : "#ffffff";
}

function resolveFont(choice: FontChoice | undefined, fallback: FontChoice): string {
  if (!choice || choice === "theme") {
    return FONT_STACKS[fallback as Exclude<FontChoice, "theme">] ?? FONT_STACKS.manrope;
  }
  return FONT_STACKS[choice as Exclude<FontChoice, "theme">] ?? FONT_STACKS.manrope;
}

export function resolveTheme(input: {
  theme?: ThemePreset;
  customize?: "off" | "on";
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  mutedColor?: string;
  borderColor?: string;
  headingFont?: FontChoice;
  bodyFont?: FontChoice;
  radius?: RadiusChoice;
  buttonShape?: ButtonShape;
  headerStyle?: HeaderStyle;
}): ResolvedTheme {
  const preset = THEME_PRESETS[input.theme ?? "medical"] ?? THEME_PRESETS.medical;
  const custom = input.customize === "on";

  const primary = custom ? normalizeHex(input.primaryColor, preset.primary) : preset.primary;
  const accent = custom ? normalizeHex(input.accentColor, preset.accent) : preset.accent;
  const background = custom
    ? normalizeHex(input.backgroundColor, preset.background)
    : preset.background;
  const surface = custom ? normalizeHex(input.surfaceColor, preset.surface) : preset.surface;
  const text = custom ? normalizeHex(input.textColor, preset.text) : preset.text;
  const muted = custom ? normalizeHex(input.mutedColor, preset.muted) : preset.muted;
  const border = custom ? normalizeHex(input.borderColor, preset.border) : preset.border;

  const radiusChoice = input.radius ?? "theme";
  const radius =
    radiusChoice === "theme" ? RADIUS_VALUES[preset.radius] : RADIUS_VALUES[radiusChoice];

  const buttonChoice = input.buttonShape ?? "theme";
  const buttonRadius =
    buttonChoice === "theme"
      ? preset.buttonRadius
      : BUTTON_RADIUS_VALUES[buttonChoice];

  const headerChoice = input.headerStyle ?? "theme";
  const headerStyle = headerChoice === "theme" ? preset.headerStyle : headerChoice;

  return {
    primary,
    primaryText: custom
      ? `color-mix(in srgb, ${primary} 72%, #0b1f33)`
      : preset.primaryText,
    onPrimary: contrastColor(primary),
    accent,
    onAccent: contrastColor(accent),
    background,
    surface,
    text,
    muted,
    border,
    radius,
    buttonRadius,
    headingFont: resolveFont(input.headingFont, preset.headingFont),
    bodyFont: resolveFont(input.bodyFont, preset.bodyFont),
    headerStyle,
    heroOverlay: preset.heroOverlay,
    heroImage: preset.heroImage,
  };
}

export function themeCssVars(theme: ResolvedTheme): Record<string, string> {
  return {
    "--site-primary": theme.primary,
    "--site-primary-text": theme.primaryText,
    "--site-on-primary": theme.onPrimary,
    "--site-primary-soft": withAlpha(theme.primary, "16"),
    "--site-accent": theme.accent,
    "--site-on-accent": theme.onAccent,
    "--site-accent-soft": withAlpha(theme.accent, "16"),
    "--site-bg": theme.background,
    "--site-surface": theme.surface,
    "--site-text": theme.text,
    "--site-muted": theme.muted,
    "--site-border": theme.border,
    "--site-radius": theme.radius,
    "--site-button-radius": theme.buttonRadius,
    "--site-font-heading": theme.headingFont,
    "--site-font-body": theme.bodyFont,
    "--site-hero-overlay": theme.heroOverlay,
    "--site-hero-image": `url("${theme.heroImage}")`,
  };
}

export function parseLinkLines(value: string | undefined): { label: string; href: string }[] {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split("|");
      return {
        label: label.trim(),
        href: rest.join("|").trim() || "#",
      };
    })
    .filter((item) => item.label.length > 0);
}

export function safeHref(value: string | undefined): string {
  const href = (value ?? "").trim();
  if (!href) return "#";
  if (/^(javascript|data|vbscript):/i.test(href)) return "#";
  return href;
}

export function safeEmbedUrl(value: string | undefined): string | null {
  const href = (value ?? "").trim();
  if (!href) return null;
  try {
    const url = new URL(href, "https://example.invalid");
    if (!["https:", "http:"].includes(url.protocol)) return null;
    return href.startsWith("http") ? href : null;
  } catch {
    return null;
  }
}

export function initials(value: string | undefined): string {
  return (value ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

"use client";

/* eslint-disable @next/next/no-img-element */

import type { CSSProperties, ReactNode } from "react";
import type { Config, CustomField, Data } from "@puckeditor/core";
import {
  BODY_FONT_OPTIONS,
  BUTTON_SHAPE_OPTIONS,
  GOOGLE_FONTS_HREF,
  HEADER_STYLE_OPTIONS,
  HEADING_FONT_OPTIONS,
  RADIUS_OPTIONS,
  THEME_PRESET_OPTIONS,
  initials,
  isValidHex,
  parseLinkLines,
  resolveTheme,
  safeEmbedUrl,
  safeHref,
  themeCssVars,
  type ButtonShape,
  type FontChoice,
  type HeaderStyle,
  type RadiusChoice,
  type ThemePreset,
} from "./theme";
import { imageField, optionalImageField } from "./media";
import { BeforeAfterSlider, WebsiteContactForm } from "./interactive";

type Align = "left" | "center" | "right";
type Tone = "light" | "soft" | "brand" | "dark";

export type PageBuilderRootProps = {
  background: "white" | "muted" | "brand";
  width: "narrow" | "normal" | "wide" | "full";
  theme: ThemePreset;
  customize: "off" | "on";
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  headingFont: FontChoice;
  bodyFont: FontChoice;
  radius: RadiusChoice;
  buttonShape: ButtonShape;
  headerStyle: HeaderStyle;
  sectionSpacing?: "compact" | "cozy" | "airy";
  imageRadius?: "theme" | "none" | "soft" | "round";
  clinicName: string;
  logoUrl: string;
  faviconUrl?: string;
  ogImageUrl?: string;
  tagline: string;
  bookingLabel: string;
  bookingHref: string;
  announcement: string;
  announcementHref: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
  navItems: { label: string; href: string }[];
  footerColumns: { title: string; links: string }[];
  socialLinks: string;
  footerText: string;
  seoTitle: string;
  seoDescription: string;
};

export type PageBuilderComponents = {
  Hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
    layout: "centered" | "split" | "image";
    align: Align;
    tone: Tone;
    imageUrl: string;
    imageAlt: string;
    imagePosition?: "center" | "top" | "bottom";
    overlay?: "theme" | "soft" | "medium" | "strong";
    stats: { value: string; label: string }[];
  };
  Heading: {
    text: string;
    level: "h1" | "h2" | "h3";
    align: Align;
  };
  Paragraph: {
    text: string;
    size: "sm" | "base" | "lg";
    align: Align;
  };
  Button: {
    label: string;
    href: string;
    variant: "primary" | "secondary" | "outline";
    align: Align;
  };
  ImageBlock: {
    src: string;
    alt: string;
    caption: string;
    size: "small" | "medium" | "large" | "full";
    rounded: "none" | "md" | "xl";
    href?: string;
    aspect?: "auto" | "4/3" | "16/9" | "1/1";
    objectPosition?: "center" | "top" | "bottom";
  };
  Features: {
    title: string;
    subtitle: string;
    columns: "2" | "3" | "4";
    items: { icon: string; title: string; description: string }[];
  };
  Services: {
    title: string;
    subtitle: string;
    columns: "2" | "3" | "4";
    items: { icon: string; title: string; description: string; href: string; imageUrl?: string }[];
  };
  Stats: {
    tone: "light" | "brand" | "dark";
    items: { value: string; label: string }[];
  };
  Doctors: {
    title: string;
    subtitle: string;
    items: {
      name: string;
      specialty: string;
      imageUrl: string;
      bio: string;
      href: string;
      credentials?: string;
    }[];
  };
  Testimonials: {
    title: string;
    subtitle: string;
    items: { quote: string; name: string; role: string; rating: number; imageUrl?: string }[];
  };
  FAQ: {
    title: string;
    subtitle: string;
    items: { question: string; answer: string }[];
  };
  AppointmentCTA: {
    title: string;
    subtitle: string;
    phone: string;
    buttonLabel: string;
    buttonHref: string;
    tone: "brand" | "dark" | "light";
  };
  Gallery: {
    title: string;
    subtitle: string;
    columns: "2" | "3" | "4";
    aspect?: "4/3" | "1/1" | "16/9";
    images: { src: string; alt: string; caption: string }[];
  };
  Process: {
    title: string;
    subtitle: string;
    steps: { title: string; description: string }[];
  };
  EmergencyBanner: {
    text: string;
    phone: string;
    href: string;
    tone: "accent" | "brand" | "dark";
  };
  Callout: {
    title: string;
    body: string;
    tone: "info" | "success" | "warning";
  };
  BeforeAfter: {
    title: string;
    subtitle: string;
    beforeImage: string;
    afterImage: string;
    beforeAlt: string;
    afterAlt: string;
    beforeLabel: string;
    afterLabel: string;
    aspect: "4/3" | "16/9" | "1/1" | "3/4";
  };
  VideoEmbed: {
    title: string;
    subtitle: string;
    videoUrl: string;
    posterUrl: string;
    caption: string;
    aspect: "16/9" | "4/3" | "1/1";
  };
  Pricing: {
    title: string;
    subtitle: string;
    note: string;
    plans: {
      name: string;
      price: string;
      period: string;
      description: string;
      features: string;
      ctaLabel: string;
      ctaHref: string;
      featured: "no" | "yes";
    }[];
  };
  InsurancePartners: {
    title: string;
    subtitle: string;
    note: string;
    items: { name: string; logoUrl: string; href: string }[];
  };
  OpeningHours: {
    title: string;
    subtitle: string;
    note: string;
    days: { day: string; hours: string }[];
  };
  ContactForm: {
    title: string;
    subtitle: string;
    nameLabel: string;
    phoneLabel: string;
    emailLabel: string;
    serviceLabel: string;
    messageLabel: string;
    buttonLabel: string;
    successMessage: string;
    privacyNote: string;
  };
  ClinicDetails: {
    name: string;
    address: string;
    phone: string;
    email: string;
    hours: string;
    bookingHref: string;
    mapUrl: string;
  };
  Divider: {
    spacing: "sm" | "md" | "lg";
  };
  Spacer: {
    height: number;
  };
};

export type PageBuilderData = Data<PageBuilderComponents, PageBuilderRootProps>;

export function isPageBuilderData(value: unknown): value is PageBuilderData {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as PageBuilderData).content)
  );
}

const ALIGN_TEXT: Record<Align, string> = {
  left: "text-left items-start",
  center: "text-center items-center",
  right: "text-right items-end",
};

const ALIGN_JUSTIFY: Record<Align, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

const ROOT_WIDTH: Record<PageBuilderRootProps["width"], string> = {
  narrow: "max-w-3xl",
  normal: "max-w-5xl",
  wide: "max-w-7xl",
  full: "max-w-none",
};

const HEADING_SIZE: Record<PageBuilderComponents["Heading"]["level"], string> = {
  h1: "text-3xl sm:text-4xl",
  h2: "text-2xl sm:text-3xl",
  h3: "text-xl sm:text-2xl",
};

const PARAGRAPH_SIZE: Record<PageBuilderComponents["Paragraph"]["size"], string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
};

const FEATURE_COLUMNS: Record<PageBuilderComponents["Features"]["columns"], string> = {
  "2": "sm:grid-cols-2",
  "3": "sm:grid-cols-2 lg:grid-cols-3",
  "4": "sm:grid-cols-2 lg:grid-cols-4",
};

const IMAGE_SIZE: Record<PageBuilderComponents["ImageBlock"]["size"], string> = {
  small: "max-w-sm",
  medium: "max-w-xl",
  large: "max-w-3xl",
  full: "max-w-full",
};

const IMAGE_ROUNDED: Record<PageBuilderComponents["ImageBlock"]["rounded"], string> = {
  none: "rounded-none",
  md: "rounded-[var(--site-radius)]",
  xl: "rounded-[calc(var(--site-radius)*1.6)]",
};

const CALLOUT_TONE: Record<PageBuilderComponents["Callout"]["tone"], string> = {
  info: "border-sky-200 bg-sky-50 text-sky-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
};

const DIVIDER_SPACING: Record<PageBuilderComponents["Divider"]["spacing"], string> = {
  sm: "my-4",
  md: "my-8",
  lg: "my-12",
};

const SECTION_GAP: Record<"compact" | "cozy" | "airy", string> = {
  compact: "gap-6 [&>div]:gap-6",
  cozy: "gap-10 [&>div]:gap-10",
  airy: "gap-16 [&>div]:gap-16",
};

const IMAGE_RADIUS_VALUES: Record<"theme" | "none" | "soft" | "round", string> = {
  theme: "var(--site-radius)",
  none: "0px",
  soft: "calc(var(--site-radius) * 0.65)",
  round: "9999px",
};

const OBJECT_POSITION: Record<"center" | "top" | "bottom", string> = {
  center: "object-center",
  top: "object-top",
  bottom: "object-bottom",
};

const GALLERY_ASPECT: Record<"4/3" | "1/1" | "16/9", string> = {
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
  "16/9": "aspect-video",
};

const IMAGE_ASPECT: Record<"auto" | "4/3" | "16/9" | "1/1", string> = {
  auto: "h-auto",
  "4/3": "aspect-[4/3] object-cover",
  "16/9": "aspect-video object-cover",
  "1/1": "aspect-square object-cover",
};

const VIDEO_ASPECT: Record<"16/9" | "4/3" | "1/1", string> = {
  "16/9": "aspect-video",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
};

function splitFeatures(value: string | undefined): string[] {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Accepts watch/share URLs as well as ready-to-use embed URLs. */
function videoEmbedUrl(value: string | undefined): string | null {
  const safe = safeEmbedUrl(value);
  if (!safe) return null;
  try {
    const url = new URL(safe);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : safe;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = url.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${encodeURIComponent(id)}`;
      if (url.pathname.startsWith("/embed/")) return safe;
    }
    if (host === "vimeo.com") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
    return safe;
  } catch {
    return null;
  }
}

const CARD =
  "rounded-[var(--site-radius)] border border-[var(--site-border)] bg-[var(--site-surface)]";

const MUTED_TEXT = "text-[var(--site-muted)]";

const SECTION_TITLE =
  "text-2xl font-bold tracking-tight text-[var(--site-text)] sm:text-3xl";

const HEADING_STYLE: CSSProperties = { fontFamily: "var(--site-font-heading)" };

function buttonClass(
  variant: "primary" | "secondary" | "outline" | "light" | "ghost-light" | "brand-ghost" = "primary"
): string {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[var(--site-button-radius)] px-5 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-primary)] focus-visible:ring-offset-2";
  switch (variant) {
    case "secondary":
      return `${base} bg-[var(--site-accent)] text-[var(--site-on-accent)] hover:opacity-90`;
    case "outline":
      return `${base} border border-[var(--site-border)] bg-[var(--site-surface)] text-[var(--site-text)] hover:bg-[var(--site-primary-soft)]`;
    case "light":
      return `${base} bg-white text-slate-950 hover:bg-white/90`;
    case "ghost-light":
      return `${base} border border-white/35 text-white hover:bg-white/10`;
    case "brand-ghost":
      return `${base} border border-[var(--site-on-primary)]/30 text-[var(--site-on-primary)] hover:bg-white/10`;
    default:
      return `${base} bg-[var(--site-primary)] text-[var(--site-on-primary)] hover:opacity-90`;
  }
}

function SectionHeading({
  title,
  subtitle,
  align = "center",
}: {
  title: string;
  subtitle?: string;
  align?: Align;
}) {
  if (!title && !subtitle) return null;
  return (
    <div className={`flex flex-col gap-2 ${ALIGN_TEXT[align]}`}>
      {title ? (
        <h2 className={SECTION_TITLE} style={HEADING_STYLE}>
          {title}
        </h2>
      ) : null}
      {subtitle ? (
        <p className={`max-w-2xl text-sm leading-relaxed sm:text-base ${MUTED_TEXT}`}>{subtitle}</p>
      ) : null}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  const count = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));
  return (
    <span className="text-sm tracking-[0.15em] text-amber-500" aria-label={`${count} out of 5 stars`}>
      {"★".repeat(count)}
      <span className="text-[var(--site-border)]">{"★".repeat(5 - count)}</span>
    </span>
  );
}

function ColorFieldComponent({
  value,
  onChange,
  fallback,
}: {
  value: string;
  onChange: (value: string) => void;
  fallback: string;
}) {
  const swatch = isValidHex(value) ? value : fallback;
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label="Pick a colour"
        value={swatch}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-11 shrink-0 cursor-pointer rounded-md border border-border bg-background p-1"
      />
      <input
        type="text"
        aria-label="Colour hex value"
        value={value ?? ""}
        placeholder="Theme default"
        onChange={(event) => onChange(event.target.value)}
        className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
      />
      <button
        type="button"
        title="Use the theme default"
        onClick={() => onChange("")}
        className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border text-xs text-muted-foreground transition hover:bg-muted"
      >
        ↺
      </button>
    </div>
  );
}

function colorField(label: string): CustomField<string> {
  return {
    type: "custom",
    label,
    render: ({ value, onChange }) => (
      <ColorFieldComponent
        value={value ?? ""}
        onChange={(next) => onChange(next)}
        fallback="#94a3b8"
      />
    ),
  };
}

const NAV_DEFAULT = [
  { label: "Home", href: "#home" },
  { label: "Services", href: "#services" },
  { label: "Doctors", href: "#doctors" },
  { label: "Reviews", href: "#reviews" },
  { label: "Contact", href: "#contact" },
];

const FOOTER_COLUMNS_DEFAULT = [
  {
    title: "Care",
    links: "Our services|#services\nOur doctors|#doctors\nPatient reviews|#reviews",
  },
  {
    title: "Clinic",
    links: "Book an appointment|#appointment\nFrequently asked questions|#faq\nContact us|#contact",
  },
];

export const pageBuilderConfig: Config<PageBuilderComponents, PageBuilderRootProps> = {
  categories: {
    hero: {
      title: "Hero & banners",
      components: ["Hero", "EmergencyBanner"],
    },
    content: {
      title: "Content",
      components: [
        "Heading",
        "Paragraph",
        "Button",
        "ImageBlock",
        "Features",
        "Services",
        "Stats",
        "Process",
        "Gallery",
        "BeforeAfter",
        "VideoEmbed",
        "Callout",
      ],
    },
    clinic: {
      title: "Clinic & trust",
      components: [
        "Doctors",
        "Testimonials",
        "FAQ",
        "AppointmentCTA",
        "ContactForm",
        "OpeningHours",
        "InsurancePartners",
        "Pricing",
        "ClinicDetails",
      ],
    },
    layout: {
      title: "Layout",
      components: ["Divider", "Spacer"],
    },
  },
  components: {
    Hero: {
      label: "Hero section",
      defaultProps: {
        eyebrow: "Welcome to our clinic",
        title: "Care that puts you first",
        subtitle:
          "Modern care in a calm, welcoming space. Book a visit with our friendly team today.",
        primaryLabel: "Book an appointment",
        primaryHref: "#appointment",
        secondaryLabel: "Explore services",
        secondaryHref: "#services",
        layout: "split",
        align: "left",
        tone: "light",
        imageUrl: "",
        imageAlt: "Clinic team at work",
        imagePosition: "center",
        overlay: "theme",
        stats: [],
      },
      fields: {
        eyebrow: { type: "text", label: "Eyebrow" },
        title: { type: "text", label: "Title" },
        subtitle: { type: "textarea", label: "Subtitle" },
        primaryLabel: { type: "text", label: "Primary button label" },
        primaryHref: { type: "text", label: "Primary button link" },
        secondaryLabel: { type: "text", label: "Secondary button label" },
        secondaryHref: { type: "text", label: "Secondary button link" },
        layout: {
          type: "select",
          label: "Layout",
          options: [
            { label: "Text + image", value: "split" },
            { label: "Full background image", value: "image" },
            { label: "Centered", value: "centered" },
          ],
        },
        align: {
          type: "select",
          label: "Text alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
        tone: {
          type: "select",
          label: "Style (centered layout)",
          options: [
            { label: "Light", value: "light" },
            { label: "Soft brand", value: "soft" },
            { label: "Brand colour", value: "brand" },
            { label: "Dark", value: "dark" },
          ],
        },
        imageUrl: imageField("Hero image"),
        imageAlt: { type: "text", label: "Image alt text" },
        imagePosition: {
          type: "select",
          label: "Image focus",
          options: [
            { label: "Center", value: "center" },
            { label: "Top", value: "top" },
            { label: "Bottom", value: "bottom" },
          ],
        },
        overlay: {
          type: "select",
          label: "Background overlay",
          options: [
            { label: "Theme default", value: "theme" },
            { label: "Light", value: "soft" },
            { label: "Medium", value: "medium" },
            { label: "Strong", value: "strong" },
          ],
        },
        stats: {
          type: "array",
          label: "Hero stats / trust badges",
          arrayFields: {
            value: { type: "text", label: "Value" },
            label: { type: "text", label: "Label" },
          },
          defaultItemProps: { value: "10+", label: "Years of care" },
          getItemSummary: (item) => `${item.value || ""} ${item.label || ""}`.trim() || "Stat",
        },
      },
      render: ({
        eyebrow,
        title,
        subtitle,
        primaryLabel,
        primaryHref,
        secondaryLabel,
        secondaryHref,
        layout,
        align,
        tone,
        imageUrl,
        imageAlt,
        imagePosition,
        overlay,
        stats,
      }) => {
        const items = Array.isArray(stats) ? stats.filter((item) => item.value || item.label) : [];
        const isImage = layout === "image";
        const isSplit = layout === "split";
        const darkText = isImage || tone === "brand" || tone === "dark";
        const focusClass = OBJECT_POSITION[imagePosition ?? "center"] ?? OBJECT_POSITION.center;
        const overlayStyle =
          overlay === "soft"
            ? { background: "rgba(15, 23, 42, 0.42)" }
            : overlay === "medium"
              ? { background: "rgba(15, 23, 42, 0.62)" }
              : overlay === "strong"
                ? { background: "rgba(15, 23, 42, 0.82)" }
                : { background: "var(--site-hero-overlay, rgba(15, 23, 42, 0.72))" };

        const toneClass = isImage
          ? "relative overflow-hidden border-0 bg-slate-950 text-white"
          : tone === "brand"
            ? "bg-[var(--site-primary)] text-[var(--site-on-primary)]"
            : tone === "dark"
              ? "bg-slate-950 text-white"
              : tone === "soft"
                ? "bg-[var(--site-primary-soft)] text-[var(--site-text)]"
                : `${CARD} text-[var(--site-text)]`;

        const eyebrowClass = darkText
          ? tone === "brand"
            ? "text-[var(--site-on-primary)] opacity-80"
            : "text-white/80"
          : "text-[var(--site-primary-text)]";
        const subtitleClass = darkText
          ? tone === "brand"
            ? "text-[var(--site-on-primary)] opacity-85"
            : "text-white/85"
          : MUTED_TEXT;
        const secondaryButton = isImage
          ? buttonClass("ghost-light")
          : tone === "brand"
            ? buttonClass("brand-ghost")
            : tone === "dark"
              ? buttonClass("ghost-light")
              : buttonClass("outline");
        const primaryButton =
          isImage || tone === "dark"
            ? buttonClass("light")
            : tone === "brand"
              ? "inline-flex items-center justify-center gap-2 rounded-[var(--site-button-radius)] bg-[var(--site-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--site-text)] transition hover:opacity-90"
              : buttonClass("primary");

        const textContent = (
          <>
            {eyebrow ? (
              <span className={`text-xs font-semibold uppercase tracking-[0.22em] ${eyebrowClass}`}>
                {eyebrow}
              </span>
            ) : null}
            <h1
              className="max-w-3xl text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl"
              style={HEADING_STYLE}
            >
              {title}
            </h1>
            {subtitle ? (
              <p className={`max-w-2xl text-base leading-relaxed sm:text-lg ${subtitleClass}`}>
                {subtitle}
              </p>
            ) : null}
            {primaryLabel || secondaryLabel ? (
              <div className={`flex flex-wrap gap-3 pt-2 ${ALIGN_JUSTIFY[isImage ? align : align]}`}>
                {primaryLabel ? (
                  <a href={safeHref(primaryHref)} className={primaryButton}>
                    {primaryLabel}
                  </a>
                ) : null}
                {secondaryLabel ? (
                  <a href={safeHref(secondaryHref)} className={secondaryButton}>
                    {secondaryLabel}
                  </a>
                ) : null}
              </div>
            ) : null}
            {items.length ? (
              <div
                className={`grid gap-4 pt-4 ${
                  items.length >= 4
                    ? "sm:grid-cols-2 lg:grid-cols-4"
                    : items.length === 2
                      ? "sm:grid-cols-2"
                      : "sm:grid-cols-3"
                } ${align === "center" ? "text-center" : "text-left"}`}
              >
                {items.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="min-w-0">
                    <p
                      className={`text-2xl font-bold ${
                        darkText ? "text-white" : "text-[var(--site-primary-text)]"
                      }`}
                      style={HEADING_STYLE}
                    >
                      {item.value}
                    </p>
                    <p
                      className={`mt-0.5 text-xs font-medium ${
                        darkText ? "text-white/70" : MUTED_TEXT
                      }`}
                    >
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        );

        if (isImage) {
          return (
            <section className={`flex min-h-[540px] flex-col justify-center px-6 py-16 sm:px-10 ${toneClass}`}>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={imageAlt}
                  className={`absolute inset-0 h-full w-full object-cover ${focusClass}`}
                />
              ) : (
                <div className="absolute inset-0 bg-[var(--site-primary)]" />
              )}
              <div className="absolute inset-0" style={overlayStyle} />
              <div className={`relative z-10 flex flex-col gap-5 ${ALIGN_TEXT[align]}`}>
                {textContent}
              </div>
            </section>
          );
        }

        if (isSplit) {
          return (
            <section className={`grid gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:items-center ${toneClass}`}>
              <div className={`flex flex-col gap-5 ${ALIGN_TEXT[align]}`}>{textContent}</div>
              <div className="relative min-h-[260px] overflow-hidden rounded-[calc(var(--site-radius)*1.2)] bg-[var(--site-primary-soft)]">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={imageAlt}
                    className={`h-full min-h-[260px] w-full object-cover ${focusClass}`}
                  />
                ) : (
                  <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-2 p-6 text-center text-sm text-[var(--site-muted)]">
                    <span className="text-4xl">🏥</span>
                    Add a hero image in the sidebar
                  </div>
                )}
              </div>
            </section>
          );
        }

        return (
          <section className={`flex flex-col gap-5 px-6 py-14 sm:px-10 ${toneClass} ${ALIGN_TEXT[align]}`}>
            {textContent}
          </section>
        );
      },
    },
    EmergencyBanner: {
      label: "Emergency banner",
      defaultProps: {
        text: "24/7 emergency care available. If this is an emergency, call us now.",
        phone: "+91 98765 43210",
        href: "tel:+919876543210",
        tone: "accent",
      },
      fields: {
        text: { type: "textarea", label: "Text" },
        phone: { type: "text", label: "Phone number" },
        href: { type: "text", label: "Phone link" },
        tone: {
          type: "select",
          label: "Style",
          options: [
            { label: "Accent", value: "accent" },
            { label: "Brand", value: "brand" },
            { label: "Dark", value: "dark" },
          ],
        },
      },
      render: ({ text, phone, href, tone }) => {
        const toneClass =
          tone === "brand"
            ? "bg-[var(--site-primary)] text-[var(--site-on-primary)]"
            : tone === "dark"
              ? "bg-slate-950 text-white"
              : "bg-[var(--site-accent)] text-[var(--site-on-accent)]";
        return (
          <section
            className={`flex flex-col items-start justify-between gap-3 rounded-[var(--site-radius)] px-5 py-4 sm:flex-row sm:items-center ${toneClass}`}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                !
              </span>
              <p className="text-sm font-medium leading-snug">{text}</p>
            </div>
            {phone ? (
              <a
                href={safeHref(href || `tel:${phone.replace(/[^\d+]/g, "")}`)}
                className="inline-flex shrink-0 items-center justify-center rounded-[var(--site-button-radius)] bg-white/15 px-4 py-2 text-sm font-bold transition hover:bg-white/25"
              >
                {phone}
              </a>
            ) : null}
          </section>
        );
      },
    },
    Heading: {
      defaultProps: {
        text: "A clear, friendly heading",
        level: "h2",
        align: "left",
      },
      fields: {
        text: { type: "text", label: "Heading" },
        level: {
          type: "select",
          label: "Level",
          options: [
            { label: "H1", value: "h1" },
            { label: "H2", value: "h2" },
            { label: "H3", value: "h3" },
          ],
        },
        align: {
          type: "select",
          label: "Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
      },
      render: ({ text, level, align }) => {
        const Tag = level;
        return (
          <div className={`flex flex-col ${ALIGN_TEXT[align]}`}>
            <Tag
              className={`font-bold tracking-tight text-[var(--site-text)] ${HEADING_SIZE[level]}`}
              style={HEADING_STYLE}
            >
              {text}
            </Tag>
          </div>
        );
      },
    },
    Paragraph: {
      defaultProps: {
        text: "Add a short paragraph about your clinic, your team, or the services you offer.",
        size: "base",
        align: "left",
      },
      fields: {
        text: { type: "textarea", label: "Text" },
        size: {
          type: "select",
          label: "Size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Base", value: "base" },
            { label: "Large", value: "lg" },
          ],
        },
        align: {
          type: "select",
          label: "Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
      },
      render: ({ text, size, align }) => (
        <div className={`flex flex-col ${ALIGN_TEXT[align]}`}>
          <p
            className={`max-w-3xl whitespace-pre-line leading-relaxed text-[var(--site-muted)] ${PARAGRAPH_SIZE[size]}`}
          >
            {text}
          </p>
        </div>
      ),
    },
    Button: {
      defaultProps: {
        label: "Book an appointment",
        href: "#appointment",
        variant: "primary",
        align: "left",
      },
      fields: {
        label: { type: "text", label: "Label" },
        href: { type: "text", label: "Link" },
        variant: {
          type: "select",
          label: "Style",
          options: [
            { label: "Primary", value: "primary" },
            { label: "Accent", value: "secondary" },
            { label: "Outline", value: "outline" },
          ],
        },
        align: {
          type: "select",
          label: "Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
      },
      render: ({ label, href, variant, align }) => (
        <div className={`flex ${ALIGN_JUSTIFY[align]}`}>
          <a href={safeHref(href)} className={buttonClass(variant)}>
            {label}
          </a>
        </div>
      ),
    },
    ImageBlock: {
      label: "Image",
      defaultProps: {
        src: "",
        alt: "Clinic photo",
        caption: "",
        size: "large",
        rounded: "xl",
        href: "",
        aspect: "auto",
        objectPosition: "center",
      },
      fields: {
        src: imageField("Image"),
        alt: { type: "text", label: "Alt text" },
        caption: { type: "text", label: "Caption" },
        href: { type: "text", label: "Optional link" },
        aspect: {
          type: "select",
          label: "Crop / aspect",
          options: [
            { label: "Natural", value: "auto" },
            { label: "Landscape (4:3)", value: "4/3" },
            { label: "Wide (16:9)", value: "16/9" },
            { label: "Square", value: "1/1" },
          ],
        },
        objectPosition: {
          type: "select",
          label: "Image focus",
          options: [
            { label: "Center", value: "center" },
            { label: "Top", value: "top" },
            { label: "Bottom", value: "bottom" },
          ],
        },
        size: {
          type: "select",
          label: "Size",
          options: [
            { label: "Small", value: "small" },
            { label: "Medium", value: "medium" },
            { label: "Large", value: "large" },
            { label: "Full width", value: "full" },
          ],
        },
        rounded: {
          type: "select",
          label: "Corners",
          options: [
            { label: "Square", value: "none" },
            { label: "Theme rounded", value: "md" },
            { label: "Extra rounded", value: "xl" },
          ],
        },
      },
      render: ({ src, alt, caption, size, rounded, href, aspect, objectPosition }) => {
        const image = src ? (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className={`w-full shadow-sm ${IMAGE_ASPECT[aspect ?? "auto"]} ${OBJECT_POSITION[objectPosition ?? "center"] ?? OBJECT_POSITION.center} ${IMAGE_ROUNDED[rounded]}`}
          />
        ) : (
          <div
            className={`flex aspect-video w-full items-center justify-center bg-[var(--site-primary-soft)] text-sm text-[var(--site-muted)] ${IMAGE_ROUNDED[rounded]}`}
          >
            Upload an image in the sidebar
          </div>
        );

        return (
          <figure className={`mx-auto w-full ${IMAGE_SIZE[size]}`}>
            {href ? (
              <a href={safeHref(href)} className="block">
                {image}
              </a>
            ) : (
              image
            )}
            {caption ? (
              <figcaption className="mt-2 text-center text-xs text-[var(--site-muted)]">
                {caption}
              </figcaption>
            ) : null}
          </figure>
        );
      },
    },
    Features: {
      label: "Feature grid",
      defaultProps: {
        title: "Why patients choose us",
        subtitle: "Thoughtful care, clear advice, and appointments that respect your time.",
        columns: "3",
        items: [
          {
            icon: "♥",
            title: "Gentle care",
            description: "Comfort-first treatments for every member of the family.",
          },
          {
            icon: "✚",
            title: "Modern equipment",
            description: "Digital diagnostics and precise, minimally invasive care.",
          },
          {
            icon: "◷",
            title: "Same-week visits",
            description: "Flexible appointments that fit around your schedule.",
          },
        ],
      },
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "textarea", label: "Subtitle" },
        columns: {
          type: "select",
          label: "Columns",
          options: [
            { label: "2 columns", value: "2" },
            { label: "3 columns", value: "3" },
            { label: "4 columns", value: "4" },
          ],
        },
        items: {
          type: "array",
          label: "Features",
          arrayFields: {
            icon: { type: "text", label: "Icon (emoji or symbol)" },
            title: { type: "text", label: "Title" },
            description: { type: "textarea", label: "Description" },
          },
          defaultItemProps: {
            icon: "✓",
            title: "Feature",
            description: "Describe this benefit in a sentence.",
          },
          getItemSummary: (item) => item.title || "Feature",
        },
      },
      render: ({ title, subtitle, columns, items }) => (
        <section className="flex flex-col gap-6 scroll-mt-24" id="about">
          <SectionHeading title={title} subtitle={subtitle} />
          <div className={`grid grid-cols-1 gap-4 ${FEATURE_COLUMNS[columns]}`}>
            {items.map((item, index) => (
              <div
                key={`${item.title}-${index}`}
                className={`${CARD} p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
              >
                <span className="flex size-10 items-center justify-center rounded-[calc(var(--site-radius)*0.8)] bg-[var(--site-primary-soft)] text-lg text-[var(--site-primary-text)]">
                  {item.icon || "✓"}
                </span>
                <p className="mt-3 text-sm font-semibold text-[var(--site-text)]">{item.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--site-muted)]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      ),
    },
    Services: {
      label: "Services grid",
      defaultProps: {
        title: "Care for every need",
        subtitle: "Comprehensive services delivered by an experienced, friendly team.",
        columns: "3",
        items: [
          {
            icon: "🩺",
            title: "General consultation",
            description: "A thorough assessment and a clear plan for your health.",
            href: "#appointment",
            imageUrl: "",
          },
          {
            icon: "🛡",
            title: "Preventive care",
            description: "Screenings and check-ups that help you stay well.",
            href: "#appointment",
            imageUrl: "",
          },
          {
            icon: "🔬",
            title: "Diagnostics",
            description: "On-site testing and fast, accurate results.",
            href: "#appointment",
            imageUrl: "",
          },
        ],
      },
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "textarea", label: "Subtitle" },
        columns: {
          type: "select",
          label: "Columns",
          options: [
            { label: "2 columns", value: "2" },
            { label: "3 columns", value: "3" },
            { label: "4 columns", value: "4" },
          ],
        },
        items: {
          type: "array",
          label: "Services",
          arrayFields: {
            icon: { type: "text", label: "Icon (emoji or symbol)" },
            title: { type: "text", label: "Title" },
            description: { type: "textarea", label: "Description" },
            href: { type: "text", label: "Link" },
            imageUrl: optionalImageField("Optional service image"),
          },
          defaultItemProps: {
            icon: "✚",
            title: "Service",
            description: "Describe this service in a sentence.",
            href: "#appointment",
            imageUrl: "",
          },
          getItemSummary: (item) => item.title || "Service",
        },
      },
      render: ({ title, subtitle, columns, items }) => (
        <section className="flex flex-col gap-6 scroll-mt-24" id="services">
          <SectionHeading title={title} subtitle={subtitle} />
          <div className={`grid grid-cols-1 gap-4 ${FEATURE_COLUMNS[columns]}`}>
            {items.map((item, index) => (
              <a
                key={`${item.title}-${index}`}
                href={safeHref(item.href)}
                className={`${CARD} group flex flex-col overflow-hidden p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg`}
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    loading="lazy"
                    className="mb-4 aspect-[16/9] w-full rounded-[var(--site-image-radius)] object-cover"
                  />
                ) : null}
                <span className="flex size-11 items-center justify-center rounded-[calc(var(--site-radius)*0.8)] bg-[var(--site-primary-soft)] text-xl">
                  {item.icon || "✚"}
                </span>
                <h3
                  className="mt-3 text-base font-bold text-[var(--site-text)]"
                  style={HEADING_STYLE}
                >
                  {item.title}
                </h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-[var(--site-muted)]">
                  {item.description}
                </p>
                <span className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[var(--site-primary-text)]">
                  Learn more →
                </span>
              </a>
            ))}
          </div>
        </section>
      ),
    },
    Stats: {
      label: "Stats band",
      defaultProps: {
        tone: "brand",
        items: [
          { value: "25+", label: "Years of care" },
          { value: "40k+", label: "Patients served" },
          { value: "98%", label: "Would recommend" },
          { value: "12", label: "Specialists" },
        ],
      },
      fields: {
        tone: {
          type: "select",
          label: "Style",
          options: [
            { label: "Light", value: "light" },
            { label: "Brand", value: "brand" },
            { label: "Dark", value: "dark" },
          ],
        },
        items: {
          type: "array",
          label: "Stats",
          arrayFields: {
            value: { type: "text", label: "Value" },
            label: { type: "text", label: "Label" },
          },
          defaultItemProps: { value: "10+", label: "Years of experience" },
          getItemSummary: (item) => `${item.value || ""} ${item.label || ""}`.trim() || "Stat",
        },
      },
      render: ({ tone, items }) => {
        const toneClass =
          tone === "brand"
            ? "bg-[var(--site-primary)] text-[var(--site-on-primary)]"
            : tone === "dark"
              ? "bg-slate-950 text-white"
              : `${CARD} text-[var(--site-text)]`;
        const mutedClass = tone === "light" ? "text-[var(--site-muted)]" : "text-white/70";
        return (
          <section
            className={`grid grid-cols-2 gap-6 rounded-[var(--site-radius)] px-6 py-8 sm:px-10 md:grid-cols-4 ${toneClass}`}
          >
            {items.map((item, index) => (
              <div key={`${item.label}-${index}`} className="text-center">
                <p className="text-3xl font-extrabold tracking-tight sm:text-4xl" style={HEADING_STYLE}>
                  {item.value}
                </p>
                <p className={`mt-1 text-xs font-medium sm:text-sm ${mutedClass}`}>{item.label}</p>
              </div>
            ))}
          </section>
        );
      },
    },
    Doctors: {
      label: "Doctors & team",
      defaultProps: {
        title: "Meet your care team",
        subtitle: "Experienced clinicians who listen first and explain every step.",
        items: [
          {
            name: "Dr. Aisha Khan",
            specialty: "General medicine",
            imageUrl: "/website/doctor-1.webp",
            bio: "Focused on preventive care and long-term wellbeing for the whole family.",
            href: "#appointment",
            credentials: "MBBS, MD",
          },
          {
            name: "Dr. Rohan Mehta",
            specialty: "Specialist care",
            imageUrl: "/website/doctor-2.webp",
            bio: "Combines careful diagnostics with a calm, patient-first approach.",
            href: "#appointment",
            credentials: "MBBS, MS",
          },
          {
            name: "Dr. Neha Shah",
            specialty: "Family health",
            imageUrl: "/website/doctor-3.webp",
            bio: "Helping patients feel informed, comfortable and confident in their care.",
            href: "#appointment",
            credentials: "MBBS, DCH",
          },
        ],
      },
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "textarea", label: "Subtitle" },
        items: {
          type: "array",
          label: "Team members",
          arrayFields: {
            name: { type: "text", label: "Name" },
            specialty: { type: "text", label: "Specialty" },
            imageUrl: imageField("Photo"),
            bio: { type: "textarea", label: "Short bio" },
            href: { type: "text", label: "Profile / booking link" },
            credentials: { type: "text", label: "Qualifications / credentials" },
          },
          defaultItemProps: {
            name: "Dr. New Team Member",
            specialty: "Specialty",
            imageUrl: "",
            bio: "Add a short introduction.",
            href: "#appointment",
            credentials: "",
          },
          getItemSummary: (item) => item.name || "Doctor",
        },
      },
      render: ({ title, subtitle, items }) => (
        <section className="flex flex-col gap-6 scroll-mt-24" id="doctors">
          <SectionHeading title={title} subtitle={subtitle} />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <article
                key={`${item.name}-${index}`}
                className={`${CARD} overflow-hidden shadow-sm transition hover:shadow-lg`}
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[var(--site-primary-soft)]">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-[var(--site-primary-text)]">
                      {initials(item.name) || "Dr"}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--site-primary-text)]">
                    {item.specialty}
                  </p>
                  <h3 className="text-lg font-bold text-[var(--site-text)]" style={HEADING_STYLE}>
                    {item.name}
                  </h3>
                  {item.credentials ? (
                    <p className="text-xs font-medium text-[var(--site-muted)]">{item.credentials}</p>
                  ) : null}
                  <p className="text-sm leading-relaxed text-[var(--site-muted)]">{item.bio}</p>
                  {item.href ? (
                    <a
                      href={safeHref(item.href)}
                      className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--site-primary-text)] hover:underline"
                    >
                      Book with {item.name} →
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ),
    },
    Testimonials: {
      label: "Testimonials",
      defaultProps: {
        title: "Kind words from our patients",
        subtitle: "Real experiences from people who trust us with their care.",
        items: [
          {
            quote:
              "The team explained everything clearly and made me feel completely at ease from the first visit.",
            name: "Priya S.",
            role: "Patient",
            rating: 5,
            imageUrl: "",
          },
          {
            quote:
              "I was seen quickly, treated with respect, and left with a plan I actually understood.",
            name: "Arjun M.",
            role: "Patient",
            rating: 5,
            imageUrl: "",
          },
          {
            quote:
              "A calm, friendly clinic that treats the whole family — including the nervous ones.",
            name: "Meera K.",
            role: "Parent",
            rating: 5,
            imageUrl: "",
          },
        ],
      },
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "textarea", label: "Subtitle" },
        items: {
          type: "array",
          label: "Testimonials",
          arrayFields: {
            quote: { type: "textarea", label: "Quote" },
            name: { type: "text", label: "Patient name" },
            role: { type: "text", label: "Role / context" },
            rating: { type: "number", label: "Rating (1–5)", min: 1, max: 5 },
            imageUrl: optionalImageField("Patient photo (optional)"),
          },
          defaultItemProps: {
            quote: "Share the patient experience here.",
            name: "Patient name",
            role: "Patient",
            rating: 5,
            imageUrl: "",
          },
          getItemSummary: (item) => item.name || "Testimonial",
        },
      },
      render: ({ title, subtitle, items }) => (
        <section className="flex flex-col gap-6 scroll-mt-24" id="reviews">
          <SectionHeading title={title} subtitle={subtitle} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {items.map((item, index) => (
              <figure
                key={`${item.name}-${index}`}
                className={`${CARD} flex flex-col p-6 shadow-sm`}
              >
                <Stars rating={item.rating} />
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-[var(--site-text)]">
                  “{item.quote}”
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-3 border-t border-[var(--site-border)] pt-4">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      loading="lazy"
                      className="size-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex size-9 items-center justify-center rounded-full bg-[var(--site-primary-soft)] text-xs font-bold text-[var(--site-primary-text)]">
                      {initials(item.name) || "P"}
                    </span>
                  )}
                  <span>
                    <span className="block text-sm font-semibold text-[var(--site-text)]">
                      {item.name}
                    </span>
                    <span className="block text-xs text-[var(--site-muted)]">{item.role}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ),
    },
    FAQ: {
      label: "FAQ accordion",
      defaultProps: {
        title: "Frequently asked questions",
        subtitle: "Can't find what you need? Our team is happy to help.",
        items: [
          {
            question: "How do I book an appointment?",
            answer:
              "Use the booking button on this page or call the clinic. Our team will confirm a time that works for you.",
          },
          {
            question: "Do you accept walk-ins?",
            answer:
              "Walk-ins are welcome when space is available, but booking ahead helps us keep waiting times short.",
          },
          {
            question: "What should I bring to my first visit?",
            answer:
              "Please bring a photo ID, your insurance details if applicable, and a list of any medicines you currently take.",
          },
        ],
      },
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "textarea", label: "Subtitle" },
        items: {
          type: "array",
          label: "Questions",
          arrayFields: {
            question: { type: "text", label: "Question" },
            answer: { type: "textarea", label: "Answer" },
          },
          defaultItemProps: {
            question: "New question",
            answer: "Add a helpful answer here.",
          },
          getItemSummary: (item) => item.question || "Question",
        },
      },
      render: ({ title, subtitle, items }) => (
        <section className="flex flex-col gap-6 scroll-mt-24" id="faq">
          <SectionHeading title={title} subtitle={subtitle} />
          <div className={`${CARD} divide-y divide-[var(--site-border)] overflow-hidden`}>
            {items.map((item, index) => (
              <details key={`${item.question}-${index}`} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-[var(--site-text)] [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span className="text-lg leading-none text-[var(--site-primary-text)] transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="px-5 pb-4 text-sm leading-relaxed text-[var(--site-muted)]">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      ),
    },
    AppointmentCTA: {
      label: "Appointment CTA",
      defaultProps: {
        title: "Ready to feel your best?",
        subtitle:
          "Book a visit with our team. We will confirm your appointment and answer any questions.",
        phone: "+91 98765 43210",
        buttonLabel: "Book an appointment",
        buttonHref: "#contact",
        tone: "brand",
      },
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "textarea", label: "Subtitle" },
        phone: { type: "text", label: "Phone" },
        buttonLabel: { type: "text", label: "Button label" },
        buttonHref: { type: "text", label: "Button link" },
        tone: {
          type: "select",
          label: "Style",
          options: [
            { label: "Brand", value: "brand" },
            { label: "Dark", value: "dark" },
            { label: "Light", value: "light" },
          ],
        },
      },
      render: ({ title, subtitle, phone, buttonLabel, buttonHref, tone }) => {
        const toneClass =
          tone === "brand"
            ? "bg-[var(--site-primary)] text-[var(--site-on-primary)]"
            : tone === "dark"
              ? "bg-slate-950 text-white"
              : `${CARD} text-[var(--site-text)]`;
        const muted = tone === "light" ? "text-[var(--site-muted)]" : "text-white/80";
        return (
          <section
            id="appointment"
            className={`flex scroll-mt-24 flex-col items-start justify-between gap-6 rounded-[calc(var(--site-radius)*1.25)] px-6 py-8 shadow-sm sm:px-10 lg:flex-row lg:items-center ${toneClass}`}
          >
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl" style={HEADING_STYLE}>
                {title}
              </h2>
              <p className={`mt-2 text-sm leading-relaxed sm:text-base ${muted}`}>{subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {phone ? (
                <a
                  href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                  className={
                    tone === "light"
                      ? buttonClass("outline")
                      : "inline-flex items-center justify-center gap-2 rounded-[var(--site-button-radius)] border border-white/30 px-5 py-2.5 text-sm font-semibold text-current transition hover:bg-white/10"
                  }
                >
                  {phone}
                </a>
              ) : null}
              <a
                href={safeHref(buttonHref)}
                className={tone === "light" ? buttonClass("primary") : buttonClass("light")}
              >
                {buttonLabel}
              </a>
            </div>
          </section>
        );
      },
    },
    Gallery: {
      label: "Image gallery",
      defaultProps: {
        title: "Inside our clinic",
        subtitle: "A calm, modern space designed around your comfort.",
        columns: "3",
        aspect: "4/3",
        images: [
          { src: "/website/medical-hero.webp", alt: "Doctor consulting a patient", caption: "Consultations" },
          { src: "/website/dental-clinic-1.webp", alt: "Modern treatment room", caption: "Treatment rooms" },
          { src: "/website/hospital-team.webp", alt: "Care team", caption: "Our team" },
        ],
      },
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "textarea", label: "Subtitle" },
        columns: {
          type: "select",
          label: "Columns",
          options: [
            { label: "2 columns", value: "2" },
            { label: "3 columns", value: "3" },
            { label: "4 columns", value: "4" },
          ],
        },
        aspect: {
          type: "select",
          label: "Image crop",
          options: [
            { label: "Landscape (4:3)", value: "4/3" },
            { label: "Square", value: "1/1" },
            { label: "Wide (16:9)", value: "16/9" },
          ],
        },
        images: {
          type: "array",
          label: "Images",
          arrayFields: {
            src: imageField("Photo"),
            alt: { type: "text", label: "Alt text" },
            caption: { type: "text", label: "Caption" },
          },
          defaultItemProps: {
            src: "",
            alt: "Clinic photo",
            caption: "Clinic photo",
          },
          getItemSummary: (item) => item.caption || item.alt || "Image",
        },
      },
      render: ({ title, subtitle, columns, aspect, images }) => (
        <section className="flex flex-col gap-6 scroll-mt-24" id="gallery">
          <SectionHeading title={title} subtitle={subtitle} />
          <div className={`grid grid-cols-1 gap-4 ${FEATURE_COLUMNS[columns]}`}>
            {images.map((image, index) => (
              <figure key={`${image.src}-${index}`} className="group overflow-hidden">
                {image.src ? (
                  <img
                    src={image.src}
                    alt={image.alt}
                    loading="lazy"
                    className={`w-full rounded-[var(--site-image-radius)] object-cover shadow-sm transition duration-500 group-hover:scale-[1.02] ${GALLERY_ASPECT[aspect ?? "4/3"] ?? GALLERY_ASPECT["4/3"]}`}
                  />
                ) : (
                  <div className={`flex w-full items-center justify-center rounded-[var(--site-image-radius)] bg-[var(--site-primary-soft)] text-sm text-[var(--site-muted)] ${GALLERY_ASPECT[aspect ?? "4/3"] ?? GALLERY_ASPECT["4/3"]}`}>
                    Add an image
                  </div>
                )}
                {image.caption ? (
                  <figcaption className="mt-2 text-xs font-medium text-[var(--site-muted)]">
                    {image.caption}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </section>
      ),
    },
    Process: {
      label: "How it works",
      defaultProps: {
        title: "Your visit, made simple",
        subtitle: "From first call to follow-up, we keep every step clear and comfortable.",
        steps: [
          {
            title: "Book your visit",
            description: "Choose a time online or call our front desk. We will confirm the details.",
          },
          {
            title: "Meet your clinician",
            description: "We listen, examine carefully and explain your options in plain language.",
          },
          {
            title: "Leave with a plan",
            description: "You get a clear next step, any prescriptions, and a follow-up if needed.",
          },
        ],
      },
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "textarea", label: "Subtitle" },
        steps: {
          type: "array",
          label: "Steps",
          arrayFields: {
            title: { type: "text", label: "Title" },
            description: { type: "textarea", label: "Description" },
          },
          defaultItemProps: {
            title: "New step",
            description: "Describe what happens at this stage.",
          },
          getItemSummary: (item) => item.title || "Step",
        },
      },
      render: ({ title, subtitle, steps }) => (
        <section className="flex flex-col gap-6 scroll-mt-24" id="process">
          <SectionHeading title={title} subtitle={subtitle} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={`${step.title}-${index}`} className={`${CARD} relative p-6 shadow-sm`}>
                <span className="flex size-9 items-center justify-center rounded-full bg-[var(--site-primary)] text-sm font-bold text-[var(--site-on-primary)]">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-base font-bold text-[var(--site-text)]" style={HEADING_STYLE}>
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--site-muted)]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      ),
    },
    Callout: {
      defaultProps: {
        title: "Now accepting new patients",
        body: "Call or book online to reserve your first appointment. We will confirm the details by phone.",
        tone: "info",
      },
      fields: {
        title: { type: "text", label: "Title" },
        body: { type: "textarea", label: "Body" },
        tone: {
          type: "select",
          label: "Tone",
          options: [
            { label: "Info", value: "info" },
            { label: "Success", value: "success" },
            { label: "Warning", value: "warning" },
          ],
        },
      },
      render: ({ title, body, tone }) => (
        <aside className={`rounded-[var(--site-radius)] border p-5 ${CALLOUT_TONE[tone]}`}>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-relaxed opacity-80">{body}</p>
        </aside>
      ),
    },
    BeforeAfter: {
      label: "Before & after",
      defaultProps: {
        title: "See the difference",
        subtitle: "Drag the slider to compare a real before-and-after result.",
        beforeImage: "/website/dental-clinic-1.webp",
        afterImage: "/website/dental-clinic-3.webp",
        beforeAlt: "Before treatment",
        afterAlt: "After treatment",
        beforeLabel: "Before",
        afterLabel: "After",
        aspect: "4/3",
      },
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "textarea", label: "Subtitle" },
        beforeImage: imageField("Before image"),
        afterImage: imageField("After image"),
        beforeAlt: { type: "text", label: "Before alt text" },
        afterAlt: { type: "text", label: "After alt text" },
        beforeLabel: { type: "text", label: "Before label" },
        afterLabel: { type: "text", label: "After label" },
        aspect: {
          type: "select",
          label: "Image crop",
          options: [
            { label: "Landscape (4:3)", value: "4/3" },
            { label: "Wide (16:9)", value: "16/9" },
            { label: "Square", value: "1/1" },
            { label: "Portrait (3:4)", value: "3/4" },
          ],
        },
      },
      render: ({
        title,
        subtitle,
        beforeImage,
        afterImage,
        beforeAlt,
        afterAlt,
        beforeLabel,
        afterLabel,
        aspect,
      }) => (
        <section className="flex flex-col gap-6 scroll-mt-24" id="before-after">
          <SectionHeading title={title} subtitle={subtitle} />
          <BeforeAfterSlider
            beforeImage={beforeImage}
            afterImage={afterImage}
            beforeAlt={beforeAlt}
            afterAlt={afterAlt}
            beforeLabel={beforeLabel}
            afterLabel={afterLabel}
            aspect={aspect}
          />
        </section>
      ),
    },
    VideoEmbed: {
      label: "Video",
      defaultProps: {
        title: "A look inside our clinic",
        subtitle: "Meet the team and see how we care for patients.",
        videoUrl: "",
        posterUrl: "",
        caption: "",
        aspect: "16/9",
      },
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "textarea", label: "Subtitle" },
        videoUrl: { type: "text", label: "Video URL (YouTube, Vimeo or MP4)" },
        posterUrl: imageField("Poster image (optional)"),
        caption: { type: "text", label: "Caption" },
        aspect: {
          type: "select",
          label: "Video shape",
          options: [
            { label: "Wide (16:9)", value: "16/9" },
            { label: "Landscape (4:3)", value: "4/3" },
            { label: "Square", value: "1/1" },
          ],
        },
      },
      render: ({ title, subtitle, videoUrl, posterUrl, caption, aspect }) => {
        const embed = videoEmbedUrl(videoUrl);
        const directVideo = safeEmbedUrl(videoUrl);
        const isFile = directVideo ? /\.(mp4|webm|ogg)(\?|#|$)/i.test(directVideo) : false;
        const frame = VIDEO_ASPECT[aspect ?? "16/9"] ?? VIDEO_ASPECT["16/9"];

        return (
          <section className="flex flex-col gap-6 scroll-mt-24" id="video">
            <SectionHeading title={title} subtitle={subtitle} />
            <div className={`overflow-hidden rounded-[calc(var(--site-radius)*1.2)] bg-slate-950 shadow-sm ${frame}`}>
              {isFile && directVideo ? (
                <video
                  src={directVideo}
                  poster={posterUrl || undefined}
                  controls
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : embed ? (
                <iframe
                  src={embed}
                  title={title || "Clinic video"}
                  className="h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 p-6 text-center text-sm text-white/70">
                  <span className="text-3xl">▶</span>
                  Add a YouTube, Vimeo or MP4 URL in the sidebar
                </div>
              )}
            </div>
            {caption ? (
              <p className="-mt-3 text-center text-xs text-[var(--site-muted)]">{caption}</p>
            ) : null}
          </section>
        );
      },
    },
    Pricing: {
      label: "Pricing / packages",
      defaultProps: {
        title: "Simple, transparent pricing",
        subtitle: "Choose the level of care that fits your needs. No hidden fees.",
        note: "Prices shown are indicative. Ask our team about insurance and payment plans.",
        plans: [
          {
            name: "Essential",
            price: "₹499",
            period: "per visit",
            description: "A focused consultation for a single concern.",
            features: "Consultation with a clinician\nClear treatment plan\nDigital prescription",
            ctaLabel: "Book essential",
            ctaHref: "#appointment",
            featured: "no",
          },
          {
            name: "Complete",
            price: "₹1,499",
            period: "per visit",
            description: "A comprehensive assessment with follow-up support.",
            features: "Extended consultation\nOn-site diagnostics\nFollow-up check-in\nPriority booking",
            ctaLabel: "Book complete",
            ctaHref: "#appointment",
            featured: "yes",
          },
          {
            name: "Family",
            price: "₹2,499",
            period: "per year",
            description: "Ongoing preventive care for the whole household.",
            features: "Annual health checks\nVaccination reminders\nFamily care coordinator",
            ctaLabel: "Talk to us",
            ctaHref: "#contact",
            featured: "no",
          },
        ],
      },
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "textarea", label: "Subtitle" },
        note: { type: "textarea", label: "Footnote" },
        plans: {
          type: "array",
          label: "Plans",
          arrayFields: {
            name: { type: "text", label: "Plan name" },
            price: { type: "text", label: "Price" },
            period: { type: "text", label: "Period" },
            description: { type: "textarea", label: "Description" },
            features: { type: "textarea", label: "Features (one per line)" },
            ctaLabel: { type: "text", label: "Button label" },
            ctaHref: { type: "text", label: "Button link" },
            featured: {
              type: "select",
              label: "Highlight this plan",
              options: [
                { label: "No", value: "no" },
                { label: "Yes", value: "yes" },
              ],
            },
          },
          defaultItemProps: {
            name: "New plan",
            price: "₹0",
            period: "per visit",
            description: "Describe who this plan is for.",
            features: "Feature one\nFeature two",
            ctaLabel: "Get started",
            ctaHref: "#appointment",
            featured: "no",
          },
          getItemSummary: (item) => item.name || "Plan",
        },
      },
      render: ({ title, subtitle, note, plans }) => (
        <section className="flex flex-col gap-6 scroll-mt-24" id="pricing">
          <SectionHeading title={title} subtitle={subtitle} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {plans.map((plan, index) => {
              const featured = plan.featured === "yes";
              return (
                <article
                  key={`${plan.name}-${index}`}
                  className={`${CARD} relative flex flex-col p-6 shadow-sm ${
                    featured ? "border-[var(--site-primary)] ring-2 ring-[var(--site-primary)]/15" : ""
                  }`}
                >
                  {featured ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--site-primary)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--site-on-primary)]">
                      Most popular
                    </span>
                  ) : null}
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--site-primary-text)]">
                    {plan.name}
                  </p>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold tracking-tight text-[var(--site-text)]" style={HEADING_STYLE}>
                      {plan.price}
                    </span>
                    {plan.period ? (
                      <span className="text-xs font-medium text-[var(--site-muted)]">{plan.period}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--site-muted)]">{plan.description}</p>
                  {splitFeatures(plan.features).length ? (
                    <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                      {splitFeatures(plan.features).map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-[var(--site-text)]">
                          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--site-primary-soft)] text-[10px] font-bold text-[var(--site-primary-text)]">
                            ✓
                          </span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex-1" />
                  )}
                  <a
                    href={safeHref(plan.ctaHref)}
                    className={`mt-6 ${buttonClass(featured ? "primary" : "outline")}`}
                  >
                    {plan.ctaLabel || "Get started"}
                  </a>
                </article>
              );
            })}
          </div>
          {note ? <p className="text-center text-xs text-[var(--site-muted)]">{note}</p> : null}
        </section>
      ),
    },
    InsurancePartners: {
      label: "Insurance / partners",
      defaultProps: {
        title: "Insurance & partners",
        subtitle: "We work with leading insurers and healthcare partners to make care easier.",
        note: "Ask our front desk to verify your cover before your visit.",
        items: [
          { name: "Insurance partner", logoUrl: "", href: "" },
          { name: "Corporate health", logoUrl: "", href: "" },
          { name: "Diagnostics partner", logoUrl: "", href: "" },
          { name: "Community clinic", logoUrl: "", href: "" },
        ],
      },
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "textarea", label: "Subtitle" },
        note: { type: "textarea", label: "Footnote" },
        items: {
          type: "array",
          label: "Partners",
          arrayFields: {
            name: { type: "text", label: "Name" },
            logoUrl: imageField("Logo"),
            href: { type: "text", label: "Optional link" },
          },
          defaultItemProps: { name: "Partner", logoUrl: "", href: "" },
          getItemSummary: (item) => item.name || "Partner",
        },
      },
      render: ({ title, subtitle, note, items }) => (
        <section className="flex flex-col gap-6 scroll-mt-24" id="partners">
          <SectionHeading title={title} subtitle={subtitle} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item, index) => {
              const content = (
                <div className="flex min-h-24 items-center justify-center rounded-[var(--site-radius)] border border-[var(--site-border)] bg-[var(--site-surface)] px-4 py-5 text-center shadow-sm transition hover:shadow-md">
                  {item.logoUrl ? (
                    <img
                      src={item.logoUrl}
                      alt={item.name}
                      loading="lazy"
                      className="max-h-12 w-auto max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-[var(--site-muted)]">{item.name}</span>
                  )}
                </div>
              );
              return item.href ? (
                <a key={`${item.name}-${index}`} href={safeHref(item.href)} className="block">
                  {content}
                </a>
              ) : (
                <div key={`${item.name}-${index}`}>{content}</div>
              );
            })}
          </div>
          {note ? <p className="text-center text-xs text-[var(--site-muted)]">{note}</p> : null}
        </section>
      ),
    },
    OpeningHours: {
      label: "Opening hours",
      defaultProps: {
        title: "Opening hours",
        subtitle: "Plan your visit around the times that suit you best.",
        note: "Emergency support is available outside these hours — call the clinic.",
        days: [
          { day: "Monday", hours: "9:00 AM – 6:00 PM" },
          { day: "Tuesday", hours: "9:00 AM – 6:00 PM" },
          { day: "Wednesday", hours: "9:00 AM – 6:00 PM" },
          { day: "Thursday", hours: "9:00 AM – 6:00 PM" },
          { day: "Friday", hours: "9:00 AM – 6:00 PM" },
          { day: "Saturday", hours: "9:00 AM – 2:00 PM" },
          { day: "Sunday", hours: "Closed" },
        ],
      },
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "textarea", label: "Subtitle" },
        note: { type: "textarea", label: "Footnote" },
        days: {
          type: "array",
          label: "Days",
          arrayFields: {
            day: { type: "text", label: "Day" },
            hours: { type: "text", label: "Hours" },
          },
          defaultItemProps: { day: "Day", hours: "9:00 AM – 5:00 PM" },
          getItemSummary: (item) => item.day || "Day",
        },
      },
      render: ({ title, subtitle, note, days }) => (
        <section className="flex flex-col gap-6 scroll-mt-24" id="hours">
          <SectionHeading title={title} subtitle={subtitle} />
          <div className={`${CARD} overflow-hidden shadow-sm`}>
            {days.map((item, index) => (
              <div
                key={`${item.day}-${index}`}
                className={`flex items-center justify-between gap-4 px-5 py-3.5 text-sm ${
                  index === 0 ? "" : "border-t border-[var(--site-border)]"
                }`}
              >
                <span className="font-semibold text-[var(--site-text)]">{item.day}</span>
                <span
                  className={`text-right ${
                    /closed/i.test(item.hours)
                      ? "font-medium text-[var(--site-muted)]"
                      : "font-semibold text-[var(--site-primary-text)]"
                  }`}
                >
                  {item.hours}
                </span>
              </div>
            ))}
          </div>
          {note ? <p className="text-center text-xs text-[var(--site-muted)]">{note}</p> : null}
        </section>
      ),
    },
    ContactForm: {
      label: "Contact form",
      defaultProps: {
        title: "Send us a message",
        subtitle: "Tell us what you need and our team will get back to you during clinic hours.",
        nameLabel: "Your name",
        phoneLabel: "Phone / WhatsApp",
        emailLabel: "Email",
        serviceLabel: "Service or concern",
        messageLabel: "How can we help?",
        buttonLabel: "Send message",
        successMessage: "Thank you — your message is with our team.",
        privacyNote: "We only use your details to respond to this enquiry.",
      },
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "textarea", label: "Subtitle" },
        nameLabel: { type: "text", label: "Name field label" },
        phoneLabel: { type: "text", label: "Phone field label" },
        emailLabel: { type: "text", label: "Email field label" },
        serviceLabel: { type: "text", label: "Service field label" },
        messageLabel: { type: "text", label: "Message field label" },
        buttonLabel: { type: "text", label: "Button label" },
        successMessage: { type: "text", label: "Success message" },
        privacyNote: { type: "textarea", label: "Privacy / consent note" },
      },
      render: (props) => (
        <WebsiteContactForm
          title={props.title}
          subtitle={props.subtitle}
          nameLabel={props.nameLabel}
          phoneLabel={props.phoneLabel}
          emailLabel={props.emailLabel}
          serviceLabel={props.serviceLabel}
          messageLabel={props.messageLabel}
          buttonLabel={props.buttonLabel}
          successMessage={props.successMessage}
          privacyNote={props.privacyNote}
        />
      ),
    },
    ClinicDetails: {
      label: "Contact & location",
      defaultProps: {
        name: "My Clinic",
        address: "123 Main Road, Your City",
        phone: "+91 98765 43210",
        email: "hello@myclinic.example",
        hours: "Mon–Sat · 9:00 AM – 6:00 PM",
        bookingHref: "#appointment",
        mapUrl: "",
      },
      fields: {
        name: { type: "text", label: "Clinic name" },
        address: { type: "textarea", label: "Address" },
        phone: { type: "text", label: "Phone" },
        email: { type: "text", label: "Email" },
        hours: { type: "text", label: "Opening hours" },
        bookingHref: { type: "text", label: "Booking link" },
        mapUrl: { type: "text", label: "Google Maps embed URL" },
      },
      render: ({ name, address, phone, email, hours, bookingHref, mapUrl }) => {
        const embed = safeEmbedUrl(mapUrl);
        return (
          <section
            className={`grid scroll-mt-24 gap-6 overflow-hidden rounded-[calc(var(--site-radius)*1.2)] border border-[var(--site-border)] bg-[var(--site-surface)] p-6 shadow-sm lg:grid-cols-2 lg:p-8`}
            id="contact"
          >
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--site-primary-text)]">
                  Visit us
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--site-text)]" style={HEADING_STYLE}>
                  {name}
                </h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--site-muted)]">
                  {address}
                </p>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {phone ? (
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wide text-[var(--site-muted)]">
                      Phone
                    </dt>
                    <dd className="mt-0.5">
                      <a
                        href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                        className="font-medium text-[var(--site-text)] hover:text-[var(--site-primary-text)]"
                      >
                        {phone}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {email ? (
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wide text-[var(--site-muted)]">
                      Email
                    </dt>
                    <dd className="mt-0.5 break-all">
                      <a
                        href={`mailto:${email}`}
                        className="font-medium text-[var(--site-text)] hover:text-[var(--site-primary-text)]"
                      >
                        {email}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {hours ? (
                  <div className="sm:col-span-2">
                    <dt className="text-[11px] font-bold uppercase tracking-wide text-[var(--site-muted)]">
                      Opening hours
                    </dt>
                    <dd className="mt-0.5 font-medium text-[var(--site-text)]">{hours}</dd>
                  </div>
                ) : null}
              </dl>
              <div>
                <a href={safeHref(bookingHref)} className={buttonClass("primary")}>
                  Book an appointment
                </a>
              </div>
            </div>
            <div className="min-h-[260px] overflow-hidden rounded-[var(--site-radius)] bg-[var(--site-primary-soft)]">
              {embed ? (
                <iframe
                  title={`Map to ${name}`}
                  src={embed}
                  className="h-full min-h-[260px] w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-2 p-6 text-center">
                  <span className="text-4xl">📍</span>
                  <p className="text-sm font-semibold text-[var(--site-text)]">{name}</p>
                  <p className="max-w-xs whitespace-pre-line text-xs leading-relaxed text-[var(--site-muted)]">
                    {address}
                  </p>
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-[var(--site-primary-text)]">
                    Add a Google Maps embed URL to show a live map
                  </p>
                </div>
              )}
            </div>
          </section>
        );
      },
    },
    Divider: {
      defaultProps: {
        spacing: "md",
      },
      fields: {
        spacing: {
          type: "select",
          label: "Spacing",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
      },
      render: ({ spacing }) => (
        <hr className={`border-[var(--site-border)] ${DIVIDER_SPACING[spacing]}`} />
      ),
    },
    Spacer: {
      defaultProps: {
        height: 32,
      },
      fields: {
        height: {
          type: "number",
          label: "Height (px)",
          min: 0,
          max: 240,
        },
      },
      render: ({ height }) => <div aria-hidden style={{ height: `${height}px` }} />,
    },
  },
  root: {
    fields: {
      theme: {
        type: "select",
        label: "Theme preset",
        options: THEME_PRESET_OPTIONS,
      },
      customize: {
        type: "radio",
        label: "Theme colours",
        options: [
          { label: "Use preset", value: "off" },
          { label: "Customise", value: "on" },
        ],
      },
      primaryColor: colorField("Primary colour override"),
      accentColor: colorField("Accent colour override"),
      backgroundColor: colorField("Page background override"),
      surfaceColor: colorField("Card / header background override"),
      textColor: colorField("Text colour override"),
      mutedColor: colorField("Muted text override"),
      borderColor: colorField("Borders override"),
      headingFont: {
        type: "select",
        label: "Heading font",
        options: HEADING_FONT_OPTIONS,
      },
      bodyFont: {
        type: "select",
        label: "Body font",
        options: BODY_FONT_OPTIONS,
      },
      radius: {
        type: "select",
        label: "Corner radius",
        options: RADIUS_OPTIONS,
      },
      buttonShape: {
        type: "select",
        label: "Button shape",
        options: BUTTON_SHAPE_OPTIONS,
      },
      headerStyle: {
        type: "select",
        label: "Header style",
        options: HEADER_STYLE_OPTIONS,
      },
      sectionSpacing: {
        type: "select",
        label: "Section spacing",
        options: [
          { label: "Compact", value: "compact" },
          { label: "Comfortable", value: "cozy" },
          { label: "Airy", value: "airy" },
        ],
      },
      imageRadius: {
        type: "select",
        label: "Image corners",
        options: [
          { label: "Match theme", value: "theme" },
          { label: "Square", value: "none" },
          { label: "Soft", value: "soft" },
          { label: "Round", value: "round" },
        ],
      },
      background: {
        type: "select",
        label: "Page background wash",
        options: [
          { label: "Theme background", value: "muted" },
          { label: "White", value: "white" },
          { label: "Brand tint", value: "brand" },
        ],
      },
      width: {
        type: "select",
        label: "Content width",
        options: [
          { label: "Narrow", value: "narrow" },
          { label: "Normal", value: "normal" },
          { label: "Wide", value: "wide" },
          { label: "Full width", value: "full" },
        ],
      },
      clinicName: { type: "text", label: "Clinic name" },
      logoUrl: imageField("Logo"),
      faviconUrl: optionalImageField("Favicon (browser tab icon)"),
      ogImageUrl: optionalImageField("Social share image"),
      tagline: { type: "text", label: "Tagline" },
      bookingLabel: { type: "text", label: "Header button label" },
      bookingHref: { type: "text", label: "Header button link" },
      announcement: { type: "text", label: "Announcement bar text" },
      announcementHref: { type: "text", label: "Announcement link" },
      phone: { type: "text", label: "Phone" },
      email: { type: "text", label: "Email" },
      address: { type: "textarea", label: "Address" },
      hours: { type: "text", label: "Opening hours" },
      navItems: {
        type: "array",
        label: "Navigation links",
        arrayFields: {
          label: { type: "text", label: "Label" },
          href: { type: "text", label: "Link" },
        },
        defaultItemProps: { label: "Link", href: "#" },
        getItemSummary: (item) => item.label || "Link",
      },
      footerColumns: {
        type: "array",
        label: "Footer columns",
        arrayFields: {
          title: { type: "text", label: "Column title" },
          links: {
            type: "textarea",
            label: "Links (one per line: Label|/link)",
          },
        },
        defaultItemProps: { title: "Column", links: "Link|#" },
        getItemSummary: (item) => item.title || "Column",
      },
      socialLinks: {
        type: "textarea",
        label: "Social links (one per line: Label|URL)",
      },
      footerText: { type: "text", label: "Copyright / footer text" },
      seoTitle: { type: "text", label: "SEO title" },
      seoDescription: { type: "textarea", label: "SEO description" },
    },
    defaultProps: {
      background: "muted",
      width: "full",
      theme: "medical",
      customize: "off",
      primaryColor: "",
      accentColor: "",
      backgroundColor: "",
      surfaceColor: "",
      textColor: "",
      mutedColor: "",
      borderColor: "",
      headingFont: "theme",
      bodyFont: "theme",
      radius: "theme",
      buttonShape: "theme",
      headerStyle: "theme",
      sectionSpacing: "cozy",
      imageRadius: "theme",
      clinicName: "My Clinic",
      logoUrl: "",
      faviconUrl: "",
      ogImageUrl: "",
      tagline: "Care that puts you first",
      bookingLabel: "Book an appointment",
      bookingHref: "#appointment",
      announcement: "Now accepting new patients · Same-week appointments available",
      announcementHref: "#appointment",
      phone: "+91 98765 43210",
      email: "hello@myclinic.example",
      address: "123 Main Road, Your City",
      hours: "Mon–Sat · 9:00 AM – 6:00 PM",
      navItems: NAV_DEFAULT,
      footerColumns: FOOTER_COLUMNS_DEFAULT,
      socialLinks: "Instagram|https://instagram.com\nFacebook|https://facebook.com",
      footerText: "© My Clinic. All rights reserved.",
      seoTitle: "",
      seoDescription: "",
    },
    render: (props) => {
      const {
        children,
        background,
        width,
        theme: themePreset,
        primaryColor,
        accentColor,
        backgroundColor,
        surfaceColor,
        textColor,
        mutedColor,
        borderColor,
        headingFont,
        bodyFont,
        radius,
        buttonShape,
        headerStyle,
        sectionSpacing,
        imageRadius,
        clinicName,
        logoUrl,
        faviconUrl,
        ogImageUrl,
        tagline,
        bookingLabel,
        bookingHref,
        announcement,
        announcementHref,
        phone,
        email,
        address,
        hours,
        navItems,
        footerColumns,
        socialLinks,
        footerText,
      } = props as PageBuilderRootProps & { children: ReactNode };

      const activeTheme = resolveTheme({
        theme: themePreset,
        customize: (props as PageBuilderRootProps).customize ?? "off",
        primaryColor,
        accentColor,
        backgroundColor,
        surfaceColor,
        textColor,
        mutedColor,
        borderColor,
        headingFont,
        bodyFont,
        radius,
        buttonShape,
        headerStyle,
      });

      const sectionGap = SECTION_GAP[sectionSpacing ?? "cozy"] ?? SECTION_GAP.cozy;
      const imageRadiusValue =
        IMAGE_RADIUS_VALUES[imageRadius ?? "theme"] ?? IMAGE_RADIUS_VALUES.theme;

      const nav =
        Array.isArray(navItems) && navItems.length
          ? navItems.filter((item) => item.label)
          : NAV_DEFAULT;
      const columns = Array.isArray(footerColumns) ? footerColumns : [];
      const socials = parseLinkLines(socialLinks);
      const isDarkHeader = activeTheme.headerStyle === "dark" || activeTheme.headerStyle === "brand";
      const isBrandHeader = activeTheme.headerStyle === "brand";

      const headerClass =
        activeTheme.headerStyle === "brand"
          ? "sticky top-0 z-30 border-b border-white/15 bg-[var(--site-primary)]"
          : activeTheme.headerStyle === "dark"
            ? "sticky top-0 z-30 border-b border-white/10 bg-slate-950"
            : activeTheme.headerStyle === "transparent"
              ? "sticky top-0 z-30 border-b border-[var(--site-border)] bg-[var(--site-surface)]/80 backdrop-blur"
              : "sticky top-0 z-30 border-b border-[var(--site-border)] bg-[var(--site-surface)]/95 backdrop-blur";

      const headerText = isBrandHeader
        ? "text-[var(--site-on-primary)]"
        : isDarkHeader
          ? "text-white"
          : "text-[var(--site-text)]";
      const headerMuted = isBrandHeader
        ? "text-[var(--site-on-primary)] opacity-75"
        : isDarkHeader
          ? "text-white/70"
          : "text-[var(--site-muted)]";
      const logoMark = isBrandHeader
        ? "bg-[var(--site-on-primary)] text-[var(--site-primary)]"
        : isDarkHeader
          ? "bg-white text-slate-950"
          : "bg-[var(--site-primary)] text-[var(--site-on-primary)]";
      const headerButton = isBrandHeader
        ? "bg-[var(--site-surface)] text-[var(--site-text)] hover:opacity-90"
        : isDarkHeader
          ? "bg-[var(--site-primary)] text-[var(--site-on-primary)] hover:opacity-90"
          : "bg-[var(--site-primary)] text-[var(--site-on-primary)] hover:opacity-90";

      const pageBackground =
        background === "white"
          ? "#ffffff"
          : background === "brand"
            ? "var(--site-primary-soft)"
            : "var(--site-bg)";

      return (
        <div
          className="min-h-full"
          style={{
            ...(themeCssVars(activeTheme) as CSSProperties),
            "--site-image-radius": imageRadiusValue,
            fontFamily: "var(--site-font-body)",
            color: "var(--site-text)",
            backgroundColor: pageBackground,
          } as CSSProperties}
        >
          <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />
          {faviconUrl ? <link rel="icon" href={faviconUrl} /> : null}
          {ogImageUrl ? <meta property="og:image" content={ogImageUrl} /> : null}
          {announcement ? (
            <div className="bg-[var(--site-accent)] px-4 py-2 text-center text-xs font-semibold tracking-wide text-[var(--site-on-accent)]">
              {announcementHref ? (
                <a href={safeHref(announcementHref)} className="hover:underline">
                  {announcement}
                </a>
              ) : (
                announcement
              )}
            </div>
          ) : null}
          <header className={headerClass}>
            <div
              className={`mx-auto flex w-full items-center justify-between gap-4 px-4 py-3.5 sm:px-8 ${ROOT_WIDTH[width]}`}
            >
              <a href="#home" className="flex min-w-0 items-center gap-3">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={clinicName}
                    className="size-10 shrink-0 rounded-[calc(var(--site-radius)*0.75)] bg-white object-contain ring-1 ring-black/5"
                  />
                ) : (
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-[calc(var(--site-radius)*0.75)] text-sm font-extrabold ${logoMark}`}
                  >
                    {initials(clinicName) || "MC"}
                  </span>
                )}
                <span className="flex min-w-0 flex-col">
                  <span className={`truncate text-sm font-bold tracking-tight ${headerText}`}>
                    {clinicName || "My Clinic"}
                  </span>
                  {tagline ? (
                    <span className={`hidden truncate text-[10px] font-medium sm:block ${headerMuted}`}>
                      {tagline}
                    </span>
                  ) : null}
                </span>
              </a>

              <nav className={`hidden items-center gap-6 text-sm font-medium lg:flex ${headerText}`}>
                {nav.map((item) => (
                  <a
                    key={`${item.label}-${item.href}`}
                    href={safeHref(item.href)}
                    className="transition hover:opacity-65"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>

              <div className="flex shrink-0 items-center gap-2">
                {phone ? (
                  <a
                    href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                    className={`hidden text-sm font-semibold xl:inline-flex ${headerMuted}`}
                  >
                    {phone}
                  </a>
                ) : null}
                <a
                  href={safeHref(bookingHref)}
                  className={`hidden items-center justify-center rounded-[var(--site-button-radius)] px-4 py-2 text-xs font-bold transition sm:inline-flex ${headerButton}`}
                >
                  {bookingLabel || "Book appointment"}
                </a>
                <details className="relative lg:hidden">
                  <summary
                    aria-label="Open menu"
                    className={`flex size-10 cursor-pointer list-none items-center justify-center rounded-[var(--site-radius)] border text-lg ${
                      isDarkHeader
                        ? "border-white/25 text-white"
                        : "border-[var(--site-border)] text-[var(--site-text)]"
                    } [&::-webkit-details-marker]:hidden`}
                  >
                    ☰
                  </summary>
                  <div className="absolute right-0 z-40 mt-2 w-64 rounded-[var(--site-radius)] border border-[var(--site-border)] bg-[var(--site-surface)] p-2 shadow-xl">
                    {nav.map((item) => (
                      <a
                        key={`mobile-${item.label}-${item.href}`}
                        href={safeHref(item.href)}
                        onClick={(event) => {
                          const details = event.currentTarget.closest("details");
                          if (details) details.open = false;
                        }}
                        className="block rounded-[calc(var(--site-radius)*0.6)] px-3 py-2 text-sm font-medium text-[var(--site-text)] hover:bg-[var(--site-primary-soft)]"
                      >
                        {item.label}
                      </a>
                    ))}
                    <a
                      href={safeHref(bookingHref)}
                      onClick={(event) => {
                        const details = event.currentTarget.closest("details");
                        if (details) details.open = false;
                      }}
                      className="mt-1 block rounded-[calc(var(--site-radius)*0.6)] bg-[var(--site-primary)] px-3 py-2 text-sm font-bold text-[var(--site-on-primary)]"
                    >
                      {bookingLabel || "Book an appointment"}
                    </a>
                    {phone ? (
                      <a
                        href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                        onClick={(event) => {
                          const details = event.currentTarget.closest("details");
                          if (details) details.open = false;
                        }}
                        className="mt-1 block rounded-[calc(var(--site-radius)*0.6)] border border-[var(--site-border)] px-3 py-2 text-sm font-semibold text-[var(--site-text)]"
                      >
                        Call {phone}
                      </a>
                    ) : null}
                  </div>
                </details>
              </div>
            </div>
          </header>
          <main
            id="home"
            className={`mx-auto w-full px-4 py-10 sm:px-8 ${ROOT_WIDTH[width]}`}
          >
            <div className={`flex w-full flex-col [&>div]:flex [&>div]:flex-col ${sectionGap}`}>
              {children}
            </div>
          </main>
          <footer className="border-t border-[var(--site-border)] bg-[var(--site-surface)]">
            <div
              className={`mx-auto grid w-full gap-8 px-4 py-10 sm:px-8 md:grid-cols-2 lg:grid-cols-4 ${ROOT_WIDTH[width]}`}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={clinicName}
                      className="size-9 rounded-[calc(var(--site-radius)*0.7)] bg-white object-contain ring-1 ring-black/5"
                    />
                  ) : (
                    <span className="flex size-9 items-center justify-center rounded-[calc(var(--site-radius)*0.7)] bg-[var(--site-primary)] text-xs font-extrabold text-[var(--site-on-primary)]">
                      {initials(clinicName) || "MC"}
                    </span>
                  )}
                  <span className="text-sm font-bold text-[var(--site-text)]">
                    {clinicName || "My Clinic"}
                  </span>
                </div>
                {tagline ? (
                  <p className="max-w-xs text-sm leading-relaxed text-[var(--site-muted)]">{tagline}</p>
                ) : null}
                {socials.length ? (
                  <div className="flex flex-wrap gap-2">
                    {socials.map((social) => (
                      <a
                        key={`${social.label}-${social.href}`}
                        href={safeHref(social.href)}
                        className="rounded-full border border-[var(--site-border)] px-3 py-1 text-xs font-semibold text-[var(--site-muted)] transition hover:border-[var(--site-primary)] hover:text-[var(--site-primary-text)]"
                      >
                        {social.label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
              {columns.map((column) => (
                <div key={`${column.title}-${column.links}`}>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--site-text)]">
                    {column.title}
                  </p>
                  <ul className="mt-3 flex flex-col gap-2">
                    {parseLinkLines(column.links).map((link) => (
                      <li key={`${column.title}-${link.label}-${link.href}`}>
                        <a
                          href={safeHref(link.href)}
                          className="text-sm text-[var(--site-muted)] transition hover:text-[var(--site-primary-text)]"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--site-text)]">
                  Contact
                </p>
                <ul className="mt-3 flex flex-col gap-2 text-sm text-[var(--site-muted)]">
                  {phone ? (
                    <li>
                      <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="hover:text-[var(--site-primary-text)]">
                        {phone}
                      </a>
                    </li>
                  ) : null}
                  {email ? (
                    <li className="break-all">
                      <a href={`mailto:${email}`} className="hover:text-[var(--site-primary-text)]">
                        {email}
                      </a>
                    </li>
                  ) : null}
                  {address ? <li className="whitespace-pre-line">{address}</li> : null}
                  {hours ? <li>{hours}</li> : null}
                </ul>
              </div>
            </div>
            <div className="border-t border-[var(--site-border)]">
              <div
                className={`mx-auto flex w-full flex-col gap-2 px-4 py-4 text-xs text-[var(--site-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-8 ${ROOT_WIDTH[width]}`}
              >
                <span>{footerText || `© ${new Date().getFullYear()} ${clinicName}. All rights reserved.`}</span>
                <a href={safeHref(bookingHref)} className="font-semibold hover:text-[var(--site-primary-text)]">
                  {bookingLabel || "Book an appointment"} →
                </a>
              </div>
            </div>
          </footer>
        </div>
      );
    },
  },
};

export function makeDefaultPageBuilderData(clinicName: string): PageBuilderData {
  const root: PageBuilderRootProps = {
    background: "muted",
    width: "full",
    theme: "medical",
    customize: "off",
    primaryColor: "",
    accentColor: "",
    backgroundColor: "",
    surfaceColor: "",
    textColor: "",
    mutedColor: "",
    borderColor: "",
    headingFont: "theme",
    bodyFont: "theme",
    radius: "theme",
    buttonShape: "theme",
    headerStyle: "theme",
    sectionSpacing: "cozy",
    imageRadius: "theme",
    clinicName,
    logoUrl: "",
    faviconUrl: "",
    ogImageUrl: "",
    tagline: "Care that puts you first",
    bookingLabel: "Book an appointment",
    bookingHref: "#appointment",
    announcement: "Now accepting new patients · Same-week appointments available",
    announcementHref: "#appointment",
    phone: "+91 98765 43210",
    email: "hello@myclinic.example",
    address: "123 Main Road, Your City",
    hours: "Mon–Sat · 9:00 AM – 6:00 PM",
    navItems: NAV_DEFAULT,
    footerColumns: FOOTER_COLUMNS_DEFAULT,
    socialLinks: "Instagram|https://instagram.com\nFacebook|https://facebook.com",
    footerText: `© ${clinicName}. All rights reserved.`,
    seoTitle: "",
    seoDescription: "",
  };

  return {
    root: { props: root },
    content: [
      {
        type: "Hero",
        props: {
          id: "hero-1",
          eyebrow: "Welcome to our clinic",
          title: "Care that puts you first",
          subtitle:
            "Modern care in a calm, welcoming space. Book a visit with our friendly team today.",
          primaryLabel: "Book an appointment",
          primaryHref: "#appointment",
          secondaryLabel: "Explore services",
          secondaryHref: "#services",
          layout: "split",
          align: "left",
          tone: "light",
          imageUrl: "/website/medical-hero.webp",
          imageAlt: "Clinic team at work",
          imagePosition: "center",
          overlay: "theme",
          stats: [
            { value: "25+", label: "Years of care" },
            { value: "40k+", label: "Patients served" },
            { value: "4.9/5", label: "Patient rating" },
          ],
        },
      },
      {
        type: "Features",
        props: {
          id: "features-1",
          title: "Why patients choose us",
          subtitle: "Thoughtful care, clear advice, and appointments that respect your time.",
          columns: "3",
          items: [
            {
              icon: "♥",
              title: "Gentle care",
              description: "Comfort-first treatments for every member of the family.",
            },
            {
              icon: "✚",
              title: "Modern equipment",
              description: "Digital diagnostics and precise, minimally invasive care.",
            },
            {
              icon: "◷",
              title: "Same-week visits",
              description: "Flexible appointments that fit around your schedule.",
            },
          ],
        },
      },
      {
        type: "ClinicDetails",
        props: {
          id: "clinic-details-1",
          name: clinicName,
          address: "123 Main Road, Your City",
          phone: "+91 98765 43210",
          email: "hello@myclinic.example",
          hours: "Mon–Sat · 9:00 AM – 6:00 PM",
          bookingHref: "#appointment",
          mapUrl: "",
        },
      },
    ],
  };
}

export const defaultPageBuilderData: PageBuilderData = makeDefaultPageBuilderData("My Clinic");

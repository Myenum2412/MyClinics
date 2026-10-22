"use client";

/* eslint-disable @next/next/no-img-element */

import type { CSSProperties } from "react";
import type { Config, Data } from "@puckeditor/core";

type Align = "left" | "center" | "right";

export type PageBuilderRootProps = {
  background: "white" | "muted" | "brand";
  width: "narrow" | "normal" | "wide" | "full";
  clinicName: string;
  logoUrl: string;
  primaryColor: string;
  footerText: string;
};

export type PageBuilderComponents = {
  Hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    ctaHref: string;
    align: Align;
    tone: "light" | "brand" | "dark";
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
  };
  Features: {
    title: string;
    subtitle: string;
    columns: "2" | "3" | "4";
    items: { title: string; description: string }[];
  };
  Callout: {
    title: string;
    body: string;
    tone: "info" | "success" | "warning";
  };
  ClinicDetails: {
    name: string;
    address: string;
    phone: string;
    email: string;
    hours: string;
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

const ROOT_BG: Record<PageBuilderRootProps["background"], string> = {
  white: "bg-background",
  muted: "bg-muted/40",
  brand: "bg-primary/5",
};

const ROOT_WIDTH: Record<PageBuilderRootProps["width"], string> = {
  narrow: "max-w-3xl",
  normal: "max-w-5xl",
  wide: "max-w-7xl",
  full: "max-w-none",
};

const HERO_TONE: Record<PageBuilderComponents["Hero"]["tone"], string> = {
  light: "border border-border bg-background text-foreground",
  brand: "bg-primary text-primary-foreground",
  dark: "bg-slate-900 text-white",
};

const HERO_EYEBROW: Record<PageBuilderComponents["Hero"]["tone"], string> = {
  light: "text-primary",
  brand: "text-primary-foreground/80",
  dark: "text-white/70",
};

const HERO_SUBTITLE: Record<PageBuilderComponents["Hero"]["tone"], string> = {
  light: "text-muted-foreground",
  brand: "text-primary-foreground/85",
  dark: "text-white/80",
};

const HERO_CTA: Record<PageBuilderComponents["Hero"]["tone"], string> = {
  light: "bg-primary text-primary-foreground hover:bg-primary/90",
  brand: "bg-background text-foreground hover:bg-background/90",
  dark: "bg-white text-slate-900 hover:bg-white/90",
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

const BUTTON_VARIANT: Record<PageBuilderComponents["Button"]["variant"], string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "border border-border bg-background text-foreground hover:bg-muted",
};

const IMAGE_SIZE: Record<PageBuilderComponents["ImageBlock"]["size"], string> = {
  small: "max-w-sm",
  medium: "max-w-xl",
  large: "max-w-3xl",
  full: "max-w-full",
};

const IMAGE_ROUNDED: Record<PageBuilderComponents["ImageBlock"]["rounded"], string> = {
  none: "rounded-none",
  md: "rounded-lg",
  xl: "rounded-2xl",
};

const FEATURE_COLUMNS: Record<PageBuilderComponents["Features"]["columns"], string> = {
  "2": "sm:grid-cols-2",
  "3": "sm:grid-cols-2 lg:grid-cols-3",
  "4": "sm:grid-cols-2 lg:grid-cols-4",
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

function safeHref(value: string): string {
  const href = (value ?? "").trim();
  if (!href) return "#";
  if (/^(javascript|data|vbscript):/i.test(href)) return "#";
  return href;
}

export const pageBuilderConfig: Config<PageBuilderComponents, PageBuilderRootProps> = {
  categories: {
    hero: {
      title: "Hero",
      components: ["Hero"],
    },
    content: {
      title: "Content",
      components: ["Heading", "Paragraph", "Button", "ImageBlock", "Features", "Callout"],
    },
    clinic: {
      title: "Clinic",
      components: ["ClinicDetails"],
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
          "Modern dentistry and general care in a calm, welcoming space. Book a visit with our team today.",
        ctaLabel: "Book an appointment",
        ctaHref: "#contact",
        align: "center",
        tone: "brand",
      },
      fields: {
        eyebrow: { type: "text", label: "Eyebrow" },
        title: { type: "text", label: "Title" },
        subtitle: { type: "textarea", label: "Subtitle" },
        ctaLabel: { type: "text", label: "Button label" },
        ctaHref: { type: "text", label: "Button link" },
        align: {
          type: "select",
          label: "Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
        tone: {
          type: "select",
          label: "Style",
          options: [
            { label: "Light", value: "light" },
            { label: "Brand", value: "brand" },
            { label: "Dark", value: "dark" },
          ],
        },
      },
      render: ({ eyebrow, title, subtitle, ctaLabel, ctaHref, align, tone }) => (
        <section
          className={`flex flex-col gap-4 rounded-2xl px-6 py-12 sm:px-10 sm:py-16 ${HERO_TONE[tone]} ${ALIGN_TEXT[align]}`}
        >
          {eyebrow ? (
            <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${HERO_EYEBROW[tone]}`}>
              {eyebrow}
            </span>
          ) : null}
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          {subtitle ? (
            <p className={`max-w-2xl text-base leading-relaxed sm:text-lg ${HERO_SUBTITLE[tone]}`}>
              {subtitle}
            </p>
          ) : null}
          {ctaLabel ? (
            <a
              href={safeHref(ctaHref)}
              className={`mt-2 inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold transition ${HERO_CTA[tone]}`}
            >
              {ctaLabel}
            </a>
          ) : null}
        </section>
      ),
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
            <Tag className={`font-bold tracking-tight text-foreground ${HEADING_SIZE[level]}`}>{text}</Tag>
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
          <p className={`max-w-3xl whitespace-pre-line leading-relaxed text-muted-foreground ${PARAGRAPH_SIZE[size]}`}>
            {text}
          </p>
        </div>
      ),
    },
    Button: {
      defaultProps: {
        label: "Book an appointment",
        href: "/clinic/appointments",
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
            { label: "Secondary", value: "secondary" },
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
          <a
            href={safeHref(href)}
            className={`inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold transition ${BUTTON_VARIANT[variant]}`}
          >
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
      },
      fields: {
        src: { type: "text", label: "Image URL" },
        alt: { type: "text", label: "Alt text" },
        caption: { type: "text", label: "Caption" },
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
            { label: "Rounded", value: "md" },
            { label: "Extra rounded", value: "xl" },
          ],
        },
      },
      render: ({ src, alt, caption, size, rounded }) => (
        <figure className={`mx-auto w-full ${IMAGE_SIZE[size]}`}>
          {src ? (
            <img
              src={src}
              alt={alt}
              className={`h-auto w-full object-cover shadow-sm ${IMAGE_ROUNDED[rounded]}`}
            />
          ) : (
            <div
              className={`flex aspect-video w-full items-center justify-center bg-muted text-sm text-muted-foreground ${IMAGE_ROUNDED[rounded]}`}
            >
              Add an image URL in the sidebar
            </div>
          )}
          {caption ? (
            <figcaption className="mt-2 text-center text-xs text-muted-foreground">{caption}</figcaption>
          ) : null}
        </figure>
      ),
    },
    Features: {
      label: "Feature grid",
      defaultProps: {
        title: "Why patients choose us",
        subtitle: "",
        columns: "3",
        items: [
          {
            title: "Gentle care",
            description: "Comfort-first treatments for every member of the family.",
          },
          {
            title: "Modern equipment",
            description: "Digital diagnostics and precise, minimally invasive care.",
          },
          {
            title: "Same-week visits",
            description: "Flexible appointments that fit around your schedule.",
          },
        ],
      },
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "text", label: "Subtitle" },
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
            title: { type: "text", label: "Title" },
            description: { type: "textarea", label: "Description" },
          },
          defaultItemProps: {
            title: "Feature",
            description: "Describe this benefit in a sentence.",
          },
          getItemSummary: (item) => item.title || "Feature",
        },
      },
      render: ({ title, subtitle, columns, items }) => (
        <section className="flex flex-col gap-6">
          {title || subtitle ? (
            <div className="flex flex-col gap-2">
              {title ? (
                <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h2>
              ) : null}
              {subtitle ? <p className="max-w-2xl text-muted-foreground">{subtitle}</p> : null}
            </div>
          ) : null}
          <div className={`grid grid-cols-1 gap-4 ${FEATURE_COLUMNS[columns]}`}>
            {items.map((item, index) => (
              <div
                key={`${item.title}-${index}`}
                className="rounded-xl border border-border bg-background p-5 shadow-sm"
              >
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
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
        <aside className={`rounded-xl border p-5 ${CALLOUT_TONE[tone]}`}>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-relaxed opacity-80">{body}</p>
        </aside>
      ),
    },
    ClinicDetails: {
      label: "Clinic details",
      defaultProps: {
        name: "My Clinic",
        address: "123 Main Road, Your City",
        phone: "+91 98765 43210",
        email: "hello@myclinic.example",
        hours: "Mon–Sat · 9:00 AM – 6:00 PM",
      },
      fields: {
        name: { type: "text", label: "Clinic name" },
        address: { type: "textarea", label: "Address" },
        phone: { type: "text", label: "Phone" },
        email: { type: "text", label: "Email" },
        hours: { type: "text", label: "Opening hours" },
      },
      render: ({ name, address, phone, email, hours }) => (
        <section className="grid gap-6 rounded-2xl border border-border bg-background p-6 shadow-sm sm:grid-cols-2" id="contact">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">{name}</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{address}</p>
          </div>
          <dl className="grid gap-3 text-sm">
            {phone ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</dt>
                <dd className="mt-0.5 text-foreground">{phone}</dd>
              </div>
            ) : null}
            {email ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</dt>
                <dd className="mt-0.5 break-all text-foreground">{email}</dd>
              </div>
            ) : null}
            {hours ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hours</dt>
                <dd className="mt-0.5 text-foreground">{hours}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ),
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
      render: ({ spacing }) => <hr className={`border-border ${DIVIDER_SPACING[spacing]}`} />,
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
      background: {
        type: "select",
        label: "Page background",
        options: [
          { label: "White", value: "white" },
          { label: "Muted", value: "muted" },
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
      logoUrl: { type: "text", label: "Logo URL" },
      primaryColor: { type: "text", label: "Brand color (hex)" },
      footerText: { type: "text", label: "Footer text" },
    },
    defaultProps: {
      background: "muted",
      width: "full",
      clinicName: "My Clinic",
      logoUrl: "",
      primaryColor: "#0f766e",
      footerText: "© My Clinic. All rights reserved.",
    },
    render: ({ children, background, width, clinicName, logoUrl, primaryColor, footerText }) => (
      <div
        className={`min-h-full ${ROOT_BG[background]}`}
        style={{ "--primary": primaryColor || "#0f766e" } as CSSProperties}
      >
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
          <div
            className={`mx-auto flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-8 ${ROOT_WIDTH[width]}`}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={clinicName}
                  className="size-9 shrink-0 rounded-lg object-contain ring-1 ring-border"
                />
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                  {(clinicName || "MC").slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="truncate text-sm font-semibold tracking-tight text-foreground">
                {clinicName || "My Clinic"}
              </span>
            </div>
            <a
              href="#contact"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Book an appointment
            </a>
          </div>
        </header>
        <main
          className={`mx-auto flex w-full flex-col gap-8 px-4 py-10 sm:px-8 ${ROOT_WIDTH[width]}`}
        >
          {children}
        </main>
        {footerText ? (
          <footer className="border-t border-border bg-background">
            <div
              className={`mx-auto w-full px-4 py-6 text-xs text-muted-foreground sm:px-8 ${ROOT_WIDTH[width]}`}
            >
              {footerText}
            </div>
          </footer>
        ) : null}
      </div>
    ),
  },
};

export function makeDefaultPageBuilderData(clinicName: string): PageBuilderData {
  return {
    root: {
      props: {
        background: "muted",
        width: "full",
        clinicName,
        logoUrl: "",
        primaryColor: "#0f766e",
        footerText: `© ${clinicName}. All rights reserved.`,
      },
    },
    content: [
      {
        type: "Hero",
        props: {
          id: "hero-1",
          eyebrow: "Welcome to our clinic",
          title: "Care that puts you first",
          subtitle:
            "Modern dentistry and general care in a calm, welcoming space. Book a visit with our team today.",
          ctaLabel: "Book an appointment",
          ctaHref: "#contact",
          align: "center",
          tone: "brand",
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
              title: "Gentle care",
              description: "Comfort-first treatments for every member of the family.",
            },
            {
              title: "Modern equipment",
              description: "Digital diagnostics and precise, minimally invasive care.",
            },
            {
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
        },
      },
    ],
  };
}

export const defaultPageBuilderData: PageBuilderData = makeDefaultPageBuilderData("My Clinic");

import * as React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import type { TCountryCode } from "countries-list";
import { HeroHeader } from "@/components/hero-section-6-header";
import { FooterSection } from "@/components/footer-section";
import NewsletterBlock from "@/components/blocks/newsletter-2";
import PartnersJoinForm from "@/components/blocks/partners-join-form";
import { DottedMap } from "@/components/magicui/dotted-map";
import type { Marker } from "@/components/magicui/dotted-map";

type CountryCode = Lowercase<TCountryCode>

type MapMarker = Marker & {
  overlay: {
    countryCode: CountryCode
    label: string
  }
}

// Our home base — the flag and label ride along as a marker overlay.
const INDIA_MARKERS: MapMarker[] = [
  {
    lat: 28.6139,
    lng: 77.209,
    size: 10,
    overlay: { countryCode: "in", label: "New Delhi" },
  },
]

// India's bounding box, and a near-square viewBox matching its Mercator aspect
// so the outline isn't stretched. `countries` must be an ISO3 id, not a name.
const INDIA_REGION = {
  lat: { min: 6.5, max: 37.5 },
  lng: { min: 68, max: 97.5 },
};

export const metadata: Metadata = {
  title: "Partners",
  description:
    "Partner with My Clinics — grow together and bring better clinic management to more practices.",
};

export default function PartnersPage() {
  const id = React.useId();

  return (
    <div className="relative isolate flex min-h-svh flex-col bg-black text-white">
      {/* Full-page partner backdrop. Fixed so it never stretches past the viewport. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <Image
          src="/partnersbg.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[22%_center] lg:object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.35),transparent_25%,transparent_75%,rgba(0,0,0,0.45))]" />
      </div>

      <HeroHeader />

      <main className="relative z-10 flex min-h-[60svh] flex-1 items-center justify-center px-6 pt-24 pb-16 sm:pt-28">
        <section
          id="become-a-partner"
          className="flex w-full max-w-2xl flex-col items-center justify-center text-center"
        >
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-blue-950 sm:text-5xl md:text-6xl">
            Grow together with My Clinics
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-slate-700 sm:text-lg">
            Join our partner network and bring smarter clinic management to more practices.
          </p>
          <PartnersJoinForm />
        </section>
      </main>

      {/* Dotted world map — India lit up as our home base. */}
      <section
        id="where-we-are"
        className="relative z-10 flex w-full flex-col items-center bg-white px-6 py-20 text-zinc-900"
      >
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            Join our team
          </h2>
          <p className="mt-3 max-w-xl text-pretty text-base leading-relaxed text-zinc-600">
            We&apos;re building the future of clinic management from India — and
            we&apos;re growing. Come shape it with us.
          </p>

          <div className="relative mt-10 h-[420px] w-full max-w-sm overflow-hidden rounded-lg">
            <div
              aria-hidden
              className="absolute inset-0 bg-radial from-transparent to-white to-200%"
            />
            <DottedMap<MapMarker>
              countries={["IND"]}
              region={INDIA_REGION}
              width={300}
              height={346}
              mapSamples={6000}
              markers={INDIA_MARKERS}
              dotColor="#000000"
              markerColor="#000000"
              className="w-full text-zinc-900"
              aria-label="Dotted map of India"
              renderMarkerOverlay={({ marker, x, y, r, index }) => {
                const { countryCode, label } = marker.overlay
                const href = `https://flagcdn.com/w80/${countryCode}.webp`

                const clipId = `${id}-flag-clip-${index}`.replace(/:/g, "-")
                const imgR = r * 0.75

                const fontSize = r * 0.9
                const pillH = r * 1.5
                const pillW = label.length * (fontSize * 0.62) + r * 1.4
                const pillX = x + r + r * 0.6
                const pillY = y - pillH / 2

                return (
                  <g style={{ pointerEvents: "none" }}>
                    <clipPath id={clipId}>
                      <circle cx={x} cy={y} r={imgR} />
                    </clipPath>

                    <image
                      href={href}
                      x={x - imgR}
                      y={y - imgR}
                      width={imgR * 2}
                      height={imgR * 2}
                      preserveAspectRatio="xMidYMid slice"
                      clipPath={`url(#${clipId})`}
                    />

                    <rect
                      x={pillX}
                      y={pillY}
                      width={pillW}
                      height={pillH}
                      rx={pillH / 2}
                      fill="rgba(0,0,0,0.55)"
                    />
                    <text
                      x={pillX + r * 0.7}
                      y={y + fontSize * 0.35}
                      fontSize={fontSize}
                      fill="white"
                    >
                      {label}
                    </text>
                  </g>
                )
              }}
            />
          </div>
        </div>
      </section>

      <div className="relative z-10">
        <NewsletterBlock />
      </div>

      <div className="relative z-10">
        <FooterSection />
      </div>
    </div>
  );
}

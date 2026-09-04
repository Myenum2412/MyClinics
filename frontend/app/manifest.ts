import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My Clinics — Clinic Management",
    short_name: "My Clinics",
    description:
      "Complete clinic management platform — appointments, patient records, billing and reports.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    categories: ["medical", "health", "productivity", "business"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Appointments",
        short_name: "Appointments",
        description: "Open the appointments dashboard",
        url: "/clinic/appointments",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        ],
      },
      {
        name: "Patients",
        short_name: "Patients",
        description: "Open the patients dashboard",
        url: "/clinic/patients",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        ],
      },
      {
        name: "Billing",
        short_name: "Billing",
        description: "Open the billing dashboard",
        url: "/clinic/billing",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        ],
      },
    ],
  };
}

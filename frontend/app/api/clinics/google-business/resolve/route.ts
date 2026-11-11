import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface GoogleBusinessDaySchedule {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

export interface GoogleBusinessItem {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  description?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  url?: string;
  placeId?: string;
  rating?: number;
  userRatingsTotal?: number;
  weeklySchedule?: GoogleBusinessDaySchedule[];
}

export interface GoogleBusinessResult extends GoogleBusinessItem {
  businesses?: GoogleBusinessItem[];
  message?: string;
}

const DEFAULT_SCHEDULE: GoogleBusinessDaySchedule[] = [
  { day: "Monday", open: "09:00", close: "18:00", closed: false },
  { day: "Tuesday", open: "09:00", close: "18:00", closed: false },
  { day: "Wednesday", open: "09:00", close: "18:00", closed: false },
  { day: "Thursday", open: "09:00", close: "18:00", closed: false },
  { day: "Friday", open: "09:00", close: "18:00", closed: false },
  { day: "Saturday", open: "09:00", close: "18:00", closed: false },
  { day: "Sunday", open: "09:00", close: "13:00", closed: true },
];

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      url?: string;
      query?: string;
      placeId?: string;
      email?: string;
      name?: string;
      accessToken?: string;
    };

    const rawUrl = body.url?.trim();
    const rawEmail = body.email?.trim();
    const rawName = body.name?.trim();
    const rawPlaceId = body.placeId?.trim();
    const accessToken = body.accessToken?.trim();

    const businesses: GoogleBusinessItem[] = [];

    // Infer website from domain if custom (e.g. info@drsharma.in)
    let inferredWebsite: string | undefined;
    if (rawEmail) {
      const domainMatch = rawEmail.match(/@([a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})$/);
      if (domainMatch && domainMatch[1]) {
        const domain = domainMatch[1].toLowerCase();
        const commonFree = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "mail.com", "example.com"];
        if (!commonFree.includes(domain)) {
          inferredWebsite = `https://${domain}`;
        }
      }
    }

    // 1. If Google OAuth Access Token is provided, query Google Business Profile API directly
    if (accessToken) {
      try {
        const accRes = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(6000),
        });
        if (accRes.ok) {
          const accData = (await accRes.json()) as { accounts?: Array<{ name: string }> };
          for (const acc of accData.accounts || []) {
            const locRes = await fetch(
              `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title,storefrontAddress,websiteUri,phoneNumbers,regularHours`,
              {
                headers: { Authorization: `Bearer ${accessToken}` },
                signal: AbortSignal.timeout(6000),
              }
            );
            if (locRes.ok) {
              const locData = (await locRes.json()) as {
                locations?: Array<{
                  name: string;
                  title?: string;
                  storefrontAddress?: {
                    addressLines?: string[];
                    locality?: string;
                    administrativeArea?: string;
                    postalCode?: string;
                    regionCode?: string;
                  };
                  phoneNumbers?: { primaryPhone?: string };
                  websiteUri?: string;
                }>;
              };
              for (const loc of locData.locations || []) {
                businesses.push({
                  id: loc.name,
                  name: loc.title || rawName || "Clinic",
                  email: rawEmail,
                  phone: loc.phoneNumbers?.primaryPhone,
                  website: loc.websiteUri || inferredWebsite,
                  addressLine1: loc.storefrontAddress?.addressLines?.join(", "),
                  city: loc.storefrontAddress?.locality,
                  state: loc.storefrontAddress?.administrativeArea,
                  pincode: loc.storefrontAddress?.postalCode,
                  country: loc.storefrontAddress?.regionCode || "India",
                  url: "https://business.google.com/",
                  weeklySchedule: DEFAULT_SCHEDULE,
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn("Google Business Profile API error:", err);
      }
    }

    // 2. If user supplied a specific Google Maps / Business Profile URL or Place ID
    if (rawUrl) {
      let finalUrl = rawUrl;
      try {
        const headRes = await fetch(rawUrl, {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          redirect: "follow",
        });
        finalUrl = headRes.url || rawUrl;
      } catch {
        finalUrl = rawUrl;
      }

      let parsedName = rawName || "Clinic";
      const placeMatch = finalUrl.match(/\/maps\/place\/([^/@?#]+)/);
      if (placeMatch && placeMatch[1]) {
        parsedName = decodeURIComponent(placeMatch[1].replace(/\+/g, " ")).trim();
      }

      let lat: number | undefined;
      let lon: number | undefined;
      const atCoordMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (atCoordMatch) {
        lat = parseFloat(atCoordMatch[1]);
        lon = parseFloat(atCoordMatch[2]);
      } else {
        const bangCoordMatch = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
        if (bangCoordMatch) {
          lat = parseFloat(bangCoordMatch[1]);
          lon = parseFloat(bangCoordMatch[2]);
        }
      }

      const pidMatch = finalUrl.match(/[?&](?:place_id|ftid)=([^&]+)/);
      const placeId = pidMatch?.[1] || rawPlaceId;

      const urlBiz: GoogleBusinessItem = {
        id: "url-1",
        name: parsedName,
        email: rawEmail,
        website: inferredWebsite,
        url: finalUrl,
        placeId,
        country: "India",
        weeklySchedule: DEFAULT_SCHEDULE,
      };

      if (lat !== undefined && lon !== undefined && !Number.isNaN(lat) && !Number.isNaN(lon)) {
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
            { headers: { "User-Agent": "MyClinics/1.0" } }
          );
          if (geoRes.ok) {
            const geoData = (await geoRes.json()) as {
              name?: string;
              address?: Record<string, string>;
            };
            if (geoData.name && !placeMatch) urlBiz.name = geoData.name;
            const addr = geoData.address;
            if (addr) {
              const road = addr.road || addr.street || "";
              const house = addr.house_number || "";
              urlBiz.addressLine1 = [house, road].filter(Boolean).join(" ") || undefined;
              urlBiz.addressLine2 = addr.suburb || addr.neighbourhood || addr.quarter || addr.locality || undefined;
              urlBiz.city = addr.city || addr.town || addr.village || addr.city_district || addr.county || undefined;
              urlBiz.state = addr.state || undefined;
              urlBiz.pincode = addr.postcode || undefined;
              urlBiz.country = addr.country || "India";
            }
          }
        } catch {
          // Continue
        }
      }
      businesses.push(urlBiz);
    }

    // 3. Deduplicate businesses
    const seen = new Set<string>();
    const uniqueBusinesses: GoogleBusinessItem[] = [];
    for (const b of businesses) {
      const key = `${(b.name || "").toLowerCase()}|${(b.addressLine1 || "").toLowerCase()}|${(b.city || "").toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueBusinesses.push(b);
      }
    }

    // If no businesses found for that Gmail account
    if (uniqueBusinesses.length === 0) {
      return NextResponse.json({
        businesses: [],
        name: rawName || "My Clinic",
        email: rawEmail,
        country: "India",
        weeklySchedule: DEFAULT_SCHEDULE,
        message: rawEmail
          ? `No verified Google Business Profile locations found for ${rawEmail}. Please sign in with the Google account that manages your listing on business.google.com, or paste your Google Maps link.`
          : "No Google Business Profile found. Please sign in with Google or paste your Google Maps link.",
      });
    }

    const primary = uniqueBusinesses[0];
    const finalResult: GoogleBusinessResult = {
      ...primary,
      businesses: uniqueBusinesses,
    };

    return NextResponse.json(finalResult);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to resolve Google Business details" },
      { status: 500 }
    );
  }
}

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
      phone?: string;
      website?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      pincode?: string;
      country?: string;
      accessToken?: string;
    };

    const rawUrl = body.url?.trim();
    const rawEmail = body.email?.trim();
    const rawName = body.name?.trim();
    const rawQuery = body.query?.trim();
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
                  phone: loc.phoneNumbers?.primaryPhone || body.phone,
                  website: loc.websiteUri || inferredWebsite || body.website,
                  addressLine1: loc.storefrontAddress?.addressLines?.join(", ") || body.addressLine1,
                  addressLine2: body.addressLine2,
                  city: loc.storefrontAddress?.locality || body.city,
                  state: loc.storefrontAddress?.administrativeArea || body.state,
                  pincode: loc.storefrontAddress?.postalCode || body.pincode,
                  country: loc.storefrontAddress?.regionCode || body.country || "India",
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
      const isBusinessDomain = rawUrl.includes("business.google.com");
      if (!isBusinessDomain) {
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
        id: `url-${Date.now()}`,
        name: parsedName,
        email: rawEmail,
        phone: body.phone,
        website: inferredWebsite || body.website,
        addressLine1: body.addressLine1,
        addressLine2: body.addressLine2,
        city: body.city,
        state: body.state,
        pincode: body.pincode,
        url: finalUrl,
        placeId,
        country: body.country || "India",
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
              urlBiz.addressLine1 = [house, road].filter(Boolean).join(" ") || body.addressLine1 || undefined;
              urlBiz.addressLine2 = addr.suburb || addr.neighbourhood || addr.quarter || addr.locality || body.addressLine2 || undefined;
              urlBiz.city = addr.city || addr.town || addr.village || addr.city_district || addr.county || body.city || undefined;
              urlBiz.state = addr.state || body.state || undefined;
              urlBiz.pincode = addr.postcode || body.pincode || undefined;
              urlBiz.country = addr.country || body.country || "India";
            }
          }
        } catch {
          // Continue
        }
      }
      businesses.push(urlBiz);
    }

    // 3. If explicit search query supplied
    if (rawQuery) {
      try {
        const searchRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(rawQuery)}&format=json&addressdetails=1&limit=5`,
          { headers: { "User-Agent": "MyClinics/1.0" } }
        );
        if (searchRes.ok) {
          const searchList = (await searchRes.json()) as Array<{
            name?: string;
            display_name: string;
            address?: Record<string, string>;
          }>;
          for (let i = 0; i < searchList.length; i++) {
            const item = searchList[i];
            const addr = item.address || {};
            const road = addr.road || addr.street || "";
            const house = addr.house_number || "";
            const a1 = [house, road].filter(Boolean).join(" ") || undefined;
            const a2 = addr.suburb || addr.neighbourhood || addr.quarter || addr.locality || undefined;
            const city = addr.city || addr.town || addr.village || addr.city_district || undefined;
            const state = addr.state || undefined;
            const pincode = addr.postcode || undefined;
            const bizName = item.name || item.display_name.split(",")[0]?.trim() || rawName || "Clinic";

            businesses.push({
              id: `search-${i}-${Date.now()}`,
              name: bizName,
              email: rawEmail,
              phone: body.phone,
              website: inferredWebsite || body.website,
              addressLine1: a1,
              addressLine2: a2,
              city,
              state,
              pincode,
              country: addr.country || body.country || "India",
              url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([bizName, a2 || city].filter(Boolean).join(" "))}`,
              weeklySchedule: DEFAULT_SCHEDULE,
            });
          }
        }
      } catch {
        // Continue
      }
    }

    // 4. Deduplicate businesses
    const seen = new Set<string>();
    const uniqueBusinesses: GoogleBusinessItem[] = [];
    for (const b of businesses) {
      const key = `${(b.name || "").toLowerCase()}|${(b.addressLine1 || "").toLowerCase()}|${(b.city || "").toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueBusinesses.push(b);
      }
    }

    // 5. If no businesses found, construct the connected business profile for this clinic
    if (uniqueBusinesses.length === 0) {
      const clinicCity = body.city?.trim();
      const clinicAddress = body.addressLine1?.trim();
      const mapsSearchUrl =
        rawUrl && !rawUrl.includes("support.google.com")
          ? rawUrl
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([rawName, clinicCity || clinicAddress].filter(Boolean).join(" "))}`;

      const defaultBiz: GoogleBusinessItem = {
        id: `gbp-${rawEmail || "clinic"}`,
        name: rawName || "Clinic Profile",
        email: rawEmail,
        phone: body.phone?.trim() || undefined,
        website: inferredWebsite || body.website?.trim() || undefined,
        addressLine1: clinicAddress || undefined,
        addressLine2: body.addressLine2?.trim() || undefined,
        city: clinicCity || undefined,
        state: body.state?.trim() || undefined,
        pincode: body.pincode?.trim() || undefined,
        country: body.country?.trim() || "India",
        url: mapsSearchUrl,
        weeklySchedule: DEFAULT_SCHEDULE,
      };
      uniqueBusinesses.push(defaultBiz);
    }

    const primary = uniqueBusinesses[0];
    const finalResult: GoogleBusinessResult = {
      ...primary,
      businesses: uniqueBusinesses,
    };

    return NextResponse.json(finalResult);

    return NextResponse.json(finalResult);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to resolve Google Business details" },
      { status: 500 }
    );
  }
}

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
    };

    const rawUrl = body.url?.trim();
    const rawEmail = body.email?.trim();
    const rawName = body.name?.trim();
    const rawQuery = body.query?.trim();
    const rawPlaceId = body.placeId?.trim();

    const businesses: GoogleBusinessItem[] = [];

    // Infer website from domain if custom
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

    // 1. If URL was provided, follow redirect and parse
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

    // 2. Search candidates via queries
    const searchTerms: string[] = [];
    if (rawQuery) searchTerms.push(rawQuery);
    if (rawName) searchTerms.push(rawName);
    if (rawName && rawEmail) {
      const emailUser = rawEmail.split("@")[0].replace(/[._-]/g, " ");
      searchTerms.push(`${rawName} ${emailUser}`);
    }

    // Run Nominatim search for the terms
    for (const term of searchTerms) {
      try {
        const searchRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(term)}&format=json&addressdetails=1&limit=6`,
          { headers: { "User-Agent": "MyClinics/1.0" } }
        );
        if (searchRes.ok) {
          const searchList = (await searchRes.json()) as Array<{
            name?: string;
            display_name: string;
            lat: string;
            lon: string;
            address?: Record<string, string>;
          }>;

          for (let i = 0; i < searchList.length; i++) {
            const item = searchList[i];
            const addr = item.address || {};
            const road = addr.road || addr.street || "";
            const house = addr.house_number || "";
            const addrLine1 = [house, road].filter(Boolean).join(" ") || undefined;
            const addrLine2 = addr.suburb || addr.neighbourhood || addr.quarter || addr.locality || undefined;
            const city = addr.city || addr.town || addr.village || addr.city_district || addr.county || undefined;
            const state = addr.state || undefined;
            const pincode = addr.postcode || undefined;
            const displayNameParts = item.display_name.split(",");
            const bizName = item.name || displayNameParts[0]?.trim() || rawName || "Clinic";

            businesses.push({
              id: `nom-${term}-${i}`,
              name: bizName,
              email: rawEmail,
              website: inferredWebsite,
              addressLine1: addrLine1,
              addressLine2: addrLine2,
              city,
              state,
              pincode,
              country: addr.country || "India",
              url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${bizName} ${addrLine2 || city || ""}`
              )}`,
              weeklySchedule: DEFAULT_SCHEDULE,
            });
          }
        }
      } catch {
        // Continue
      }

      if (businesses.length >= 5) break;
    }

    // 3. Google Places API if key available
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (googleApiKey && (rawPlaceId || rawName || rawQuery)) {
      try {
        const q = rawQuery || rawName || "";
        const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
          q
        )}&key=${googleApiKey}`;
        const searchRes = await fetch(searchUrl);
        if (searchRes.ok) {
          const sData = (await searchRes.json()) as {
            results?: Array<{
              place_id: string;
              name: string;
              formatted_address?: string;
              rating?: number;
              user_ratings_total?: number;
            }>;
          };
          if (sData.results) {
            for (const r of sData.results.slice(0, 5)) {
              businesses.push({
                id: r.place_id,
                name: r.name,
                email: rawEmail,
                website: inferredWebsite,
                addressLine1: r.formatted_address,
                placeId: r.place_id,
                rating: r.rating,
                userRatingsTotal: r.user_ratings_total,
                url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name)}&query_place_id=${r.place_id}`,
                country: "India",
                weeklySchedule: DEFAULT_SCHEDULE,
              });
            }
          }
        }
      } catch {
        // Continue
      }
    }

    // 4. If no businesses found or to ensure direct email profile is listed:
    if (businesses.length === 0 || rawEmail) {
      const emailUser = rawEmail ? rawEmail.split("@")[0].replace(/[._-]/g, " ") : "";
      const baseName = rawName || (emailUser ? `${emailUser.charAt(0).toUpperCase() + emailUser.slice(1)} Clinic` : "My Clinic");
      const defaultPrimary: GoogleBusinessItem = {
        id: "biz-primary",
        name: baseName,
        email: rawEmail,
        website: inferredWebsite,
        url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(baseName)}`,
        country: "India",
        weeklySchedule: DEFAULT_SCHEDULE,
      };

      // Put primary at the beginning if not already present
      const alreadyHasExact = businesses.some((b) => b.name.toLowerCase() === baseName.toLowerCase());
      if (!alreadyHasExact) {
        businesses.unshift(defaultPrimary);
      }
    }

    // Deduplicate by name + addressLine1
    const seen = new Set<string>();
    const uniqueBusinesses: GoogleBusinessItem[] = [];
    for (const b of businesses) {
      const key = `${(b.name || "").toLowerCase()}|${(b.addressLine1 || "").toLowerCase()}|${(b.city || "").toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueBusinesses.push(b);
      }
    }

    const primary = uniqueBusinesses[0] || {
      name: rawName || "My Clinic",
      email: rawEmail,
      country: "India",
      weeklySchedule: DEFAULT_SCHEDULE,
    };

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

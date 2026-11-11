import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface GoogleBusinessDaySchedule {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

interface GoogleBusinessResult {
  name?: string;
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
    };

    const rawUrl = body.url?.trim();
    const rawQuery = body.query?.trim();
    const rawPlaceId = body.placeId?.trim();

    const result: GoogleBusinessResult = {
      weeklySchedule: DEFAULT_SCHEDULE,
      country: "India",
    };

    let finalUrl = rawUrl || "";
    let lat: number | undefined;
    let lon: number | undefined;

    // 1. Follow redirects for URL & parse
    if (rawUrl) {
      result.url = rawUrl;
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
        result.url = finalUrl;
      } catch {
        finalUrl = rawUrl;
      }

      const placeMatch = finalUrl.match(/\/maps\/place\/([^/@?#]+)/);
      if (placeMatch && placeMatch[1]) {
        result.name = decodeURIComponent(placeMatch[1].replace(/\+/g, " ")).trim();
      }

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
      if (pidMatch && pidMatch[1]) {
        result.placeId = pidMatch[1];
      }
    }

    // 2. Reverse geocode coordinates
    if (lat !== undefined && lon !== undefined && !Number.isNaN(lat) && !Number.isNaN(lon)) {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
          { headers: { "User-Agent": "MyClinics/1.0" } }
        );
        if (geoRes.ok) {
          const geoData = (await geoRes.json()) as {
            name?: string;
            display_name?: string;
            address?: Record<string, string>;
          };
          if (!result.name && geoData.name) {
            result.name = geoData.name;
          }
          const addr = geoData.address;
          if (addr) {
            const road = addr.road || addr.street || "";
            const house = addr.house_number || "";
            result.addressLine1 = [house, road].filter(Boolean).join(" ") || undefined;
            result.addressLine2 =
              addr.suburb || addr.neighbourhood || addr.quarter || addr.locality || undefined;
            result.city =
              addr.city || addr.town || addr.village || addr.city_district || addr.county || undefined;
            result.state = addr.state || undefined;
            result.pincode = addr.postcode || undefined;
            result.country = addr.country || "India";
          }
        }
      } catch {
        // Continue
      }
    }

    // 3. Query search fallback
    if (rawQuery) {
      if (!result.name) {
        const parts = rawQuery.split(",").map((p) => p.trim());
        result.name = parts[0];
      }

      try {
        const searchRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(rawQuery)}&format=json&addressdetails=1&limit=1`,
          { headers: { "User-Agent": "MyClinics/1.0" } }
        );
        if (searchRes.ok) {
          const searchList = (await searchRes.json()) as Array<{
            name?: string;
            address?: Record<string, string>;
          }>;
          if (searchList && searchList.length > 0 && searchList[0].address) {
            const addr = searchList[0].address;
            const road = addr.road || addr.street || "";
            const house = addr.house_number || "";
            if (!result.addressLine1) {
              result.addressLine1 = [house, road].filter(Boolean).join(" ") || undefined;
            }
            if (!result.addressLine2) {
              result.addressLine2 =
                addr.suburb || addr.neighbourhood || addr.quarter || addr.locality || undefined;
            }
            if (!result.city) {
              result.city =
                addr.city || addr.town || addr.village || addr.city_district || addr.county || undefined;
            }
            if (!result.state) result.state = addr.state || undefined;
            if (!result.pincode) result.pincode = addr.postcode || undefined;
            if (!result.country) result.country = addr.country || "India";
          }
        }
      } catch {
        // Continue
      }
    }

    // 4. Google Maps API if available
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (googleApiKey && (rawPlaceId || result.name)) {
      try {
        let placeId = rawPlaceId;
        if (!placeId && result.name) {
          const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
            result.name + (result.city ? ` ${result.city}` : "")
          )}&inputtype=textquery&fields=place_id&key=${googleApiKey}`;
          const findRes = await fetch(findUrl);
          if (findRes.ok) {
            const findData = (await findRes.json()) as { candidates?: Array<{ place_id?: string }> };
            placeId = findData.candidates?.[0]?.place_id;
          }
        }

        if (placeId) {
          result.placeId = placeId;
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_phone_number,international_phone_number,formatted_address,address_components,website,opening_hours,rating,user_ratings_total,url&key=${googleApiKey}`;
          const detailsRes = await fetch(detailsUrl);
          if (detailsRes.ok) {
            const detailsData = (await detailsRes.json()) as {
              result?: {
                name?: string;
                formatted_phone_number?: string;
                international_phone_number?: string;
                formatted_address?: string;
                address_components?: Array<{
                  long_name: string;
                  short_name: string;
                  types: string[];
                }>;
                website?: string;
                url?: string;
                rating?: number;
                user_ratings_total?: number;
              };
            };
            const p = detailsData.result;
            if (p) {
              if (p.name) result.name = p.name;
              if (p.formatted_phone_number || p.international_phone_number) {
                result.phone = p.formatted_phone_number || p.international_phone_number;
              }
              if (p.website) result.website = p.website;
              if (p.url && !result.url) result.url = p.url;
              if (p.rating) result.rating = p.rating;
              if (p.user_ratings_total) result.userRatingsTotal = p.user_ratings_total;
            }
          }
        }
      } catch {
        // Continue
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to resolve Google Business details" },
      { status: 500 }
    );
  }
}

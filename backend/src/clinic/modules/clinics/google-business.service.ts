export interface GoogleBusinessResolveInput {
  url?: string;
  query?: string;
  placeId?: string;
  email?: string;
  name?: string;
}

export interface GoogleBusinessDaySchedule {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

export interface GoogleBusinessResult {
  name?: string;
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

const DEFAULT_SCHEDULE: GoogleBusinessDaySchedule[] = [
  { day: "Monday", open: "09:00", close: "18:00", closed: false },
  { day: "Tuesday", open: "09:00", close: "18:00", closed: false },
  { day: "Wednesday", open: "09:00", close: "18:00", closed: false },
  { day: "Thursday", open: "09:00", close: "18:00", closed: false },
  { day: "Friday", open: "09:00", close: "18:00", closed: false },
  { day: "Saturday", open: "09:00", close: "18:00", closed: false },
  { day: "Sunday", open: "09:00", close: "13:00", closed: true },
];

export async function resolveGoogleBusiness(
  input: GoogleBusinessResolveInput
): Promise<GoogleBusinessResult> {
  const result: GoogleBusinessResult = {
    weeklySchedule: DEFAULT_SCHEDULE,
    country: "India",
  };

  const rawUrl = input.url?.trim();
  const rawEmail = input.email?.trim();
  const rawName = input.name?.trim();
  const rawQuery = input.query?.trim();
  const rawPlaceId = input.placeId?.trim();

  if (rawEmail) {
    result.email = rawEmail;
    const domainMatch = rawEmail.match(/@([a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})$/);
    if (domainMatch && domainMatch[1]) {
      const domain = domainMatch[1].toLowerCase();
      const commonFree = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "mail.com", "example.com"];
      if (!commonFree.includes(domain)) {
        result.website = `https://${domain}`;
      }
    }
  }

  if (rawName) {
    result.name = rawName;
  }

  let finalUrl = rawUrl || "";
  let extractedName: string | undefined;
  let lat: number | undefined;
  let lon: number | undefined;

  // 1. If URL is given, follow redirects and parse coordinates / name
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
      // Continue with original url if fetch fails
      finalUrl = rawUrl;
    }

    // Try parsing name from URL: /maps/place/NAME/...
    const placeMatch = finalUrl.match(/\/maps\/place\/([^/@?#]+)/);
    if (placeMatch && placeMatch[1]) {
      extractedName = decodeURIComponent(placeMatch[1].replace(/\+/g, " ")).trim();
      result.name = extractedName;
    }

    // Try coordinates from URL: /@12.9783,77.6408 or !3d12.9783!4d77.6408
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

    // Place ID from URL
    const pidMatch = finalUrl.match(/[?&](?:place_id|ftid)=([^&]+)/);
    if (pidMatch && pidMatch[1]) {
      result.placeId = pidMatch[1];
    }
  }

  // 2. If coordinates are found, reverse geocode via Nominatim
  if (lat !== undefined && lon !== undefined && !Number.isNaN(lat) && !Number.isNaN(lon)) {
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
        {
          headers: { "User-Agent": "MyClinics/1.0" },
        }
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
      // Non-critical, continue
    }
  }

  // 3. If query was supplied and name/location still missing, search Nominatim or parse query
  if (rawQuery) {
    if (!result.name) {
      // If query has comma (e.g., "Apollo Clinic, Indiranagar"), first part is name
      const parts = rawQuery.split(",").map((p) => p.trim());
      result.name = parts[0];
    }

    // Try Nominatim search with query
    try {
      const searchRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(rawQuery)}&format=json&addressdetails=1&limit=1`,
        {
          headers: { "User-Agent": "MyClinics/1.0" },
        }
      );
      if (searchRes.ok) {
        const searchList = (await searchRes.json()) as Array<{
          name?: string;
          display_name?: string;
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
      // Non-critical
    }

    // Fallback: If city is still empty and query has location parts (e.g. "Clinic Name, Whitefield Bangalore")
    if (!result.city && rawQuery.includes(",")) {
      const locationPart = rawQuery.split(",").slice(1).join(", ").trim();
      try {
        const locRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationPart)}&format=json&addressdetails=1&limit=1`,
          {
            headers: { "User-Agent": "MyClinics/1.0" },
          }
        );
        if (locRes.ok) {
          const locList = (await locRes.json()) as Array<{
            address?: Record<string, string>;
          }>;
          if (locList && locList.length > 0 && locList[0].address) {
            const addr = locList[0].address;
            if (!result.addressLine2) {
              result.addressLine2 = addr.suburb || addr.neighbourhood || undefined;
            }
            if (!result.city) {
              result.city = addr.city || addr.town || addr.city_district || addr.county || undefined;
            }
            if (!result.state) result.state = addr.state || undefined;
            if (!result.pincode) result.pincode = addr.postcode || undefined;
          }
        }
      } catch {
        // Non-critical
      }
    }
  }

  // 4. If Google Maps API Key is available, enrich with Google Places Details
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
              opening_hours?: {
                periods?: Array<{
                  open: { day: number; time: string };
                  close?: { day: number; time: string };
                }>;
                weekday_text?: string[];
              };
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

            if (p.address_components) {
              for (const comp of p.address_components) {
                if (comp.types.includes("street_number")) {
                  result.addressLine1 = comp.long_name + (result.addressLine1 ? ` ${result.addressLine1}` : "");
                } else if (comp.types.includes("route")) {
                  result.addressLine1 = (result.addressLine1 ? `${result.addressLine1} ` : "") + comp.long_name;
                } else if (comp.types.includes("sublocality") || comp.types.includes("sublocality_level_1")) {
                  result.addressLine2 = comp.long_name;
                } else if (comp.types.includes("locality")) {
                  result.city = comp.long_name;
                } else if (comp.types.includes("administrative_area_level_1")) {
                  result.state = comp.long_name;
                } else if (comp.types.includes("postal_code")) {
                  result.pincode = comp.long_name;
                } else if (comp.types.includes("country")) {
                  result.country = comp.long_name;
                }
              }
            }

            if (p.opening_hours?.periods) {
              const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
              const schedule: GoogleBusinessDaySchedule[] = days.map((day) => ({
                day,
                open: "09:00",
                close: "18:00",
                closed: true,
              }));

              for (const period of p.opening_hours.periods) {
                const dayIndex = period.open.day;
                if (schedule[dayIndex]) {
                  const formatTime = (t: string) =>
                    `${t.slice(0, 2).padStart(2, "0")}:${t.slice(2, 4).padStart(2, "0")}`;
                  schedule[dayIndex].closed = false;
                  schedule[dayIndex].open = formatTime(period.open.time);
                  schedule[dayIndex].close = period.close ? formatTime(period.close.time) : "18:00";
                }
              }

              // Reorder so Monday is first
              const reordered = [
                schedule[1],
                schedule[2],
                schedule[3],
                schedule[4],
                schedule[5],
                schedule[6],
                schedule[0],
              ];
              result.weeklySchedule = reordered;
            }
          }
        }
      }
    } catch {
      // Non-critical
    }
  }

  return result;
}

export const dynamic = "force-dynamic";

interface PostalResponse {
  Status: string;
  PostOffice?: { District: string; State: string }[];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pincode: string }> }
) {
  const { pincode } = await params;
  if (!/^[1-9]\d{5}$/.test(pincode)) {
    return Response.json({ error: "Invalid pincode" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return Response.json({ error: "Pincode lookup failed" }, { status: 502 });
    }

    const data = (await res.json()) as PostalResponse[];
    const entry = Array.isArray(data) ? data[0] : undefined;
    if (!entry || entry.Status !== "Success" || !entry.PostOffice?.length) {
      return Response.json({ error: "No results for this pincode" }, { status: 404 });
    }

    const office = entry.PostOffice[0];
    return Response.json({ city: office.District, state: office.State });
  } catch {
    return Response.json({ error: "Pincode lookup unavailable" }, { status: 502 });
  }
}
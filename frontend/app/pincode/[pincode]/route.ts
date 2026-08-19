import { lookup } from "indiapins";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pincode: string }> }
) {
  const { pincode } = await params;
  if (!/^[1-9]\d{5}$/.test(pincode)) {
    return Response.json({ error: "Invalid pincode" }, { status: 400 });
  }

  try {
    const offices = lookup(pincode);
    if (!offices.length) {
      return Response.json({ error: "No results for this pincode" }, { status: 404 });
    }

    const office = offices[0];
    return Response.json({ city: office.district, state: office.state });
  } catch {
    return Response.json({ error: "Pincode lookup unavailable" }, { status: 502 });
  }
}
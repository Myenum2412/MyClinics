import { handlers } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.url;
  const searchParams = req.nextUrl.searchParams.toString();
  console.log(`[NextAuth GET] Request URL: ${url}`);
  console.log(`[NextAuth GET] Search Params: ${searchParams}`);
  
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  return handlers.POST(req);
}

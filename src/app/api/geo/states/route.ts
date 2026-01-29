import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      "https://www.yuksi.dev/geo/states?country_id=225&limit=100&offset=0",
      {
        headers: { accept: "application/json" },
      }
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}

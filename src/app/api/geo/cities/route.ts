import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stateId = searchParams.get("state_id");

  if (!stateId) {
    return NextResponse.json([], { status: 400 });
  }

  try {
    const res = await fetch(
      `https://www.yuksi.dev/geo/cities?state_id=${stateId}&limit=100&offset=0`,
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

import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> | { code: string } }
) {
  const resolvedParams = await params;
  const rawCode = resolvedParams.code?.trim();

  if (!rawCode || !/^[1-9][0-9]{5}$/.test(rawCode)) {
    return NextResponse.json(
      { success: false, error: "Please enter a valid 6-digit Indian PIN code" },
      { status: 400 }
    );
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    // Call official Indian Postal Pincode API
    const res = await fetch(`https://api.postalpincode.in/pincode/${rawCode}`, {
      signal: controller.signal,
      headers: { "User-Agent": "Media360/1.0" },
      cache: "force-cache",
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (
        Array.isArray(data) &&
        data[0]?.Status === "Success" &&
        Array.isArray(data[0]?.PostOffice) &&
        data[0].PostOffice.length > 0
      ) {
        const postOfficeList = data[0].PostOffice;
        const primary = postOfficeList[0];
        const city = primary.District || primary.Division || primary.Block || primary.Circle || "";
        const state = primary.State || "";
        const country = primary.Country || "India";

        return NextResponse.json({
          success: true,
          pincode: rawCode,
          city,
          state,
          country,
          postOffices: postOfficeList.map((p: any) => p.Name).filter(Boolean).slice(0, 6),
        });
      }
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to connect to postal lookup service" },
      { status: 502 }
    );
  }

  return NextResponse.json(
    { success: false, error: "PIN code not found in postal records" },
    { status: 404 }
  );
}

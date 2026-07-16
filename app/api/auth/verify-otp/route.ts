import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { phone, otp } = await request.json();

    const cleanPhone = phone ? String(phone).replace(/[^\d]/g, "") : "";
    const cleanOtp = otp ? String(otp).trim() : "";

    if (!cleanPhone || !cleanOtp) {
      return NextResponse.json(
        { error: "Missing mobile number or verification code" },
        { status: 400 },
      );
    }

    const otpCache = (global as any).activeOtpCache;
    if (!otpCache) {
      return NextResponse.json(
        { error: "OTP has expired or session not initialized" },
        { status: 400 },
      );
    }

    const record = otpCache.get(cleanPhone);
    if (!record) {
      return NextResponse.json(
        { error: "OTP not requested for this phone number" },
        { status: 400 },
      );
    }

    if (Date.now() > record.expires) {
      otpCache.delete(cleanPhone);
      return NextResponse.json(
        { error: "OTP code has expired" },
        { status: 400 },
      );
    }

    if (record.code !== cleanOtp) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 },
      );
    }

    // Success, clear cache entry
    otpCache.delete(cleanPhone);
    return NextResponse.json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error: any) {
    console.error("[Verify OTP API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify OTP" },
      { status: 500 },
    );
  }
}

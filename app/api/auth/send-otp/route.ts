import { NextResponse } from "next/server";

// A mock in-memory session cache to store active OTP values
// In production deployment, replace with Redis or database cache
const otpCache = new Map<string, { code: string; expires: number }>();

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    // Clean and validate 10-digit phone number
    const cleanPhone = phone ? String(phone).replace(/[^\d]/g, "") : "";
    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: "Invalid 10-digit mobile number" },
        { status: 400 },
      );
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 5 * 60 * 1000; // Expires in 5 minutes

    // Store in global cache
    otpCache.set(cleanPhone, { code: otp, expires: expiry });
    // Expose cache globally so verify-otp route can read it
    (global as any).activeOtpCache = otpCache;

    console.log(`[SMS AUTH] Generated OTP for +91${cleanPhone}: ${otp}`);

    // Send payload to BlackSMS SMS Gateway API endpoint
    const apiKey =
      process.env.BLACKSMS_API_KEY || "eb66bf1db97050a4e983aa2ae263caf7";
    const senderId = process.env.BLACKSMS_SENDER_ID || "324";

    const smsPayload = {
      apikey: apiKey,
      senderid: senderId,
      number: cleanPhone,
      message: `Your Kawachi verification code is ${otp}. Please enter it within 5 minutes to verify your account.`,
      route: "1", // Transactional route
    };

    const smsRes = await fetch("https://blacksms.in/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(smsPayload),
    });

    if (!smsRes.ok) {
      console.error("[BlackSMS Gateway Error] Status code:", smsRes.status);
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error: any) {
    console.error("[Send OTP API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send OTP" },
      { status: 500 },
    );
  }
}

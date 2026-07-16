"use client";

import React, { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "otp" && timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanPhone = phone.replace(/[^\d]/g, "");
    if (cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStep("otp");
        setTimer(30);
      } else {
        setError(data.error || "Failed to send code. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0) return;
    setError("");
    const cleanPhone = phone.replace(/[^\d]/g, "");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone })
      });
      if (res.ok) {
        setTimer(30);
      }
    } catch (err) {
      setError("Failed to resend code.");
    }
  };

  const handleOtpChange = async (val: string, index: number) => {
    const numericVal = val.replace(/[^\d]/g, "");
    const newOtp = [...otp];
    newOtp[index] = numericVal;
    setOtp(newOtp);

    // Auto-focus next input field
    if (numericVal && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // Automatically verify when the 6th digit is entered
    if (newOtp.every((digit) => digit !== "")) {
      const finalOtp = newOtp.join("");
      const cleanPhone = phone.replace(/[^\d]/g, "");
      setLoading(true);
      setError("");

      try {
        const result = await signIn("credentials", {
          phone: cleanPhone,
          otp: finalOtp,
          redirect: false
        });

        if (result?.error) {
          setError("Invalid verification code. Please check and try again.");
          setOtp(new Array(6).fill(""));
          otpInputsRef.current[0]?.focus();
        } else {
          onClose();
          if (onSuccess) onSuccess();
          window.location.reload();
        }
      } catch (err) {
        setError("Verification failed. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google");
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
      <div 
        className="relative w-[90%] max-w-[420px] transform rounded-2xl border-2 border-orange-500 bg-white p-6 shadow-2xl transition-all duration-300"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
        >
          &times;
        </button>

        {/* Brand Header */}
        <div className="mb-6 text-center">
          <h2 className="text-xl font-extrabold text-[#0a2540]">Welcome to Kawachi</h2>
          <p className="mt-1 text-xs text-slate-500">Headless WooCommerce Marketplace</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-600">
            {error}
          </div>
        )}

        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Mobile Number</label>
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 overflow-hidden focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500">
                <span className="flex items-center px-3 border-r border-slate-200 text-sm font-semibold text-slate-500">
                  +91
                </span>
                <input 
                  type="tel"
                  placeholder="Enter 10-digit number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-transparent px-3 py-2.5 text-sm outline-none text-slate-800"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#0a2540] py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/10 hover:bg-[#081e33] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? "Sending OTP..." : "Send Verification Code"}
            </button>

            <div className="relative flex items-center justify-center my-4">
              <span className="absolute bg-white px-2 text-xxs font-bold text-slate-400 uppercase tracking-widest">or</span>
              <div className="w-full border-t border-slate-100"></div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleSignIn}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.69c-.29 1.5-.1.85-2.2 2.27v1.88h3.55c2.08-1.92 3.28-4.74 3.28-7.98z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.55-2.76c-.99.66-2.23 1.06-4.41 1.06-3.4 0-6.27-2.3-7.3-5.39H1.05v2.96C3.03 20.3 7.16 24 12 24z"/>
                <path fill="#FBBC05" d="M4.7 14c-.26-.78-.41-1.6-.41-2.45s.15-1.67.41-2.45V6.14H1.05C.38 7.48 0 9.01 0 10.65s.38 3.17 1.05 4.51L4.7 14z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.22 0 12 0 7.16 0 3.03 3.7 1.05 7.64l3.65 2.85c1.03-3.09 3.9-5.39 7.3-5.39z"/>
              </svg>
              Sign in with Google
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-xs text-slate-500">We've sent a 6-digit verification code to</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">+91 {phone}</p>
            </div>

            <div className="flex justify-between gap-2 max-w-[280px] mx-auto">
              {otp.map((digit, idx) => (
                <input 
                  key={idx}
                  type="text"
                  maxLength={1}
                  value={digit}
                  ref={(el) => { otpInputsRef.current[idx] = el; }}
                  onChange={(e) => handleOtpChange(e.target.value, idx)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  className="h-11 w-11 rounded-lg border border-slate-200 bg-slate-50 text-center text-lg font-bold text-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                />
              ))}
            </div>

            <div className="text-center">
              {timer > 0 ? (
                <span className="text-xs text-slate-400">Resend code in <strong className="text-slate-600 font-semibold">{timer}s</strong></span>
              ) : (
                <button 
                  onClick={handleResendOtp}
                  className="text-xs font-bold text-orange-500 hover:text-orange-600 outline-none"
                >
                  Resend Verification Code
                </button>
              )}
            </div>

            <button 
              onClick={() => { setStep("phone"); setOtp(new Array(6).fill("")); }}
              className="w-full text-center text-xs font-bold text-slate-500 hover:text-[#0a2540]"
            >
              Change Mobile Number
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

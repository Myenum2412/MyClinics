"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PincodeLookupProps {
  pincode: string;
  city: string;
  state: string;
  pincodeError?: string;
  onPincodeChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onStateChange: (value: string) => void;
  disabled?: boolean;
}

export function PincodeLookup({
  pincode,
  city,
  state,
  pincodeError,
  onPincodeChange,
  onCityChange,
  onStateChange,
  disabled = false,
}: PincodeLookupProps) {
  const [lookingUp, setLookingUp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!/^[1-9]\d{5}$/.test(pincode)) {
      queueMicrotask(() => setMessage(null));
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const seq = ++seqRef.current;
      setLookingUp(true);
      setMessage(null);
      try {
        const res = await fetch(`/api/pincode/${pincode}`);
        if (seq !== seqRef.current) return;
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          setMessage(body?.error ?? "Could not find this pincode");
          return;
        }
        const body = (await res.json()) as { city: string; state: string };
        onCityChange(body.city);
        onStateChange(body.state);
        setMessage("City and State filled from pincode");
      } catch {
        if (seq === seqRef.current) setMessage("Pincode lookup failed");
      } finally {
        if (seq === seqRef.current) setLookingUp(false);
      }
    }, 600);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pincode, onCityChange, onStateChange]);

  const errorBox = (err?: string) =>
    `border ${
      err ? "border-red-500 focus:ring-red-500" : "border-blue-200 focus:ring-blue-400"
    }`;

  return (
    <div className="space-y-2">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Pincode</Label>
          <div className="relative">
            <Input
              value={pincode}
              onChange={(e) => onPincodeChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="400001"
              maxLength={6}
              disabled={disabled}
              className={errorBox(pincodeError)}
            />
            {lookingUp && (
              <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-blue-500" />
            )}
          </div>
          {pincodeError ? (
            <p className="text-xs text-red-600">{pincodeError}</p>
          ) : (
            <p className="text-xs text-gray-500">6-digit Indian pincode</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">City</Label>
          <Input
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            placeholder="Mumbai"
            disabled={disabled}
            className={errorBox()}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">State</Label>
          <Input
            value={state}
            onChange={(e) => onStateChange(e.target.value)}
            placeholder="Maharashtra"
            disabled={disabled}
            className={errorBox()}
          />
        </div>
      </div>
      {message && (
        <p className="flex items-center gap-1.5 text-xs text-blue-600">
          <MapPin className="size-3.5" />
          {message}
        </p>
      )}
    </div>
  );
}
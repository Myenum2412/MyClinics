"use client";

import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

export const INDIAN_COUNTRY_CODE = "+91";

/** Validates a 10-digit Indian mobile number (digits only). */
export const isIndianMobile = (value: string): boolean => {
  return /^[6-9]\d{9}$/.test(value.replace(/\D/g, ""));
};

export function WhatsAppInput({
  id,
  value,
  onChange,
  error,
  placeholder = "9876543210",
  required = false,
  disabled = false,
  helperText,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex">
        <span
          className={`inline-flex items-center rounded-l-lg border border-r-0 px-3 text-sm font-medium text-gray-700 ${
            error
              ? "border-red-500 bg-red-50"
              : "border-blue-200 bg-blue-50 text-blue-700"
          }`}
        >
          {INDIAN_COUNTRY_CODE}
        </span>
        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          value={value}
          onChange={(e) =>
            onChange(e.target.value.replace(/\D/g, "").slice(0, 10))
          }
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`rounded-l-none border ${
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-blue-200 focus:ring-blue-400"
          }`}
        />
      </div>
      {error && (
        <div className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      {helperText && (
        <p className="text-xs text-gray-500">
          {INDIAN_COUNTRY_CODE} {helperText}
        </p>
      )}
    </div>
  );
}

"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";

type PasswordInputProps = {
  id?: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  className?: string;
  /** `light`: fondos claros (login / onboarding). `dark`: paneles oscuros (recuperación, invitación). */
  variant?: "light" | "dark";
  value?: string;
  defaultValue?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
};

export function PasswordInput({
  id,
  name,
  placeholder,
  required,
  minLength,
  className = "",
  variant = "light",
  value,
  defaultValue,
  onChange,
  autoComplete = "current-password",
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  const shell =
    variant === "light"
      ? {
          lock: "text-slate-500",
          input:
            "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 pl-9 pr-10 text-sm text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-400/40",
          toggle:
            "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
        }
      : {
          lock: "text-slate-400",
          input:
            "h-11 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 pl-9 pr-10 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-yellow-300/70 focus:ring-1 focus:ring-yellow-400/30",
          toggle:
            "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
        };

  return (
    <div className="relative mt-1">
      <Lock className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${shell.lock}`} />
      <input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        autoComplete={autoComplete}
        className={`${shell.input} ${className}`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className={`absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md ${shell.toggle}`}
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

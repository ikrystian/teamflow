"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordGenerator } from "./password-generator";
import { StrengthMeter } from "./strength-meter";

/** Pole hasła z generatorem i miernikiem siły (rozdział 5.5, krok 4). */
export function PasswordInput({
  id,
  value,
  onChange,
  generator = true,
  meter = true,
  inputs,
  autoComplete = "new-password",
  placeholder,
  ...rest
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  generator?: boolean;
  meter?: boolean;
  inputs?: string[];
  autoComplete?: string;
  placeholder?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "id">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input id={id} type={visible ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} className="secret pr-10" autoComplete={autoComplete} spellCheck={false} placeholder={placeholder} {...rest} />
          <Button type="button" variant="ghost" size="icon" className="absolute top-1/2 right-0.5 size-8 -translate-y-1/2" onClick={() => setVisible(!visible)} aria-label={visible ? "Ukryj hasło" : "Pokaż hasło"} aria-pressed={visible}>
            {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </Button>
        </div>
        {generator ? <PasswordGenerator onUse={(v) => (onChange(v), setVisible(true))} /> : null}
      </div>
      {meter ? <StrengthMeter password={value} inputs={inputs} /> : null}
    </div>
  );
}

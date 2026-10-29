"use client";

import { RefreshCw, WandSparkles } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DEFAULT_PASSPHRASE_OPTIONS,
  DEFAULT_PASSWORD_OPTIONS,
  generatePassphrase,
  generatePassword,
  passphraseEntropy,
  passwordEntropy,
  type PassphraseOptions,
  type PasswordOptions,
} from "@/lib/crypto/generator";

/** Generator haseł i fraz hasłowych wbudowany w pole hasła (rozdział 4.4 i 5.5). */
export function PasswordGenerator({ onUse }: { onUse: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"password" | "passphrase">("password");
  const [pw, setPw] = useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS);
  const [pp, setPp] = useState<PassphraseOptions>(DEFAULT_PASSPHRASE_OPTIONS);
  const [value, setValue] = useState("");

  const regenerate = useCallback(
    (next?: { mode?: typeof mode; pw?: PasswordOptions; pp?: PassphraseOptions }) => {
      const m = next?.mode ?? mode;
      try {
        setValue(m === "password" ? generatePassword(next?.pw ?? pw) : generatePassphrase(next?.pp ?? pp));
      } catch {
        setValue("");
      }
    },
    [mode, pw, pp],
  );
  const setMode2 = (m: typeof mode) => {
    setMode(m);
    regenerate({ mode: m });
  };
  const setPw2 = (o: PasswordOptions) => {
    setPw(o);
    regenerate({ pw: o, mode: "password" });
  };
  const setPp2 = (o: PassphraseOptions) => {
    setPp(o);
    regenerate({ pp: o, mode: "passphrase" });
  };


  const entropy = mode === "password" ? passwordEntropy(pw) : passphraseEntropy(pp);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) regenerate();
      }}
    >
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label="Generator haseł" title="Generator haseł">
          <WandSparkles aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3" align="end">
        <Tabs value={mode} onValueChange={(v) => setMode2(v as typeof mode)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="password">Hasło</TabsTrigger>
            <TabsTrigger value="passphrase">Fraza</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <Input readOnly value={value} className="secret" aria-label="Wygenerowane hasło" />
          <Button type="button" variant="outline" size="icon" onClick={() => regenerate()} aria-label="Wygeneruj ponownie">
            <RefreshCw aria-hidden />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Entropia: ok. {entropy} bitów</p>
        {mode === "password" ? (
          <div className="space-y-2">
            <Label htmlFor="gen-len">Długość: {pw.length}</Label>
            <input id="gen-len" type="range" min={8} max={64} value={pw.length} onChange={(e) => setPw2({ ...pw, length: Number(e.target.value) })} className="w-full accent-primary" />
            {(
              [
                ["lowercase", "Małe litery"],
                ["uppercase", "Wielkie litery"],
                ["digits", "Cyfry"],
                ["symbols", "Znaki specjalne"],
                ["avoidAmbiguous", "Bez znaków mylących (Il1O0)"],
              ] as const
            ).map(([k, label]) => (
              <div key={k} className="flex items-center gap-2">
                <Checkbox id={`gen-${k}`} checked={pw[k]} onCheckedChange={(v) => setPw2({ ...pw, [k]: v === true })} />
                <Label htmlFor={`gen-${k}`} className="font-normal">{label}</Label>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="gen-words">Liczba słów: {pp.words}</Label>
            <input id="gen-words" type="range" min={3} max={10} value={pp.words} onChange={(e) => setPp2({ ...pp, words: Number(e.target.value) })} className="w-full accent-primary" />
            <div className="flex items-center gap-2">
              <Label htmlFor="gen-sep" className="font-normal">Separator</Label>
              <Input id="gen-sep" value={pp.separator} maxLength={3} onChange={(e) => setPp2({ ...pp, separator: e.target.value })} className="h-8 w-16" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="gen-cap" checked={pp.capitalize} onCheckedChange={(v) => setPp2({ ...pp, capitalize: v === true })} />
              <Label htmlFor="gen-cap" className="font-normal">Wielka litera na początku słów</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="gen-num" checked={pp.includeNumber} onCheckedChange={(v) => setPp2({ ...pp, includeNumber: v === true })} />
              <Label htmlFor="gen-num" className="font-normal">Dodaj cyfrę</Label>
            </div>
          </div>
        )}
        <Button type="button" className="w-full" disabled={!value} onClick={() => (onUse(value), setOpen(false))}>
          Użyj tego hasła
        </Button>
      </PopoverContent>
    </Popover>
  );
}

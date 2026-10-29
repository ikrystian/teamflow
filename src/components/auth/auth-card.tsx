import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STEPS = ["Konto", "Sejf", "Przestrzeń"];

export function AuthCard({ title, description, step, children, className }: { title: string; description?: React.ReactNode; step?: number; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("glass-surface-soft glass-rise rounded-2xl", className)}>
      <CardHeader>
        {step ? (
          <ol className="mb-3 flex items-center gap-2 text-xs" aria-label="Kroki rejestracji">
            {STEPS.map((s, i) => (
              <li key={s} className={cn("flex items-center gap-1.5", i + 1 === step ? "font-semibold text-foreground" : "text-muted-foreground")} aria-current={i + 1 === step ? "step" : undefined}>
                <span className={cn("inline-flex size-5 items-center justify-center rounded-full border text-[10px]", i + 1 < step && "bg-primary text-primary-foreground border-primary", i + 1 === step && "border-foreground")}>{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        ) : null}
        <CardTitle className="text-xl">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { createClientSchema, type CreateClientFormData } from "@/lib/client-validations"
import { type Client } from "@/types"

interface ClientFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  /** Gdy podany — tryb edycji; gdy null/undefined — tryb tworzenia */
  client?: Client | null
}

type FormState = {
  name: string
  contactPerson: string
  email: string
  phone: string
  website: string
  address: string
  taxId: string
  notes: string
}

const EMPTY_FORM: FormState = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  taxId: "",
  notes: "",
}

export function ClientFormSheet({
  open,
  onOpenChange,
  onSaved,
  client,
}: ClientFormSheetProps) {
  const isEdit = Boolean(client)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  // Wczytaj dane klienta przy otwarciu (edycja) lub wyczyść formularz (tworzenie)
  useEffect(() => {
    if (!open) return
    if (client) {
      setForm({
        name: client.name || "",
        contactPerson: client.contactPerson || "",
        email: client.email || "",
        phone: client.phone || "",
        website: client.website || "",
        address: client.address || "",
        taxId: client.taxId || "",
        notes: client.notes || "",
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setError("")
    setFieldErrors({})
  }, [open, client])

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setFieldErrors({})

    const validation = createClientSchema.safeParse(form)

    if (!validation.success) {
      const errors: Partial<Record<keyof FormState, string>> = {}
      validation.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof FormState
        if (key && !errors[key]) errors[key] = issue.message
      })
      setFieldErrors(errors)
      setLoading(false)
      return
    }

    try {
      const url = isEdit ? `/api/clients/${client!.id}` : "/api/clients"
      const method = isEdit ? "PATCH" : "POST"
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      })

      if (response.ok) {
        onSaved()
        onOpenChange(false)
      } else {
        const data = await response.json().catch(() => ({}))
        setError(data.error || "Nie udało się zapisać klienta")
      }
    } catch {
      setError("Wystąpił błąd podczas zapisywania klienta")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-hidden flex flex-col">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-left">
            {isEdit ? "Edytuj klienta" : "Dodaj klienta"}
          </SheetTitle>
          <SheetDescription className="text-left">
            {isEdit
              ? "Zaktualizuj dane kontaktowe i notatki dotyczące klienta."
              : "Wprowadź dane kontaktowe oraz notatki dotyczące nowego klienta."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-5 py-4 px-4">
          <div className="grid gap-2">
            <Label htmlFor="client-name">Nazwa klienta / firma *</Label>
            <Input
              id="client-name"
              placeholder="np. Acme Sp. z o.o."
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              disabled={loading}
              className={fieldErrors.name ? "border-destructive" : ""}
            />
            {fieldErrors.name && (
              <p className="text-sm text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="client-contact">Osoba kontaktowa</Label>
            <Input
              id="client-contact"
              placeholder="np. Jan Kowalski"
              value={form.contactPerson}
              onChange={(e) => update("contactPerson", e.target.value)}
              disabled={loading}
              className={fieldErrors.contactPerson ? "border-destructive" : ""}
            />
            {fieldErrors.contactPerson && (
              <p className="text-sm text-destructive">{fieldErrors.contactPerson}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="client-email">E-mail</Label>
              <Input
                id="client-email"
                type="email"
                placeholder="kontakt@firma.pl"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                disabled={loading}
                className={fieldErrors.email ? "border-destructive" : ""}
              />
              {fieldErrors.email && (
                <p className="text-sm text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="client-phone">Telefon</Label>
              <Input
                id="client-phone"
                placeholder="+48 600 000 000"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                disabled={loading}
                className={fieldErrors.phone ? "border-destructive" : ""}
              />
              {fieldErrors.phone && (
                <p className="text-sm text-destructive">{fieldErrors.phone}</p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="client-website">Strona WWW</Label>
            <Input
              id="client-website"
              placeholder="https://firma.pl"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              disabled={loading}
              className={fieldErrors.website ? "border-destructive" : ""}
            />
            {fieldErrors.website && (
              <p className="text-sm text-destructive">{fieldErrors.website}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="client-taxid">NIP</Label>
              <Input
                id="client-taxid"
                placeholder="000-000-00-00"
                value={form.taxId}
                onChange={(e) => update("taxId", e.target.value)}
                disabled={loading}
                className={fieldErrors.taxId ? "border-destructive" : ""}
              />
              {fieldErrors.taxId && (
                <p className="text-sm text-destructive">{fieldErrors.taxId}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="client-address">Adres</Label>
              <Input
                id="client-address"
                placeholder="ul. Przykładowa 1, Warszawa"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                disabled={loading}
                className={fieldErrors.address ? "border-destructive" : ""}
              />
              {fieldErrors.address && (
                <p className="text-sm text-destructive">{fieldErrors.address}</p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="client-notes">Notatki</Label>
            <Textarea
              id="client-notes"
              placeholder="Dodatkowe informacje o kliencie, ustalenia, preferencje..."
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={5}
              disabled={loading}
              className={fieldErrors.notes ? "border-destructive" : ""}
            />
            {fieldErrors.notes && (
              <p className="text-sm text-destructive">{fieldErrors.notes}</p>
            )}
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}
        </form>

        <SheetFooter className="pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Anuluj
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading || !form.name.trim()}>
            {loading ? "Zapisywanie..." : isEdit ? "Zapisz zmiany" : "Dodaj klienta"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const NONE_VALUE = "__none__"

interface ClientOption {
  id: string
  name: string
}

interface ProjectClientSelectProps {
  value: string | null
  onChange: (clientId: string | null) => void
  disabled?: boolean
}

export function ProjectClientSelect({
  value,
  onChange,
  disabled,
}: ProjectClientSelectProps) {
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const fetchClients = async () => {
      try {
        const response = await fetch("/api/clients")
        if (response.ok) {
          const data = await response.json()
          if (active) setClients(data.clients || [])
        }
      } catch {
        // pomijamy — Select pozostanie z opcją "Brak klienta"
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchClients()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="grid gap-2">
      <Label htmlFor="project-client">Klient (opcjonalnie)</Label>
      <Select
        value={value ?? NONE_VALUE}
        onValueChange={(v) => onChange(v === NONE_VALUE ? null : v)}
        disabled={disabled || loading}
      >
        <SelectTrigger id="project-client" className="w-full">
          <SelectValue placeholder={loading ? "Wczytywanie..." : "Wybierz klienta"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>Brak klienta</SelectItem>
          {clients.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              {client.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

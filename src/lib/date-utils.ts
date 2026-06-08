/**
 * Formatuje datę zadania zgodnie z wymaganiami:
 * - Jeśli data jest w obecnym roku: wyświetla dzień i pełną polską nazwę miesiąca
 * - Jeśli data jest w innym roku: wyświetla pełną datę
 */
const formatTaskDueDate = (dateString: string) => {
  const date = new Date(dateString)
  const currentYear = new Date().getFullYear()
  const dateYear = date.getFullYear()

  if (dateYear === currentYear) {
    // Jeśli data jest w obecnym roku, wyświetl dzień i pełną nazwę miesiąca
    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long'
    })
  } else {
    // Jeśli data jest w innym roku, wyświetl pełną datę
    return date.toLocaleDateString('pl-PL')
  }
}

/**
 * Formatuje datę z uwzględnieniem względnych opisów (Dzisiaj, Jutro)
 * oraz nowego formatowania dla dat w obecnym roku
 */
export const formatTaskDueDateWithRelative = (dateString: string) => {
  const date = new Date(dateString)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.toDateString() === today.toDateString()) {
    return "Dzisiaj"
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return "Jutro"
  } else {
    return formatTaskDueDate(dateString)
  }
}

/**
 * Formatuje datę utworzenia w krótkim formacie
 * Przykład: "15 sty" lub "15.01.2023" dla innych lat
 */
export const formatCreatedDate = (dateString: string) => {
  const date = new Date(dateString)
  const currentYear = new Date().getFullYear()
  const dateYear = date.getFullYear()

  if (dateYear === currentYear) {
    // Jeśli data jest w obecnym roku, wyświetl dzień i skrót miesiąca
    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short'
    })
  } else {
    // Jeśli data jest w innym roku, wyświetl pełną datę w krótkim formacie
    return date.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }
}

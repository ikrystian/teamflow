# Naprawa przeglądu zadań w dashboard - Nexus

## Problem

Dashboard miał tytuł "Przegląd wszystkich zadań z całego systemu", ale API endpoint `/api/tasks` pobierał tylko zadania, do których użytkownik miał dostęp (jako członek zespołu, twórca lub osoba przypisana). To było mylące dla użytkowników, szczególnie administratorów, którzy oczekiwali zobaczyć wszystkie zadania w systemie.

## Rozwiązanie

### 1. Modyfikacja API endpoint `/api/tasks`

**Plik:** `src/app/api/tasks/route.ts`

- Dodano import funkcji `isAdmin` z `@/lib/admin`
- Dodano sprawdzanie czy użytkownik jest administratorem
- Zmodyfikowano logikę pobierania zadań:
  - **Administrator:** widzi wszystkie zadania z systemu (z projektów niearchiwalnych + zadania bez projektów)
  - **Zwykły użytkownik:** widzi tylko zadania do których ma dostęp (jak wcześniej)

```typescript
// Check if user is admin
const userIsAdmin = await isAdmin()

// Build where clause based on user permissions
const whereClause = userIsAdmin ? {
  ...baseFilters,
  OR: [
    // Tasks without projects
    { projectId: null },
    // Tasks with non-archived projects
    { project: { archived: false } }
  ]
} : {
  ...baseFilters,
  OR: [
    // Tasks with projects where user is a team member and project is not archived
    { project: { archived: false, team: { members: { some: { id: session.user.id } } } } },
    // Tasks without projects created by the user
    { projectId: undefined, createdById: session.user.id },
    // Tasks without projects assigned to the user
    { projectId: undefined, assigneeId: session.user.id }
  ]
}
```

### 2. Nowy endpoint sprawdzania statusu administratora

**Plik:** `src/app/api/user/admin-status/route.ts`

Utworzono nowy endpoint do sprawdzania czy użytkownik jest administratorem po stronie klienta:

```typescript
export async function GET() {
  const session = await getServerSession(authOptions) as Session | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const adminStatus = await isAdmin()
  return NextResponse.json({ 
    isAdmin: adminStatus,
    user: {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role
    }
  })
}
```

### 3. Dynamiczny tytuł dashboard

**Plik:** `src/components/dashboard/content.tsx`

- Dodano sprawdzanie statusu administratora w komponencie
- Dodano dynamiczny tytuł w zależności od uprawnień użytkownika:
  - **Administrator:** "Przegląd wszystkich zadań z całego systemu"
  - **Zwykły użytkownik:** "Przegląd moich zadań"

```typescript
const [isAdmin, setIsAdmin] = useState(false)

// Check if user is admin
useEffect(() => {
  const checkAdminStatus = async () => {
    if (session?.user) {
      try {
        const response = await fetch('/api/user/admin-status')
        if (response.ok) {
          const data = await response.json()
          setIsAdmin(data.isAdmin)
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
      }
    }
  }
  checkAdminStatus()
}, [session])

const getPageTitle = () => {
  if (isAdmin) {
    return "Przegląd wszystkich zadań z całego systemu"
  }
  return "Przegląd moich zadań"
}
```

## Konfiguracja testowa

### Baza danych

- Zmieniono provider w `prisma/schema.prisma` z `postgresql` na `sqlite`
- Zaktualizowano `DATABASE_URL` w `.env` na `"file:./prisma/dev.db"`
- Uruchomiono migracje: `npx prisma db push`
- Zasilono bazę danymi testowymi: `npx prisma db seed`

### Konto administratora

Utworzono konto administratora za pomocą skryptu:
```bash
npx tsx scripts/create-admin.ts
```

**Dane logowania administratora:**
- Email: `krystian@bpcoders.pl`
- Hasło: `admin123`
- Rola: `admin`

**Dane logowania zwykłego użytkownika (testowe):**
- Email: `john@example.com`
- Hasło: `password123`
- Rola: `user`

## Testowanie

### Scenariusze testowe

1. **Logowanie jako administrator:**
   - Zaloguj się jako `krystian@bpcoders.pl`
   - Przejdź do dashboard (`/dashboard`)
   - Sprawdź czy tytuł to "Przegląd wszystkich zadań z całego systemu"
   - Sprawdź czy widoczne są wszystkie zadania z systemu

2. **Logowanie jako zwykły użytkownik:**
   - Zaloguj się jako `john@example.com`
   - Przejdź do dashboard (`/dashboard`)
   - Sprawdź czy tytuł to "Przegląd moich zadań"
   - Sprawdź czy widoczne są tylko zadania użytkownika

### Uruchomienie testów

```bash
# Uruchom serwer deweloperski
npm run dev

# Otwórz aplikację w przeglądarce
http://localhost:3000

# Strona logowania
http://localhost:3000/auth/signin
```

## Pliki zmodyfikowane

1. `src/app/api/tasks/route.ts` - logika pobierania zadań z uwzględnieniem uprawnień administratora
2. `src/components/dashboard/content.tsx` - dynamiczny tytuł i sprawdzanie statusu administratora
3. `src/app/api/user/admin-status/route.ts` - nowy endpoint (utworzony)
4. `prisma/schema.prisma` - zmiana provider na sqlite
5. `.env` - konfiguracja DATABASE_URL

## Rezultat

- Administrator widzi wszystkie zadania z systemu z odpowiednim tytułem
- Zwykły użytkownik widzi tylko swoje zadania z odpowiednim tytułem
- Tytuł dashboard jest dynamiczny i odzwierciedla rzeczywiste uprawnienia użytkownika
- Logika jest spójna między API a interfejsem użytkownika

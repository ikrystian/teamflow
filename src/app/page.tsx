import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Users, Calendar, BarChart3, Clock, CheckCircle, Zap } from "lucide-react"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">TeamFlow</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors">Funkcje</a>
              <a href="#benefits" className="text-slate-600 hover:text-slate-900 transition-colors">Korzyści</a>
              <Link href="/auth/signin">
                <Button variant="ghost" className="text-slate-600 hover:text-slate-900">
                  Zaloguj się
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  Rozpocznij za darmo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
              Zoptymalizuj zarządzanie
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                projektami swojego zespołu
              </span>
            </h1>
            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
              Od śledzenia zadań po współpracę zespołową - TeamFlow łączy wszystko
              w jednej intuicyjnej platformie stworzonej dla nowoczesnych zespołów.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-8">
                  Rozpocznij darmowy okres próbny
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/auth/signin">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8">
                  Zaloguj się
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Wszystko, czego potrzebujesz, aby odnieść sukces
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Potężne funkcje, które pomagają Twojemu zespołowi pozostać zorganizowanym, produktywnym i połączonym.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Zarządzanie zadaniami</h3>
              <p className="text-slate-600">
                Twórz, przypisuj i śledź zadania z potężnymi tablicami kanban i niestandardowymi przepływami pracy.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Współpraca zespołowa</h3>
              <p className="text-slate-600">
                Współpraca w czasie rzeczywistym z komentarzami, udostępnianiem plików i dyskusjami zespołowymi.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Śledzenie czasu</h3>
              <p className="text-slate-600">
                Śledź czas spędzony na zadaniach i generuj szczegółowe raporty dla lepszych wglądów.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-orange-50 to-red-50 hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Widok kalendarza</h3>
              <p className="text-slate-600">
                Wizualizuj terminy i kamienie milowe z zintegrowaną funkcjonalnością kalendarza.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Analityka i raporty</h3>
              <p className="text-slate-600">
                Zyskaj wgląd w wydajność zespołu z kompleksową analityką i raportami.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-600 to-rose-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Szybki i niezawodny</h3>
              <p className="text-slate-600">
                Błyskawiczna wydajność z aktualizacjami w czasie rzeczywistym i możliwościami offline.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                Zbudowany dla nowoczesnych zespołów
              </h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Łatwy w użyciu</h3>
                    <p className="text-slate-600">Intuicyjny interfejs, który nie wymaga szkolenia</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Skalowalny</h3>
                    <p className="text-slate-600">Rozwija się razem z Twoim zespołem od 2 do 2000+ członków</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Bezpieczny</h3>
                    <p className="text-slate-600">Zabezpieczenia na poziomie enterprise z szyfrowaniem danych</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Przystępny cenowo</h3>
                    <p className="text-slate-600">Konkurencyjne ceny bez ukrytych kosztów</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl p-8">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-4">Szybkie statystyki</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Aktywni użytkownicy</span>
                    <span className="font-semibold text-slate-900">10,000+</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Ukończone projekty</span>
                    <span className="font-semibold text-slate-900">50,000+</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Zadowolenie klientów</span>
                    <span className="font-semibold text-green-600">98%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Czas działania</span>
                    <span className="font-semibold text-slate-900">99.9%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Gotowy, aby przekształcić produktywność swojego zespołu?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Dołącz do tysięcy zespołów, które już korzystają z TeamFlow, aby realizować projekty szybciej i bardziej efektywnie.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
              Rozpocznij darmowy okres próbny
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <p className="text-sm text-blue-200 mt-4">
            Nie wymagamy karty kredytowej • 14-dniowy darmowy okres próbny • Możesz anulować w każdej chwili
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">TeamFlow</span>
              </div>
              <p className="text-slate-400">
                Nowoczesne zarządzanie projektami dla nowoczesnych zespołów.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Produkt</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-white transition-colors">Funkcje</a></li>
                <li><a href="#benefits" className="hover:text-white transition-colors">Korzyści</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cennik</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Wsparcie</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Centrum pomocy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Kontakt</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Dokumentacja</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Firma</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">O nas</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Prywatność</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400">
            <p>&copy; 2025 TeamFlow. Wszystkie prawa zastrzeżone.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

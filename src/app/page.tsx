import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Users, Calendar, BarChart3, Clock, CheckCircle, Zap, Star, Lightbulb, Shield, Sparkles, ChevronDown, Play, TrendingUp, Target, Layers } from "lucide-react"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-white text-gray-800 overflow-x-hidden selection:bg-blue-500/20">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Nexus</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors duration-300">Funkcje</a>
              <a href="#benefits" className="text-gray-600 hover:text-blue-600 transition-colors duration-300">Korzyści</a>
              <Link href="/auth/signin">
                <Button variant="ghost" className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300">
                  Zaloguj się
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-300">
                  Rozpocznij za darmo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Trello-inspired Clean Layout */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text Content */}
            <div className="space-y-8">
              <div className="space-y-6">
                <div>
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full text-sm font-medium text-blue-600 mb-6">
                    <Sparkles className="w-4 h-4" />
                    Nowoczesna platforma do zarządzania projektami
                  </span>
                </div>
                <h1 className="text-4xl md:text-6xl font-bold leading-tight text-gray-900">
                  Zoptymalizuj zarządzanie
                  <br />
                  <span className="text-blue-600">projektami zespołu</span>
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl leading-relaxed">
                  Od śledzenia zadań po współpracę zespołową - Nexus łączy wszystko
                  w jednej intuicyjnej platformie stworzonej dla nowoczesnych zespołów.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/signup">
                  <Button size="lg" className="group w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-300">
                    Rozpocznij darmowy okres próbny
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </Button>
                </Link>
                <Link href="#demo">
                  <Button size="lg" variant="outline" className="group w-full sm:w-auto text-lg px-8 py-4 rounded-lg border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-300">
                    <Play className="mr-2 w-5 h-5" />
                    Zobacz demo
                  </Button>
                </Link>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">10k+</div>
                  <div className="text-sm text-gray-600">Aktywni użytkownicy</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">50k+</div>
                  <div className="text-sm text-gray-600">Ukończone projekty</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">98%</div>
                  <div className="text-sm text-gray-600">Zadowolenie</div>
                </div>
              </div>
            </div>

            {/* Right Column - Dashboard Preview */}
            <div className="relative">
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-xl">
                {/* Mock Dashboard Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg"></div>
                    <span className="font-semibold text-gray-900">Panel główny</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                </div>

                {/* Mock Cards Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-900 font-medium">Wydajność zespołu</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">+24%</div>
                    <div className="text-xs text-gray-600">vs. poprzedni miesiąc</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-gray-600" />
                      <span className="text-xs text-gray-600">Zadania</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900">127</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="w-4 h-4 text-gray-600" />
                      <span className="text-xs text-gray-600">Projekty</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900">12</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-gray-400" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Wszystko, czego potrzebujesz
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Potężne funkcje w nowoczesnym, intuicyjnym interfejsie
            </p>
          </div>

          {/* Clean Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature Cards */}
            <div className="group bg-white rounded-2xl p-8 border border-gray-200 hover:border-blue-300 transition-all duration-300 hover:shadow-lg cursor-pointer">
              <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Zarządzanie zadaniami</h3>
              <p className="text-gray-600 leading-relaxed">
                Twórz, przypisuj i śledź zadania z potężnymi tablicami kanban, 
                niestandardowymi przepływami pracy i automatyzacją procesów.
              </p>
            </div>

            <div className="group bg-white rounded-2xl p-8 border border-gray-200 hover:border-blue-300 transition-all duration-300 hover:shadow-lg cursor-pointer">
              <div className="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Współpraca zespołowa</h3>
              <p className="text-gray-600 leading-relaxed">
                Współpraca w czasie rzeczywistym z komentarzami, dyskusjami 
                i udostępnianiem plików w jednym miejscu.
              </p>
            </div>

            <div className="group bg-white rounded-2xl p-8 border border-gray-200 hover:border-blue-300 transition-all duration-300 hover:shadow-lg cursor-pointer">
              <div className="w-16 h-16 bg-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Śledzenie czasu</h3>
              <p className="text-gray-600 leading-relaxed">
                Dokładne raporty czasowe i analityka produktywności 
                z automatycznym śledzeniem aktywności.
              </p>
            </div>

            <div className="group bg-white rounded-2xl p-8 border border-gray-200 hover:border-blue-300 transition-all duration-300 hover:shadow-lg cursor-pointer">
              <div className="w-16 h-16 bg-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Widok kalendarza</h3>
              <p className="text-gray-600 leading-relaxed">
                Wizualizacja terminów, kamieni milowych i harmonogramów 
                projektów w przejrzystym kalendarzu.
              </p>
            </div>

            <div className="group bg-white rounded-2xl p-8 border border-gray-200 hover:border-blue-300 transition-all duration-300 hover:shadow-lg cursor-pointer">
              <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Analityka</h3>
              <p className="text-gray-600 leading-relaxed">
                Szczegółowe raporty i metryki wydajności 
                z inteligentными wglądami w produktywność zespołu.
              </p>
            </div>

            <div className="group bg-white rounded-2xl p-8 border border-gray-200 hover:border-blue-300 transition-all duration-300 hover:shadow-lg cursor-pointer">
              <div className="w-16 h-16 bg-cyan-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Bezpieczeństwo</h3>
              <p className="text-gray-600 leading-relaxed">
                Zabezpieczenia na poziomie enterprise z szyfrowaniem danych 
                i kontrolą dostępu opartą na rolach.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Column - Benefits List */}
            <div className="space-y-8">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                Zbudowany dla nowoczesnych zespołów
              </h2>
              
              <div className="space-y-6">
                {[
                  {
                    icon: Lightbulb,
                    title: "Intuicyjny w użyciu",
                    description: "Nowoczesny interfejs, który nie wymaga szkolenia",
                    color: "bg-yellow-600"
                  },
                  {
                    icon: TrendingUp,
                    title: "Skalowalny",
                    description: "Rozwija się razem z Twoim zespołem od 2 do 2000+ członków",
                    color: "bg-green-600"
                  },
                  {
                    icon: Shield,
                    title: "Bezpieczny",
                    description: "Zabezpieczenia na poziomie enterprise z szyfrowaniem danych",
                    color: "bg-blue-600"
                  },
                  {
                    icon: Star,
                    title: "Przystępny cenowo",
                    description: "Konkurencyjne ceny bez ukrytych kosztów",
                    color: "bg-purple-600"
                  }
                ].map((benefit, index) => (
                  <div 
                    key={index}
                    className="flex items-start space-x-4 group cursor-pointer p-4 rounded-2xl hover:bg-gray-50 transition-all duration-300"
                  >
                    <div className={`mt-1 w-12 h-12 ${benefit.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <benefit.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-xl mb-1 group-hover:text-blue-600 transition-colors duration-300">
                        {benefit.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Stats Card */}
            <div className="relative">
              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 shadow-lg">
                <h3 className="font-bold text-gray-900 mb-6 text-2xl">Nasze osiągnięcia</h3>
                <div className="space-y-6">
                  {[
                    { label: "Aktywni użytkownicy", value: "10,000+", color: "text-blue-600" },
                    { label: "Ukończone projekty", value: "50,000+", color: "text-green-600" },
                    { label: "Zadowolenie klientów", value: "98%", color: "text-purple-600" },
                    { label: "Czas działania", value: "99.9%", color: "text-orange-600" }
                  ].map((stat, index) => (
                    <div 
                      key={index}
                      className="flex justify-between items-center group cursor-pointer p-3 rounded-lg hover:bg-white transition-all duration-300"
                    >
                      <span className="text-gray-600 group-hover:text-gray-900 transition-colors duration-300">
                        {stat.label}
                      </span>
                      <span className={`font-bold text-xl ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Gotowy na transformację?
            </h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed">
              Dołącz do tysięcy zespołów, które już korzystają z Nexus, aby realizować projekty 
              szybciej i bardziej efektywnie niż kiedykolwiek wcześniej.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="group w-full sm:w-auto bg-white hover:bg-gray-50 text-blue-600 text-lg px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300">
                  Rozpocznij darmowy okres próbny
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </Link>
            </div>
            <p className="text-sm text-blue-200">
              Nie wymagamy karty kredytowej • 14-dniowy darmowy okres próbny • Możesz anulować w każdej chwili
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Nexus</span>
              </div>
              <p className="text-gray-400">
                Nowoczesne zarządzanie projektami dla nowoczesnych zespołów.
              </p>
            </div>
            
            {[
              {
                title: "Produkt",
                links: ["Funkcje", "Korzyści", "Cennik"]
              },
              {
                title: "Wsparcie", 
                links: ["Centrum pomocy", "Kontakt", "Dokumentacja"]
              },
              {
                title: "Firma",
                links: ["O nas", "Blog", "Prywatność"]
              }
            ].map((section, index) => (
              <div key={index}>
                <h3 className="font-bold text-white mb-4">{section.title}</h3>
                <ul className="space-y-2">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Nexus. Wszystkie prawa zastrzeżone.</p>
          </div>
        </div>
      </footer>

      {/* Intersection Observer Script */}
      <script dangerouslySetInnerHTML={{
        __html: `
          if (typeof window !== 'undefined') {
            const observerOptions = {
              threshold: 0.1,
              rootMargin: '0px 0px -100px 0px'
            };

            const observer = new IntersectionObserver((entries) => {
              entries.forEach(entry => {
                if (entry.isIntersecting) {
                  entry.target.classList.add('is-visible');
                }
              });
            }, observerOptions);

            document.addEventListener('DOMContentLoaded', () => {
              const fadeElements = document.querySelectorAll('.fade-in-section');
              fadeElements.forEach(el => observer.observe(el));
            });
          }
        `
      }} />
    </div>
  )
}
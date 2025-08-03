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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 overflow-x-hidden selection:bg-blue-500/20">
      {/* Navigation */}
      <nav className="fixed top-0 w-full glass-effect-dark border-b border-white/10 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2 animate-fade-in-left">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center animate-pulse-glow">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Nexus</span>
            </div>
            <div className="hidden md:flex items-center space-x-8 animate-fade-in-right">
              <a href="#features" className="text-slate-300 hover:text-white transition-all duration-300 hover:scale-105">Funkcje</a>
              <a href="#benefits" className="text-slate-300 hover:text-white transition-all duration-300 hover:scale-105">Korzyści</a>
              <Link href="/auth/signin">
                <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 transition-all duration-300">
                  Zaloguj się
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105">
                  Rozpocznij za darmo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Modern Asymmetrical Layout */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>
        
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text Content */}
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="animate-fade-in-up">
                  <span className="inline-flex items-center gap-2 px-4 py-2 glass-effect rounded-full text-sm font-medium text-cyan-400 mb-6 border border-cyan-500/30">
                    <Sparkles className="w-4 h-4" />
                    Nowoczesna platforma do zarządzania projektami
                  </span>
                </div>
                <h1 className="text-5xl md:text-7xl font-bold leading-tight animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                  <span className="text-white">Zoptymalizuj </span>
                  <span className="text-white">zarządzanie</span>
                  <br />
                  <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent animate-gradient-shift">
                    projektami zespołu
                  </span>
                </h1>
                <p className="text-xl text-slate-400 max-w-2xl leading-relaxed animate-fade-in-up" style={{animationDelay: '0.4s'}}>
                  Od śledzenia zadań po współpracę zespołową - Nexus łączy wszystko
                  w jednej intuicyjnej platformie stworzonej dla nowoczesnych zespołów.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{animationDelay: '0.6s'}}>
                <Link href="/auth/signup">
                  <Button size="lg" className="group w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg px-8 py-4 rounded-lg shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105">
                    Rozpocznij darmowy okres próbny
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </Button>
                </Link>
                <Link href="#demo">
                  <Button size="lg" variant="outline" className="group w-full sm:w-auto text-lg px-8 py-4 rounded-lg border-slate-600 text-slate-300 hover:bg-white/5 glass-effect hover:border-white/30 transition-all duration-300">
                    <Play className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                    Zobacz demo
                  </Button>
                </Link>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 animate-fade-in-up" style={{animationDelay: '0.8s'}}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">10k+</div>
                  <div className="text-sm text-slate-400">Aktywni użytkownicy</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">50k+</div>
                  <div className="text-sm text-slate-400">Ukończone projekty</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">98%</div>
                  <div className="text-sm text-slate-400">Zadowolenie</div>
                </div>
              </div>
            </div>

            {/* Right Column - Interactive Dashboard Preview */}
            <div className="relative animate-fade-in-right" style={{animationDelay: '0.4s'}}>
              <div className="glass-effect-dark rounded-3xl p-8 border border-white/10 shadow-2xl animate-float">
                {/* Mock Dashboard Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg"></div>
                    <span className="font-semibold text-white">Panel główny</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                </div>

                {/* Mock Bento Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-lg p-4 border border-blue-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm text-white font-medium">Wydajność zespołu</span>
                    </div>
                    <div className="text-2xl font-bold text-white">+24%</div>
                    <div className="text-xs text-slate-400">vs. poprzedni miesiąc</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-slate-300">Zadania</span>
                    </div>
                    <div className="text-lg font-bold text-white">127</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-slate-300">Projekty</span>
                    </div>
                    <div className="text-lg font-bold text-white">12</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-slate-400" />
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 fade-in-section">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-4">
              Wszystko, czego potrzebujesz
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Potężne funkcje w nowoczesnym, intuicyjnym interfejsie
            </p>
          </div>

          {/* Modern Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 auto-rows-auto">
            {/* Large Feature Card */}
            <div className="md:col-span-3 md:row-span-2 group glass-effect-dark rounded-3xl p-8 border border-white/10 hover:border-blue-500/50 transition-all duration-500 hover:scale-[1.02] cursor-pointer">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Zarządzanie zadaniami</h3>
                  <p className="text-slate-400">Kompleksowe narzędzie</p>
                </div>
              </div>
              <p className="text-slate-300 text-lg leading-relaxed">
                Twórz, przypisuj i śledź zadania z potężnymi tablicami kanban, 
                niestandardowymi przepływami pracy i automatyzacją procesów.
              </p>
              <div className="mt-6 flex items-center gap-2 text-cyan-400 group-hover:text-cyan-300 transition-colors duration-300">
                <span className="text-sm font-medium">Poznaj więcej</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </div>

            {/* Medium Feature Cards */}
            <div className="md:col-span-3 group glass-effect-dark rounded-3xl p-6 border border-white/10 hover:border-purple-500/50 transition-all duration-500 hover:scale-[1.02] cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Współpraca zespołowa</h3>
              <p className="text-slate-400">
                Współpraca w czasie rzeczywistym z komentarzami i dyskusjami.
              </p>
            </div>

            <div className="md:col-span-2 group glass-effect-dark rounded-3xl p-6 border border-white/10 hover:border-green-500/50 transition-all duration-500 hover:scale-[1.02] cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-400 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Śledzenie czasu</h3>
              <p className="text-slate-400 text-sm">
                Dokładne raporty czasowe
              </p>
            </div>

            <div className="md:col-span-2 group glass-effect-dark rounded-3xl p-6 border border-white/10 hover:border-orange-500/50 transition-all duration-500 hover:scale-[1.02] cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Widok kalendarza</h3>
              <p className="text-slate-400 text-sm">
                Wizualizacja terminów
              </p>
            </div>

            <div className="md:col-span-2 group glass-effect-dark rounded-3xl p-6 border border-white/10 hover:border-indigo-500/50 transition-all duration-500 hover:scale-[1.02] cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Analityka</h3>
              <p className="text-slate-400 text-sm">
                Szczegółowe raporty
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Benefits Section */}
      <section id="benefits" className="py-24 px-4 sm:px-6 lg:px-8 fade-in-section">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Column - Benefits List */}
            <div className="space-y-8">
              <h2 className="text-4xl md:text-5xl font-bold text-white">
                Zbudowany dla nowoczesnych zespołów
              </h2>
              
              <div className="space-y-6">
                {[
                  {
                    icon: Lightbulb,
                    title: "Intuicyjny w użyciu",
                    description: "Nowoczesny interfejs, który nie wymaga szkolenia",
                    color: "from-yellow-500 to-orange-500"
                  },
                  {
                    icon: TrendingUp,
                    title: "Skalowalny",
                    description: "Rozwija się razem z Twoim zespołem od 2 do 2000+ członków",
                    color: "from-green-500 to-emerald-500"
                  },
                  {
                    icon: Shield,
                    title: "Bezpieczny",
                    description: "Zabezpieczenia na poziomie enterprise z szyfrowaniem danych",
                    color: "from-blue-500 to-cyan-500"
                  },
                  {
                    icon: Star,
                    title: "Przystępny cenowo",
                    description: "Konkurencyjne ceny bez ukrytych kosztów",
                    color: "from-purple-500 to-pink-500"
                  }
                ].map((benefit, index) => (
                  <div 
                    key={index}
                    className="flex items-start space-x-4 group cursor-pointer p-4 rounded-2xl hover:bg-white/5 transition-all duration-300"
                    style={{animationDelay: `${index * 0.1}s`}}
                  >
                    <div className={`mt-1 w-12 h-12 bg-gradient-to-br ${benefit.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <benefit.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-xl mb-1 group-hover:text-cyan-400 transition-colors duration-300">
                        {benefit.title}
                      </h3>
                      <p className="text-slate-400 leading-relaxed">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Interactive Stats Card */}
            <div className="relative">
              <div className="glass-effect-dark rounded-3xl p-8 border border-white/10 shadow-2xl">
                <h3 className="font-bold text-white mb-6 text-2xl">Nasze osiągnięcia</h3>
                <div className="space-y-6">
                  {[
                    { label: "Aktywni użytkownicy", value: "10,000+", color: "text-blue-400" },
                    { label: "Ukończone projekty", value: "50,000+", color: "text-green-400" },
                    { label: "Zadowolenie klientów", value: "98%", color: "text-cyan-400" },
                    { label: "Czas działania", value: "99.9%", color: "text-purple-400" }
                  ].map((stat, index) => (
                    <div 
                      key={index}
                      className="flex justify-between items-center group cursor-pointer p-3 rounded-lg hover:bg-white/5 transition-all duration-300"
                    >
                      <span className="text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
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

      {/* Modern CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-cyan-500/20 to-purple-600/20 animate-gradient-shift"></div>
        <div className="absolute inset-0 glass-effect"></div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="space-y-8 animate-fade-in-up">
            <h2 className="text-4xl md:text-6xl font-bold text-white">
              Gotowy na transformację?
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Dołącz do tysięcy zespołów, które już korzystają z Nexus, aby realizować projekty 
              szybciej i bardziej efektywnie niż kiedykolwiek wcześniej.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="group w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg px-8 py-4 rounded-lg shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105">
                  Rozpocznij darmowy okres próbny
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </Link>
            </div>
            <p className="text-sm text-slate-400">
              Nie wymagamy karty kredytowej • 14-dniowy darmowy okres próbny • Możesz anulować w każdej chwili
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass-effect-dark border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Nexus</span>
              </div>
              <p className="text-slate-400">
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
                      <a href="#" className="text-slate-400 hover:text-white transition-colors duration-300 hover:translate-x-1 transform inline-block">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="border-t border-white/10 pt-8 text-center text-slate-400">
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
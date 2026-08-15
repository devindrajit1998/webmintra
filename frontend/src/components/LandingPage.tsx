import {
  ArrowRight,
  Check,
  ChevronRight,
  Eye,
  FileUp,
  MonitorSmartphone,
  MousePointer2,
  ShieldCheck,
  Sparkles,
  Play,
  CheckCircle2,
  Building2,
  Stethoscope,
  Briefcase,
  Scissors,
  Utensils,
  GraduationCap,
  PartyPopper,
  MoreHorizontal,
  Star,
  FileEdit,
  Smartphone,
  Globe,
  Mail,
  Search,
  Zap,
  History,
  Image as ImageIcon,
  ChevronDown,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAuthenticatedUser, routeForRole, type SessionUser } from "@/lib/auth-api";
import { useQuery } from "@tanstack/react-query";
import {
  getPublicSettings,
  getPublicTemplates,
  getPublicPlans,
  getPublicTestimonials,
} from "@/lib/public-api";

export function LandingPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const { data: settings = {} } = useQuery({
    queryKey: ["publicSettings"],
    queryFn: getPublicSettings,
    staleTime: 1000 * 60 * 5,
  });

  const { data: dynamicTemplates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["publicTemplates"],
    queryFn: () => getPublicTemplates({ limit: 10 }),
    staleTime: 1000 * 60 * 2,
  });

  const { data: dynamicPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["publicPlans"],
    queryFn: getPublicPlans,
    staleTime: 1000 * 60 * 5,
  });

  const { data: dynamicTestimonials = [], isLoading: testimonialsLoading } = useQuery({
    queryKey: ["publicTestimonials"],
    queryFn: getPublicTestimonials,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    setIsMounted(true);
    void getAuthenticatedUser().then(setUser);
  }, []);

  const primaryRoute = user ? routeForRole(user.role) : "/create-account";
  const siteName = settings["site.name"] || "WebMintra";
  const logoUrl = settings["brand.logoUrl"];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#07111f] text-slate-200 font-sans selection:bg-[#06b6d4]/30">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#07111f]/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <a
            href="#top"
            className="flex items-center gap-3 font-display text-lg font-bold text-white transition hover:opacity-80"
          >
            {isMounted && logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-9 w-9 object-contain" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#06b6d4] text-white">
                <span className="font-bold">{(isMounted ? siteName : "webmintra").charAt(0)}</span>
              </span>
            )}
            <span className="text-[22px] font-black tracking-tight leading-none bg-gradient-to-r from-[#0055ff] via-[#00c9a7] to-[#10e793] bg-clip-text text-transparent lowercase font-sans">
              {isMounted ? siteName : "webmintra"}
            </span>
          </a>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-300 md:flex">
            <a className="transition hover:text-cyan-400" href="#templates">
              Templates
            </a>
            <a className="transition hover:text-cyan-400" href="#comparison">
              Why WebMintra
            </a>
            <a className="transition hover:text-cyan-400" href="#how-it-works">
              How It Works
            </a>
            <a className="transition hover:text-cyan-400" href="#features">
              Features
            </a>
            <a className="transition hover:text-cyan-400" href="#pricing">
              Pricing
            </a>
            <a className="transition hover:text-cyan-400" href="#faq">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <Link
              to={user ? routeForRole(user.role) : "/sign-in"}
              className="hidden text-sm font-semibold text-slate-300 transition hover:text-white sm:block"
            >
              Sign in
            </Link>
            <Link
              to={primaryRoute}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[#06b6d4] px-6 text-sm font-bold text-[#083344] shadow-[0_0_20px_rgba(6,182,212,0.3)] transition hover:bg-[#22d3ee] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]"
            >
              Start Free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main id="top" className="pt-28 md:pt-36">
        {/* 1. HERO SECTION */}
        <section className="relative px-6 pb-20 lg:pb-28">
          <div className="pointer-events-none absolute left-1/2 top-0 -z-10 -translate-x-1/2 opacity-30 blur-[130px]">
            <div className="h-[450px] w-[850px] rounded-full bg-gradient-to-r from-[#06b6d4] via-teal-500 to-emerald-500" />
          </div>

          <div className="mx-auto max-w-7xl">
            <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1.1fr]">
              <div>
                <div className="mb-6 flex items-center">
                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-bold text-cyan-300 backdrop-blur-md">
                    <Sparkles className="h-3.5 w-3.5 text-cyan-400" /> No Developer Required
                  </span>
                </div>
                <h1 className="font-display text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-[3.75rem]">
                  Launch your business website. <br />
                  <span className="bg-gradient-to-r from-[#00c9a7] to-[#10e793] bg-clip-text text-transparent">
                    Update it yourself — without a developer.
                  </span>
                </h1>
                <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-slate-300">
                  Choose a professionally designed website, add your business details, connect your
                  domain, and publish in minutes. Make changes anytime with simple point-and-click
                  editing.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link
                    to={primaryRoute}
                    className="inline-flex h-14 items-center gap-2 rounded-full bg-[#06b6d4] px-8 text-base font-bold text-[#083344] shadow-[0_0_25px_rgba(6,182,212,0.4)] transition hover:bg-[#22d3ee] hover:shadow-[0_0_35px_rgba(6,182,212,0.6)]"
                  >
                    Create My Website <ArrowRight className="h-5 w-5" />
                  </Link>
                  <a
                    href="#templates"
                    className="inline-flex h-14 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 text-base font-bold text-white backdrop-blur-sm transition hover:bg-white/10 hover:border-cyan-400/40"
                  >
                    Explore Templates <ChevronDown className="h-4 w-4" />
                  </a>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-xs sm:text-sm font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> No coding required
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Mobile ready
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Custom domain
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> 15-day free trial
                  </span>
                </div>
              </div>

              {/* 2. INTERACTIVE PRODUCT EDITOR DEMO */}
              <div className="relative w-full rounded-2xl border border-white/15 bg-[#0a1524] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.6)] ring-1 ring-cyan-500/20">
                <div className="flex h-10 items-center justify-between border-b border-white/10 px-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                    <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                    <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="flex items-center gap-2 rounded bg-black/40 px-3 py-1 text-[11px] font-mono text-cyan-400">
                    <Globe className="h-3 w-3" /> smilecaredental.in
                  </div>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    Live Editor
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-2.5 p-2">
                  {/* Left: Simulated Visual Canvas */}
                  <div className="relative h-[340px] overflow-hidden rounded-xl border border-white/10 bg-slate-900 flex flex-col justify-center p-6 text-center">
                    <div className="relative mx-auto max-w-sm rounded-lg border-2 border-dashed border-cyan-400 bg-cyan-500/10 p-5 backdrop-blur-sm shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                      <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded bg-cyan-400 px-2.5 py-0.5 text-[10px] font-black text-slate-950">
                        <FileEdit className="h-3 w-3" /> Click to Edit
                      </div>
                      <h3 className="font-display text-2xl font-bold text-white leading-tight">
                        Compassionate Dental Care For Your Family
                      </h3>
                    </div>
                    <p className="mt-4 text-xs text-slate-300 line-clamp-2">
                      Experienced dental professionals dedicated to pain-free treatments and
                      brighter smiles.
                    </p>
                    <div className="mt-5 flex justify-center gap-3">
                      <span className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-md">
                        Book Appointment
                      </span>
                      <span className="rounded-lg border border-white/20 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white">
                        Our Services
                      </span>
                    </div>
                  </div>

                  {/* Right: Simulated Properties Panel */}
                  <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#0e1c2e] p-3.5 text-left">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Element Properties
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400">H2 Title</span>
                      </div>
                      <div className="mt-3 space-y-2.5">
                        <div>
                          <label className="text-[10px] font-medium text-slate-400 block mb-1">
                            Heading Text
                          </label>
                          <textarea
                            readOnly
                            className="h-16 w-full resize-none rounded-lg border border-cyan-500/40 bg-black/40 p-2 text-xs text-white outline-none"
                            value="Compassionate Dental Care For Your Family"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-slate-400 block mb-1">
                            Theme Color
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-full bg-cyan-400 ring-2 ring-white/20" />
                            <span className="text-[11px] font-mono text-slate-300">
                              #06B6D4 (Teal)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/10">
                      <div className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 py-2 text-xs font-bold text-slate-950 shadow-lg">
                        <Check className="h-3.5 w-3.5" /> Changes Saved Instantly
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. TRUST BANNER */}
        <div className="border-y border-white/5 bg-[#0a1523] py-8">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <p className="mb-5 text-sm font-semibold tracking-wide text-slate-400 uppercase">
              Trusted by 500+ Indian Businesses & Clinics
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5 text-slate-300 text-sm font-medium">
              <span className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-cyan-400" /> Gyms & Fitness
              </span>
              <span className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-cyan-400" /> Doctors & Clinics
              </span>
              <span className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-cyan-400" /> CA & Financial Firms
              </span>
              <span className="flex items-center gap-2">
                <Scissors className="h-5 w-5 text-cyan-400" /> Salons & Spas
              </span>
              <span className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-cyan-400" /> Restaurants & Cafes
              </span>
              <span className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-cyan-400" /> Coaching Institutes
              </span>
            </div>
          </div>
        </div>

        {/* 4. WHY WEBMINTRA (STOP PAYING DEVELOPERS FOR SMALL CHANGES) */}
        <section id="comparison" className="px-6 py-24 lg:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="mb-14 text-center">
              <p className="mb-3 text-sm font-bold text-cyan-400 uppercase tracking-wider">
                The WebMintra Difference
              </p>
              <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
                Your website shouldn&apos;t depend on a developer.
              </h2>
              <p className="mt-4 text-base text-slate-400 max-w-2xl mx-auto">
                Stop waiting days and paying recurring charges just to update phone numbers, menu
                items, or service offerings.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Old Way */}
              <div className="rounded-2xl border border-rose-500/20 bg-[#121622] p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-8 w-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 font-bold text-lg">
                    ✕
                  </div>
                  <h3 className="text-xl font-bold text-slate-200">The Traditional Way</h3>
                </div>
                <ul className="space-y-4 text-sm text-slate-400">
                  <li className="flex items-start gap-3">
                    <span className="text-rose-400 font-bold">✕</span>
                    <span>Wait 3–7 days for freelance developers to make a minor text edit</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-rose-400 font-bold">✕</span>
                    <span>Pay ₹500–₹2,000 maintenance fees for every single change</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-rose-400 font-bold">✕</span>
                    <span>Complex WordPress/cPanel logins that break with plugin updates</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-rose-400 font-bold">✕</span>
                    <span>Slow loading speeds and vulnerability to security hacks</span>
                  </li>
                </ul>
              </div>

              {/* WebMintra Way */}
              <div className="rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-[#0c1c2c] to-[#0a1523] p-8 shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-cyan-500 text-slate-950 font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-bl-lg">
                  Instant Control
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-8 w-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-300 font-bold text-lg">
                    ✓
                  </div>
                  <h3 className="text-xl font-bold text-white">The WebMintra Way</h3>
                </div>
                <ul className="space-y-4 text-sm text-slate-200">
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>
                      <strong>Edit in 10 seconds:</strong> Click on any text, change it, and hit
                      Save.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>
                      <strong>Zero maintenance costs:</strong> Unlimited updates included with your
                      plan.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>
                      <strong>100% Managed hosting:</strong> Lightning fast CDN, SSL certificate &
                      daily backups.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>
                      <strong>Mobile ready & SEO optimized:</strong> Automatically looks stunning on
                      phones.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 5. HOW IT WORKS (3 SIMPLE STEPS) */}
        <section
          id="how-it-works"
          className="border-t border-white/5 bg-[#0a1523] px-6 py-24 lg:py-32"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-14 text-center max-w-3xl mx-auto">
              <p className="mb-3 text-sm font-bold text-cyan-400 uppercase tracking-wider">
                Easy 3-Step Journey
              </p>
              <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
                From idea to live website in 15 minutes.
              </h2>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#111e2f] p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-4xl font-black text-cyan-400/40 font-mono">01</span>
                    <Building2 className="h-6 w-6 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Choose Your Template</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Pick a template engineered specifically for your business industry (Clinics,
                    Gyms, Cafes, Salons, CA firms, etc.).
                  </p>
                </div>
                <div className="mt-6 aspect-video rounded-lg overflow-hidden border border-white/10 bg-slate-900">
                  <img
                    src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80"
                    alt="Step 1"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#111e2f] p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-4xl font-black text-cyan-400/40 font-mono">02</span>
                    <FileEdit className="h-6 w-6 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Customize Content</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Type your business name, operating hours, service prices, and contact details
                    directly on the page.
                  </p>
                </div>
                <div className="mt-6 aspect-video rounded-lg overflow-hidden border border-white/10 bg-slate-900">
                  <img
                    src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80"
                    alt="Step 2"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#111e2f] p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-4xl font-black text-cyan-400/40 font-mono">03</span>
                    <Globe className="h-6 w-6 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Connect Domain & Go Live</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Connect your custom `.com` or `.in` domain with one click. Your SSL secured
                    website is published instantly.
                  </p>
                </div>
                <div className="mt-6 aspect-video rounded-lg overflow-hidden border border-white/10 bg-slate-900 flex items-center justify-center p-4 text-center bg-gradient-to-br from-cyan-950 to-slate-900">
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-1" />
                    <span className="text-xs font-bold text-white">Published & Active</span>
                    <span className="text-[10px] text-cyan-300 font-mono mt-0.5">
                      https://yourbusiness.in
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. VIBRANT DYNAMIC TEMPLATES SHOWCASE */}
        <section id="templates" className="relative px-6 py-24 lg:py-32 overflow-hidden">
          {/* Subtle glowing ambient backdrop */}
          <div className="pointer-events-none absolute right-0 top-1/2 -z-10 -translate-y-1/2 opacity-20 blur-[120px]">
            <div className="h-[400px] w-[500px] rounded-full bg-gradient-to-l from-cyan-500 to-teal-500" />
          </div>

          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-bold text-cyan-300 backdrop-blur-md mb-3">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" /> Professional Designs
                </span>
                <h2 className="font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
                  Beautiful templates tailored for your business.
                </h2>
                <p className="mt-3 text-slate-400 text-sm sm:text-base max-w-2xl">
                  Choose from dozens of mobile-ready templates customized with high-converting
                  layouts, appointment forms, and service catalogs.
                </p>
              </div>

              <Link
                to="/templates"
                className="inline-flex shrink-0 whitespace-nowrap items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-500 hover:text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
              >
                Explore All Templates <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {templatesLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-2xl border border-white/10 bg-[#0c1827] p-3"
                    >
                      <div className="aspect-[16/10] w-full rounded-xl bg-slate-800/80" />
                      <div className="mt-4 h-4 w-3/4 rounded bg-slate-800" />
                      <div className="mt-2 h-3 w-1/2 rounded bg-slate-800" />
                    </div>
                  ))
                : dynamicTemplates.length > 0
                  ? dynamicTemplates.slice(0, 8).map((t: any) => (
                      <div
                        key={t._id || t.id}
                        className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-b from-[#0e1c2e] to-[#0a1523] p-3.5 transition-all duration-300 hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] hover:-translate-y-1.5"
                      >
                        <div>
                          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-slate-900 border border-white/5">
                            <img
                              src={
                                t.thumbnailUrl ||
                                "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80"
                              }
                              alt={t.title}
                              className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-105"
                            />
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                              <span className="rounded-full bg-slate-950/80 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-cyan-400 border border-cyan-500/30">
                                {t.category || "General"}
                              </span>
                              {t.pageCount > 1 && (
                                <span className="rounded-full bg-slate-950/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-slate-300 border border-white/10">
                                  {t.pageCount} Pages
                                </span>
                              )}
                            </div>

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-slate-950/60 backdrop-blur-[2px]">
                              <Link
                                to="/templates"
                                className="rounded-full bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg transition hover:bg-cyan-400 flex items-center gap-1.5"
                              >
                                <Eye className="h-3.5 w-3.5" /> Preview Live
                              </Link>
                              <Link
                                to={primaryRoute}
                                className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg transition hover:bg-emerald-400 flex items-center gap-1.5"
                              >
                                Use Now <ArrowRight className="h-3.5 w-3.5" />
                              </Link>
                            </div>
                          </div>

                          <div className="pt-3.5 pb-1">
                            <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition truncate">
                              {t.title}
                            </h3>
                            <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                              {t.description ||
                                `High converting website template designed for ${t.category || "businesses"}.`}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                          <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Fully Customizable
                          </span>
                          <Link
                            to="/templates"
                            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                          >
                            Details <ChevronRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    ))
                  : [
                      {
                        title: "Pulse Fitness & Gym",
                        category: "Gym & Fitness",
                        pageCount: 3,
                        image:
                          "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80",
                      },
                      {
                        title: "AuraHealth Medical Clinic",
                        category: "Clinic & Healthcare",
                        pageCount: 4,
                        image:
                          "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&q=80",
                      },
                      {
                        title: "Artisan Brew Cafe",
                        category: "Food & Cafe",
                        pageCount: 2,
                        image:
                          "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80",
                      },
                      {
                        title: "Apex Law & Advisory",
                        category: "Legal & CA",
                        pageCount: 3,
                        image:
                          "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80",
                      },
                    ].map((t, idx) => (
                      <div
                        key={idx}
                        className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0e1c2e] p-3.5 transition-all hover:border-cyan-500/50"
                      >
                        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-slate-900">
                          <img src={t.image} alt={t.title} className="h-full w-full object-cover" />
                          <span className="absolute top-2.5 left-2.5 rounded-full bg-slate-950/80 px-2.5 py-0.5 text-[10px] font-bold text-cyan-400 border border-cyan-500/30">
                            {t.category}
                          </span>
                        </div>
                        <div className="pt-3 pb-1">
                          <h3 className="text-base font-bold text-white">{t.title}</h3>
                        </div>
                      </div>
                    ))}
            </div>
          </div>
        </section>

        {/* 7. OUTCOME-BASED FEATURES */}
        <section id="features" className="border-t border-white/5 bg-[#0a1523] px-6 py-24 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16">
              <p className="mb-3 text-sm font-bold text-cyan-400 uppercase tracking-wider">
                Everything You Need
              </p>
              <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
                Built to help your local business grow.
              </h2>
            </div>

            <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              <Feature
                icon={FileEdit}
                title="Edit Without Coding"
                desc="Change texts, photos, pricing, and operating hours anytime with simple point-and-click."
              />
              <Feature
                icon={Globe}
                title="Your Own Professional Domain"
                desc="Connect your existing domain (.com, .in) or use a free WebMintra subpath seamlessly."
              />
              <Feature
                icon={Smartphone}
                title="Flawless On Every Device"
                desc="Your website automatically adjusts to look stunning and fast on mobile, tablet and desktop."
              />
              <Feature
                icon={Mail}
                title="Capture Leads & Enquiries"
                desc="Receive customer enquiries, booking requests, and leads directly into your dashboard and email."
              />
              <Feature
                icon={Search}
                title="Get Found On Google (SEO)"
                desc="Pre-configured meta tags, sitemap, and fast code to boost your local search ranking."
              />
              <Feature
                icon={ShieldCheck}
                title="Managed High-Speed Hosting"
                desc="Lightning-fast cloud CDN, SSL security certificate, and automated daily backups included."
              />
            </div>
          </div>
        </section>

        {/* 8. DYNAMIC PRICING SECTION */}
        <section id="pricing" className="px-6 py-24 lg:py-32">
          <div className="mx-auto max-w-6xl text-center">
            <p className="mb-3 text-sm font-bold text-cyan-400 uppercase tracking-wider">
              Transparent Pricing
            </p>
            <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
              Simple, predictable plans for every stage.
            </h2>
            <p className="mt-4 text-base text-slate-400 max-w-xl mx-auto">
              No developer retainers. No hidden server fees. All plans include 15-day free trial.
            </p>

            {/* Monthly / Yearly Billing Toggle */}
            <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-[#0c1827] p-1.5 shadow-md">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`rounded-full px-5 py-2 text-xs font-bold transition ${
                  billingCycle === "monthly"
                    ? "bg-cyan-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold transition ${
                  billingCycle === "yearly"
                    ? "bg-cyan-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Yearly
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-400">
                  Save 20%
                </span>
              </button>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {plansLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-3xl border border-white/5 bg-[#111e2f] p-8"
                  >
                    <div className="h-6 w-1/2 rounded bg-slate-800" />
                    <div className="mt-4 h-10 w-3/4 rounded bg-slate-800" />
                    <div className="mt-8 space-y-3">
                      <div className="h-4 w-full rounded bg-slate-800" />
                      <div className="h-4 w-5/6 rounded bg-slate-800" />
                      <div className="h-4 w-4/6 rounded bg-slate-800" />
                    </div>
                  </div>
                ))
              ) : dynamicPlans.length > 0 ? (
                dynamicPlans.map((plan: any, index: number) => {
                  const isPopular =
                    index === 1 ||
                    plan.slug === "pro" ||
                    plan.slug === "growth" ||
                    dynamicPlans.length === 1;
                  const price =
                    billingCycle === "yearly"
                      ? plan.pricing?.yearly
                        ? Math.round(plan.pricing.yearly / 12)
                        : plan.pricing?.monthly || 0
                      : plan.pricing?.monthly || 0;

                  return (
                    <div
                      key={plan._id || plan.slug}
                      className={`relative flex flex-col justify-between rounded-3xl p-8 transition-all duration-300 text-left ${
                        isPopular
                          ? "border-2 border-cyan-500 bg-gradient-to-b from-[#102438] to-[#07111f] shadow-[0_0_40px_rgba(6,182,212,0.2)] lg:-translate-y-2"
                          : "border border-white/10 bg-[#0c1827] hover:border-white/20"
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-1 text-[11px] font-black text-slate-950 uppercase tracking-wider shadow-md">
                          Most Popular
                        </div>
                      )}

                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                            <p className="text-xs text-slate-400 mt-1 min-h-[32px] line-clamp-2">
                              {plan.description ||
                                "Everything you need to run your business online"}
                            </p>
                          </div>
                        </div>

                        <div className="my-6 py-4 border-y border-white/10">
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-extrabold text-white">
                              {price === 0
                                ? "Free"
                                : `${plan.currency === "USD" ? "$" : "₹"}${price}`}
                            </span>
                            {price > 0 && (
                              <span className="text-xs font-medium text-slate-400">/month</span>
                            )}
                          </div>
                          <p className="text-[11px] text-emerald-400 font-semibold mt-1">
                            {billingCycle === "yearly" && price > 0
                              ? `Billed annually (${plan.currency === "USD" ? "$" : "₹"}${plan.pricing?.yearly || price * 12}/yr)`
                              : "Billed monthly • Cancel anytime"}
                          </p>
                        </div>

                        {/* If plan has custom curated highlights from Admin, use them; otherwise construct from limits & features */}
                        <ul className="space-y-3 text-sm text-slate-300 mb-8">
                          {plan.highlights && plan.highlights.length > 0 ? (
                            plan.highlights.map((h: string, i: number) => (
                              <li key={i} className="flex items-center gap-2.5">
                                <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                                <span>{h}</span>
                              </li>
                            ))
                          ) : (
                            <>
                              <li className="flex items-center gap-2.5">
                                <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                                <span>
                                  {plan.limits?.websites === 0
                                    ? "Unlimited websites"
                                    : `${plan.limits?.websites || 1} Published Website${(plan.limits?.websites || 1) > 1 ? "s" : ""}`}
                                </span>
                              </li>
                              <li className="flex items-center gap-2.5">
                                <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                                <span>
                                  {plan.limits?.pagesPerWebsite === 0
                                    ? "Unlimited pages"
                                    : `Up to ${plan.limits?.pagesPerWebsite || 5} pages per website`}
                                </span>
                              </li>
                              <li className="flex items-center gap-2.5">
                                <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                                <span>
                                  {plan.features?.customDomain || plan.limits?.customDomains > 0
                                    ? "Connect custom domain (.com, .in)"
                                    : "WebMintra free subdomain"}
                                </span>
                              </li>
                              <li className="flex items-center gap-2.5">
                                <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                                <span>Cloud SSL & high-speed CDN</span>
                              </li>
                              <li className="flex items-center gap-2.5">
                                <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                                <span>Lead capture & enquiry forms</span>
                              </li>
                              {plan.features?.seoTools && (
                                <li className="flex items-center gap-2.5">
                                  <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                                  <span>Advanced SEO & meta tags</span>
                                </li>
                              )}
                              {plan.features?.prioritySupport && (
                                <li className="flex items-center gap-2.5">
                                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                  <span>Priority WhatsApp & phone support</span>
                                </li>
                              )}
                            </>
                          )}
                        </ul>
                      </div>

                      <Link
                        to={primaryRoute}
                        className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition shadow-lg ${
                          isPopular
                            ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                            : "bg-white/10 text-white hover:bg-white/15"
                        }`}
                      >
                        {plan.trialDays
                          ? `Start ${plan.trialDays}-Day Free Trial`
                          : "Start 15-Day Free Trial"}{" "}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  );
                })
              ) : (
                /* Fallback starter card if no plans in DB */
                <div className="max-w-md mx-auto rounded-3xl border border-cyan-500/40 bg-gradient-to-b from-[#111e2f] to-[#07111f] p-8 shadow-[0_0_40px_rgba(6,182,212,0.15)] relative md:col-span-2 lg:col-span-3">
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-1 text-xs font-black text-slate-950 uppercase tracking-wider shadow-md">
                    15-Day Free Trial
                  </div>
                  <h3 className="text-xl font-bold text-white mt-2">Starter Business Plan</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Complete setup for Indian small businesses
                  </p>

                  <div className="my-6 py-4 border-y border-white/10">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-extrabold text-white">₹499</span>
                      <span className="text-sm font-medium text-slate-400">/month</span>
                    </div>
                    <p className="text-[11px] text-emerald-400 font-semibold mt-1">
                      ✓ Billed yearly or monthly • No credit card required
                    </p>
                  </div>

                  <ul className="space-y-3 text-left text-sm text-slate-200 mb-8 max-w-sm mx-auto">
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-cyan-400" /> Full website editor & live preview
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-cyan-400" /> Custom domain connection (.com,
                      .in)
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-cyan-400" /> Managed cloud hosting & SSL
                      certificate
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-cyan-400" /> Lead collection & contact forms
                    </li>
                  </ul>

                  <Link
                    to={primaryRoute}
                    className="w-full max-w-sm mx-auto flex items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3.5 text-sm font-bold text-slate-950 shadow-lg transition hover:bg-cyan-400"
                  >
                    Start 15-Day Free Trial <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 9. TESTIMONIALS */}
        <section className="border-t border-white/5 bg-[#0a1523] px-6 py-24 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12">
              <p className="mb-3 text-sm font-bold text-cyan-400 uppercase tracking-wider">
                Customer Stories
              </p>
              <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
                What business owners say
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {testimonialsLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-48 animate-pulse rounded-2xl border border-white/5 bg-[#111e2f] p-6"
                    />
                  ))
                : dynamicTestimonials.length > 0
                  ? dynamicTestimonials.map((t: any) => (
                      <div
                        key={t._id || t.id}
                        className="rounded-2xl border border-white/10 bg-[#111e2f] p-6 flex flex-col justify-between transition-all hover:border-cyan-500/30"
                      >
                        <div>
                          <QuoteIcon />
                          <p className="mt-4 text-sm leading-relaxed text-slate-300">
                            &ldquo;{t.quote}&rdquo;
                          </p>
                        </div>
                        <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/5">
                          <div className="flex items-center gap-3">
                            {t.avatarUrl ? (
                              <img
                                src={t.avatarUrl}
                                alt={t.authorName}
                                className="h-10 w-10 rounded-full object-cover border border-slate-700"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">
                                {t.authorName?.charAt(0) || "U"}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-bold text-white">{t.authorName}</p>
                              <p className="text-xs text-slate-400">
                                {t.roleOrTitle}
                                {t.businessName ? ` · ${t.businessName}` : ""}
                                {t.location ? ` (${t.location})` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1 text-amber-400">
                            {Array.from({ length: t.rating || 5 }).map((_, idx) => (
                              <Star key={idx} className="h-3.5 w-3.5 fill-current" />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  : [
                      {
                        authorName: "Rohit Sharma",
                        roleOrTitle: "Owner",
                        businessName: "Pulse Fitness",
                        location: "Kolkata",
                        quote:
                          "I launched our gym website in one evening. When we updated our membership pricing last week, I did it myself in 2 minutes from my phone.",
                        rating: 5,
                        avatarUrl: "https://i.pravatar.cc/150?img=11",
                      },
                      {
                        authorName: "Dr. Priya Verma",
                        roleOrTitle: "Dentist",
                        businessName: "Care Dental Clinic",
                        location: "Delhi",
                        quote:
                          "We used to pay ₹1,500 every time we needed to update doctor availability. With WebMintra, we edit our clinic schedule directly without hassle.",
                        rating: 5,
                        avatarUrl: "https://i.pravatar.cc/150?img=47",
                      },
                      {
                        authorName: "Ankit Agarwal",
                        roleOrTitle: "Partner",
                        businessName: "Agarwal & Associates",
                        location: "Jaipur",
                        quote:
                          "Our accounting firm receives enquiries every week through our WebMintra contact form. Setup was seamless and domain connection took 5 minutes.",
                        rating: 5,
                        avatarUrl: "https://i.pravatar.cc/150?img=12",
                      },
                    ].map((t, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-white/10 bg-[#111e2f] p-6 flex flex-col justify-between"
                      >
                        <div>
                          <QuoteIcon />
                          <p className="mt-4 text-sm leading-relaxed text-slate-300">
                            &ldquo;{t.quote}&rdquo;
                          </p>
                        </div>
                        <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/5">
                          <div className="flex items-center gap-3">
                            <img
                              src={t.avatarUrl}
                              alt={t.authorName}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                            <div>
                              <p className="text-sm font-bold text-white">{t.authorName}</p>
                              <p className="text-xs text-slate-400">
                                {t.roleOrTitle}, {t.businessName} · {t.location}
                              </p>
                            </div>
                          </div>
                          <Stars />
                        </div>
                      </div>
                    ))}
            </div>
          </div>
        </section>

        {/* 10. CONVERSION-FOCUSED FAQ */}
        <section id="faq" className="px-6 py-24 lg:py-32">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <p className="mb-3 text-sm font-bold text-cyan-400 uppercase tracking-wider">
                Frequently Asked Questions
              </p>
              <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
                Everything you need to know.
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-4">
                <FaqItem
                  q="Can I use my own custom domain?"
                  a="Yes! You can connect any domain you own (.com, .in, .org, etc.) with simple DNS records."
                />
                <FaqItem
                  q="Do I need coding or technical knowledge?"
                  a="Zero coding required. You can edit any text, image, price, or button just by clicking on it."
                />
                <FaqItem
                  q="Is hosting and SSL included?"
                  a="Yes, high-speed managed hosting with automatic SSL encryption and daily backups is included."
                />
                <FaqItem
                  q="Can I update my website after publishing?"
                  a="Yes, you can edit and republish your website as many times as you want with no extra charges."
                />
              </div>
              <div className="flex flex-col gap-4">
                <FaqItem
                  q="Can customers contact me through my website?"
                  a="Yes! Every template comes with built-in enquiry and booking forms that send leads directly to your email and dashboard."
                />
                <FaqItem
                  q="Will my website look good on mobile phones?"
                  a="Every WebMintra template is 100% mobile-responsive and optimized for fast smartphone browsing."
                />
                <FaqItem
                  q="Do I need a credit card for the free trial?"
                  a="No credit card is required. You get 15 days of full access to create and customize your website."
                />
                <FaqItem
                  q="Can I cancel my subscription anytime?"
                  a="Yes, you can cancel your subscription anytime with a single click from your account dashboard."
                />
              </div>
            </div>
          </div>
        </section>

        {/* 11. FINAL HIGH-CONVERTING CTA */}
        <section className="px-6 pb-24 lg:pb-32">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-[#0c1827] via-[#0a1523] to-[#111e2f] px-6 py-20 text-center shadow-[0_0_60px_rgba(6,182,212,0.15)]">
            <div className="absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-cyan-400 opacity-20 blur-[90px]" />
            <div className="relative z-10">
              <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/30">
                <Sparkles className="h-8 w-8" />
              </div>
              <h2 className="font-display text-4xl font-extrabold text-white sm:text-5xl">
                Your business deserves a professional website.
              </h2>
              <p className="mt-4 text-lg text-slate-300 max-w-xl mx-auto">
                Launch yours today with WebMintra. Start free for 15 days — no coding, no developer
                needed.
              </p>
              <div className="mt-8 flex justify-center">
                <Link
                  to={primaryRoute}
                  className="inline-flex h-14 items-center gap-2 rounded-full bg-[#06b6d4] px-8 text-base font-bold text-[#083344] shadow-[0_0_25px_rgba(6,182,212,0.4)] transition hover:bg-[#22d3ee] hover:shadow-[0_0_35px_rgba(6,182,212,0.6)]"
                >
                  Create My Website Now <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 12. MOBILE STICKY CTA */}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#07111f]/95 p-3 backdrop-blur-md md:hidden">
          <Link
            to={primaryRoute}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#06b6d4] font-bold text-[#083344] shadow-lg"
          >
            Create Your Website <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#050b14] px-6 py-12">
        <div className="mx-auto grid max-w-7xl gap-12 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <div className="sm:col-span-2 md:col-span-4 lg:col-span-1 lg:pr-8">
            <a
              href="#top"
              className="flex items-center gap-3 font-display text-lg font-bold text-white transition hover:opacity-90"
            >
              {logoUrl ? (
                <img src={logoUrl} alt={siteName} className="h-8 w-8 object-contain" />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                  <span className="font-bold">{siteName.charAt(0)}</span>
                </span>
              )}
              <span className="text-[20px] font-black tracking-tight leading-none bg-gradient-to-r from-[#0055ff] via-[#00c9a7] to-[#10e793] bg-clip-text text-transparent lowercase font-sans">
                {siteName}
              </span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              The easiest way to create and manage your business website.
            </p>
            <p className="mt-8 text-xs text-slate-500">
              © {new Date().getFullYear()} {siteName}. All rights reserved.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">Product</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li>
                <a href="#how-it-works" className="hover:text-[#06b6d4]">
                  How it works
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[#06b6d4]">
                  Features
                </a>
              </li>
              <li>
                <Link to="/templates" className="hover:text-[#06b6d4]">
                  Templates Catalog
                </Link>
              </li>
              <li>
                <a href="#pricing" className="hover:text-[#06b6d4]">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">Company</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li>
                <Link to="/blog" className="hover:text-[#06b6d4]">
                  Blog & Guides
                </Link>
              </li>
              <li>
                <Link to="/help" className="hover:text-[#06b6d4]">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#06b6d4]">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">
              Legal & Compliance
            </h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li>
                <Link to="/privacy-policy" className="hover:text-[#06b6d4]">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-and-conditions" className="hover:text-[#06b6d4]">
                  Terms and Conditions
                </Link>
              </li>
              <li>
                <Link to="/refund-cancellation-policy" className="hover:text-[#06b6d4]">
                  Refund & Cancellation
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">
              Follow us
            </h4>
            <div className="flex gap-4">
              <a
                href="#"
                className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-slate-400 hover:bg-[#06b6d4] hover:text-white transition"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                </svg>
              </a>
              <a
                href="#"
                className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-slate-400 hover:bg-[#06b6d4] hover:text-white transition"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="#"
                className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-slate-400 hover:bg-[#06b6d4] hover:text-white transition"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Components ──────────────────────────────────────────────

function StepCard({
  number,
  icon: Icon,
  title,
  desc,
}: {
  number: string;
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <div className="relative flex-1 rounded-2xl border border-white/5 bg-[#111e2f] p-6 shadow-xl z-10 transition hover:border-white/10 hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#06b6d4]/10 text-[#06b6d4]">
          <Icon className="h-5 w-5" />
        </div>
        <span className="font-mono text-2xl font-bold text-slate-700">{number}</span>
      </div>
      <h3 className="mt-8 font-display text-xl font-bold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">{desc}</p>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-[#111e2f] text-[#06b6d4] shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-bold text-white">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">{desc}</p>
      </div>
    </div>
  );
}

function TemplateCard({
  title,
  category,
  image,
}: {
  title: string;
  category?: string;
  image: string;
}) {
  return (
    <div className="group cursor-pointer rounded-xl border border-white/5 bg-[#111e2f] p-2.5 transition-all duration-300 hover:border-[#06b6d4]/50 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)] hover:-translate-y-1">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-800">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105 group-hover:opacity-90"
        />
        {category && (
          <span className="absolute top-2 left-2 rounded bg-black/60 backdrop-blur px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#06b6d4]">
            {category}
          </span>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-black/50 backdrop-blur-[2px]">
          <span className="rounded-full bg-[#06b6d4] px-3.5 py-1.5 text-xs font-bold text-[#083344] shadow-lg flex items-center gap-1.5">
            Use Template <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
      <div className="pt-3 pb-1 text-center">
        <p className="text-sm font-bold text-white truncate px-1">{title}</p>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-2xl border border-white/5 bg-[#111e2f] p-5 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer items-center justify-between gap-4 font-bold text-white hover:text-[#06b6d4]">
        {q}
        <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
          <div className="absolute h-4 w-0.5 bg-slate-500 transition-transform group-open:rotate-90 group-open:bg-[#06b6d4]" />
          <div className="absolute h-0.5 w-4 bg-slate-500 group-open:bg-[#06b6d4]" />
        </span>
      </summary>
      <p className="mt-4 text-sm leading-relaxed text-slate-400">{a}</p>
    </details>
  );
}

function QuoteIcon() {
  return (
    <svg className="h-8 w-8 text-white/5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
    </svg>
  );
}

function Stars() {
  return (
    <div className="flex gap-1 text-amber-400">
      <Star className="h-4 w-4 fill-current" />
      <Star className="h-4 w-4 fill-current" />
      <Star className="h-4 w-4 fill-current" />
      <Star className="h-4 w-4 fill-current" />
      <Star className="h-4 w-4 fill-current" />
    </div>
  );
}

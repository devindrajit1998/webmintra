import {
  ArrowRight,
  Check,
  ChevronDown,
  Eye,
  Globe,
  Sparkles,
  CheckCircle2,
  Building2,
  Stethoscope,
  Briefcase,
  Scissors,
  Utensils,
  Dumbbell,
  Compass,
  Star,
  FileEdit,
  Smartphone,
  ShieldCheck,
  Zap,
  Layers,
  MessageSquare,
  BarChart3,
  Sliders,
  X,
  ExternalLink,
  Menu,
  GraduationCap,
  Scale,
  Plus,
  Play,
  TrendingUp,
  Search,
  Lock,
  Smartphone as PhoneIcon,
  Laptop,
  ChevronRight,
  Phone,
  HelpCircle,
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
import { PublicMobileMenu } from "./PublicMobileMenu";

export function LandingPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live interactive editor mockup state
  const [heroHeadingText, setHeroHeadingText] = useState(
    "Compassionate Dental Care for Your Family",
  );
  const [heroTextColor, setHeroTextColor] = useState("#0f172a");

  const { data: settings = {} } = useQuery({
    queryKey: ["publicSettings"],
    queryFn: getPublicSettings,
    staleTime: 1000 * 60 * 5,
  });

  const { data: dynamicTemplates = [] } = useQuery({
    queryKey: ["publicTemplates"],
    queryFn: () => getPublicTemplates({ limit: 12 }),
    staleTime: 1000 * 60 * 2,
  });

  const { data: dynamicPlans = [] } = useQuery({
    queryKey: ["publicPlans"],
    queryFn: getPublicPlans,
    staleTime: 1000 * 60 * 5,
  });

  const { data: dynamicTestimonials = [] } = useQuery({
    queryKey: ["publicTestimonials"],
    queryFn: getPublicTestimonials,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    setIsMounted(true);
    void getAuthenticatedUser().then(setUser);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  const primaryRoute = user ? routeForRole(user.role) : "/create-account";
  const siteName = settings["site.name"] || "webmintra";
  const logoUrl = settings["brand.logoUrl"];

  // Reference UI 6 Template Cards with Indian Business Personas
  const defaultTemplates = [
    {
      id: "tpl-healthcare",
      title: "Dental & Healthcare",
      subtitle: "Dr. Sharma Dental, Greater Kailash Delhi",
      category: "Healthcare",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=800",
    },
    {
      id: "tpl-fitness",
      title: "Gym & CrossFit",
      subtitle: "Apex Fitness Studio, Indiranagar Bengaluru",
      category: "Fitness",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=800",
    },
    {
      id: "tpl-restaurant",
      title: "Fine Dining & Cafe",
      subtitle: "Saffron Dining & Cafe, Bandra Mumbai",
      category: "Restaurant",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800",
    },
    {
      id: "tpl-salon",
      title: "Bridal Salon & Spa",
      subtitle: "Elegance Bridal & Spa, Jubilee Hills Hyderabad",
      category: "Salon",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800",
    },
    {
      id: "tpl-travel",
      title: "Tours & Resorts",
      subtitle: "Royal Rajasthan & Kerala Backwaters",
      category: "Travel",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=800",
    },
    {
      id: "tpl-consultant",
      title: "CA & Tax Advisory",
      subtitle: "R.K. Agarwal & Co., Chartered Accountants",
      category: "Consultant",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800",
    },
  ];

  const templatesToDisplay =
    dynamicTemplates.length >= 6 ? dynamicTemplates.slice(0, 6) : defaultTemplates;

  // Reference UI Testimonials with Real Indian Local Businesses
  const defaultTestimonials = [
    {
      id: "t1",
      authorName: "Dr. Neha Sharma, MDS",
      roleOrTitle: "SmileCare Clinic, GK-1 New Delhi",
      quote:
        "Webmintra helped our dental clinic get 45+ WhatsApp appointment bookings in the first week. Patients love the fast mobile experience on Jio and Airtel.",
      avatarUrl:
        "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200",
    },
    {
      id: "t2",
      authorName: "Rohit Varma",
      roleOrTitle: "Apex Gym & CrossFit, Indiranagar Bengaluru",
      quote:
        "Our gym membership inquiries doubled after publishing our rate cards and trainer schedules on our custom .in domain. Managing it without a web developer is effortless.",
      avatarUrl:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    },
    {
      id: "t3",
      authorName: "Priya Mehta",
      roleOrTitle: "Elegance Bridal Studio, Bandra West Mumbai",
      quote:
        "Our bridal salon appointments grew by 3.5x once clients could browse our makeup lookbook online and connect with one click on WhatsApp.",
      avatarUrl:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    },
  ];

  const testimonialsToDisplay =
    dynamicTestimonials.length > 0 ? dynamicTestimonials : defaultTestimonials;

  return (
    <div className="landing-page min-h-screen bg-white text-[#0f172a] selection:bg-[#ea580c]/20 selection:text-[#ea580c]">
      <a href="#main-content" className="landing-skip-link">
        Skip to content
      </a>

      {/* ── 1. NAVBAR ────────────────────────────────────────────── */}
      <header className="landing-nav-glass fixed top-0 left-0 right-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          {/* Logo */}
          <a
            href="#top"
            aria-label="Webmintra home"
            className="flex items-center gap-2.5 rounded-md"
          >
            <div className="relative flex h-8 w-8 items-center justify-center">
              <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none">
                <path
                  d="M4 8L10 24L16 12L22 24L28 8"
                  stroke="#ea580c"
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="16" cy="24" r="3" fill="#059669" />
              </svg>
            </div>
            <span className="text-[22px] font-black tracking-tight text-[#0f172a] lowercase font-sans">
              webmintra
            </span>
          </a>

          {/* Nav Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 text-[13px] font-semibold text-[#475569] md:flex"
          >
            <a href="#product" className="landing-nav-link">
              Product
            </a>
            <a href="#templates" className="landing-nav-link">
              Templates
            </a>
            <a href="#solutions" className="landing-nav-link">
              Solutions
            </a>
            <a href="#pricing" className="landing-nav-link">
              Pricing
            </a>
            <a href="#faq" className="landing-nav-link">
              Resources
            </a>
          </nav>

          {/* Right Action CTAs */}
          <div className="flex items-center gap-4">
            <Link
              to={user ? routeForRole(user.role) : "/sign-in"}
              className="text-[14px] font-semibold text-[#475569] hover:text-[#0f172a] transition"
            >
              Login
            </Link>
            <Link
              to={primaryRoute}
              className="hidden h-10 items-center justify-center rounded-md bg-[#059669] px-5 text-[13.5px] font-bold text-white shadow-sm transition hover:bg-[#047857] active:scale-[0.98] sm:inline-flex"
            >
              Create Your Website
            </Link>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              className="landing-icon-button md:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

      </header>

      {/* ── MOBILE OFF-CANVAS SLIDE-OVER DRAWER ───────────────────── */}
      <PublicMobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        user={user}
        primaryRoute={primaryRoute}
        siteName={siteName}
        logoUrl={logoUrl}
        isLandingPage={true}
      />

      <main id="top">
        {/* ── 2. HERO SECTION ──────────────────────────────────────── */}
        <section
          id="main-content"
          tabIndex={-1}
          className="tiranga-hero-bg indian-jali-pattern relative px-5 pt-24 pb-14 sm:px-6 sm:pt-28 lg:pb-20 border-b border-[#e2e8f0] overflow-hidden"
        >
          {/* Subtle Ambient Tiranga Light Gradients */}
          <div className="pointer-events-none absolute -top-16 -left-16 h-[440px] w-[440px] rounded-full bg-[#ea580c]/[0.08] blur-[120px]" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-[440px] w-[440px] rounded-full bg-[#059669]/[0.09] blur-[120px]" />

          <div className="mx-auto max-w-7xl relative z-10">
            <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12">
              {/* Left Column Content */}
              <div>
                {/* Eyebrow Pill */}
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3.5 py-1 text-[11.5px] font-bold text-[#c2410c] shadow-2xs">
                  <span className="text-sm">🇮🇳</span>
                  <span>BHARAT&apos;S #1 WEBSITE BUILDER FOR BUSINESSES</span>
                </div>

                {/* Headline */}
                <h1 className="max-w-xl text-[40px] font-extrabold text-[#0f172a] leading-[1.08] sm:text-[52px] lg:text-[56px]">
                  Your business <br />
                  deserves a website <br />
                  that <span className="text-[#ea580c]">works</span> as hard <br />
                  as <span className="text-[#059669]">you do.</span>
                </h1>

                <p className="mt-5 text-[16px] sm:text-[17.5px] text-[#475569] leading-relaxed max-w-lg">
                  Launch a high-converting website with <strong>direct WhatsApp leads</strong>, <strong>instant UPI payments</strong>, and <strong>free .in domain</strong>. No coding or developers needed.
                </p>

                {/* CTAs */}
                <div className="mt-7 flex flex-wrap items-center gap-3.5">
                  <Link
                    to={primaryRoute}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#ea580c] px-6 text-[14.5px] font-bold text-white shadow-[0_4px_14px_rgba(234,88,12,0.35)] transition hover:bg-[#c2410c]"
                  >
                    Create Your Website <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href="#templates"
                    className="inline-flex h-12 items-center justify-center rounded-lg border border-[#cbd5e1] bg-white px-5 text-[14.5px] font-bold text-[#0f172a] shadow-sm transition hover:bg-[#f8fafc]"
                  >
                    Explore Templates
                  </a>
                </div>

                {/* Indian Business Trust Indicators */}
                <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] font-bold text-[#475569]">
                  <span className="flex items-center gap-1.5 text-[#059669]">
                    <span>💬</span> Direct WhatsApp Leads
                  </span>
                  <span className="flex items-center gap-1.5 text-[#ea580c]">
                    <span>🇮🇳</span> Free .in / .com Domain
                  </span>
                  <span className="flex items-center gap-1.5 text-[#1d4ed8]">
                    <span>⚡</span> Instant UPI & QR Pay
                  </span>
                </div>
              </div>

              {/* Right Column: Visual Product Editor Mockup with Indian Context */}
              <div className="relative">
                {/* Browser Studio Frame */}
                <div className="landing-editor-frame overflow-hidden bg-white border border-[#cbd5e1] shadow-2xl">
                  {/* Browser Top Navigation Bar */}
                  <div className="flex h-10 items-center justify-between border-b border-[#e2e8f0] bg-[#f8fafc] px-4">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
                      <div className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
                      <div className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
                    </div>

                    {/* App Internal Nav */}
                    <div className="flex items-center gap-4 text-[11px] font-medium text-[#64748b]">
                      <div className="flex items-center gap-1 text-[#0f172a] font-bold">
                        <span className="h-2 w-2 rounded-full bg-[#059669]" /> SmileCare Dental
                      </div>
                      <span className="hidden sm:inline">Home</span>
                      <span className="hidden sm:inline">Treatments</span>
                      <span className="hidden sm:inline">Doctors</span>
                      <span className="hidden sm:inline">Pricing</span>
                      <span className="hidden sm:inline">Contact</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[#059669] px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                        Publish
                      </span>
                    </div>
                  </div>

                  {/* Editor Body Grid: Sidebar + Canvas */}
                  <div className="grid grid-cols-[44px_1fr] min-h-[350px]">
                    {/* Left Icon Toolstrip */}
                    <div className="border-r border-[#e2e8f0] bg-[#f8fafc] py-4 flex flex-col items-center gap-5 text-[#64748b]">
                      <div className="flex flex-col items-center gap-0.5 text-[#ea580c] cursor-pointer">
                        <Layers className="h-4 w-4" />
                        <span className="text-[8px] font-bold">Section</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 hover:text-[#0f172a] cursor-pointer">
                        <FileEdit className="h-4 w-4" />
                        <span className="text-[8px] font-medium">Pages</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 hover:text-[#0f172a] cursor-pointer">
                        <Sliders className="h-4 w-4" />
                        <span className="text-[8px] font-medium">Theme</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 hover:text-[#0f172a] cursor-pointer">
                        <ShieldCheck className="h-4 w-4" />
                        <span className="text-[8px] font-medium">Settings</span>
                      </div>
                    </div>

                    {/* Canvas Area */}
                    <div className="relative p-5 sm:p-6 bg-[#fafcfa]">
                      <div className="grid sm:grid-cols-[1.1fr_0.9fr] gap-4 items-center">
                        {/* Canvas Left Content */}
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#059669] bg-[#ecfdf5] px-2 py-0.5 rounded border border-[#a7f3d0]">
                              GREATER KAILASH, NEW DELHI
                            </span>
                          </div>
                          <h2
                            style={{ color: heroTextColor }}
                            className="text-[20px] sm:text-[22px] font-extrabold leading-snug"
                          >
                            {heroHeadingText}
                          </h2>
                          <p className="mt-2 text-[11px] text-[#64748b] leading-relaxed">
                            Dr. Neha Sharma, MDS & Team. Modern pain-free dentistry with instant WhatsApp appointment booking.
                          </p>
                          <div className="mt-4 flex items-center gap-2">
                            <span className="rounded-lg bg-[#25D366] hover:bg-[#20bd5a] px-3 py-1.5 text-[10px] font-bold text-white shadow-sm flex items-center gap-1.5">
                              <span>💬</span> WhatsApp Book
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-[#0f172a]">
                              <Play className="h-3 w-3 fill-current text-[#ea580c]" /> Clinic Tour
                            </span>
                          </div>
                        </div>

                        {/* Canvas Right Image */}
                        <div className="rounded-xl overflow-hidden border border-[#e2e8f0] bg-white aspect-[4/3] shadow-sm">
                          <img
                            src="https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=800"
                            alt="Dental Clinic Delhi"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>

                      {/* Floating "Edit Text" Property Inspector Popover */}
                      <div className="landing-property-panel absolute top-4 right-4 sm:right-6 w-[175px] rounded-lg border border-[#e2e8f0] bg-white p-3 shadow-xl z-20 text-[11px]">
                        <div className="font-bold text-[#0f172a] mb-2 pb-1 border-b border-[#f1f5f9]">
                          Edit Text
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between rounded border border-[#e2e8f0] bg-[#f8fafc] px-2 py-1 text-[10px] font-medium text-[#0f172a]">
                            <span>Heading 1</span>
                            <ChevronDown className="h-3 w-3 opacity-60" />
                          </div>

                          <div className="flex items-center justify-between text-[#64748b] px-1 font-bold text-[10px]">
                            <span className="hover:text-[#0f172a] cursor-pointer">B</span>
                            <span className="italic hover:text-[#0f172a] cursor-pointer">I</span>
                            <span className="underline hover:text-[#0f172a] cursor-pointer">U</span>
                            <span className="hover:text-[#0f172a] cursor-pointer">≡</span>
                          </div>

                          <div>
                            <span className="text-[9px] font-bold text-[#64748b] block mb-1">Text Color</span>
                            <div className="flex items-center gap-1.5">
                              {["#0f172a", "#ea580c", "#059669", "#1d4ed8"].map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setHeroTextColor(c)}
                                  className={`h-4 w-4 rounded-full transition ${heroTextColor === c ? "ring-2 ring-offset-1 ring-[#0f172a]" : ""}`}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[9px] font-bold text-[#64748b] mb-0.5">
                              <span>Spacing</span>
                              <span>24</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-[#e2e8f0] relative">
                              <div className="h-1.5 w-2/3 rounded-full bg-[#059669]" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Floating Domain Pill */}
                  <div className="border-t border-[#e2e8f0] bg-[#f8fafc] px-4 py-2 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-[#475569] font-mono">
                      <Globe className="h-3.5 w-3.5 text-[#ea580c]" />
                      <span>smilecaredental.in</span>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-[#059669] bg-[#ecfdf5] px-2 py-0.5 rounded border border-[#a7f3d0]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#059669]" /> Live on Delhi Edge
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. TRUSTED BY THOUSANDS STRIP ────────────────────────── */}
        <section id="solutions" className="border-b border-[#e2e8f0] bg-[#f8faf9] py-8">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <p className="text-[11.5px] font-extrabold uppercase tracking-wider text-[#64748b]">
              TRUSTED BY THOUSANDS OF BUSINESSES ACROSS <span className="text-[#059669]">INDIA</span>
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 text-[13px] font-bold text-[#334155]">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e2e8f0] bg-white px-3.5 py-1.5 shadow-2xs transition hover:border-[#ea580c] hover:text-[#ea580c]">
                <Stethoscope className="h-4 w-4 text-[#ea580c]" /> Clinics
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e2e8f0] bg-white px-3.5 py-1.5 shadow-2xs transition hover:border-[#059669] hover:text-[#059669]">
                <Dumbbell className="h-4 w-4 text-[#059669]" /> Gyms
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e2e8f0] bg-white px-3.5 py-1.5 shadow-2xs transition hover:border-[#ea580c] hover:text-[#ea580c]">
                <Utensils className="h-4 w-4 text-[#ea580c]" /> Restaurants
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e2e8f0] bg-white px-3.5 py-1.5 shadow-2xs transition hover:border-[#059669] hover:text-[#059669]">
                <Scissors className="h-4 w-4 text-[#059669]" /> Salons
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e2e8f0] bg-white px-3.5 py-1.5 shadow-2xs transition hover:border-[#ea580c] hover:text-[#ea580c]">
                <Briefcase className="h-4 w-4 text-[#ea580c]" /> Consultants
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e2e8f0] bg-white px-3.5 py-1.5 shadow-2xs transition hover:border-[#059669] hover:text-[#059669]">
                <Compass className="h-4 w-4 text-[#059669]" /> Travel
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e2e8f0] bg-white px-3.5 py-1.5 shadow-2xs transition hover:border-[#ea580c] hover:text-[#ea580c]">
                <GraduationCap className="h-4 w-4 text-[#ea580c]" /> Coaching
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e2e8f0] bg-white px-3.5 py-1.5 shadow-2xs transition hover:border-[#059669] hover:text-[#059669]">
                <Scale className="h-4 w-4 text-[#059669]" /> Professional Services
              </span>
            </div>
          </div>
        </section>

        {/* ── 4. PROBLEM VS SOLUTION (WITH 'VS' BADGE) ─────────────── */}
        <section className="px-6 py-16 lg:py-20 bg-white border-b border-[#e2e8f0]">
          <div className="mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-[1fr_auto_1fr_1.15fr] gap-5 lg:gap-6 items-stretch">
              
              {/* Left Box: The Old Way (Orange tone) */}
              <div className="flex flex-col justify-between rounded-2xl border border-[#fed7aa] bg-[#fffaf5] p-7 shadow-xs">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#ea580c] block mb-2">
                    THE OLD WAY IS SLOW & EXPENSIVE
                  </span>
                  <h3 className="text-[21px] font-extrabold text-[#0f172a] leading-snug">
                    Building a website shouldn&apos;t become another headache.
                  </h3>
                  <ul className="mt-5 space-y-3 text-[13px] text-[#475569] font-medium">
                    <li className="flex items-start gap-2.5">
                      <span className="text-red-500 font-bold text-sm leading-none shrink-0 mt-0.5">✕</span>
                      <span>Depend on developers for every small change</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-red-500 font-bold text-sm leading-none shrink-0 mt-0.5">✕</span>
                      <span>Long timelines and back-and-forth revisions</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-red-500 font-bold text-sm leading-none shrink-0 mt-0.5">✕</span>
                      <span>High development and maintenance cost</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-red-500 font-bold text-sm leading-none shrink-0 mt-0.5">✕</span>
                      <span>Not built for your business needs</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* VS Center Badge */}
              <div className="hidden lg:flex items-center justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f5f9] text-[#64748b] font-black text-xs border border-[#cbd5e1] shadow-2xs">
                  VS
                </div>
              </div>

              {/* Middle Box: The Webmintra Way (Green tone) */}
              <div className="flex flex-col justify-between rounded-2xl border border-[#a7f3d0] bg-[#f7fdfa] p-7 shadow-xs">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#059669] block mb-2">
                    THE WEBMINTRA WAY
                  </span>
                  <h3 className="text-[21px] font-extrabold text-[#0f172a] leading-snug">
                    Your website, your way.
                  </h3>
                  <ul className="mt-5 space-y-3 text-[13px] text-[#0f172a] font-semibold">
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-[#059669] shrink-0 mt-0.5" />
                      <span>Choose from beautiful templates</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-[#059669] shrink-0 mt-0.5" />
                      <span>Customise everything yourself</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-[#059669] shrink-0 mt-0.5" />
                      <span>Publish in minutes and go live</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-[#059669] shrink-0 mt-0.5" />
                      <span>Update anytime, with no technical skills</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right Side: 3 Horizontal Flow Cards */}
              <div className="flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <span className="text-sm font-extrabold text-[#059669] font-mono">01</span>
                    <span className="text-xs font-bold text-[#0f172a]">Choose Template</span>
                  </div>
                  <div className="h-8 w-14 rounded bg-white border border-[#e2e8f0] overflow-hidden p-1 shadow-xs">
                    <div className="h-2 w-full bg-[#cbd5e1] rounded-xs mb-1" />
                    <div className="h-1.5 w-2/3 bg-[#ea580c] rounded-xs" />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <span className="text-sm font-extrabold text-[#059669] font-mono">02</span>
                    <span className="text-xs font-bold text-[#0f172a]">Customise Content</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#64748b] bg-white px-2.5 py-1 rounded border border-[#e2e8f0] shadow-2xs font-mono">
                    <span className="font-bold text-[#0f172a]">T</span>
                    <span className="italic">B</span>
                    <span className="underline">I</span>
                    <span>🎨</span>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] p-4 shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <span className="text-sm font-extrabold text-[#059669] font-mono">03</span>
                    <span className="text-xs font-bold text-[#0f172a]">Publish & Go Live</span>
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#059669] text-white shadow-xs">
                    <Check className="h-4 w-4" />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── 5. SIMPLE PROCESS (3 CARDS FROM BLANK PAGE) ─────────── */}
        <section className="tiranga-section-subtle px-6 py-16 lg:py-20 border-b border-[#e2e8f0]">
          <div className="mx-auto max-w-6xl">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-[11.5px] font-extrabold uppercase tracking-wider text-[#059669]">
                SIMPLE PROCESS
              </span>
              <h2 className="mt-2 text-[32px] sm:text-[40px] font-extrabold text-[#0f172a] leading-tight">
                From blank page to business-ready website.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#64748b] max-w-lg mx-auto">
                Launch your high-converting business website in three effortless steps.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3 items-stretch">
              
              {/* Card 01: Choose */}
              <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-[#059669]/40 transition-all duration-200">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-black text-[#059669] font-mono">01</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]">
                      <Layers className="h-4 w-4" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-[#0f172a]">Choose</h3>
                  <p className="mt-1.5 text-xs text-[#64748b] leading-relaxed">
                    Pick a professionally designed template tailored for your industry.
                  </p>
                </div>

                {/* Rich visual illustration */}
                <div className="mt-6 aspect-[16/10] rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-2.5 overflow-hidden flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#e2e8f0]">
                    <span className="text-[10px] font-bold text-[#0f172a]">Template Gallery</span>
                    <span className="text-[9px] text-[#059669] font-bold bg-[#ecfdf5] px-1.5 py-0.5 rounded border border-[#a7f3d0]">12+ Ready</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 my-auto">
                    <div className="rounded-lg border border-[#e2e8f0] bg-white p-1.5 shadow-2xs">
                      <div className="h-10 w-full rounded bg-[#fff7ed] overflow-hidden border border-[#fed7aa] relative mb-1">
                        <img
                          src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=200"
                          alt="Dental"
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute bottom-0.5 left-0.5 text-[7px] font-extrabold bg-white/90 px-1 rounded text-[#c2410c]">Dental</span>
                      </div>
                      <div className="h-1.5 w-3/4 bg-[#e2e8f0] rounded" />
                    </div>
                    <div className="rounded-lg border border-[#e2e8f0] bg-white p-1.5 shadow-2xs">
                      <div className="h-10 w-full rounded bg-[#ecfdf5] overflow-hidden border border-[#a7f3d0] relative mb-1">
                        <img
                          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=200"
                          alt="Gym"
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute bottom-0.5 left-0.5 text-[7px] font-extrabold bg-white/90 px-1 rounded text-[#047857]">Gym</span>
                      </div>
                      <div className="h-1.5 w-3/4 bg-[#e2e8f0] rounded" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 02: Customise */}
              <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-[#ea580c]/40 transition-all duration-200">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-black text-[#059669] font-mono">02</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fff7ed] text-[#ea580c] border border-[#fed7aa]">
                      <FileEdit className="h-4 w-4" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-[#0f172a]">Customise</h3>
                  <p className="mt-1.5 text-xs text-[#64748b] leading-relaxed">
                    Update text, images, services and contact details in minutes.
                  </p>
                </div>

                {/* Rich visual illustration */}
                <div className="mt-6 aspect-[16/10] rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-2.5 overflow-hidden flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#e2e8f0]">
                    <span className="text-[10px] font-bold text-[#0f172a]">Visual Editor</span>
                    <span className="text-[9px] text-[#ea580c] font-bold bg-[#fff7ed] px-1.5 py-0.5 rounded border border-[#fed7aa]">● Live</span>
                  </div>
                  <div className="rounded-lg border border-dashed border-[#ea580c] bg-[#fffaf5] p-2 text-center my-auto shadow-2xs">
                    <span className="text-[10px] font-extrabold text-[#0f172a] block">
                      Apex Fitness Indiranagar
                    </span>
                    <span className="text-[8px] text-[#64748b] mt-0.5 block">
                      Click to edit timings, fees & photos
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[8px] font-semibold text-[#64748b]">
                    <span className="font-mono">Font: Plus Jakarta</span>
                    <span className="text-[#059669] font-bold">✓ Auto-Saved</span>
                  </div>
                </div>
              </div>

              {/* Card 03: Publish */}
              <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-[#059669]/40 transition-all duration-200">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-black text-[#059669] font-mono">03</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]">
                      <Zap className="h-4 w-4" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-[#0f172a]">Publish</h3>
                  <p className="mt-1.5 text-xs text-[#64748b] leading-relaxed">
                    Go live instantly with your custom domain & start attracting leads.
                  </p>
                </div>

                {/* Rich visual illustration */}
                <div className="mt-6 aspect-[16/10] rounded-xl border border-[#a7f3d0] bg-[#f7fdfa] p-3 overflow-hidden flex items-center justify-center text-center shadow-2xs">
                  <div>
                    <div className="h-9 w-9 rounded-full bg-[#059669] text-white flex items-center justify-center mx-auto mb-1.5 shadow-sm">
                      <Check className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-extrabold text-[#0f172a] block">
                      Your site is live! 🎉
                    </span>
                    <span className="text-[10px] text-[#059669] font-mono font-bold mt-0.5 inline-block bg-white px-2 py-0.5 rounded border border-[#a7f3d0] shadow-2xs">
                      https://mybusiness.in
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── 6. TEMPLATES SECTION (3D BROWSER MOCKUP CARDS) ───────── */}
        <section id="templates" className="px-6 py-16 lg:py-20 bg-white border-b border-[#e2e8f0]">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <span className="text-[11.5px] font-extrabold uppercase tracking-wider text-[#059669]">
                  BEAUTIFUL TEMPLATES
                </span>
                <h2 className="mt-2 text-[32px] sm:text-[38px] font-extrabold text-[#0f172a] leading-tight">
                  Designed for every type of business
                </h2>
                <p className="mt-2 text-sm text-[#64748b] max-w-xl">
                  Pick a ready-to-launch website layout tailored with industry-specific sections, appointment forms & WhatsApp routing.
                </p>
              </div>
              <Link
                to="/templates"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059669] hover:text-[#047857] hover:underline"
              >
                View all templates <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              {templatesToDisplay.map((t: any) => (
                <div
                  key={t.id || t._id}
                  onClick={() => setPreviewTemplate(t)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setPreviewTemplate(t);
                    }
                  }}
                  className="landing-template-card group cursor-pointer p-2.5 flex flex-col justify-between"
                >
                  {/* Miniature Browser Chrome */}
                  <div className="landing-mini-browser aspect-[4/3] relative">
                    <div className="h-4 bg-[#f1f5f9] border-b border-[#e2e8f0] px-2 flex items-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
                      <div className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
                      <div className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
                    </div>

                    <div className="h-[calc(100%-16px)] w-full overflow-hidden relative">
                      <img
                        src={
                          t.thumbnailUrl ||
                          "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=600"
                        }
                        alt={t.title}
                        className="h-full w-full object-cover group-hover:scale-108 transition-transform duration-300"
                      />
                      
                      {/* Category Tag */}
                      <span className="absolute top-1.5 left-1.5 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[8px] font-bold text-white shadow-xs">
                        {t.category || "General"}
                      </span>

                      {/* Live Preview Button Hover Overlay */}
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <span className="rounded-lg bg-[#059669] px-2.5 py-1 text-[10px] font-extrabold text-white shadow-lg flex items-center gap-1">
                          Preview <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Label & Subtitle */}
                  <div className="pt-3 pb-1 px-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold text-[#0f172a] group-hover:text-[#059669] transition block">
                        {t.title}
                      </span>
                      <span className="text-[9px] font-bold text-amber-600 flex items-center gap-0.5">
                        ⭐ 4.9
                      </span>
                    </div>
                    <span className="text-[11px] text-[#64748b] block mt-0.5 line-clamp-1">
                      {t.subtitle || "Full Website Template"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. POWERFUL FEATURES STRIP (3D TACTILE CARDS) ─────────── */}
        <section
          id="product"
          className="tiranga-section-subtle py-16 lg:py-20 border-b border-[#e2e8f0] relative overflow-hidden"
        >
          <div className="mx-auto max-w-7xl px-6 relative z-10">
            <div className="mb-12 text-center max-w-2xl mx-auto">
              <span className="text-[11.5px] font-extrabold uppercase tracking-wider text-[#059669]">
                POWERFUL FEATURES
              </span>
              <h2 className="mt-2 text-[30px] sm:text-[38px] font-extrabold text-[#0f172a] leading-tight">
                Everything you need to grow online
              </h2>
              <p className="mt-2 text-sm text-[#64748b]">
                Enterprise-grade technology built specifically for Indian businesses.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-5">
              
              {/* Feature 1: Mobile */}
              <div className="landing-feature-card p-5 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff7ed] text-[#ea580c] border border-[#fed7aa] shadow-2xs">
                      <PhoneIcon className="h-5 w-5" />
                    </div>
                    <span className="text-[9px] font-bold bg-[#fff7ed] text-[#c2410c] px-2 py-0.5 rounded-full border border-[#fed7aa]">
                      100% Score
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#0f172a]">Mobile Responsive</h4>
                  <p className="mt-1 text-xs text-[#64748b] leading-relaxed">
                    Looks flawless on iPhones, Androids, tablets, and desktops automatically.
                  </p>
                </div>
                <div className="pt-2 border-t border-[#f1f5f9] text-[10px] font-semibold text-[#ea580c]">
                  Fluid Touch UI →
                </div>
              </div>

              {/* Feature 2: SEO */}
              <div className="landing-feature-card p-5 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff7ed] text-[#ea580c] border border-[#fed7aa] shadow-2xs">
                      <Search className="h-5 w-5" />
                    </div>
                    <span className="text-[9px] font-bold bg-[#fff7ed] text-[#c2410c] px-2 py-0.5 rounded-full border border-[#fed7aa]">
                      Google Ready
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#0f172a]">SEO Optimized</h4>
                  <p className="mt-1 text-xs text-[#64748b] leading-relaxed">
                    Auto-generated meta tags, sitemaps, and local Schema to rank higher.
                  </p>
                </div>
                <div className="pt-2 border-t border-[#f1f5f9] text-[10px] font-semibold text-[#ea580c]">
                  Rank on Maps →
                </div>
              </div>

              {/* Feature 3: Speed */}
              <div className="landing-feature-card p-5 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff7ed] text-[#ea580c] border border-[#fed7aa] shadow-2xs">
                      <Zap className="h-5 w-5" />
                    </div>
                    <span className="text-[9px] font-bold bg-[#fff7ed] text-[#c2410c] px-2 py-0.5 rounded-full border border-[#fed7aa]">
                      0.4s Fast
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#0f172a]">Lightning Fast</h4>
                  <p className="mt-1 text-xs text-[#64748b] leading-relaxed">
                    Hosted on Mumbai & Delhi Edge CDN servers for ultra-fast local speeds.
                  </p>
                </div>
                <div className="pt-2 border-t border-[#f1f5f9] text-[10px] font-semibold text-[#ea580c]">
                  99 PageSpeed →
                </div>
              </div>

              {/* Feature 4: Security */}
              <div className="landing-feature-card p-5 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff7ed] text-[#ea580c] border border-[#fed7aa] shadow-2xs">
                      <Lock className="h-5 w-5" />
                    </div>
                    <span className="text-[9px] font-bold bg-[#ecfdf5] text-[#047857] px-2 py-0.5 rounded-full border border-[#a7f3d0]">
                      256-Bit SSL
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#0f172a]">Secure & Reliable</h4>
                  <p className="mt-1 text-xs text-[#64748b] leading-relaxed">
                    Free automated SSL certificates and daily cloud data backups.
                  </p>
                </div>
                <div className="pt-2 border-t border-[#f1f5f9] text-[10px] font-semibold text-[#059669]">
                  99.9% Uptime →
                </div>
              </div>

              {/* Feature 5: Made in India */}
              <div className="landing-feature-card p-5 space-y-3 flex flex-col justify-between border-[#a7f3d0] bg-[#f7fdfa]">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] shadow-2xs">
                      <span className="text-base">🇮🇳</span>
                    </div>
                    <span className="text-[9px] font-bold bg-[#ecfdf5] text-[#047857] px-2 py-0.5 rounded-full border border-[#a7f3d0]">
                      Local Support
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#0f172a]">Made in India</h4>
                  <p className="mt-1 text-xs text-[#64748b] leading-relaxed">
                    WhatsApp lead capture, UPI readiness, and GST invoices built-in.
                  </p>
                </div>
                <div className="pt-2 border-t border-[#e2e8f0] text-[10px] font-semibold text-[#059669]">
                  WhatsApp Ready →
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── 8. PRICING SECTION (STARTER ₹199 / GROWTH ₹349) ──────── */}
        <section id="pricing" className="px-6 py-16 lg:py-20 bg-white border-b border-[#e2e8f0]">
          <div className="mx-auto max-w-4xl text-center">
            <span className="text-[11.5px] font-extrabold uppercase tracking-wider text-[#059669]">
              SIMPLE, PREDICTABLE PRICING
            </span>
            <h2 className="mt-2 text-[30px] sm:text-[38px] font-extrabold text-[#0f172a]">
              Plans that grow with your business
            </h2>
            <p className="mt-2 text-sm text-[#64748b]">
              Transparent pricing with no hidden charges. All prices in Indian Rupees (₹).
            </p>

            {/* Toggle */}
            <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-[#e2e8f0] bg-[#f8fafc] p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`rounded-full px-4 py-1 text-xs font-bold transition ${
                  billingCycle === "monthly"
                    ? "bg-[#059669] text-white shadow-sm"
                    : "text-[#64748b] hover:text-[#0f172a]"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`rounded-full px-4 py-1 text-xs font-bold transition ${
                  billingCycle === "yearly"
                    ? "bg-[#059669] text-white shadow-sm"
                    : "text-[#64748b] hover:text-[#0f172a]"
                }`}
              >
                Yearly (Save 20%)
              </button>
            </div>

            {/* 2 Main Cards Grid */}
            <div className="mt-10 grid gap-6 md:grid-cols-2 max-w-2xl mx-auto text-left">
              {/* Starter Plan */}
              <div className="rounded-2xl border border-[#e2e8f0] bg-[#fafcfb] p-7 shadow-sm flex flex-col justify-between hover:border-[#cbd5e1] hover:shadow-md transition">
                <div>
                  <h3 className="text-lg font-bold text-[#0f172a]">Starter</h3>
                  <p className="text-xs text-[#64748b] mt-0.5">Ideal for single-location shops & clinics.</p>

                  <div className="my-5">
                    <span className="text-4xl font-extrabold text-[#0f172a]">
                      ₹{billingCycle === "yearly" ? "159" : "199"}
                    </span>
                    <span className="text-xs text-[#64748b]">/month</span>
                  </div>

                  <ul className="space-y-2.5 text-xs font-medium text-[#475569] mb-7">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#059669]" /> 1 Website + Custom .in Domain
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#059669]" /> Direct WhatsApp Lead Alerts
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#059669]" /> 5 GB High-Speed Edge Storage
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#059669]" /> Free Automated SSL Certificate
                    </li>
                  </ul>
                </div>

                <Link
                  to={primaryRoute}
                  className="w-full flex items-center justify-center rounded-lg border border-[#cbd5e1] bg-white py-2.5 text-xs font-bold text-[#0f172a] shadow-xs hover:bg-[#f8fafc]"
                >
                  Start Free 14-Day Trial
                </Link>
              </div>

              {/* Growth Plan (Most Popular) */}
              <div className="relative rounded-2xl border-2 border-[#ea580c] bg-white p-7 shadow-xl flex flex-col justify-between">
                <div className="absolute -top-3 right-6 rounded-md bg-[#ea580c] px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                  MOST POPULAR
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[#0f172a]">Growth</h3>
                  <p className="text-xs text-[#64748b] mt-0.5">Best for multi-service businesses & agencies.</p>

                  <div className="my-5">
                    <span className="text-4xl font-extrabold text-[#0f172a]">
                      ₹{billingCycle === "yearly" ? "279" : "349"}
                    </span>
                    <span className="text-xs text-[#64748b]">/month</span>
                  </div>

                  <ul className="space-y-2.5 text-xs font-semibold text-[#0f172a] mb-7">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#059669]" /> 5 Websites + Custom .in / .com Domains
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#059669]" /> Unlimited WhatsApp & Email Leads
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#059669]" /> 20 GB Edge SSD Storage
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#059669]" /> Google Search Console & SEO Tools
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#059669]" /> Priority 24/7 WhatsApp & Phone Support
                    </li>
                  </ul>
                </div>

                <Link
                  to={primaryRoute}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#059669] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#047857]"
                >
                  Start Free 14-Day Trial →
                </Link>
              </div>
            </div>

            {/* Indian Payments & Invoicing Strip */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[12px] font-medium text-[#64748b]">
              <span className="flex items-center gap-1.5">
                <span className="font-bold text-[#0f172a]">⚡ Supported Payments:</span> UPI (GPay, PhonePe, Paytm), RuPay, NetBanking & Cards
              </span>
              <span className="flex items-center gap-1 text-[#059669] font-bold">
                🧾 100% GST Invoice with Input Tax Credit (ITC)
              </span>
            </div>
          </div>
        </section>

        {/* ── 9. TESTIMONIALS SECTION ──────────────────────────────── */}
        <section className="tiranga-section-subtle px-6 py-16 lg:py-20 border-b border-[#e2e8f0]">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center sm:text-left">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#059669]">
                LOVED BY BUSINESS OWNERS
              </span>
              <h2 className="mt-2 text-[28px] sm:text-[36px] font-extrabold text-[#0f172a]">
                See what our customers say
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {testimonialsToDisplay.map((t: any, idx: number) => (
                <div
                  key={t.id || idx}
                  className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition"
                >
                  <p className="text-[13px] text-[#475569] leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </p>

                  <div className="mt-5 pt-4 border-t border-[#f1f5f9] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={t.avatarUrl}
                        alt={t.authorName}
                        className="h-9 w-9 rounded-full object-cover border border-[#e2e8f0]"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-[#0f172a]">{t.authorName}</h4>
                        <p className="text-[11px] text-[#64748b]">{t.roleOrTitle}</p>
                      </div>
                    </div>

                    <div className="flex text-amber-500 gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 10. FAQ SECTION (HAVE QUESTIONS?) ────────────────────── */}
        <section id="faq" className="px-6 py-16 lg:py-20 bg-white border-b border-[#e2e8f0]">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-10">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#059669]">
                HAVE QUESTIONS?
              </span>
              <h2 className="mt-2 text-[28px] sm:text-[36px] font-extrabold text-[#0f172a]">
                Everything you need to know.
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Left Column */}
              <div className="space-y-3">
                <details className="group rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-2xs">
                  <summary className="landing-faq-summary flex cursor-pointer items-center justify-between text-xs font-bold text-[#0f172a]">
                    <span>Do I need any coding skills?</span>
                    <Plus className="h-3.5 w-3.5 text-[#64748b] transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="mt-2 text-xs text-[#64748b] leading-relaxed">
                    Zero coding or technical knowledge required. You can edit any text, image,
                    price, or button just by clicking on it.
                  </p>
                </details>

                <details className="group rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-2xs">
                  <summary className="landing-faq-summary flex cursor-pointer items-center justify-between text-xs font-bold text-[#0f172a]">
                    <span>Can I use my own domain name?</span>
                    <Plus className="h-3.5 w-3.5 text-[#64748b] transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="mt-2 text-xs text-[#64748b] leading-relaxed">
                    Yes! You can connect any custom .in, .com, or .org domain with 1-click DNS
                    connection.
                  </p>
                </details>

                <details className="group rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-2xs">
                  <summary className="landing-faq-summary flex cursor-pointer items-center justify-between text-xs font-bold text-[#0f172a]">
                    <span>Is hosting included?</span>
                    <Plus className="h-3.5 w-3.5 text-[#64748b] transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="mt-2 text-xs text-[#64748b] leading-relaxed">
                    Yes, high-speed managed cloud hosting with automated SSL encryption and daily
                    backups is included in every plan.
                  </p>
                </details>
              </div>

              {/* Right Column */}
              <div className="space-y-3">
                <details className="group rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-2xs">
                  <summary className="landing-faq-summary flex cursor-pointer items-center justify-between text-xs font-bold text-[#0f172a]">
                    <span>Can I change my template later?</span>
                    <Plus className="h-3.5 w-3.5 text-[#64748b] transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="mt-2 text-xs text-[#64748b] leading-relaxed">
                    Yes, you can switch or customize your template layout at any point from your
                    dashboard.
                  </p>
                </details>

                <details className="group rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-2xs">
                  <summary className="landing-faq-summary flex cursor-pointer items-center justify-between text-xs font-bold text-[#0f172a]">
                    <span>Will my website work on mobile devices?</span>
                    <Plus className="h-3.5 w-3.5 text-[#64748b] transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="mt-2 text-xs text-[#64748b] leading-relaxed">
                    Every Webmintra template is 100% mobile-responsive and loads fast on smartphones
                    and tablets.
                  </p>
                </details>

                <details className="group rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-2xs">
                  <summary className="landing-faq-summary flex cursor-pointer items-center justify-between text-xs font-bold text-[#0f172a]">
                    <span>Do you offer customer support?</span>
                    <Plus className="h-3.5 w-3.5 text-[#64748b] transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="mt-2 text-xs text-[#64748b] leading-relaxed">
                    Yes, our dedicated support team is available via WhatsApp, email, and live help
                    center guides.
                  </p>
                </details>
              </div>
            </div>
          </div>
        </section>

        {/* ── 11. FINAL CONVERSION BANNER (MATCHING IMAGE) ─────────── */}
        <section className="px-6 py-16 lg:py-20 bg-white">
          <div className="mx-auto max-w-6xl rounded-2xl bg-[#0b192c] p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden">
            {/* Saffron & Green Decorative Waves */}
            <div className="pointer-events-none absolute -top-10 -left-10 h-64 w-64 rounded-full bg-[#ea580c]/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -right-10 h-64 w-64 rounded-full bg-[#059669]/25 blur-3xl" />

            <div className="relative z-10 grid lg:grid-cols-[1fr_1.1fr] gap-8 items-center">
              {/* Left Content */}
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#ea580c] block mb-2">
                  GET STARTED TODAY
                </span>
                <h2 className="text-[32px] sm:text-[42px] font-extrabold leading-tight text-white">
                  Your business is ready for a better website.
                </h2>
                <p className="mt-3 text-sm text-slate-300">
                  Launch your professional website in minutes.
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-3.5">
                  <Link
                    to={primaryRoute}
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-[#ea580c] px-6 text-xs font-bold text-white shadow-md hover:bg-[#c2410c] transition"
                  >
                    Create Your Website
                  </Link>
                  <a
                    href="#templates"
                    className="inline-flex h-11 items-center justify-center rounded-lg border border-white/20 bg-white/5 px-5 text-xs font-semibold text-white hover:bg-white/10 transition"
                  >
                    Explore Templates
                  </a>
                </div>
              </div>

              {/* Right Mockup Display */}
              <div className="relative flex items-center justify-center lg:justify-end">
                {/* Laptop Mockup Box */}
                <div className="relative w-full max-w-sm rounded-xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden aspect-[16/10]">
                  <div className="h-4 bg-slate-800 flex items-center px-2 gap-1 border-b border-slate-700">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <img
                    src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=600"
                    alt="Laptop screen"
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Overlapping Mobile Mockup */}
                <div className="absolute -bottom-3 right-2 sm:right-8 w-26 rounded-xl bg-slate-950 border-2 border-slate-700 shadow-2xl overflow-hidden aspect-[9/16] hidden sm:block">
                  <img
                    src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=400"
                    alt="Mobile screen"
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Overlapping Floating Visitor Stat Pill */}
                <div className="absolute -bottom-2 -left-2 sm:left-2 rounded-lg bg-white p-2.5 shadow-xl border border-[#e2e8f0] text-[#0f172a] text-[10px] flex items-center gap-3">
                  <div>
                    <span className="text-[#64748b] block font-medium">Visitors</span>
                    <span className="font-extrabold text-sm text-[#0f172a]">1,420</span>
                  </div>
                  <div className="flex items-center gap-1 font-bold text-[#059669] bg-[#ecfdf5] px-1.5 py-0.5 rounded">
                    <TrendingUp className="h-3 w-3" /> +28%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── 12. FOOTER (5 DISTINCT BALANCED COLUMNS + SUB-FOOTER) ── */}
      <footer className="border-t border-[#e2e8f0] bg-white pt-14 pb-10 text-[#475569]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            
            {/* Brand column (2 spans on desktop) */}
            <div className="lg:col-span-2 pr-4 space-y-4">
              <a href="#top" className="flex items-center gap-2">
                <div className="relative flex h-7 w-7 items-center justify-center">
                  <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
                    <path
                      d="M4 8L10 24L16 12L22 24L28 8"
                      stroke="#ea580c"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="16" cy="24" r="3" fill="#059669" />
                  </svg>
                </div>
                <span className="text-xl font-black tracking-tight text-[#0f172a] lowercase">
                  {isMounted ? siteName : "webmintra"}
                </span>
              </a>
              <p className="text-xs leading-relaxed text-[#64748b] max-w-sm">
                Empowering Indian business owners, doctors, consultants, and creators to launch fast, beautiful websites without writing a single line of code.
              </p>

              {/* Made in India badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-[#a7f3d0] bg-[#ecfdf5] px-3 py-1 text-[11px] font-bold text-[#047857]">
                <span>🇮🇳</span>
                <span>Crafted in India · Edge CDN Mumbai & Delhi</span>
              </div>

              {/* Social SVG Icons */}
              <div className="flex items-center gap-2.5 pt-1">
                {/* Facebook */}
                <a
                  href="#"
                  aria-label="Facebook"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f8fafc] text-[#64748b] transition hover:border-[#ea580c] hover:bg-[#fff7ed] hover:text-[#ea580c]"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                {/* Instagram */}
                <a
                  href="#"
                  aria-label="Instagram"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f8fafc] text-[#64748b] transition hover:border-[#ea580c] hover:bg-[#fff7ed] hover:text-[#ea580c]"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                {/* LinkedIn */}
                <a
                  href="#"
                  aria-label="LinkedIn"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f8fafc] text-[#64748b] transition hover:border-[#059669] hover:bg-[#ecfdf5] hover:text-[#059669]"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
                {/* YouTube */}
                <a
                  href="#"
                  aria-label="YouTube"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f8fafc] text-[#64748b] transition hover:border-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Column 2: PRODUCT */}
            <div>
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#0f172a] mb-4">
                Product
              </h4>
              <ul className="space-y-2.5 text-xs font-semibold text-[#475569]">
                <li>
                  <a href="#product" className="transition hover:text-[#059669]">
                    Website Builder
                  </a>
                </li>
                <li>
                  <Link to="/templates" className="transition hover:text-[#059669]">
                    Templates Gallery
                  </Link>
                </li>
                <li>
                  <a href="#product" className="transition hover:text-[#059669]">
                    Features & Tools
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="transition hover:text-[#059669]">
                    Pricing Plans
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="transition hover:text-[#059669]">
                    Custom Domains
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: SOLUTIONS */}
            <div>
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#0f172a] mb-4">
                Solutions
              </h4>
              <ul className="space-y-2.5 text-xs font-semibold text-[#475569]">
                <li>
                  <a href="#solutions" className="transition hover:text-[#059669]">
                    For Clinics & Doctors
                  </a>
                </li>
                <li>
                  <a href="#solutions" className="transition hover:text-[#059669]">
                    For Gyms & Fitness
                  </a>
                </li>
                <li>
                  <a href="#solutions" className="transition hover:text-[#059669]">
                    For Restaurants & Cafes
                  </a>
                </li>
                <li>
                  <a href="#solutions" className="transition hover:text-[#059669]">
                    For Salons & Spas
                  </a>
                </li>
                <li>
                  <a href="#solutions" className="transition hover:text-[#059669]">
                    For CAs & Consultants
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4: RESOURCES */}
            <div>
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#0f172a] mb-4">
                Resources
              </h4>
              <ul className="space-y-2.5 text-xs font-semibold text-[#475569]">
                <li>
                  <Link to="/help" className="transition hover:text-[#059669]">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link to="/blog" className="transition hover:text-[#059669]">
                    Business Blog
                  </Link>
                </li>
                <li>
                  <Link to="/help" className="transition hover:text-[#059669]">
                    Setup Guides
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="transition hover:text-[#059669]">
                    Contact Support
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 5: COMPANY */}
            <div>
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#0f172a] mb-4">
                Company
              </h4>
              <ul className="space-y-2.5 text-xs font-semibold text-[#475569]">
                <li>
                  <Link to="/help" className="transition hover:text-[#059669]">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link to="/privacy-policy" className="transition hover:text-[#059669]">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms-and-conditions" className="transition hover:text-[#059669]">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/help" className="transition hover:text-[#059669]">
                    GST & Invoicing
                  </Link>
                </li>
              </ul>
            </div>

          </div>

          {/* Sub-Footer Bottom Bar */}
          <div className="mt-12 pt-6 border-t border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11.5px] text-[#64748b]">
            <p>
              © {new Date().getFullYear()} {isMounted ? siteName : "Webmintra"}. All rights reserved.
            </p>
            <div className="flex items-center gap-5 font-medium">
              <Link to="/privacy-policy" className="hover:text-[#0f172a]">Privacy</Link>
              <span>·</span>
              <Link to="/terms-and-conditions" className="hover:text-[#0f172a]">Terms</Link>
              <span>·</span>
              <Link to="/contact" className="hover:text-[#0f172a]">Support</Link>
              <span>·</span>
              <span className="text-[#059669] font-bold">100% Data Stored in India 🇮🇳</span>
            </div>
          </div>

        </div>
      </footer>

      {/* ── 13. QUICK PREVIEW MODAL ──────────────────────────────── */}
      {previewTemplate && (
        <div className="landing-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-preview-title"
            className="w-full max-w-3xl rounded-xl bg-white shadow-2xl overflow-hidden border border-[#e2e8f0]"
          >
            <div className="flex items-center justify-between border-b border-[#e2e8f0] px-5 py-3.5">
              <div>
                <h3 id="template-preview-title" className="text-sm font-bold text-[#0f172a]">
                  {previewTemplate.title}
                </h3>
                <span className="text-[11px] text-[#64748b]">
                  {previewTemplate.category || "Business"} Template
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                aria-label="Close template preview"
                className="landing-icon-button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="aspect-[16/10] bg-[#f8fafc] overflow-hidden">
              <img
                src={previewTemplate.thumbnailUrl}
                alt={previewTemplate.title}
                className="h-full w-full object-cover object-top"
              />
            </div>
            <div className="flex items-center justify-between border-t border-[#e2e8f0] bg-[#fafcfb] px-5 py-3.5">
              <p className="text-xs text-[#475569]">
                Professional, mobile-responsive template with built-in appointment & inquiry forms.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="rounded-md border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0f172a]"
                >
                  Close
                </button>
                <Link
                  to={primaryRoute}
                  className="rounded-md bg-[#059669] px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#047857]"
                >
                  Use This Template
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

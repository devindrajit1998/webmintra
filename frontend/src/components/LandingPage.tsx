import { 
  ArrowRight, Check, ChevronRight, Eye, FileUp, MonitorSmartphone, MousePointer2, ShieldCheck, Sparkles, 
  Play, CheckCircle2, Building2, Stethoscope, Briefcase, Scissors, Utensils, GraduationCap, PartyPopper, 
  MoreHorizontal, Star, FileEdit, Smartphone, Globe, Mail, Search, Zap, History, Image as ImageIcon,
  ChevronDown
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAuthenticatedUser, routeForRole, type SessionUser } from "@/lib/auth-api";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/public-api";

export function LandingPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const { data: settings = {} } = useQuery({
    queryKey: ["publicSettings"],
    queryFn: getPublicSettings,
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
      <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#07111f]/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <a href="#top" className="flex items-center gap-3 font-display text-lg font-bold text-white transition hover:opacity-80">
            {isMounted && logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-10 w-10 rounded-xl object-contain shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#06b6d4] text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                <span className="font-bold">{(isMounted ? siteName : "WebMintra").charAt(0)}</span>
              </span>
            )}
            {isMounted ? siteName : "WebMintra"}
          </a>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
            <a className="transition hover:text-white" href="#how-it-works">How it works</a>
            <a className="transition hover:text-white" href="#features">Features</a>
            <a className="transition hover:text-white" href="#templates">Templates</a>
            <a className="transition hover:text-white" href="#pricing">Pricing</a>
            <a className="transition hover:text-white" href="#questions">Questions</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link to={user ? routeForRole(user.role) : "/sign-in"} className="hidden text-sm font-semibold text-slate-300 transition hover:text-white sm:block">
              Sign in
            </Link>
            <Link to={primaryRoute} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#06b6d4] px-6 text-sm font-bold text-[#083344] shadow-[0_0_20px_rgba(6,182,212,0.3)] transition hover:bg-[#22d3ee] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]">
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main id="top" className="pt-32">
        {/* Hero Section */}
        <section className="relative px-6 pb-24 lg:pb-32">
          {/* Ambient background glows */}
          <div className="pointer-events-none absolute left-1/2 top-0 -z-10 -translate-x-1/2 opacity-30 blur-[120px]">
            <div className="h-[400px] w-[800px] rounded-full bg-gradient-to-r from-[#06b6d4] to-emerald-500" />
          </div>

          <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.1fr_1fr]">
            <div className="max-w-2xl">
              <div className="mb-8 flex items-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#06b6d4]/30 bg-[#06b6d4]/10 px-4 py-1.5 text-xs font-bold text-[#06b6d4] backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5" /> Website made easy for every business
                </span>
              </div>
              <h1 className="font-display text-5xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-[4rem]">
                Launch your business website. <br />
                <span className="bg-gradient-to-r from-[#06b6d4] to-teal-400 bg-clip-text text-transparent">Update it yourself.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-400">
                Choose a ready-made website, customize your content, connect your domain, and keep your business online — without a developer.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link to={primaryRoute} className="inline-flex h-14 items-center gap-2 rounded-full bg-[#06b6d4] px-8 text-base font-bold text-[#083344] shadow-[0_0_20px_rgba(6,182,212,0.3)] transition hover:bg-[#22d3ee] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]">
                  Create my website <ArrowRight className="h-5 w-5" />
                </Link>
                <a href="#how-it-works" className="inline-flex h-14 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 text-base font-bold text-white backdrop-blur-sm transition hover:bg-white/10">
                  See how it works <Play className="h-4 w-4 fill-current" />
                </a>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-400">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#06b6d4]" /> No coding</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#06b6d4]" /> No credit card</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#06b6d4]" /> Cancel anytime</span>
              </div>
            </div>
            
            {/* Editor Mockup */}
            <div className="relative w-full rounded-2xl border border-white/10 bg-[#0c1827] p-2 shadow-2xl lg:ml-10">
              <div className="flex h-12 items-center justify-between border-b border-white/5 px-4">
                <div className="flex gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="hidden sm:flex h-7 items-center justify-center rounded-md bg-white/5 px-6 text-xs text-slate-400">Your Website</div>
                <div className="hidden lg:flex gap-4 text-xs font-semibold text-slate-300">
                  <span className="border-b-2 border-[#06b6d4] pb-1 text-[#06b6d4]">Home</span>
                  <span>About</span>
                  <span>Services</span>
                  <span>Contact</span>
                </div>
                <button className="flex h-7 items-center gap-1.5 rounded bg-[#06b6d4]/20 px-3 text-[10px] font-bold text-[#06b6d4]">
                  <FileEdit className="h-3 w-3" /> Edit
                </button>
              </div>
              <div className="relative grid grid-cols-1 md:grid-cols-[1fr_260px] gap-2 p-2">
                <div className="relative h-[400px] overflow-hidden rounded-xl border border-white/5 bg-slate-900">
                  <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80" alt="Website preview" className="absolute inset-0 h-full w-full object-cover opacity-50" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                    <div className="relative rounded-lg border-2 border-dashed border-[#06b6d4] bg-[#06b6d4]/10 p-6 backdrop-blur-sm">
                      <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 gap-1 rounded bg-[#06b6d4] px-2 py-0.5 text-[10px] font-bold text-[#083344]">
                        <span>Edit</span>
                        <div className="ml-1 flex gap-1 border-l border-[#083344]/20 pl-1">
                          <span className="font-serif">B</span>
                          <span className="italic">I</span>
                          <span className="underline">U</span>
                        </div>
                      </div>
                      <h2 className="font-display text-4xl font-bold text-white">Grow your business<br />with confidence</h2>
                    </div>
                    <p className="mt-6 max-w-md text-slate-300">We help you build a strong online presence and attract more customers.</p>
                    <button className="mt-8 rounded-md bg-[#06b6d4] px-6 py-2.5 text-sm font-bold text-[#083344]">Learn More</button>
                  </div>
                </div>
                
                {/* Editor Sidebar */}
                <div className="hidden md:flex h-full flex-col rounded-xl border border-white/5 bg-[#111e2f] p-4">
                  <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Edit Content</p>
                  
                  <div className="mb-4">
                    <label className="mb-1.5 block text-[10px] font-medium text-slate-500">Heading</label>
                    <textarea 
                      className="h-20 w-full resize-none rounded-lg border border-white/10 bg-black/20 p-2.5 text-xs text-white outline-none focus:border-[#06b6d4]" 
                      defaultValue="Grow your business with confidence"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="mb-1.5 block text-[10px] font-medium text-slate-500">Text</label>
                    <textarea 
                      className="h-24 w-full resize-none rounded-lg border border-white/10 bg-black/20 p-2.5 text-xs text-slate-300 outline-none focus:border-[#06b6d4]" 
                      defaultValue="We help you build a strong online presence and attract more customers."
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label className="mb-1.5 block text-[10px] font-medium text-slate-500">Button Text</label>
                    <input 
                      type="text" 
                      className="h-9 w-full rounded-lg border border-white/10 bg-black/20 px-2.5 text-xs text-white outline-none focus:border-[#06b6d4]" 
                      defaultValue="Learn More"
                    />
                  </div>
                  
                  <button className="mt-auto w-full rounded-lg bg-[#06b6d4] py-2.5 text-xs font-bold text-[#083344] hover:bg-[#22d3ee]">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trusted By Strip */}
        <div className="border-y border-white/5 bg-[#0a1523] py-8">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <p className="mb-6 text-sm font-medium text-slate-400">Trusted by 500+ businesses across India</p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 text-slate-500">
              <span className="flex items-center gap-2"><Building2 className="h-5 w-5 text-[#06b6d4]" /> Gym</span>
              <span className="flex items-center gap-2"><Stethoscope className="h-5 w-5 text-[#06b6d4]" /> Clinics</span>
              <span className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-[#06b6d4]" /> CA Firms</span>
              <span className="flex items-center gap-2"><Scissors className="h-5 w-5 text-[#06b6d4]" /> Salons</span>
              <span className="flex items-center gap-2"><Utensils className="h-5 w-5 text-[#06b6d4]" /> Restaurants</span>
              <span className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-[#06b6d4]" /> Coaching</span>
              <span className="flex items-center gap-2"><PartyPopper className="h-5 w-5 text-[#06b6d4]" /> Events</span>
              <span className="flex items-center gap-2"><MoreHorizontal className="h-5 w-5" /> And more...</span>
            </div>
          </div>
        </div>

        {/* How It Works (Steps) */}
        <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-24 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-[1fr_2.5fr]">
            <div>
              <p className="mb-3 text-sm font-bold text-[#06b6d4]">How it works</p>
              <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">Three simple steps to your website, all by yourself.</h2>
            </div>
            
            <div className="flex flex-col gap-6 md:flex-row relative">
              {/* Connector lines (desktop) */}
              <div className="absolute top-[4.5rem] hidden w-[calc(100%-80px)] -translate-y-1/2 border-t-2 border-dashed border-white/10 md:block lg:w-[calc(100%-120px)]" />
              
              <StepCard 
                number="01" 
                icon={Building2} 
                title="Choose your website" 
                desc="Pick a professional website template that fits your business and industry." 
              />
              <StepCard 
                number="02" 
                icon={FileEdit} 
                title="Make it yours" 
                desc="Add your business details, images, services and content. Preview every change." 
              />
              <StepCard 
                number="03" 
                icon={Zap} 
                title="Publish and grow" 
                desc="Connect your domain and go live. Update your website anytime you need to." 
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="border-t border-white/5 bg-[#0a1523] px-6 py-24 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16">
              <p className="mb-3 text-sm font-bold text-[#06b6d4]">Everything you need</p>
              <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">Powerful features, <br />built for your success.</h2>
            </div>
            
            <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
              <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
                <Feature icon={FileEdit} title="Easy Content Editing" desc="Edit text, images, buttons, and pages with a simple click." />
                <Feature icon={Smartphone} title="Mobile Responsive" desc="Your website looks perfect on all devices automatically." />
                <Feature icon={Globe} title="Custom Domain" desc="Connect your own domain and build your brand." />
                <Feature icon={Mail} title="Enquiry & Contact Forms" desc="Collect leads and enquiries directly from your website." />
                <Feature icon={Search} title="SEO Friendly" desc="Built with clean code and best practices for better Google ranking." />
                <Feature icon={ShieldCheck} title="Secure & Fast Hosting" desc="Reliable hosting with SSL certificate and daily backups." />
                <Feature icon={History} title="Version History" desc="See previous versions and restore anytime you want." />
                <Feature icon={ImageIcon} title="Media Library" desc="Upload, manage and reuse images and files easily." />
              </div>
              
              {/* Mobile Editor Mockup Component */}
              <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-[#111e2f] to-[#07111f] p-8 pb-0 text-center shadow-2xl">
                <div className="absolute right-12 top-16 hidden md:block">
                  <svg width="80" height="120" fill="none" viewBox="0 0 100 150" className="text-[#06b6d4]/40">
                    <path stroke="currentColor" strokeDasharray="4 4" strokeWidth="2" d="M10,10 C50,20 90,60 90,130" />
                    <polygon fill="currentColor" points="85,125 95,125 90,135" />
                  </svg>
                </div>
                <h3 className="mb-4 font-display text-2xl font-bold text-white">Update anytime, <br/>from anywhere.</h3>
                <p className="mx-auto mb-10 max-w-xs text-sm text-slate-400">Use WebMintra on your computer, tablet or phone. Your website, always in your control.</p>
                
                <div className="mx-auto h-[400px] w-[220px] rounded-t-3xl border-x-[6px] border-t-[6px] border-black bg-black shadow-2xl">
                  <div className="h-full w-full overflow-hidden rounded-t-[18px] bg-[#0c1827]">
                    <div className="flex items-center justify-between bg-[#111e2f] px-3 py-2">
                      <div className="h-4 w-4 rounded bg-[#06b6d4]/20" />
                      <div className="text-[10px] font-medium text-white">{siteName} Editor</div>
                      <div className="h-4 w-4 rounded bg-white/10" />
                    </div>
                    <div className="relative h-40 bg-slate-800">
                      <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80" alt="Mobile preview" className="absolute inset-0 h-full w-full object-cover opacity-50" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 p-4 text-center">
                         <div className="relative rounded border border-dashed border-[#06b6d4] bg-[#06b6d4]/20 p-2">
                           <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded bg-[#06b6d4] px-1 text-[8px] font-bold text-[#083344]">Edit</div>
                           <h2 className="text-xl font-bold text-white">Grow your business</h2>
                         </div>
                         <button className="mt-3 rounded bg-[#06b6d4] px-3 py-1 text-[10px] font-bold text-[#083344]">Learn More</button>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="mb-2 h-3 w-3/4 rounded bg-white/20" />
                      <div className="mb-2 h-3 w-full rounded bg-white/10" />
                      <div className="mb-2 h-3 w-5/6 rounded bg-white/10" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Templates Section */}
        <section id="templates" className="px-6 py-24 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="mb-3 text-sm font-bold text-[#06b6d4]">Professional templates</p>
                <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">Beautiful templates for every business.</h2>
              </div>
              <Link to="/templates" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5">
                View all templates <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              <TemplateCard title="Gym & Fitness" image="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80" />
              <TemplateCard title="Dental Care" image="https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&q=80" />
              <TemplateCard title="Coffee Shop" image="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80" />
              <TemplateCard title="Event Management" image="https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&q=80" />
              <TemplateCard title="Law Firm" image="https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80" />
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="border-t border-white/5 bg-[#0a1523] px-6 py-24 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12">
              <p className="mb-3 text-sm font-bold text-[#06b6d4]">Loved by business owners</p>
              <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">What our customers say</h2>
            </div>
            
            <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-[#111e2f] p-6 lg:col-span-1">
                <QuoteIcon />
                <p className="mt-4 text-sm leading-relaxed text-slate-300">"WebMintra made it so easy to create our website. Now we update our services and offers on our own!"</p>
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src="https://i.pravatar.cc/150?img=11" alt="Rohit Sharma" className="h-10 w-10 rounded-full object-cover" />
                    <div>
                      <p className="text-sm font-bold text-white">Rohit Sharma</p>
                      <p className="text-[10px] text-slate-400">Gym Owner, Kolkata</p>
                    </div>
                  </div>
                  <Stars />
                </div>
              </div>
              
              <div className="rounded-2xl border border-white/10 bg-[#111e2f] p-6 lg:col-span-1">
                <QuoteIcon />
                <p className="mt-4 text-sm leading-relaxed text-slate-300">"Very simple and powerful platform. I can manage my clinic website without any technical help."</p>
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src="https://i.pravatar.cc/150?img=47" alt="Dr. Priya Verma" className="h-10 w-10 rounded-full object-cover" />
                    <div>
                      <p className="text-sm font-bold text-white">Dr. Priya Verma</p>
                      <p className="text-[10px] text-slate-400">Clinic Owner, Delhi</p>
                    </div>
                  </div>
                  <Stars />
                </div>
              </div>
              
              <div className="rounded-2xl border border-white/10 bg-[#111e2f] p-6 lg:col-span-1">
                <QuoteIcon />
                <p className="mt-4 text-sm leading-relaxed text-slate-300">"Affordable, easy and effective. Exactly what small businesses like us needed."</p>
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src="https://i.pravatar.cc/150?img=12" alt="Ankit Agarwal" className="h-10 w-10 rounded-full object-cover" />
                    <div>
                      <p className="text-sm font-bold text-white">Ankit Agarwal</p>
                      <p className="text-[10px] text-slate-400">CA, Jaipur</p>
                    </div>
                  </div>
                  <Stars />
                </div>
              </div>
              
              <div className="flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-[#111e2f] to-[#07111f] p-6 text-center border border-white/5 lg:col-span-1">
                <div className="mb-2 text-5xl font-bold text-white">4.9<span className="text-2xl text-slate-500">/5</span></div>
                <Stars />
                <p className="mt-3 text-xs text-slate-400">Based on 500+ reviews</p>
                <div className="mt-4 flex -space-x-2">
                  <img src="https://i.pravatar.cc/150?img=11" alt="User" className="h-8 w-8 rounded-full border-2 border-[#111e2f]" />
                  <img src="https://i.pravatar.cc/150?img=47" alt="User" className="h-8 w-8 rounded-full border-2 border-[#111e2f]" />
                  <img src="https://i.pravatar.cc/150?img=12" alt="User" className="h-8 w-8 rounded-full border-2 border-[#111e2f]" />
                  <img src="https://i.pravatar.cc/150?img=5" alt="User" className="h-8 w-8 rounded-full border-2 border-[#111e2f]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="questions" className="px-6 py-24 lg:py-32">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <p className="mb-3 text-sm font-bold text-[#06b6d4]">Questions</p>
              <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">Everything you need to know.</h2>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-4">
                <FaqItem q="Can I use my existing website?" a={`Yes! You can start by importing your current website into ${siteName} and edit it easily.`} />
                <FaqItem q="Do I need to know how to code?" a="Not at all. Our intuitive editor lets you change text, images, and more by just clicking on them." />
                <FaqItem q="Can I connect my own domain?" a="Yes, you can easily connect any custom domain name you already own to your published website." />
              </div>
              <div className="flex flex-col gap-4">
                <FaqItem q="Can I edit my website from my phone?" a={`Absolutely. The ${siteName} editor is fully mobile-responsive so you can make updates on the go.`} />
                <FaqItem q="What happens if I make a mistake?" a="We maintain a full version history. You can preview changes before publishing and roll back to any previous version." />
                <FaqItem q="Can I change my template later?" a="Once a template is chosen and content is added, it forms the foundation of your site. If you wish to redesign entirely, you can start a new workspace." />
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="px-6 pb-24 lg:pb-32">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c1827] to-[#111e2f] px-6 py-20 text-center shadow-[0_0_50px_rgba(6,182,212,0.1)]">
            <div className="absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-[#06b6d4] opacity-20 blur-[80px]" />
            <div className="relative z-10">
              <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-[#06b6d4]/10 text-[#06b6d4] ring-1 ring-[#06b6d4]/30">
                <Sparkles className="h-8 w-8" />
              </div>
              <h2 className="font-display text-4xl font-bold text-white sm:text-5xl">Ready to launch your website?</h2>
              <p className="mt-6 text-lg text-slate-300">Start free for 15 days. No credit card required.</p>
              <Link to={primaryRoute} className="mt-10 inline-flex h-14 items-center gap-2 rounded-full bg-[#06b6d4] px-8 text-base font-bold text-[#083344] shadow-[0_0_20px_rgba(6,182,212,0.3)] transition hover:bg-[#22d3ee] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]">
                Create my website now <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#050b14] px-6 py-12">
        <div className="mx-auto grid max-w-7xl gap-12 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <div className="sm:col-span-2 md:col-span-4 lg:col-span-1 lg:pr-8">
            <a href="#top" className="flex items-center gap-2.5 font-display text-lg font-bold text-white">
              {logoUrl ? (
                <img src={logoUrl} alt={siteName} className="h-8 w-8 rounded-lg object-contain" />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#06b6d4] text-xs text-white">
                  <span className="font-bold">{siteName.charAt(0)}</span>
                </span>
              )}
              {siteName}
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">The easiest way to create and manage your business website.</p>
            <p className="mt-8 text-xs text-slate-500">© {new Date().getFullYear()} {siteName}. All rights reserved.</p>
          </div>
          
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">Product</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><a href="#how-it-works" className="hover:text-[#06b6d4]">How it works</a></li>
              <li><a href="#features" className="hover:text-[#06b6d4]">Features</a></li>
              <li><a href="#templates" className="hover:text-[#06b6d4]">Templates</a></li>
              <li><a href="#pricing" className="hover:text-[#06b6d4]">Pricing</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">Company</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><a href="#" className="hover:text-[#06b6d4]">About us</a></li>
              <li><a href="#" className="hover:text-[#06b6d4]">Blog</a></li>
              <li><a href="#" className="hover:text-[#06b6d4]">Contact us</a></li>
              <li><a href="#" className="hover:text-[#06b6d4]">Affiliates</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">Legal</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><a href="#" className="hover:text-[#06b6d4]">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#06b6d4]">Terms of Service</a></li>
              <li><a href="#" className="hover:text-[#06b6d4]">Refund Policy</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">Follow us</h4>
            <div className="flex gap-4">
              <a href="#" className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-slate-400 hover:bg-[#06b6d4] hover:text-white transition">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
              </a>
              <a href="#" className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-slate-400 hover:bg-[#06b6d4] hover:text-white transition">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
              </a>
              <a href="#" className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-slate-400 hover:bg-[#06b6d4] hover:text-white transition">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Components ──────────────────────────────────────────────

function StepCard({ number, icon: Icon, title, desc }: { number: string; icon: any; title: string; desc: string }) {
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

function TemplateCard({ title, image }: { title: string; image: string }) {
  return (
    <div className="group cursor-pointer rounded-xl border border-white/5 bg-[#111e2f] p-2 transition hover:border-[#06b6d4]/50">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-800">
        <img src={image} alt={title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105 group-hover:opacity-80" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-black/40">
          <span className="rounded-full bg-[#06b6d4] px-4 py-2 text-xs font-bold text-[#083344] shadow-lg">Preview</span>
        </div>
      </div>
      <div className="p-3 text-center">
        <p className="text-sm font-bold text-white">{title}</p>
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

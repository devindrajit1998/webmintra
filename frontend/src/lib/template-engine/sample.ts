// A built-in demo template package so admins can try the import engine instantly.

const shell = (body: string, head: string) => `<!DOCTYPE html>
<html lang="en">
<head>
${head}
<style>
  :root { --brand: #0ea5a4; --brand-dark: #0f766e; --ink: #0f172a; --paper: #f8fafc; --line: #e2e8f0; --accent: #f59e0b; }
  body { font-family: "Manrope", ui-sans-serif, system-ui; color: #0f172a; background: #f8fafc; margin: 0; }
  h1,h2,h3 { font-family: "Sora", ui-sans-serif, system-ui; letter-spacing: -0.02em; }
  .btn-primary { background: #0ea5a4; color: #ffffff; border-radius: 12px; padding: 12px 22px; font-weight: 700; display: inline-block; text-decoration: none; }
  .btn-secondary { background: #ffffff; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 22px; font-weight: 600; display: inline-block; text-decoration: none; }
  .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 26px; }
  .eyebrow { color: #0ea5a4; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; font-size: 12px; }
  .sect { max-width: 1140px; margin: 0 auto; padding: 88px 24px; }
  nav a { color: #0f172a; text-decoration: none; font-weight: 600; font-size: 15px; }
  footer { background: #0f172a; color: #f8fafc; }
  footer a { color: #cbd5e1; text-decoration: none; font-size: 14px; }
  input, textarea { width: 100%; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 12px; font: inherit; box-sizing: border-box; }
  .grid3 { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 22px; }
  .grid2 { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 22px; }
  @media (max-width: 860px) { .grid3, .grid2 { grid-template-columns: 1fr; } }
</style>
</head>
<body>
${body}
</body>
</html>`;

const header = `
<header style="position:sticky;top:0;background:#ffffff;border-bottom:1px solid #e2e8f0;z-index:20">
  <nav style="max-width:1140px;margin:0 auto;padding:18px 24px;display:flex;align-items:center;justify-content:space-between">
    <a href="index.html" style="display:flex;align-items:center;gap:10px;font-weight:800;font-size:18px">
      <img src="assets/logo.svg" alt="Northwind Studio logo" width="32" height="32" />
      <span>Northwind Studio</span>
    </a>
    <ul style="display:flex;gap:26px;list-style:none;margin:0;padding:0">
      <li><a href="index.html">Home</a></li>
      <li><a href="#services">Services</a></li>
      <li><a href="#pricing">Pricing</a></li>
      <li><a href="about.html">About</a></li>
      <li><a href="#contact">Contact</a></li>
    </ul>
    <a class="btn-primary" href="#contact">Book a call</a>
  </nav>
</header>`;

const footer = `
<footer>
  <div class="sect" style="padding:64px 24px 40px">
    <div class="grid3">
      <div>
        <h3 style="margin:0 0 10px;font-size:20px;color:#f8fafc">Northwind Studio</h3>
        <p style="color:#94a3b8;font-size:14px;line-height:1.7">A product design studio building interfaces that convert, for teams that ship fast.</p>
      </div>
      <div>
        <h3 style="font-size:14px;color:#f8fafc;margin:0 0 12px">Company</h3>
        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:8px">
          <li><a href="about.html">About us</a></li>
          <li><a href="#services">Services</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#faq">FAQ</a></li>
        </ul>
      </div>
      <div>
        <h3 style="font-size:14px;color:#f8fafc;margin:0 0 12px">Social</h3>
        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:8px">
          <li><a href="https://twitter.com/northwind">Twitter</a></li>
          <li><a href="https://linkedin.com/company/northwind">LinkedIn</a></li>
          <li><a href="https://dribbble.com/northwind">Dribbble</a></li>
        </ul>
      </div>
    </div>
    <p style="color:#64748b;font-size:13px;margin-top:38px">© 2026 Northwind Studio. All rights reserved.</p>
  </div>
</footer>`;

const homeHead = `<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Northwind Studio — Product design for teams that ship</title>
<meta name="description" content="Northwind Studio designs and builds high-converting product interfaces for SaaS teams." />
<meta name="keywords" content="product design, saas design, web design studio" />
<link rel="canonical" href="https://northwind.studio/" />
<meta property="og:title" content="Northwind Studio" />
<meta property="og:description" content="Product design for teams that ship." />
<meta property="og:image" content="assets/og-cover.jpg" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="icon" href="assets/favicon.ico" />`;

const homeBody = `${header}
<section class="sect" style="display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center">
  <div>
    <span class="eyebrow">Design studio</span>
    <h1 style="font-size:56px;line-height:1.05;margin:14px 0 18px">Interfaces that make your product feel inevitable.</h1>
    <p style="font-size:19px;line-height:1.7;color:#475569;max-width:34rem">We partner with SaaS teams to design, prototype and ship product experiences that move revenue — not just pixels.</p>
    <div style="display:flex;gap:12px;margin-top:26px">
      <a class="btn-primary" href="#contact">Start a project</a>
      <a class="btn-secondary" href="#work">See our work</a>
    </div>
    <p style="font-size:13px;color:#64748b;margin-top:18px">Trusted by 40+ product teams · Avg. 3.2× conversion lift</p>
  </div>
  <img src="assets/hero.jpg" alt="Designers reviewing an interface on a large display" style="width:100%;border-radius:22px;border:1px solid #e2e8f0" />
</section>

<section class="sect" id="services" style="padding-top:20px">
  <span class="eyebrow">Services</span>
  <h2 style="font-size:36px;margin:12px 0 8px">Everything from discovery to launch</h2>
  <p style="color:#475569;max-width:44rem;margin:0 0 34px">Pick a single engagement or run the whole product loop with us.</p>
  <div class="grid3">
    <div class="card">
      <img src="assets/icon-research.svg" alt="Research icon" width="40" height="40" />
      <h3 style="font-size:20px;margin:16px 0 8px">Product discovery</h3>
      <p style="color:#475569;line-height:1.7;margin:0">Interviews, jobs-to-be-done mapping and opportunity sizing before a single screen exists.</p>
      <a href="#contact" style="color:#0ea5a4;font-weight:700;text-decoration:none;display:inline-block;margin-top:14px">Learn more</a>
    </div>
    <div class="card">
      <img src="assets/icon-design.svg" alt="Design icon" width="40" height="40" />
      <h3 style="font-size:20px;margin:16px 0 8px">Interface design</h3>
      <p style="color:#475569;line-height:1.7;margin:0">Design systems, flows and pixel-tight screens delivered in production-ready components.</p>
      <a href="#contact" style="color:#0ea5a4;font-weight:700;text-decoration:none;display:inline-block;margin-top:14px">Learn more</a>
    </div>
    <div class="card">
      <img src="assets/icon-build.svg" alt="Build icon" width="40" height="40" />
      <h3 style="font-size:20px;margin:16px 0 8px">Front-end build</h3>
      <p style="color:#475569;line-height:1.7;margin:0">We ship the front end ourselves so nothing is lost between design and release.</p>
      <a href="#contact" style="color:#0ea5a4;font-weight:700;text-decoration:none;display:inline-block;margin-top:14px">Learn more</a>
    </div>
  </div>
</section>

<section class="sect" id="pricing" style="padding-top:20px">
  <span class="eyebrow">Pricing</span>
  <h2 style="font-size:36px;margin:12px 0 30px">Simple monthly engagements</h2>
  <div class="grid3">
    <div class="card">
      <h3 style="margin:0;font-size:18px">Sprint</h3>
      <p style="font-size:40px;font-weight:800;margin:10px 0 4px">$4,800</p>
      <p style="color:#64748b;font-size:14px;margin:0 0 18px">per 2-week sprint</p>
      <a class="btn-secondary" href="#contact">Choose Sprint</a>
    </div>
    <div class="card" style="border-color:#0ea5a4">
      <h3 style="margin:0;font-size:18px">Partner</h3>
      <p style="font-size:40px;font-weight:800;margin:10px 0 4px">$9,600</p>
      <p style="color:#64748b;font-size:14px;margin:0 0 18px">per month, one squad</p>
      <a class="btn-primary" href="#contact">Choose Partner</a>
    </div>
    <div class="card">
      <h3 style="margin:0;font-size:18px">Embedded</h3>
      <p style="font-size:40px;font-weight:800;margin:10px 0 4px">$18,400</p>
      <p style="color:#64748b;font-size:14px;margin:0 0 18px">per month, full team</p>
      <a class="btn-secondary" href="#contact">Choose Embedded</a>
    </div>
  </div>
</section>

<section class="sect" id="work" style="padding-top:20px">
  <span class="eyebrow">Selected work</span>
  <h2 style="font-size:36px;margin:12px 0 30px">Recent launches</h2>
  <div class="grid3">
    <img src="assets/work-1.jpg" alt="Analytics dashboard redesign" style="width:100%;border-radius:16px" />
    <img src="assets/work-2.jpg" alt="Fintech onboarding flow" style="width:100%;border-radius:16px" />
    <img src="assets/work-3.jpg" alt="Marketplace search experience" style="width:100%;border-radius:16px" />
  </div>
</section>

<section class="sect" style="padding-top:20px">
  <span class="eyebrow">Testimonials</span>
  <h2 style="font-size:36px;margin:12px 0 30px">What partners say</h2>
  <div class="grid3">
    <div class="card">
      <blockquote style="margin:0;font-size:17px;line-height:1.7;color:#0f172a">“They rebuilt our onboarding in six weeks and activation jumped 41%.”</blockquote>
      <div style="display:flex;gap:12px;align-items:center;margin-top:18px">
        <img src="assets/avatar-1.jpg" alt="Portrait of Maya Fern" width="40" height="40" style="border-radius:999px" />
        <div><p style="margin:0;font-weight:700;font-size:14px">Maya Fern</p><p style="margin:0;color:#64748b;font-size:13px">VP Product, Cadence</p></div>
      </div>
    </div>
    <div class="card">
      <blockquote style="margin:0;font-size:17px;line-height:1.7;color:#0f172a">“The only studio that shipped front-end code we didn't have to rewrite.”</blockquote>
      <div style="display:flex;gap:12px;align-items:center;margin-top:18px">
        <img src="assets/avatar-2.jpg" alt="Portrait of Dev Raman" width="40" height="40" style="border-radius:999px" />
        <div><p style="margin:0;font-weight:700;font-size:14px">Dev Raman</p><p style="margin:0;color:#64748b;font-size:13px">CTO, Loopwise</p></div>
      </div>
    </div>
    <div class="card">
      <blockquote style="margin:0;font-size:17px;line-height:1.7;color:#0f172a">“Our pricing page finally explains the product. Revenue followed.”</blockquote>
      <div style="display:flex;gap:12px;align-items:center;margin-top:18px">
        <img src="assets/avatar-3.jpg" alt="Portrait of Iris Kohl" width="40" height="40" style="border-radius:999px" />
        <div><p style="margin:0;font-weight:700;font-size:14px">Iris Kohl</p><p style="margin:0;color:#64748b;font-size:13px">Founder, Tidebox</p></div>
      </div>
    </div>
  </div>
</section>

<section class="sect" id="faq" style="padding-top:20px">
  <span class="eyebrow">FAQ</span>
  <h2 style="font-size:36px;margin:12px 0 30px">Questions, answered</h2>
  <div style="display:grid;gap:14px">
    <div class="card">
      <h3 style="margin:0 0 8px;font-size:17px">How fast can we start?</h3>
      <p style="margin:0;color:#475569;line-height:1.7">Most engagements kick off within ten business days of a signed scope.</p>
    </div>
    <div class="card">
      <h3 style="margin:0 0 8px;font-size:17px">Do you work with in-house designers?</h3>
      <p style="margin:0;color:#475569;line-height:1.7">Yes — roughly half of our work is embedded alongside an existing design team.</p>
    </div>
    <div class="card">
      <h3 style="margin:0 0 8px;font-size:17px">What happens after launch?</h3>
      <p style="margin:0;color:#475569;line-height:1.7">We run a 30-day measurement window and hand over a documented design system.</p>
    </div>
  </div>
</section>

<section class="sect" id="contact" style="padding-top:20px">
  <div class="card" style="padding:40px">
    <div class="grid2" style="align-items:start">
      <div>
        <span class="eyebrow">Contact</span>
        <h2 style="font-size:32px;margin:12px 0 10px">Tell us about your product</h2>
        <p style="color:#475569;line-height:1.7;margin:0">Share a few details and we'll reply within one business day with next steps.</p>
        <video src="assets/studio-tour.mp4" poster="assets/studio-poster.jpg" controls muted style="width:100%;border-radius:14px;margin-top:22px"></video>
      </div>
      <form>
        <div style="display:grid;gap:14px">
          <div><label for="name" style="font-size:13px;font-weight:600">Full name</label><input id="name" name="name" placeholder="Ada Lovelace" required /></div>
          <div><label for="email" style="font-size:13px;font-weight:600">Work email</label><input id="email" name="email" type="email" placeholder="ada@company.com" required /></div>
          <div><label for="budget" style="font-size:13px;font-weight:600">Budget</label><input id="budget" name="budget" placeholder="$10,000 – $50,000" /></div>
          <div><label for="brief" style="font-size:13px;font-weight:600">Project brief</label><textarea id="brief" name="brief" rows="4" placeholder="What are you building?"></textarea></div>
          <button class="btn-primary" type="submit" style="border:0;cursor:pointer">Send enquiry</button>
        </div>
      </form>
    </div>
  </div>
</section>
${footer}`;

const aboutHead = `<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>About — Northwind Studio</title>
<link rel="canonical" href="https://northwind.studio/about" />
<link rel="icon" href="assets/favicon.ico" />`;

const aboutBody = `${header}
<section class="sect">
  <span class="eyebrow">About</span>
  <h1 style="font-size:46px;margin:14px 0 16px;max-width:36rem">A small studio with an unreasonable standard.</h1>
  <p style="font-size:18px;color:#475569;line-height:1.7;max-width:42rem">Founded in 2018, Northwind is eleven designers and engineers who like shipping. We take on six partners a year, which keeps the work honest.</p>
  <img src="assets/studio.jpg" alt="The Northwind studio space" style="width:100%;border-radius:22px;margin-top:34px" />
</section>
<section class="sect" style="padding-top:0">
  <span class="eyebrow">Team</span>
  <h2 style="font-size:34px;margin:12px 0 28px">The people you'll work with</h2>
  <div class="grid3">
    <div class="card" style="text-align:center">
      <img src="assets/team-1.jpg" alt="Portrait of Noor Haddad" width="88" height="88" style="border-radius:999px" />
      <h3 style="font-size:18px;margin:14px 0 4px">Noor Haddad</h3>
      <p style="color:#64748b;font-size:14px;margin:0">Principal designer</p>
    </div>
    <div class="card" style="text-align:center">
      <img src="assets/team-2.jpg" alt="Portrait of Sam Okonkwo" width="88" height="88" style="border-radius:999px" />
      <h3 style="font-size:18px;margin:14px 0 4px">Sam Okonkwo</h3>
      <p style="color:#64748b;font-size:14px;margin:0">Front-end lead</p>
    </div>
    <div class="card" style="text-align:center">
      <img src="assets/team-3.jpg" alt="Portrait of Lena Frost" width="88" height="88" style="border-radius:999px" />
      <h3 style="font-size:18px;margin:14px 0 4px">Lena Frost</h3>
      <p style="color:#64748b;font-size:14px;margin:0">Research director</p>
    </div>
  </div>
</section>
<section class="sect" style="padding-top:0">
  <span class="eyebrow">By the numbers</span>
  <h2 style="font-size:34px;margin:12px 0 28px">Eight years of shipping</h2>
  <table style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
    <thead><tr style="background:#f1f5f9"><th style="text-align:left;padding:14px">Year</th><th style="text-align:left;padding:14px">Partners</th><th style="text-align:left;padding:14px">Launches</th></tr></thead>
    <tbody>
      <tr><td style="padding:14px;border-top:1px solid #e2e8f0">2024</td><td style="padding:14px;border-top:1px solid #e2e8f0">6</td><td style="padding:14px;border-top:1px solid #e2e8f0">11</td></tr>
      <tr><td style="padding:14px;border-top:1px solid #e2e8f0">2025</td><td style="padding:14px;border-top:1px solid #e2e8f0">6</td><td style="padding:14px;border-top:1px solid #e2e8f0">14</td></tr>
      <tr><td style="padding:14px;border-top:1px solid #e2e8f0">2026</td><td style="padding:14px;border-top:1px solid #e2e8f0">4</td><td style="padding:14px;border-top:1px solid #e2e8f0">9</td></tr>
    </tbody>
  </table>
</section>
<section class="sect" style="padding-top:0">
  <div class="card" style="padding:36px">
    <h2 style="font-size:26px;margin:0 0 8px">Get the studio newsletter</h2>
    <p style="color:#475569;margin:0 0 18px">One short letter a month on interface craft. No pitches.</p>
    <form style="display:flex;gap:12px;flex-wrap:wrap">
      <input id="nl-email" name="email" type="email" placeholder="you@company.com" style="max-width:320px" />
      <button class="btn-primary" type="submit" style="border:0;cursor:pointer">Subscribe</button>
    </form>
  </div>
</section>
${footer}`;

export const SAMPLE_TEMPLATE_FILES = [
  { name: "index.html", content: shell(homeBody, homeHead) },
  { name: "about.html", content: shell(aboutBody, aboutHead) },
];

export const SAMPLE_ASSET_NAMES = [
  "assets/logo.svg",
  "assets/hero.jpg",
  "assets/icon-research.svg",
  "assets/icon-design.svg",
  "assets/icon-build.svg",
  "assets/work-1.jpg",
  "assets/work-2.jpg",
  "assets/work-3.jpg",
  "assets/avatar-1.jpg",
  "assets/avatar-2.jpg",
  "assets/avatar-3.jpg",
  "assets/team-1.jpg",
  "assets/team-2.jpg",
  "assets/team-3.jpg",
  "assets/studio.jpg",
  "assets/studio-tour.mp4",
  "assets/studio-poster.jpg",
  "assets/favicon.ico",
  "assets/fonts/Sora.woff2",
  "assets/fonts/Manrope.woff2",
  "assets/site.js",
  "assets/content.json",
];

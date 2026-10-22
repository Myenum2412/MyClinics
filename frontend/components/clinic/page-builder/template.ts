/**
 * Starter template inserted into GrapesJS when a clinic publishes its
 * website for the first time. Everything is regular HTML/CSS, so the whole
 * page stays editable in the GrapesJS style manager and code view.
 */

export const STARTER_HTML = `
<header class="mc-header">
  <div class="mc-shell mc-header-inner">
    <a class="mc-brand" href="#top">
      <span class="mc-brand-mark">MC</span>
      <span>My Clinic</span>
    </a>
    <nav class="mc-nav">
      <a href="#services">Services</a>
      <a href="#about">About</a>
      <a href="#contact">Contact</a>
    </nav>
    <a class="mc-button" href="#contact">Book an appointment</a>
  </div>
</header>
<main id="top">
  <section class="mc-hero">
    <div class="mc-shell mc-hero-inner">
      <div class="mc-hero-copy">
        <span class="mc-eyebrow">Welcome to our clinic</span>
        <h1>Care that puts you first</h1>
        <p class="mc-lead">
          Modern dentistry and general care in a calm, welcoming space. Book a
          visit with our team today.
        </p>
        <div class="mc-actions">
          <a class="mc-button" href="#contact">Book an appointment</a>
          <a class="mc-button mc-button-ghost" href="#services">Our services</a>
        </div>
      </div>
      <aside class="mc-hero-card">
        <p class="mc-card-label">Opening hours</p>
        <p class="mc-card-value">Mon–Sat</p>
        <p class="mc-card-muted">9:00 AM – 6:00 PM</p>
        <div class="mc-card-divider"></div>
        <p class="mc-card-label">Call us</p>
        <p class="mc-card-value">+91 98765 43210</p>
        <p class="mc-card-muted">We reply during clinic hours</p>
      </aside>
    </div>
  </section>

  <section class="mc-section" id="services">
    <div class="mc-shell">
      <div class="mc-section-head">
        <span class="mc-eyebrow">What we do</span>
        <h2>Care for every stage of life</h2>
        <p class="mc-lead">
          From routine check-ups to complete smile makeovers, our team plans
          treatment around you.
        </p>
      </div>
      <div class="mc-grid">
        <article class="mc-card">
          <h3>General dentistry</h3>
          <p>Check-ups, cleanings and preventive care for the whole family.</p>
        </article>
        <article class="mc-card">
          <h3>Restorative care</h3>
          <p>Fillings, crowns and implants that look and feel natural.</p>
        </article>
        <article class="mc-card">
          <h3>Cosmetic dentistry</h3>
          <p>Whitening, veneers and smile design tailored to your goals.</p>
        </article>
      </div>
    </div>
  </section>

  <section class="mc-section mc-section-muted" id="about">
    <div class="mc-shell mc-about">
      <div>
        <span class="mc-eyebrow">About the clinic</span>
        <h2>A calm, modern place to be cared for</h2>
        <p class="mc-lead">
          Our clinic combines experienced clinicians with digital diagnostics
          and gentle techniques. Every visit starts with listening.
        </p>
      </div>
      <ul class="mc-list">
        <li>Same-week appointments</li>
        <li>Transparent treatment plans</li>
        <li>Digital X-rays and scans</li>
        <li>Family-friendly scheduling</li>
      </ul>
    </div>
  </section>

  <section class="mc-section" id="contact">
    <div class="mc-shell">
      <div class="mc-section-head">
        <span class="mc-eyebrow">Visit us</span>
        <h2>Book your appointment</h2>
        <p class="mc-lead">
          Call or message us and we will confirm a time that works for you.
        </p>
      </div>
      <div class="mc-contact">
        <div class="mc-card">
          <h3>Clinic details</h3>
          <p>123 Main Road, Your City</p>
          <p>Phone: +91 98765 43210</p>
          <p>Email: hello@myclinic.example</p>
        </div>
        <div class="mc-card">
          <h3>Opening hours</h3>
          <p>Monday – Saturday</p>
          <p>9:00 AM – 6:00 PM</p>
          <p>Sunday: closed</p>
        </div>
      </div>
    </div>
  </section>
</main>
<footer class="mc-footer">
  <div class="mc-shell mc-footer-inner">
    <p>© My Clinic. All rights reserved.</p>
    <p>Built for patients, powered by MyClinics.</p>
  </div>
</footer>
`;

export const STARTER_CSS = `
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  color: #0f172a;
  background: #ffffff;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  line-height: 1.6;
}

h1, h2, h3, p {
  margin: 0;
}

a {
  color: inherit;
  text-decoration: none;
}

.mc-shell {
  width: 100%;
  max-width: none;
  margin: 0 auto;
  padding: 0 24px;
}

.mc-header {
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
}

.mc-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 68px;
}

.mc-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.mc-brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #0f766e;
  color: #ffffff;
  font-size: 13px;
}

.mc-nav {
  display: flex;
  align-items: center;
  gap: 22px;
  font-size: 14px;
  color: #475569;
}

.mc-nav a:hover {
  color: #0f766e;
}

.mc-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 18px;
  border-radius: 10px;
  background: #0f766e;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  transition: opacity 150ms ease;
}

.mc-button:hover {
  opacity: 0.9;
}

.mc-button-ghost {
  background: transparent;
  color: #0f766e;
  border: 1px solid #99f6e4;
}

.mc-hero {
  padding: 72px 0;
  background:
    radial-gradient(900px 400px at 10% -10%, #ccfbf1 0%, transparent 60%),
    linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
}

.mc-hero-inner {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.6fr);
  gap: 48px;
  align-items: center;
}

.mc-eyebrow {
  display: inline-block;
  margin-bottom: 14px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #0f766e;
}

.mc-hero h1 {
  max-width: 620px;
  font-size: clamp(34px, 5vw, 56px);
  line-height: 1.1;
  letter-spacing: -0.03em;
}

.mc-lead {
  max-width: 560px;
  margin-top: 16px;
  color: #64748b;
  font-size: 17px;
}

.mc-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.mc-hero-card {
  padding: 26px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 18px 40px -24px rgba(15, 23, 42, 0.35);
}

.mc-card-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #94a3b8;
}

.mc-card-value {
  margin-top: 4px;
  font-size: 20px;
  font-weight: 700;
}

.mc-card-muted {
  margin-top: 2px;
  font-size: 13px;
  color: #64748b;
}

.mc-card-divider {
  height: 1px;
  margin: 18px 0;
  background: #e2e8f0;
}

.mc-section {
  padding: 72px 0;
}

.mc-section-muted {
  background: #f8fafc;
}

.mc-section-head {
  max-width: 640px;
}

.mc-section h2 {
  font-size: clamp(26px, 3vw, 36px);
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.mc-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-top: 32px;
}

.mc-card {
  padding: 22px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #ffffff;
}

.mc-card h3 {
  font-size: 16px;
  font-weight: 700;
}

.mc-card p {
  margin-top: 8px;
  color: #64748b;
  font-size: 14px;
}

.mc-about {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(240px, 0.7fr);
  gap: 48px;
  align-items: center;
}

.mc-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
}

.mc-list li {
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  font-size: 14px;
  font-weight: 600;
}

.mc-contact {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-top: 32px;
}

.mc-footer {
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
  padding: 22px 0;
}

.mc-footer-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #94a3b8;
  font-size: 12px;
}

@media (max-width: 860px) {
  .mc-hero-inner,
  .mc-about,
  .mc-contact {
    grid-template-columns: 1fr;
  }

  .mc-grid {
    grid-template-columns: 1fr;
  }

  .mc-nav {
    display: none;
  }
}

@media (max-width: 520px) {
  .mc-hero {
    padding: 48px 0;
  }

  .mc-section {
    padding: 48px 0;
  }

  .mc-header .mc-button {
    display: none;
  }
}
`;

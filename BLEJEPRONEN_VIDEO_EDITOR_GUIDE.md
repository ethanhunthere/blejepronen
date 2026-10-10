# 🎬 Bleje Pronën — Brand, Product & Video Production Guide
> **Internal Creative Brief for Video Editors, Motion Designers & Content Creators**

---

## 1. Executive Summary: What is Bleje Pronën?

**Bleje Pronën** (*"Buy the Property"*) is the premier next-generation digital real estate platform and mobile ecosystem for the Albanian-speaking region and diaspora (**Kosovo, Albania, North Macedonia, and international diaspora**).

It modernizes and streamlines real estate discovery by eliminating obsolete middlemen, broker spam, and hidden listings. Users can browse, filter, buy, sell, and rent apartments, luxury villas, commercial spaces, and land with **direct peer-to-peer and verified-agency communication**, instant mortgage simulation, and real-time calling/chat.

### The Brand Vibe & Tone
* **Aesthetic**: Premium, sleek, modern, architectural, luxury-tech (think **Airbnb meets Apple / Linear**).
* **Feel**: Trustworthy, exclusive, fast, effortless.
* **Target Audience**: Homebuyers, renters, diaspora investors looking to purchase back home, modern real estate agencies, and individual property owners.

---

## 2. Platforms & Tech Ecosystem (What Exists)

Bleje Pronën is not just a landing page; it is a full **cross-platform ecosystem** available across Web, iOS, and Android:

| Platform | Tech Stack | Key Capabilities & Highlights for Video |
| :--- | :--- | :--- |
| **Web Platform** | **Next.js 15+**, React, Tailwind CSS | Ultra-responsive desktop & tablet experience, dynamic search bars, interactive mortgage calculators, interactive city hubs, high-res photo gallery lightboxes. |
| **iOS Mobile App** | **React Native (Expo)**, Apple HIG | Native iOS liquid navigation, dynamic blur glass (`expo-blur`), haptic feedback, bottom navigation bar, floating action bars, smooth sheet modals. |
| **Android Mobile App** | **React Native (Expo)** | Edge-to-edge Material 3 luxury styling, adaptive icons, high-refresh rate fluidity, deep system integration. |
| **Backend & Cloud** | **Supabase**, PostgreSQL, Realtime | Live database updates, real-time messaging, instant push notifications, authenticated OTP SMS verification. |

---

## 3. Core Features to Showcase in Footage & Motion Graphics

When capturing screen recordings or creating 2D/3D mockup animations, highlight these flagship features:

### 🔍 1. Omnisearch & City Hub Discovery
* **Instant Filtering**: Search across cities (Prishtinë, Tiranë, Shkup, Durrës, Vlorë, Prizren, Ferizaj, etc.).
* **Category Pills**: *Banesa (Apartments)*, *Shtëpi (Houses)*, *Vila (Luxury Villas)*, *Zyra / Komerciale (Offices)*, *Toka (Land)*.
* **Filter Sheets**: Price range sliders, square meters ($m^2$), bedrooms, floor level, new development status.

### 🏡 2. Flagship Listing Detail Screen (`listings/[id]`)
* **Cinematic Imagery**: 4K full-bleed photography carousel with hero zoom and thumbnail scrubbing.
* **Key Spec Badges**: Clean pill chips showing Area ($m^2$), Rooms, Bathrooms, Floor, Status.
* **Verified Seller Card**: Agency logo or owner profile with verification badge, member status, and response time.
* **Floating Bottom Action Bar**: Quick buttons for **Thirr (Call)**, **Mesazh (Message)**, and **WhatsApp**.

### 📱 3. Built-In In-App VoIP Audio Calling (`CallScreen`)
* Instant voice calls directly between buyer and seller inside the app with full calling UI (mute, speaker, call timer, connected status).
* Eliminates sharing private phone numbers if the user prefers privacy.

### 💬 4. Real-Time Chat & Messaging (`mesazhet`)
* WhatsApp-grade speed with real-time typing indicators, read receipts, and direct property link cards embedded in conversation.

### 📊 5. Interactive Mortgage Calculator (*"Kalkulatori i Kredisë"*)
* Built-in financial instrument allowing buyers to calculate monthly mortgage payments.
* Configurable fields:
  * **Çmimi i Pronës** (Property Price)
  * **Kësti Fillestar** (Down Payment %)
  * **Afati i Kredisë** (Loan Term in Years)
  * **Norma Vjetore e Interesit** (Annual Interest Rate %)
  * **Pagesa Mujore** (Estimated Monthly Payment calculation)

### ➕ 6. Fast Listing Creation Flow (*"Posto Pronë"*)
* Clean, frictionless 3-step listing flow: upload photos, set specs/price, pin city/location, and publish instantly.

### 🎨 7. The Three-Theme Engine (Light, Forest Green, OLED Dark)
The mobile app features **three curated design themes** switchable in settings:
1. **White / Studio Light**: Clean Scandinavian gallery style with deep emerald accents.
2. **Forest / Luxury Green**: Deep bottle green canvas (`#071C18`) with imperial gold accents (`#D4AF37`) for high-net-worth listings.
3. **Black / OLED Stealth**: Pure jet black (`#000000`) with electric mint green (`#2FBF8B`) accents.

---

## 4. Brand Design System & Color Palette

Use these exact HEX codes for motion graphics, lower thirds, typography highlights, device frames, and background graphics:

### Primary Brand Palette
```
#00675B  ██████  Emerald Brand Teal    (Primary action color, logo mark, primary buttons)
#004D43  ██████  Dark Emerald Teal     (Hover states, pressed buttons, active rings)
#E8F5F2  ██████  Soft Sage / Mint Tint (Light background washes, selected chips, icon backings)
```

### Luxury Accent Palette (Gold & Emerald)
```
#9A7228  ██████  Imperial Bronze/Gold  (Light theme verification badges, premium stars)
#D4AF37  ██████  Champagne Gold        (Luxury green theme primary & accents)
#2FBF8B  ██████  Electric Mint         (Dark theme primary CTA, active states, calls)
```

### Canvas & Surface Colors
```
#002D26  ██████  Deep Pine Hero Dark   (Web landing hero backdrop & cinematic gradients)
#071C18  ██████  Forest Obsidian       (Mobile green theme background)
#000000  ██████  True OLED Black       (Mobile dark theme background)
#F5F7FA  ██████  Gallery Off-White     (Web & light theme canvas background)
#FFFFFF  ██████  Pure Crisp White      (Card surfaces, text on dark backgrounds)
#0F172A  ██████  Slate Navy Ink        (Primary reading typography on light mode)
```

### Typography Hierarchy
* **Primary Typeface**: **`Albert Sans`** (Geometric humanist sans-serif — clean, modern, architectural).
* **Weights**:
  * `800 ExtraBold / 900 Black`: Hero headlines, prices, primary titles.
  * `600 SemiBold`: Button labels, navigation tabs, spec labels.
  * `400 Regular / 500 Medium`: Body copy, descriptions, micro-copy.

---

## 5. Video Editing & Motion Guidelines

### Pacing & Rhythm
* **Tempo**: Fast, dynamic, modern tech tempo (85–115 BPM electronic/sub-bass or chic lo-fi house).
* **Cuts**: Rapid, deliberate match cuts (e.g., tap on listing card $\rightarrow$ zoom into high-res hero image $\rightarrow$ swipe through living room photo $\rightarrow$ tap "Kalkulatori" $\rightarrow$ number counter spins up).
* **Transitions**: Seamless camera punch-ins, subtle whip zooms, glass card slide-ups, clean UI pans. Avoid cheesy standard video transitions (no basic star wipes or generic dissolves).

### Device Framing & Mockups
* **Mobile Shots**: Use modern **iPhone 16 Pro (Natural Titanium or Black Titanium)** with Dynamic Island and slim bezels.
* **Desktop / Web Shots**: Use **MacBook Pro 16" / Pro Display XDR** floating bezel or clean clay mockup with subtle perspective tilt (isometric 15°–25° angle).
* **Backgrounds for Devices**: Soft blurred ambient gradients using brand teal (`#00675B`) and deep forest (`#002D26`) against dark slate or crisp white studio backdrops.

### Sound Design (SFX)
* Clean, satisfying UI Foley sound effects:
  * Subtle haptic *pop/tick* on tab switches or chip selections.
  * Soft *whoosh* on screen slides and gallery transitions.
  * Delicate *click* on buttons and phone call actions.
  * Deep sub-bass *boom/drop* on logo reveals and tagline drops.

---

## 6. Official Slogans & Copy (Use for Text Overlays)

### Albanian (Primary)
* **Main Slogan**: *"Prona jote e ardhshme është këtu."* (Your next property is here.)
* **Sub-Slogan**: *"Bli, shit ose merr me qira duke komunikuar direkt me pronarët."*
* **Platform Tagline**: *"Platforma #1 e Pasurive të Patundshme në Kosovë dhe Shqipëri."*
* **CTA Buttons**: *"Shfleto Pronat"*, *"Posto Pronë Falas"*, *"Shkarko Aplikacionin"*.

### English (International / Diaspora)
* *"Find your next home in Kosovo & Albania."*
* *"Direct contact with owners & verified agencies. Zero middleman friction."*
* *"Available on Web, iOS, and Android."*

---

## 7. Checklist for Promotional Video Assets
- [ ] Showcase both **Web (`blejepronen.com`)** on laptop and **Mobile App** on iPhone/Android side-by-side.
- [ ] Highlight the speed of the **Omnisearch & City Filters**.
- [ ] Feature the **Mortgage Calculator** spinning up numbers.
- [ ] Show the **Direct Communication** (In-App Call & WhatsApp chat buttons).
- [ ] End with the **Official Logo + App Store & Google Play Badges + Website URL (`blejepronen.com`)**.

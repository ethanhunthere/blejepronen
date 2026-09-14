# Bleje Pronën — iOS & Android Mobile App (Expo / React Native)

Aplikacioni zyrtar celular për **Bleje Pronën** (iOS dhe Android), i ndërtuar me **React Native (Expo SDK 57)** dhe **TypeScript**. 

Aplikacioni është projektuar për të pasqyruar 100% platformën kryesore web (`blejepronen.com`), me dizajn modern, estetikë luksoze (Apple & Airbnb-grade), pa elemente artificiale apo pika vezulluese (zero AI-look), dhe me performancë të lartë native.

---

## 📱 Veçoritë Kryesore të Implementuara

1. **Ballina & Kërkimi (`app/(tabs)/index.tsx`)**:
   - Header zyrtar me logon dhe brandin Bleje Pronën.
   - Kërkim i shpejtë me fjalë kyçe (qyteti, lagjja, titulli).
   - Ndarja e ofertave: **Të gjitha**, **Në Shitje**, **Me Qira**.
   - Filtrim me kategori të shpejta: *Banesa, Shtëpi, Vila, Toka, Lokale, Garazha*.
   - Feed i pronave më të reja nga baza e të dhënave Supabase me pull-to-refresh.

2. **Eksplorimi & Filtrat e Avancuar (`app/(tabs)/listings.tsx`)**:
   - Modal i dedikuar filtrimi.
   - Zgjedhje e qyteteve të Kosovës dhe **lagjeve të lidhura në mënyrë kaskadë** nga `KOSOVO_LOCATIONS` (Prishtinë, Prizren, Pejë, Gjakovë, Gjilan, Mitrovicë, Ferizaj, etj.).
   - Renditje sipas: *Më të rejat, Çmimi më i ulët, Çmimi më i lartë*.
   - Kartela me pamje të pastër, çmimin, lokacionin dhe specifikat kryesore (`m²`, dhomat, kati).

3. **Posto Pronë të Re (`app/(tabs)/post.tsx`)**:
   - **6 Seksione të strukturuara**:
     1. Zgjedhja e kategorisë me nën-lloje të sinkronizuara.
     2. Lloji i ofertës (Shitje / Qira).
     3. Lokacioni (Qyteti, Lagjja kaskadë, Rruga).
     4. Çmimi (€), Sipërfaqja (`m²`), Dhomat, Kati, dhe Veçoritë/Përparësitë.
     5. Titulli & **Asistenti inteligjent i përshkrimit**:
        - *"Sugjero përshkrim profesional"* kur fusha është bosh.
        - *"Rregullo & përmirëso"* kur shënohen disa fjalë.
        - Butoni *"Kthe"* për të kthyer tekstin e mëparshëm nëse dëshirohet.
     6. Ngarkimi i fotove direkt nga Galeria/Kamera (deri në 10 foto) me etiketën e fotos kryesore.

4. **Detajet e Pronës (`app/listings/[id].tsx`)**:
   - Galeri e plotë fotografish me tregues numri.
   - Çmimi, titulli, adresa me ikonë harte.
   - Kutitë e specifikave kryesore (`m²`, dhomat, kati).
   - Përshkrimi i plotë i formatuar.
   - Lista e pajisjeve dhe veçorive.
   - **Kalkulatori interaktiv i kredisë/hipotekës** (llogarit automatikisht këstin mujor në bazë të vlerës, interesit dhe viteve).
   - Kartela e shitësit/agjencisë me statusin e verifikimit.
   - Bar fiks në fund me butona të menjëhershëm: **WhatsApp** dhe **Telefono**.

5. **Bisedat & Mesazhet (`app/(tabs)/messages.tsx`)**:
   - Lista e bisedave për çdo pronë.
   - Paraqitje e fotos së pronës, emrit të shitësit dhe mesazhit të fundit.

6. **Profili & Cilësimet (`app/(tabs)/profile.tsx`)**:
   - Kartela e profilit të përdoruesit me emblemën **"E verifikuar"**.
   - Përcaktimi i llojit të llogarisë (*Individuale* vs *Kompani / Agjenci*).
   - Qasje e shpejtë te: *Shpalljet e mia*, *Pronat e ruajtura (Favorites)*, *Cilësimet*, *Ndihma*.
   - Veprimi i çkyçjes me konfirmim të sigurt.

---

## 🎨 Paleta e Ngjyrave & Shenjat e Dizajnit (Tokens)

- **Primary**: `#006459` (E gjelbër e thellë pylli/smerald)
- **Primary Dark**: `#005048`
- **Primary Light**: `#E6F2F1` (Prapavijë e butë e elementeve aktive)
- **Gold Accent**: `#C8B882` (Ari luksoz për distinktivë dhe theksime)
- **Background Canvas**: `#F2F7F7` (Prapavijë e pastër dhe e freskët)
- **Card Surface**: `#FFFFFF`
- **Border**: `#E5E7EB`
- **Typography**: Tituj të theksuar me peshë 800/900, tekst ndihmës neutral.

---

## 🚀 Si të nisni aplikacionin për testim

Nga terminali, shkoni në folderin `mobile`:

```bash
cd mobile
npm start
```

### Opsionet e testimit:
1. **Në Celular Fizik (iPhone / Android)**:
   - Shkarkoni aplikacionin falas **Expo Go** nga App Store ose Google Play.
   - Skanoni QR code-in që shfaqet në terminal me kamerën e telefonit tuaj (në iOS) ose brenda aplikacionit Expo Go (në Android).
2. **Në Simulator iOS (macOS)**:
   - Shtypni tastin `i` në terminal ose ekzekutoni `npm run ios`.
3. **Në Emulator Android**:
   - Shtypni tastin `a` në terminal ose ekzekutoni `npm run android`.
4. **Në Shfletues Web**:
   - Shtypni tastin `w` në terminal ose ekzekutoni `npm run web`.

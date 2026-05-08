# SILBE Vocabulary

**Status:** kanonisch — diese Datei ist die einzige Wahrheit für Wortwahl, Tonalität, Begriffe.
**Stand:** 2026-05-07
**Für:** alle Frontend-Texte, alle Editorial-Inhalte, alle Produkttitel/-beschreibungen, alle Email-Templates, alle Social-Posts.

---

## Lese-Reihenfolge für Agents

Wenn ein Agent (Claude Code, Editorial-Agent, oder ein Mensch) Text für SILBE schreibt, ist die Pflicht-Reihenfolge: 1) diese Datei lesen, 2) `brand-tokens.md` für Voice/Tone-Direction lesen, 3) erst dann schreiben. Bei Konflikten zwischen den beiden Dokumenten gewinnt diese Datei für Wortwahl, das andere für Visualisierung.

---

## 1. Tonalität — die fünf Sätze

1. **Editorial, nicht Marketing.** Erklären, kontextualisieren, einladen. Nicht pitchen.
2. **Sie-Form, nicht Du-Form.** Ausnahme: Quote-Reproduktionen müssen Original-Form behalten (Rilke schrieb "Ihrem", nicht "deinem"). Diese Regel war früher anders — der Pivot zur Sie-Form ist Mai 2026 final.
3. **Deutsche Klarheit, kein Influencer-Speak.** Niemals: "literally obsessed", "game-changer", "vibes", "slay", "mood", "krass", "Alter".
4. **Understated, Feuilleton-zugänglich.** Tucholsky-trocken > BuzzFeed-spielerisch.
5. **Konkret-physisch beats Adjektiv-Stack.** "200 g/m² säurefreies Premium-Papier matt, gedruckt in Deutschland" beats "luxuriöses, hochwertiges, einzigartiges Papier".

### Good vs Bad — konkret

| GOOD | BAD |
|---|---|
| „Danke für Ihre Begeisterung rund um das Rilke-Poster. Wir freuen uns sehr." | „OMG wir sind SO excited!!! Danke für ALL the love 💕" |
| „Die Mai-Edition ist verfügbar. Wir versenden DE/AT in 3–6 Werktagen." | „Neu bei uns! Mai-Sale! Nur kurze Zeit! Jetzt zugreifen!" |
| „Kafkas Brief an Oskar Pollak datiert auf den 27. Januar 1904 — eine Notiz, die sich erhalten hat." | „Dieses Kafka-Zitat haut Sie um, trust us." |
| „›Dir, der Du mich nie gekannt!‹ — Stefan Zweig, 1922." | „Zum Mai: ein Memorial-Poster für ALLE Mamas 💐" |
| „Hochweißes Premium-Papier, 200 g/m², matt, säurefrei. Versand 3–6 Werktage." | „Höchste Qualität, perfekt für Ihr Zuhause!" |

---

## 2. Navigation & Page-Begriffe

### Live (post-Mai-2026-Pivot)

| Was | Begriff |
|---|---|
| Shop / Produkte | **Editionen** |
| Journal / Blog | **Bibliothek** |
| Über uns | **Werkstatt** |
| Kollektion-Übersicht | **Alle Editionen** |
| Autoren-Sammlung | **Stimmen** (bleibt) |
| Kontakt | **Kontakt** (bleibt) |

### URL-Routing (final)

```
/                          → Homepage
/editionen                 → Kollektion-Übersicht (alle Produkte)
/editionen/[handle]        → PDP (Produkt-Detail)
/stimmen                   → Autoren-Hub
/stimmen/[author-slug]     → Autoren-Detail (Rilke, Kafka, Mann, Zweig, Ebner-Eschenbach)
/bibliothek                → Editorial-Hub
/bibliothek/[essay-slug]   → Editorial-Article
/werkstatt                 → Über-uns / Editorial-Atelier-Story
/kontakt                   → Kontakt
/impressum                 → Pflicht
/agb                       → Pflicht
/datenschutz               → Pflicht
/widerrufsrecht            → Pflicht (NICHT `/widerruf` — die alte URL war abmahn-relevant)
/widerrufsformular         → Pflicht (separater Handle)
/versand                   → Pflicht
/cookie-einstellungen      → Pflicht
```

301-Redirects vom alten Liquid-Theme: `/collections/alle-werke → /editionen`, `/blogs/journal → /bibliothek`, `/pages/ueber-uns → /werkstatt`, `/pages/autoren → /stimmen`, `/pages/widerruf → /widerrufsrecht`.

---

## 3. Produkt-States

### Was erlaubt ist

| State | Wann verwenden |
|---|---|
| **Verfügbar** | Default für alle aktiven Produkte. Print-on-Demand bei Gelato. |
| **In Vorbereitung** | Produkt ist im Setup, noch nicht bestellbar (Phase-2-Editionen). |
| **Vergriffen** | Edition ist nicht mehr verfügbar (z.B. archivierte Lasker-Schüler-Editionen). Niemals "ausverkauft" — "Vergriffen" ist bookish und passt zur Editorial-Stimme. |

### Was verboten ist (Mai 2026 final)

- ❌ "Limitierte Edition" — bei Print-on-Demand UWG-angreifbar, weil keine echte Stückzahl-Limitierung existiert.
- ❌ "Limitierte Erstauflage" — selbe Begründung.
- ❌ "Edition X von Y" / "Auflage X / 200" — wir tracken keine Stückzahlen.
- ❌ "Handnummeriert" — bei PoD nicht der Fall, faktisch falsch.
- ❌ "Numbered Edition" / "Limited Edition" Englisch-Begriffe.
- ❌ "Sold out" — Englisch, falsche Stimme.
- ❌ "Bald wieder verfügbar", "Coming soon" — entweder es ist verfügbar oder es ist "In Vorbereitung".
- ❌ "Nur noch X Stück" / Scarcity-Counter / Countdown-Timer.

### Werteanker statt "Limitiert"

Wenn das Bedürfnis aufkommt, Produktwert zu kommunizieren, sind diese Werteanker erlaubt und faktisch korrekt:

1. **Quellenstrenge** — „Quelle: ›Briefe an einen jungen Dichter‹, Brief 4, datiert 16.07.1903"
2. **Papierqualität** — „Hochweißes Premium-Papier, 200 g/m², matt, säurefrei"
3. **Wiener Kuration** — „Kuratiert in Wien. Per Hand."
4. **Editorial-Tiefe** — „Mit 400 Wörtern Editorial-Kontext"
5. **Druck-Lokalität** — „Gedruckt in der EU, überwiegend in Deutschland"

Diese Anker reichen. Sie sind ehrlich, prüfbar, juristisch wasserdicht.

---

## 4. Anführungszeichen & Werktitel

### Pflicht-Regeln

- **Zitate (auch ironisch, auch in Quote-Form):** „Habe Geduld gegen alles Ungelöste in Ihrem Herzen." — deutsches Anführungszeichen unten/oben (`„` `"`).
- **Werktitel:** ›Briefe an einen jungen Dichter‹, ›Der Tod in Venedig‹, ›Brief einer Unbekannten‹ — Guillemets (französische Anführungszeichen, einfach).
- **Niemals:** `"..."` (US-Style), `'...'` (US-single), `«...»` (französisch-doppelt, wäre CH-Style aber auf SILBE.at falsch), `‚...'` (deutsche einfache, nur in geschachtelten Zitaten).

### Praktische Beispiele

```
✅ „Geduld zu haben gegen alles Ungelöste in Ihrem Herzen."
   Rainer Maria Rilke · ›Briefe an einen jungen Dichter‹ · 1903

❌ "Geduld zu haben gegen alles Ungelöste in Ihrem Herzen."
   Rainer Maria Rilke · "Briefe an einen jungen Dichter" · 1903

❌ »Geduld zu haben gegen alles Ungelöste in Ihrem Herzen.«
   (französisch-doppelt — falsch für DE-Editorial-Standard)
```

### Quote-Source-Format (universell)

Jede Quote-Reproduktion bekommt ein dreigliedriges Source-Caption:
1. Name (Voll: Rainer Maria Rilke. Bei zweiter Erwähnung: Rilke).
2. Werk in Guillemets (`›...‹`).
3. Datum/Jahr.

```
Rainer Maria Rilke · ›Briefe an einen jungen Dichter‹ · 1903
Franz Kafka · ›Brief an Oskar Pollak‹ · 27.01.1904
Stefan Zweig · ›Brief einer Unbekannten‹ · 1922
Marie von Ebner-Eschenbach · ›Aphorismen‹ · 1880
Thomas Mann · ›Der Tod in Venedig‹ · 1912
```

---

## 5. Umlaute & Sonderzeichen

### Pflicht

- **Umlaute korrekt:** ä ö ü ß
- **Niemals ASCII-Substitutionen:** ae oe ue ss
- **Niemals reine Großschreibung der Substitution:** AE OE UE SS — selbst in Asset-Filenames vermeidbar (siehe brand-tokens.md §6).
- **Apostroph:** typografisches `'` (right single quote), niemals `'` (straight ASCII).
- **Gedankenstrich:** Halbgeviertstrich `–` für Datum-Bereiche und Einschübe (`3–6 Werktage`, `2026–2027`). Geviertstrich `—` selten, nur für betonte Einschübe in Editorial-Long-Form.
- **Bindestrich:** `-` für zusammengesetzte Wörter (`Print-on-Demand`, `silbe-cc-sprint`).

### Quick-Test

Wenn ein Editor-Doc Umlaute als `ae oe ue` enthält, ist es kaputt und muss vor dem Publish gefixt werden. Mai-2026-Audit-Findings haben gezeigt: das passiert öfter als man denkt, besonders bei AI-generierten Texten die durch ASCII-only-Pipelines liefen.

---

## 6. Zahlen & Einheiten

### Schreibung

| Kontext | Form |
|---|---|
| Zahlen ≤ 12 in Fließtext | ausgeschrieben (eine, zwei, drei … zwölf) |
| Zahlen >12 in Fließtext | als Ziffer (13, 30, 200) |
| Maße/Mengen/Daten | immer als Ziffer mit Einheit (200 g/m², 3–6 Werktage, 29,90 €) |
| Jahre | immer als Ziffer (1903, 2026) |

### Einheiten

- `200 g/m²` — mit hochgestelltem `²`, niemals `g/m2`. Geschütztes Leerzeichen zwischen Zahl und Einheit empfohlen.
- `29,90 €` — Komma als Dezimaltrenner (deutsch), Euro-Symbol nach der Zahl mit Leerzeichen.
- `3–6 Werktage` — Halbgeviertstrich, kein Bis-Strich-Bindestrich.

### Konsistenz-Pflichten (P0 aus Site-Review)

Diese Werte sind über die ganze Seite identisch zu halten:

- **Lieferzeit:** `3–6 Werktage` (überall — Trust-Bar, Versand, AGB, FAQ).
- **Material:** `Hochweißes Premium-Papier, 200 g/m², matt, säurefrei` (überall — Hero, PDP, Versand, Über uns).
- **Druck-Lokalität:** `Gedruckt in der EU, überwiegend in Deutschland` (statt "87% DE-lokal" — die Prozentzahl ist UWG-angreifbar, weil unprüfbar).
- **Versand-Verpackung:** `Versandzylinder aus recyceltem Material` (statt "Wachssiegel" oder "Karton" — Inkonsistenz im Site-Review aufgefallen).
- **Anzahl Stimmen:** `fünf Stimmen` (Lasker-Schüler ist seit Mai 2026 archiviert — niemals mehr "sechs Stimmen").

---

## 7. Verbotene Wörter & Phrasen (UWG/Wahrheits-Risk)

Diese Phrasen sind faktisch falsch oder rechtlich angreifbar bei einer Print-on-Demand-Brand mit Gelato-Fulfillment:

| Phrase | Warum verboten | Replacement |
|---|---|---|
| "handgesetzt" | Bleisatz-Konnotation, bei digitalem Druck falsch. UWG §5. | "in Cormorant Garamond gesetzt" oder weglassen |
| "handgedruckt" | Falsch. Gelato druckt digital. | "gedruckt in der EU" |
| "Wir prüfen jedes Blatt selbst" | Ihr seht die Drucke nie. UWG §5. | "Wir kuratieren jede Edition" |
| "Atelier verlässt" | Es gibt kein physisches Atelier — nur ein Editorial-Atelier. | "Werkstatt-Notiz" oder "kuratiert" |
| "Buettenpapier" / "Büttenpapier" | Faktisch falsch (Gelato nutzt Premium-Naturpapier, nicht Bütten). | "Hochweißes Premium-Papier, 200 g/m², matt, säurefrei" |
| "limitiert" / "Limited Edition" | Bei PoD juristisch problematisch. | siehe §3 — Werteanker statt Limitierung |
| "Edition X / Y" | Wir tracken keine Stückzahlen. | weglassen |
| "Subscription" / "Abo" | Wir bieten kein Abo. App-Reste aus Selling-Plan-App. | weglassen |
| "Cancellation Policy" | Englisch, falsche Stimme. | "Widerrufsrecht" |
| "X% kohlenstoffneutral" / "klimaneutral" | UWG-angreifbar wenn nicht zertifiziert. | "CO₂-kompensiert via Gelato" oder weglassen |
| "Mission-F" / "Mission-A/B/C/D/E/G" | Interne Codenames. Niemals frontend-sichtbar. | inhaltliche Beschreibung |
| "Wiener Stimmen" für Mann/Lasker | Geographisch falsch (Mann: Lübeck/München/Pacific Palisades. Lasker: Wuppertal/Berlin/Jerusalem). | "deutschsprachige Klassiker" |

---

## 8. Autoren-Naming

### Vollständige Schreibweisen (Pflicht für erste Erwähnung)

| Autor | Vollform | Kurzform | Lebensdaten |
|---|---|---|---|
| Rilke | Rainer Maria Rilke | Rilke | 1875–1926 |
| Kafka | Franz Kafka | Kafka | 1883–1924 |
| Mann | Thomas Mann | Mann | 1875–1955 |
| Zweig | Stefan Zweig | Zweig | 1881–1942 |
| Ebner-Eschenbach | Marie von Ebner-Eschenbach | Ebner-Eschenbach | 1830–1916 |

### Bezeichnungen die eindeutig sein müssen

- "Ebner-Eschenbach" mit Bindestrich, niemals "Ebner Eschenbach" oder "von Ebner-Eschenbach" (das "von" ist Adelsprädikat, in Kurzform weglassen).
- "Marie von Ebner-Eschenbach" — der Vorname ist „Marie", nicht „Maria". Nicht zu verwechseln mit Rilkes „Rainer Maria".
- "Rainer Maria Rilke" — dreigeteilt, "Maria" ist Mittelname.

### Werkbezüge — final per Autor

| Autor | Hauptwerk-Bezug | Wo verwenden |
|---|---|---|
| Rilke | ›Briefe an einen jungen Dichter‹ (1903) | Homepage, PDP, Stimmen-Page |
| Kafka | ›Brief an Oskar Pollak‹ (1904) — primär; ›Briefe an Milena‹ + ›Aphorismen aus den Oktavheften‹ als sekundär | konsistent über alle Surfaces |
| Mann | ›Der Tod in Venedig‹ (1912) — primär; ›Tonio Kröger‹, ›Buddenbrooks‹, ›Joseph-Tetralogie‹ als Werk-Kontext | konsistent |
| Zweig | ›Brief einer Unbekannten‹ (1922) | Homepage, PDP |
| Ebner-Eschenbach | ›Aphorismen‹ (1880) | Homepage, PDP |

Inkonsistenz zwischen Homepage und Stimmen-Page war P1-Finding im Site-Review. Mit dieser Tabelle gelöst.

---

## 9. Footer-Manifest (Tagline-Pool)

Die canonical Footer-Aussage:

> SILBE versammelt aus Wien kuratierte deutschsprachige Klassiker in kuratierten Editionen. Jede Sendung ist mit Sorgfalt gepackt. Wir sehen die Edition als die kleinste Form eines Verlags.

Hinweis: alte Version war "in handgesetzten Editionen" + "handnummeriert" — beides faktisch falsch und seit Mai 2026 archiviert.

---

## 10. Newsletter-Sprache

### Was funktioniert

- "Kein Newsletter. Ein Brief." als Hook-Linie.
- "Briefe von SILBE" als Newsletter-Name.
- "Lesestoff per Post" als Sub-Tagline für die Anmeldung.
- "Ein Mal im Monat schicken wir einen kurzen literarischen Brief — eine Stimme, ein Satz, eine Notiz aus Wien."

### Was nicht funktioniert

- "Newsletter abonnieren" — DTC-Ton.
- "Subscribe to our newsletter" — Englisch.
- "Erhalten Sie Updates" — Marketing-Sprache.
- "Bleiben Sie informiert" — Banal.

### Pflicht im Form-UI

- Datenschutz-Hinweis nach Art. 13 DSGVO sichtbar **vor** dem Submit-Button.
- Double-Opt-In ist Pflicht (DSGVO AT/DE).
- Footer-Text: "Mit der Anmeldung stimmen Sie unserer Datenschutzerklärung zu. Sie erhalten eine Bestätigungs-E-Mail. Abmeldung jederzeit möglich. Datenschutz: Klaviyo (EU-Server)."

---

## 11. Email-Templates (Sprache)

### Order Confirmation

Subject: `Ihre SILBE-Edition ist auf dem Weg`
Body: editorial Stimme, deutsche Anführungszeichen, Sie-Form. Kein Marketing.

### Shipping Notification

Subject: `Versendet — Sendungsnummer {{tracking_number}}`
Body: knapp, faktisch, mit Tracking-Link.

### Newsletter (Klaviyo)

Subject: `Briefe von SILBE — {{month}} {{year}}`
Body: Ein Zitat, eine Notiz aus Wien, ein Hinweis auf eine Edition. Niemals Sale-Banner, niemals "Letzte Chance"-Subjekt-Lines.

---

## 12. Bestätigung — wenn ein Agent oder Editor schreibt

**Vor jedem Publish-Schritt prüfen:**

- [ ] Sie-Form, nicht Du-Form.
- [ ] Umlaute korrekt (ä ö ü ß), keine ae/oe/ue.
- [ ] Deutsche Anführungszeichen `„"`, Werktitel in Guillemets `›‹`.
- [ ] Keine verbotenen Phrasen aus §7.
- [ ] Lieferzeit, Material, Stimmen-Anzahl konsistent zu §6.
- [ ] Werktitel-Konsistenz nach §8 (kein Mix von "Tod in Venedig" und "Buddenbrooks" auf zwei Surfaces).
- [ ] Kein Subscription-Disclaimer (App-Rest, muss raus).
- [ ] Kein Lorem-Ipsum, kein "Pair text with an image", keine Theme-Defaults.

Diese Checkliste wird in `apps/silbe/scripts/content-lint.ts` als automatisierter Linter implementiert. Build schlägt fehl wenn ein verbotenes Wort im Output-HTML gefunden wird.

---

## 13. Changelog

- **2026-05-07** — Initial lock. Konsolidiert aus Master-Playbook §2.4 + Site-Review-Findings (50 Items) + Research-Synthese (Aesop, Fitzcarraldo, Notting Hill, MUBI, DLA Marbach, Suhrkamp, Diaphanes). Strenge Streichung von "limitiert" / "Edition X/Y" / "handnummeriert" / "Stückzahl-Limitierung". Vokabular-Pivot Navigation: Editionen / Bibliothek / Werkstatt / Stimmen.

# ServiceDock Design-Analyse: Light/Dark Mode Konsistenz

> **Letzte Aktualisierung:** 2026-03-09  
> **Status:** ✅ Alle Inkonsistenzen behoben

## Übersicht

Diese Analyse dokumentiert alle Design-Patterns der verschiedenen Komponenten, um Inkonsistenzen zwischen Light Mode und Dark Mode zu identifizieren.

---

## 1. Referenz-Design: ServiceCard ✅ (BEST PRACTICE)

Die ServiceCard ist das Ziel-Design, das als Standard verwendet werden soll.

```css
/* Container */
bg-white/50 dark:bg-white/[0.12]
backdrop-blur-md
border border-gray-400/60 dark:border-white/10
shadow-xl hover:shadow-2xl

/* Hover */
hover:bg-white/70 dark:hover:bg-white/20
hover:border-gray-500/70 dark:hover:border-white/20

/* Icon-Container */
bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/10 dark:to-white/10
border border-gray-400 dark:border-white/20

/* Text */
text-gray-900 dark:text-white/90       (Titel)
text-gray-700 dark:text-white/60       (Description)
textShadow: '0 1px 3px rgba(0,0,0,0.3)'
```

### Warum es funktioniert:
- **Light Mode:** `bg-white/50` ist durchsichtig genug für Glaseffekt
- **Dark Mode:** `bg-white/[0.12]` (12%) ist sichtbar genug, aber nicht zu opak
- **Konsistente Opacity-Strategie:** Light = höhere Opacity (50-70%), Dark = 12% base, 20% hover

---

## 2. ShortcutLink ✅ (KONSISTENT)

Verwendet das gleiche Pattern wie ServiceCard:

```css
bg-white/50 dark:bg-white/[0.12]
backdrop-blur-md
border border-gray-400/60 dark:border-white/10
```

**Status:** ✅ Konsistent mit ServiceCard

---

## 3. ProxmoxCard ⚠️ (INKONSISTENT)

```css
/* Aktuell */
bg-white/70 dark:bg-gray-900/70      ❌ PROBLEM: gray-900/70 statt white/5
border border-gray-300/50 dark:border-white/[0.12]
```

### Probleme:
1. **Dark Mode:** `bg-gray-900/70` ist viel zu dunkel/opak verglichen mit `bg-white/5`
2. Light Mode verwendet `bg-white/70`, sollte aber `bg-white/50` sein für Konsistenz

### Soll-Werte:
```css
bg-white/50 dark:bg-white/5           ✅ ZIEL
border border-gray-400/60 dark:border-white/10
```

---

## 4. ProxmoxStatsCards (StatCard) ⚠️ (INKONSISTENT)

```css
/* Aktuell */
bg-white/70 dark:bg-gray-900/70      ❌ PROBLEM
border border-gray-300/50 dark:border-white/[0.12]
```

### Probleme:
- Identisch zu ProxmoxCard - `gray-900/70` im Dark Mode ist zu dunkel

### Soll-Werte:
```css
bg-white/50 dark:bg-white/5
border border-gray-400/60 dark:border-white/10
```

---

## 5. SecurityDashboard Cards ⚠️ (INKONSISTENT)

```css
/* Aktuell (OverviewCards, Log-Table) */
bg-white/70 dark:bg-gray-900/70      ❌ PROBLEM
border border-gray-300/50 dark:border-white/[0.12]
```

### Probleme:
- Gleiches Problem wie ProxmoxCard

---

## 6. Settings Page ⚠️ (TEILWEISE INKONSISTENT)

### 6.1 Sidebar & Mobile Nav
```css
/* Aktuell */
bg-white/70 dark:bg-white/10         ⚠️ OK aber inkonsistent mit Rest
```

### 6.2 cardClass (content wrapper)
```css
/* Aktuell - CSS Utility */
.glass {
  background: rgba(255, 255, 255, 0.7);   /* Light: 70% */
}
.dark .glass {
  background: rgba(17, 24, 39, 0.7);      /* Dark: gray-900 mit 70% */
}
```

**Problem:** `.glass` Klasse verwendet `gray-900/70` im Dark Mode!

### 6.3 Settings Sub-Components (AppearanceTab, DashboardsCard, etc.)

**sectionCard (AppearanceTab):**
```css
bg-white/30 dark:bg-white/[0.04]     ✅ GUT! Verwendet white-basiert
border border-gray-200/40 dark:border-white/[0.06]
```

**DashboardsCard Items:**
```css
bg-white/30 dark:bg-white/[0.04]     ✅ GUT!
```

**ProxmoxTab & AddOnsCard Overview Cards:**
```css
bg-white/30 dark:bg-white/[0.04]     ✅ GUT!
ring-2 ring-{farbe}-500/30           ✅ Farbige Akzente
```

**ProxmoxTab & AddOnsCard Modals:**
```css
bg-white/70 dark:bg-gray-900/70      ⚠️ PROBLEM im Modal-Body
```

---

## 7. ProxmoxStatusDashboard (stats/* Cards) ⚠️ (INKONSISTENT)

**StatCard.jsx (Basis für alle Status-Cards):**
```css
bg-white/70 dark:bg-gray-900/70      ❌ PROBLEM
border border-gray-300/50 dark:border-white/[0.12]
```

---

## 8. ProxmoxGrid ⚠️ (GEMISCHT)

**Filter/Sort Toolbar:**
```css
bg-white/70 dark:bg-white/10         ⚠️ Unterschiedliche Pattern
```

**Cards Container:**
Verwendet ProxmoxCard → siehe oben

---

## Zusammenfassung: Inkonsistenz-Matrix

| Komponente | Light Mode | Dark Mode | Status |
|------------|------------|-----------|--------|
| ServiceCard | `white/50` | `white/5` | ✅ REFERENZ |
| ShortcutLink | `white/50` | `white/5` | ✅ OK |
| ProxmoxCard | `white/70` | `gray-900/70` | ❌ FIX NEEDED |
| ProxmoxStatsCards | `white/70` | `gray-900/70` | ❌ FIX NEEDED |
| StatCard (stats/) | `white/70` | `gray-900/70` | ❌ FIX NEEDED |
| SecurityDashboard | `white/70` | `gray-900/70` | ❌ FIX NEEDED |
| .glass CSS | `white/70` | `gray-900/70` | ❌ FIX NEEDED |
| Settings sectionCard | `white/30` | `white/[0.04]` | ✅ OK |
| Settings Modals | `white/70` | `gray-900/70` | ⚠️ PRÜFEN |
| ProxmoxGrid Toolbar | `white/70` | `white/10` | ⚠️ PRÜFEN |

---

## Vorgeschlagene Fixes

### Design-Token-System (Empfehlung)

Statt individuelle Klassen überall zu haben, sollten wir **zentrale Design-Tokens** definieren:

```css
/* In index.css oder tailwind.config.js */

/* Card Backgrounds */
--card-bg-light: rgba(255, 255, 255, 0.5);
--card-bg-dark: rgba(255, 255, 255, 0.05);

/* Card Backgrounds (stärker, z.B. für Modals) */
--card-bg-solid-light: rgba(255, 255, 255, 0.7);
--card-bg-solid-dark: rgba(255, 255, 255, 0.08);

/* Borders */
--border-light: rgba(156, 163, 175, 0.6);
--border-dark: rgba(255, 255, 255, 0.1);
```

### Konkrete Tailwind-Klassen zum Ersetzen

**Pattern A: Standard Cards (transparent)**
```css
/* ALT */
bg-white/70 dark:bg-gray-900/70

/* NEU */
bg-white/50 dark:bg-white/5
```

**Pattern B: Modals/Overlays (etwas opaker)**
```css
/* ALT */
bg-white/90 dark:bg-gray-900/90

/* NEU */
bg-white/70 dark:bg-white/10
/* ODER für mehr Lesbarkeit */
bg-white/80 dark:bg-gray-900/80   (akzeptabel für Modals)
```

**Pattern C: Borders**
```css
/* ALT */
border-gray-300/50 dark:border-white/[0.12]

/* NEU */
border-gray-400/60 dark:border-white/10
```

---

## Dateien die geändert werden müssen

1. **`/frontend/src/index.css`** - `.glass` Utility-Klasse
2. **`/frontend/src/components/ProxmoxCard.jsx`** - Container
3. **`/frontend/src/components/ProxmoxStatsCards.jsx`** - StatCard
4. **`/frontend/src/components/stats/StatCard.jsx`** - Basis-Card
5. **`/frontend/src/components/SecurityDashboard.jsx`** - OverviewCards + LogTable
6. **`/frontend/src/components/ProxmoxGrid.jsx`** - Toolbar & Filter
7. **`/frontend/src/components/settings/ProxmoxTab.jsx`** - Modal backgrounds
8. **`/frontend/src/components/settings/AddOnsCard.jsx`** - Modal backgrounds
9. **`/frontend/src/components/SettingsPage.jsx`** - Sidebar Nav
10. **`/frontend/src/components/CustomSelect.jsx`** - Dropdown

---

## ⚠️ KRITISCH: GPU-Layer & backdrop-blur Problem

### Das Problem

Wenn eine **CSS-Animation mit `transform`** auf einem **Parent-Element** liegt, erstellt der Browser einen separaten **GPU Compositing Layer**. Das Kind-Element mit `backdrop-blur` wirkt dann nur **innerhalb dieses Layers** — nicht gegen den echten Hintergrund (Wallpaper).

**Symptom:** Cards erscheinen "zu transparent" oder der Blur-Effekt fehlt komplett.

### Falsches Pattern ❌

```jsx
{/* Wrapper mit Animation erstellt GPU-Layer */}
<div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
  <ProxmoxCard ... />  {/* backdrop-blur wirkt nur innerhalb des Layers! */}
</div>
```

### Korrektes Pattern ✅

```jsx
{/* Animation direkt auf dem Element mit backdrop-blur */}
<ProxmoxCard 
  className="animate-fade-up" 
  animationDelay={0.1}
  ...
/>
```

### CSS-Fix für Animationen

```css
@keyframes fadeUpIn {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: none;  /* ✅ WICHTIG: "none" statt "translateY(0)" */
  }
}
```

**Warum `transform: none`?**
- `translateY(0)` behält den GPU-Layer nach der Animation
- `none` entfernt den Layer komplett → `backdrop-blur` wirkt wieder normal

### Betroffene Komponenten

| Komponente | Fix |
|------------|-----|
| ProxmoxCard | `animationDelay` Prop + Animation direkt auf Card |
| ServiceCard | Animation bereits direkt auf Element ✅ |
| SecurityDashboard Cards | Animation bereits direkt auf Element ✅ |
| StatCard (stats/) | Animation bereits direkt auf Element ✅ |

---

## Nächste Schritte

1. ~~**Entscheidung:** Welches Opacity-Level für Modals? (`white/70` oder `white/80`?)~~ ✅ Erledigt: `white/10` für Dark Mode
2. ~~**Bulk-Replace:** Alle `dark:bg-gray-900/70` durch `dark:bg-white/[0.12]` ersetzen~~ ✅ Erledigt
3. ~~**CSS-Utility:** `.glass` Klasse auf neues Pattern aktualisieren~~ ✅ Erledigt
4. ~~**Test:** Alle Bereiche in Light UND Dark Mode visuell prüfen~~ ✅ Erledigt
5. **WICHTIG:** Bei neuen Animationen NIEMALS Wrapper mit `transform` um `backdrop-blur` Elemente!

---

## Visueller Vergleich

### Light Mode Opacity-Guide
| Opacity | Verwendung |
|---------|------------|
| `white/30` | Sub-Sections innerhalb von Cards |
| `white/50` | Standard Cards (ServiceCard, ProxmoxCard) |
| `white/70` | Modals, stärker hervorgehobene Elemente |
| `white/80-90` | Dialoge mit viel Text |

### Dark Mode Opacity-Guide (WHITE-basiert)
| Opacity | Verwendung |
|---------|------------|
| `white/[0.04]` | Sub-Sections innerhalb von Cards |
| `white/[0.12]` | Standard Cards (ServiceCard, ProxmoxCard, StatCard) |
| `white/10` | Modals, Toolbars |
| `white/15-20` | Dialoge mit viel Text, Hover-States |

**WICHTIG:** Im Dark Mode sollte IMMER `white/X` verwendet werden, NICHT `gray-900/X`, da `white/X` besser mit dem Hintergrund harmoniert!

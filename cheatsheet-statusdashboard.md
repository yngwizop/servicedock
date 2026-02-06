# Cheatsheet: Proxmox Status Dashboard Styling

## 🎯 Grundprinzipien

### Gleichmäßige Abstände
- **Seitenränder = Unterer Rand** - Alle Cards müssen gleichmäßige Abstände haben
- Ränder links/rechts/unten sollten identisch groß sein
- Bei zu viel Platz nach unten: Spacing zwischen Elementen erhöhen

### Grid-Layout System
- Basiert auf `react-grid-layout` mit `rowHeight=75px`
- 4-Spalten-Grid (lg breakpoint)
- Cards haben `minH`, `maxH`, `minW`, `maxW` Constraints

## 📏 Card-Sizing Regeln

### Resize-Verhalten
- **Kein Scrolling in Cards** - User nutzt Drag-Resize statt Scrollbars
- Cards haben Mindestgrößen (`minH`) für optimale Darstellung
- Content muss bei `minH` komplett sichtbar sein (nichts außerhalb)

### Spezielle Card-Constraints

#### Ceph Health Card
- `minH: 5`, `maxH: 6` - Kompakte Card, nicht zu groß skalierbar
- Status-Content mit `flex-1` und `justify-center` für perfekte Zentrierung
- OSD Overview mit Border-Top am unteren Rand (ohne `mt-auto`)
- **Layout**: Status zentriert in verfügbarem Raum, OSD Info statisch unten

```jsx
<div className="flex flex-col h-full">
  <div className="flex-1 flex flex-col justify-center items-center">
    {/* Status Icon + Badge - automatisch zentriert */}
  </div>
  <div className="pt-2 border-t">
    {/* OSD Overview - bleibt unten */}
  </div>
</div>
```

#### Ceph OSDs Card
- **Nur horizontal resizable**: `minH = maxH = 5`
- Macht keinen Sinn vertikal zu vergrößern
- `mt-auto` für Status Info → schiebt Content nach unten

#### Storage per Node Card
- `minH: 6` (450px) - Mindestgröße für 3 Nodes
- `maxH: 12` - Dynamisch erweiterbar bei mehr Nodes
- Muss sich automatisch an Anzahl der Nodes anpassen

#### Storage by Type Card
- `minH: 6`, horizontal resizable: `minW: 1` (1/4 Breite)
- Muss dynamisch wachsen bei vielen Storage-Types

## 🔧 Spacing-Optimierung

### Kompaktes Layout bei minH
Wenn Card zu viel Platz nach unten hat:
1. `space-y` zwischen Elementen reduzieren
2. `padding` (p-*) in Boxen verkleinern
3. `margin-bottom` (mb-*) zwischen Sections minimieren
4. `mt-auto` für Bottom-Content nutzen

### Content-Verteilung
```jsx
// Beispiel: Content mit mt-auto nach unten schieben
<div className="flex flex-col h-full">
  <div className="space-y-2">
    {/* Haupt-Content */}
  </div>
  <div className="mt-auto pt-2 border-t">
    {/* Footer-Content */}
  </div>
</div>
```

## 📐 Typische Spacing-Werte

### Zwischen Elementen
- Sehr kompakt: `space-y-1` (4px)
- Standard: `space-y-2` (8px)
- Luftig: `space-y-3` (12px)

### Box-Padding
- Kompakt: `p-1.5` / `p-2`
- Standard: `p-2.5` / `p-3`
- Groß: `p-4`

### Margins
- Minimal: `mb-0.5`, `mt-0.5`
- Klein: `mb-1`, `mt-1`
- Standard: `mb-2`, `mt-2`

## ⚠️ Häufige Probleme

### Problem: Content schaut unten raus
**Lösung**: 
- `minH` im Grid-Layout erhöhen
- Spacing innerhalb der Card reduzieren

### Problem: Zu viel Platz nach unten
**Lösung**:
- Spacing zwischen Elementen erhöhen
- `mt-auto` für letzten Block verwenden
- Border-top Padding erhöhen (`pt-*`)

### Problem: Schrift zu klein/groß
**Lösung**:
- Originale Tailwind-Classes beibehalten:
  - Icons: `text-lg` / `text-base`
  - Header: `text-base` / `text-sm`
  - Details: `text-xs`

## 🎨 Design-Konsistenz

### StatCard Component
- Nutzt `flex flex-col h-full` für volle Höhe
- Header mit Drag-Handle ist fix (`flex-shrink-0`)
- Content-Bereich nimmt verfügbaren Raum (`flex-1`)

### Responsive Verhalten
- Cards passen sich Grid-Constraints an
- Keine fixen Höhen im Content - nur relatives Spacing
- `overflow-y-auto` vermeiden - nutze Resize stattdessen

## 📋 Checkliste vor Commit

- [ ] Seitenränder = Unterer Rand
- [ ] Content bei minH vollständig sichtbar
- [ ] Kein `overflow-y-auto` in Cards
- [ ] minH/maxH/minW/maxW korrekt gesetzt
- [ ] Schriftgrößen konsistent mit anderen Cards
- [ ] Spacing gleichmäßig verteilt

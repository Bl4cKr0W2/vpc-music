# 🎶 VPC Music

A feature-rich song management and performance tool — blending the best of OnSong, our current site, and solutions to real pain points musicians face on stage and in rehearsal. **VPC Music uses [ChordPro](https://www.chordpro.org/) as its native song format**, with built-in converters to migrate existing `.chrd` and OnSong libraries.

> **Monorepo**: Express API · PostgreSQL/Drizzle · React/Vite SPA · RBAC · ChordPro Engine  
> **Stack**: pnpm workspaces · React 19 · Vite 7 · TypeScript · Tailwind CSS 4 · Radix UI (shadcn/ui pattern) · Express.js · Drizzle ORM · PostgreSQL 16 · Socket.io · Docker

> **📂 Existing Assets:** We have a Dropbox full of music items (chord charts, lyrics, recordings, etc.) that can be referenced or imported as needed during development and migration.

---

## 🏗️ Legacy Site (Current ChurchMusic App)

The current site is a PHP/JS web app (`ChurchMusic/`) that serves as the foundation VPC Music will replace and build upon. **Every feature below must be carried forward** into the new app.

### Custom `.chrd` File Format
Songs use a custom text format with line-type prefixes:
| Prefix | Meaning |
|---|---|
| *(first line)* | Song title |
| *(second line)* | Song key (e.g. `G`) |
| *(subsequent header lines)* | Metadata — author, year, notes |
| `#` | **Primary chord line** (displayed above lyrics, color-coded) |
| `^` | **Secondary chord line** (alternate voicings / secondary instrument, different color) |
| `@` | **Lyric line** |
| `*` | **Comment/annotation** (italic, toggleable visibility) |
| *(blank line + first line of next block)* | Section header (Verse, Chorus, Bridge, etc.) |

### Song Display & Rendering
- Chord lines rendered with bracket notation: `[G] [C] [D]`
- Primary chords (`#`) and secondary chords (`^`) styled with distinct colors
- Nashville Number System rendering — auto-converts letter chords to numbers relative to the song key
- Toggle between letter notation and number notation
- Comments (`*` lines) rendered in italic with toggle visibility
- Song sections parsed and rendered with headers
- Song title set as browser page title

### Transpose & Key Management
- **Transpose up / down** — step-by-step semitone transposition (buttons in toolbar)
- **Direct key picker** — popup with all 12 chromatic keys (C, Db, D, Eb, E, F, Gb, G, Ab, A, Bb, B) for instant key change
- **Key via URL parameter** — deep-link to any song in a specific key (e.g. `?song=amazing_grace&key=C`)
- **Chord spacing preservation** — after transposing, chord spacing is recalculated to maintain alignment over lyrics
- Key display updates dynamically; search page carries selected key forward

### Themes & Display
- **Dark / Light theme toggle** — persisted in localStorage, applied globally
- Dark theme: black background, green chords, purple secondary chords
- Light theme: white background, red chords, purple secondary chords
- **Toggle bracket visibility** — show or hide `[ ]` around chord names
- **Toggle comments visibility** — show or hide comment annotations
- **Zoom controls** — zoom in/out (persisted per session)
- **Responsive zoom levels** — different zoom for mobile (0.65) vs tablet (0.9)
- **Print stylesheet** — strips toolbar/navigation, forces white background, clean chord colors

### Navigation & Search
- **Song search page** — lists all songs, real-time text filtering by name and tags
- **Hidden/draft songs** — songs prefixed with `~` are hidden from the default list; revealed by triple-clicking the search button
- **Bottom bar section navigation** — dynamically generated from song section headers (Verse 1, Chorus, Bridge, etc.)
- **Scroll to Top** button
- **Smooth scroll with highlight animation** — navigating to a section scrolls smoothly and flashes a background highlight

### Export
- **OnSong export** — generates `.onsong` file download with proper chord-over-lyric placement (ChordPro inline format)
- Full conversion engine from `.chrd` → OnSong format, including chord position merging with lyrics

### Utility
- **NoSleep mode** — uses NoSleep.js to prevent screen dimming during performance (with visual indicator)
- **Disable double-tap zoom** — `touch-action: manipulation` on all interactive elements for reliable stage tapping
- **Persistent user preferences** — theme, bracket visibility, comment visibility, notation mode, and zoom level saved in localStorage
- **Toolbar conditionally shown** — song-specific controls hidden until a song is loaded

### Song Library
- 100+ songs in `.chrd` format in the `songList/` directory
- Includes metadata (author, year) in song headers
- Draft/work-in-progress songs prefixed with `~`
- Song library toolbar supports text search, key filtering, tag filtering sourced from the song-tag catalog endpoint, minimum/maximum BPM filtering, sort modes for title, last edited, most used, and recently added, previous/next pagination controls, and key-aware song links that open charts in the selected search key
- Song metadata now includes optional alternate names plus an associated shout/callout field across edit, full-view, shared-view, and song-library search flows
- BPM metadata now shows a tempo pulse indicator on library, dashboard, song view, shared song view, and performance mode screens when tempo is available

---

## 🎼 Native Format: ChordPro

VPC Music adopts the **[ChordPro](https://www.chordpro.org/) standard** as its canonical song format. ChordPro is an open, widely-supported plain-text format that embeds chords inline with lyrics using bracket notation.

### Why ChordPro?
- **Industry standard** — supported by OnSong, BandHelper, SongBook, SongSelect, and dozens of other tools
- **Human-readable** — songs are plain text files that are easy to read, edit, and version-control
- **Rich directive set** — titles, subtitles, keys, tempo, capo, sections, comments, and custom metadata via `{directive: value}` syntax
- **Portable** — import/export across virtually every chord chart app on the market
- **Future-proof** — active spec maintained at [chordpro.org](https://www.chordpro.org/chordpro/)

### ChordPro Quick Reference
```
{title: Amazing Grace}
{key: G}
{tempo: 72}
{artist: John Newton}

{comment: Verse 1}
[G]Amazing [G/B]grace, how [C]sweet the [G]sound
That [G]saved a [Em]wretch like [D]me

{comment: Chorus}
[G]I once was [G/B]lost, but [C]now am [G]found
Was [G]blind but [D]now I [G]see
```

### Migration Path

All existing songs will be converted to ChordPro during the migration:

| Source Format | Conversion | Notes |
|---|---|---|
| **`.chrd`** (legacy custom format) | `.chrd` → ChordPro | Prefix-based lines (`#`, `^`, `@`, `*`) mapped to ChordPro directives and inline chord notation. Secondary chords (`^`) preserved via custom directives. |
| **OnSong** (`.onsong`) | OnSong → ChordPro | OnSong already uses a ChordPro-like format; conversion is mostly structural cleanup and directive normalization. |
| **OpenSong** (`.xml`) | OpenSong → ChordPro | XML-based format parsed and re-emitted as ChordPro. |
| **PDF** (`.pdf`) | PDF → ChordPro | Geometry-aware extraction via [PDF.co](https://pdf.co/) API — supports single- and two-column layouts, chord-line classification, and chord-to-word positional alignment. See [PDF Import Strategy](#-pdf-import-strategy) below. |
| **Plain text** | Manual / Paste | Paste lyrics and add chords via the Easy Song Creator wizard. |

The legacy `.chrd` converter will handle:
- `^` lines → secondary chord annotations (custom ChordPro directive or comment)
- `*` lines → `{comment: ...}` directives
- Song title, key, author, and year → standard ChordPro `{title}`, `{key}`, `{artist}`, `{year}` directives
- Section headers → `{comment: Verse 1}`, `{start_of_chorus}` / `{end_of_chorus}`, etc.
- Draft prefix `~` → metadata flag for draft status

### 📄 PDF Import Strategy

PDF chord charts are one of the most common formats musicians share, but they're the hardest to parse because they're visual documents, not structured data. VPC Music will use a geometry-aware pipeline to convert PDFs into ChordPro.

**Parsing Engine: [PDF.co](https://pdf.co/)**

PDF.co's text extraction API returns text elements with **positional coordinates** (x, y, width, height, font info), giving us the spatial data needed to reconstruct the chord chart layout.

**Pipeline Overview:**

```
PDF upload
  → PDF.co API (extract text with coordinates)
  → Column detection (single vs. two-column layout)
  → Per-column line assembly
  → Chord-line vs. lyric-line classification
  → Chord-to-word positional alignment
  → ChordPro output with inline [chord] notation
  → User review & correction UI
```

**Step-by-step:**

1. **Extract text with coordinates** — call PDF.co's `/pdf/convert/to/text` or `/pdf/documentparser` endpoint, retrieving every text element with its `(x, y)` position, font name, and font size

2. **Column detection** — analyze the x-coordinate distribution of text elements:
   - **Single-column:** all text clusters within one x-range
   - **Two-column:** distinct left-half and right-half x-clusters with a gap in between
   - Split elements into columns by the detected gutter boundary; process left column first (top-to-bottom), then right column

3. **Line assembly** — within each column, group text elements by y-coordinate proximity (elements on the same horizontal baseline = same line). Sort groups top-to-bottom to establish reading order

4. **Chord-line classification** — distinguish chord lines from lyric lines using heuristics:
   - Chord lines contain mostly recognized chord tokens (`A`, `Bm`, `F#m7`, `Gsus4`, `C/E`, etc.) with whitespace gaps
   - Chord lines are typically shorter, have wider spacing between tokens, and may use a different font/size/weight
   - Lyric lines contain natural language words and punctuation
   - Section headers (Verse, Chorus, Bridge, etc.) detected by keyword matching and/or bold/italic font styling

5. **Chord-to-word alignment** — the key geometry step, assuming monospace-like positioning:
   - For each chord token on a chord line, note its **x-position** (character offset from left margin)
   - On the corresponding lyric line directly below, find the **word or syllable** whose x-position is at or just after the chord's x-position
   - Insert the chord in ChordPro inline format: `[Chord]word`
   - If a chord falls between words or mid-word, insert it at the closest syllable boundary
   - If no lyric line follows a chord line (instrumental sections), emit the chord line as a standalone `[Chord]` sequence

6. **Metadata extraction** — look for title (typically the largest/boldest text at top), key, tempo, author, and copyright info (often at bottom or header) and map to ChordPro directives

7. **Section detection** — identify section labels (Verse, Chorus, Bridge, Pre-Chorus, Interlude, Tag, Outro, etc.) and emit appropriate ChordPro directives (`{comment: Verse 1}`, `{start_of_chorus}`, etc.)

8. **User review** — present the converted ChordPro alongside a rendered preview for the user to verify and correct any alignment or parsing errors before saving

**Edge cases to handle:**
- **Mixed fonts** — some PDFs use a proportional font for lyrics and a monospace font for chords; use font metadata to improve classification
- **Scanned PDFs** — route through OCR (PDF.co supports OCR mode) before the text extraction step
- **Chord-only sheets** — no lyrics, just section headers and chord progressions; emit as `{comment}` blocks with chord-only lines
- **Repeat/coda/DS markings** — detect and preserve as ChordPro comments or custom directives
- **Multi-page songs** — stitch pages in order before column/line assembly

> **Note:** PDF import is fully implemented. The geometry-aware pipeline handles single- and two-column layouts, chord-line classification, chord-to-word positional alignment, and metadata extraction (title, key, tempo, artist, copyright).

---

## Features

### 🎵 Song Management

- **Original / Custom / Variation toggle** — switch between the canonical version, your personal edits, or named variations
- **New Song** — create songs from scratch in ChordPro format
- **Edit (clone from original)** — safely edit by branching from the original; never lose the source
- **Easy Song Creator** — guided wizard for quick song entry (outputs ChordPro)
- **Transpose** — instant key changes with chord recalculation (step-by-step semitone buttons + direct key picker with all 12 keys)
- **Key via URL** — deep-link to any song in a specific key
- **Quick Navigation** — dropdown to jump between song sections (Verse, Chorus, Bridge, etc.) with smooth scroll and highlight animation
- **Sticky Notes** — attach personal reminders to any song or section ✅ *Implemented*
- **Song Status Indicator** — visual flags for incomplete data (e.g. missing chords, no tempo set)

### ✏️ ChordPro Editor ✅

The built-in ChordPro editor provides a rich editing experience with real-time feedback:

**Syntax Highlighting** — transparent textarea overlay architecture with 5 token types:
- **Chords** (`[G]`, `[C#m7]`, `[Bb/F]`) — gold/bold
- **Directives** (`{title: ...}`, `{key: ...}`) — sky-blue
- **Section headers** (`{comment: Verse 1}`) — gold/bold/italic
- **Lyrics** — default foreground
- **Invalid syntax** — red wavy underline (unclosed brackets/braces)

**Inline Validation** — real-time error/warning panel below the editor:
- Missing closing `]` bracket, unbalanced `{`/`}` braces
- Unknown directives, duplicate unique directives (title, key, tempo, etc.)
- Collapsible issue list with line numbers, severity icons, and one-click fixes for common syntax/chord cleanup issues

**Keyboard Shortcuts:**

| Shortcut | Action |
|---|---|
| `Ctrl+S` | Save song |
| `Ctrl+/` | Toggle comment on selected line(s) |
| `Ctrl+K` | Insert chord at cursor / open chord popup on selection |
| `Ctrl+Shift+V` | Insert Verse header |
| `Ctrl+Shift+C` | Insert Chorus header |
| `Ctrl+Shift+B` | Insert Bridge header |
| `Alt+Up` | Transpose selected chords up one semitone |
| `Alt+Down` | Transpose selected chords down one semitone |

**Insert Menu** — 19 quick-insert options including all section types, metadata block template, and full song skeleton.

**Help Section** — collapsible 4-tab reference panel (Quick Tips, Shortcuts, Common Directives, Section Templates) with localStorage persistence.

**Smart Suggestions & Context Help** — the editor now suggests missing metadata, unlabeled Verse/Instrumental sections, likely chorus blocks, and malformed chord spellings, while a live cursor-aware help card adapts to directive, section, chord, and lyric contexts.

**Section Organizer** — advanced mode now includes a structured section organizer with previews, jump-to-line shortcuts, drag-and-drop source reordering, fold/expand controls, and auto-numbered duplicate section actions.

**Arrangement Builder** — existing songs can now build a reusable section order with repeat markers like `Chorus ×2`, preview the generated arrangement, and save it as a new song variation.

**Rich Editor Foundation** — advanced mode now uses a CodeMirror 6 editing surface with native line numbers, active-line highlighting, custom ChordPro syntax decorations, and inline diagnostics while beginner mode keeps the existing textarea workflow as a compatibility fallback.

**Accessibility & Tablet Upgrades** — sticky editor toolbar, quick section-jump chips, keyboard shortcuts for format/help/section navigation (`Ctrl+Shift+F`, `F1`, `Ctrl+P`, `Ctrl+1/2/3`), mobile/tablet bottom-sheet editor menus, and labeled dialog/tool controls for screen readers.

**Beginner / Advanced Modes** — beginner mode keeps examples and help visible with a simplified toolbar, while advanced mode restores split preview, section power tools, formatting controls, and compact shortcut chips. The mode preference is persisted from Settings.

### 📁 Song Metadata

| Field | Description |
|---|---|
| **Title** | Primary song name |
| **AKA / Alternate Names** | Search and display by any known name |
| **Tags** | Flexible categorization (genre, mood, season, etc.) |
| **Tempo** | BPM value with a **visual blinker/metronome** |
| **Associated Shout** | Linked spoken cues or callouts |
| **Lyrics** | Full lyrics with section markers |
| **Chords** | Inline or above-lyric chord notation |
| **Notes** | Freeform musician notes |
| **Staff** | Traditional staff/sheet music attachment |

### 🎨 Styling & Layout

- **Themes & User Page Styles**
  - **Dark / Light theme toggle** (carried forward from current site) with persistent preference
  - Background / page color customization with live preview from Settings
  - Primary + secondary chord color customization for editor syntax and rendered charts
  - Rendered-song font is fixed to a monospace stack for alignment consistency
  - Theme presets: **Stage Dark**, **Print Light**, **Classic**, and **Custom**
- **2-Pane View** — side-by-side display (lyrics + chords, two songs, etc.)
- **Compressed / Spaced Layout** — toggle density to fit more on screen or improve readability
- **Word Wrap** — responsive text wrapping for any screen size
- **Toggle Bracket Visibility** — show or hide `[ ]` around chord names (carried forward from current site)
- **Toggle Comments Visibility** — show or hide comment/annotation lines
- **Number Notation** — Nashville Number System support with toggle between letter chords and number notation
- **Versatile Input** — modifier syntax (e.g. `+` / `-`) for quick chord and note adjustments
- **Secondary Chord Lines** — support for alternate voicings / secondary instrument chords (distinct color)
- **Zoom Controls** — pinch-to-zoom, buttons, or font scaling with persistent preference
- **Responsive Mobile/Tablet Zoom** — automatic zoom adjustments per device class
- **High Contrast Mode** — optional low-vision theme with stronger borders, brighter focus rings, and higher color separation
- **Print Stylesheet** — clean print output that strips UI chrome and forces readable colors

### 🎨 CSS Design System ✅

The web app uses a comprehensive CSS design system defined in `apps/web/src/styles/index.css` with Tailwind CSS v4 (CSS-first configuration via `@theme {}`). Reusable component classes live in a `@layer components {}` block.

**Design Tokens** (added to `@theme`):
- `--shadow-card`, `--shadow-card-hover`, `--shadow-dropdown`, `--shadow-modal` — elevation system
- `--duration-fast` (150ms), `--duration-normal` (200ms), `--duration-slow` (300ms) — transition timing

**Component Classes:**

| Category | Classes | Description |
|---|---|---|
| **Buttons** | `.btn`, `.btn-primary`, `.btn-outline`, `.btn-ghost`, `.btn-destructive`, `.btn-success`, `.btn-sm`, `.btn-xs`, `.btn-icon` | Full button system with variants, sizes, and icon-only |
| **Inputs** | `.input`, `.select` | Form controls with focus rings and dark mode support |
| **Cards** | `.card`, `.card-interactive`, `.card-body`, `.card-body-lg`, `.card-empty` | Elevated containers with hover states and empty states |
| **Badges** | `.badge`, `.badge-muted`, `.badge-success`, `.badge-warning`, `.badge-key` | Status and metadata badges |
| **Modals** | `.modal-backdrop`, `.modal-content` | Overlay and centered dialog |
| **Headers** | `.section-header`, `.section-title`, `.section-title-icon`, `.page-header`, `.page-title` | Consistent page and section headings |
| **Lists** | `.list-container`, `.list-item` | Divided list with hover states |
| **Links** | `.link-muted`, `.link-accent` | Styled anchor variants |
| **Effects** | `.glass` | Backdrop-blur glass morphism effect |
| **Loading** | `.spinner` | Animated spin indicator |

**AppShell / Header:**
- Sticky glass header with `backdrop-blur` and semi-transparent background
- Mobile hamburger menu with slide-down drawer for screens < 768px
- Active nav indicator via gold underline CSS pseudo-element on `NavLink`
- User avatar showing gold circle with white initials from display name

### 🔍 Navigation & Search

- **Search Bar** — full-text search across titles, AKAs, tags, and lyrics with real-time filtering
- **Quick Nav (Sections Dropdown)** — jump to any section within a song instantly, with smooth scroll and highlight animation
- **Hidden/Draft Songs** — mark songs as drafts (hidden from default list, accessible via toggle)
- **Scroll to Top** — quick-return button during song viewing
- **Key-Aware Search** — carry a selected key through from search into song view

### 📤 Import, Export & Print

**Import (→ ChordPro):**
- **`.chrd` Import** — convert the legacy custom format into ChordPro (see [Migration Path](#migration-path) above)
- **OnSong Import** — import `.onsong` files and normalize to ChordPro
- **OpenSong Import** — import OpenSong XML files and convert to ChordPro
- **ChordPro Import** — directly import standard `.chopro` / `.chordpro` / `.cho` files
- **PDF Import** — geometry-aware extraction via PDF.co with column detection, chord-line classification, and chord-to-word alignment (see [PDF Import Strategy](#-pdf-import-strategy) above)
- **Plain Text / Paste** — paste lyrics and add chords via the Easy Song Creator

**Export (from ChordPro →):**
- **ChordPro Export** — native format, always available
- **OnSong Export** — generate `.onsong` files with proper chord-over-lyric placement (carried forward from current site's conversion engine)
- **PDF Export** — formatted chord chart with layout control
- **Plain Text Export** — chords-over-lyrics or lyrics-only
- **Print with Layout Control** — configure columns, font size, and section visibility before printing; clean print stylesheet that strips UI chrome

### 📚 Song Sets & Groups

- **Song Groups** — implemented reusable song collections with filtering and inline management
- **Delegated Song Groups** — implemented delegated per-group management for assigned users
- **Shared Songs** — implemented authenticated sharing to individual users, reusable teams, and other organizations, including an editable batch-share workflow plus a “Shared with me” library scope
- **Shared Sets** — share entire setlists for collaborative performance prep
- **Categories** — high-level buckets (e.g. Weddings, Church, Special Events)

### 👥 User Roles & Settings

- **Login** — secure authentication
- **Organizations** — churches/teams modeled as organizations; users belong to orgs with per-org roles
- **Org switcher** — header org selector persists the active org in localStorage and sends it to the API via `X-Organization-Id`
- **Org creation flow** — owners and worship leaders can create an organization from the header switcher or empty-org onboarding state
- **Owner org visibility** — global owners receive all organizations in their auth payload, not just direct memberships
- **Roles**
  | Scope | Role | Permissions |
  |---|---|---|
  | Global | **Owner** | Super-admin across all orgs |
  | Org | **Worship Leader** (admin) | Full access within org — manage songs, setlists, events, invite members |
  | Org | **Musician** | View and interact with org content |
  | Org | **Observer** | Read-only access to org content |
- **Share Links** — generate token-based read-only links to share individual songs with anyone (no login required); recipients can transpose, toggle chords, and auto-scroll but cannot edit, delete, or see the library
- **User Settings**
  - Default themes
  - Notifications (new songs, modifications, shared content)

### 🛠️ Utility Tools

- **NoSleep Mode** — prevent screen dimming during performance with visual indicator (carried forward from current site)
- **Disable Double-Tap Zoom** — reliable stage tapping without accidental zoom on touch devices
- **Persistent User Preferences** — theme, bracket visibility, comment visibility, notation mode, zoom level all saved and restored per user
- **Accessibility polish** — stronger global focus states, screen-reader labels on editor/toolbars/dialogs, and 44px coarse-pointer touch targets
- **Toolbar Conditional Display** — song-specific controls hidden until a song is loaded (clean empty state)
- **Button Actions** — inline controls for transpose, song switching, scroll
- **Feedback & Recommendations** — in-app feedback loop for feature requests and song suggestions

---

## 💡 Suggested Additions

Here are some features worth considering that could take VPC Music to the next level:

### Performance Mode
- **Auto-Scroll** — configurable scroll speed per song, tempo-synced or manual
- **Setlist Countdown Timer** — configurable 2–10 min timer per song with progress bar, pause/play, warning states ✅ *Implemented*
- **Performance-mode layout** — full-screen distraction-free overlay with large fonts (12–36px), no nav, collapsible toolbar ✅ *Implemented*
- **Setlist song transitions** — prev/next buttons, keyboard (N/P, ←/→), dot navigation, "Up next" banner ✅ *Implemented*
- **Setlist drag-and-drop reorder** — setlist detail pages now support drag-and-drop song ordering alongside the existing move up/down controls ✅ *Implemented*
- **Foot Pedal / Bluetooth Control** — page turns and song navigation hands-free ✅ *Implemented*

### Collaboration & Rehearsal
- **Live Setlist Sync** — band leader pushes the current song/position to all connected devices in real time
- **Rehearsal Markers** — tag tricky sections during practice so they surface before the next gig ✅ *Implemented*
- **Comment Threads on Songs** — per-section discussion (e.g. "Let's extend the bridge here") ✅ *Implemented*
- **Rehearsal Notes Layer** — keep optional performance notes like "Piano starts alone" or "Drums in at chorus" outside the canonical ChordPro source ✅ *Implemented*

### Smart Features
- **Recently Played / Frequently Used** — dashboard section showing top songs by usage count with last-used date ✅ *Implemented*
- **Key Compatibility Checker** — flags awkward key transitions (≥5 semitones) between adjacent setlist songs ✅ *Implemented*
- **Song Status Indicator** — visual flags on dashboard for songs missing key or tempo ✅ *Implemented*
- **Duplicate Detection** — SongEditPage now flags likely duplicate songs in real time using title and lyric similarity before you save ✅ *Implemented*
- **AI Chord Suggestion** — auto-detect or suggest chords from lyrics/audio

### Offline & Sync
- **Offline Mode** — ✅ PWA with auto-updating service worker (Workbox), precached app shell, runtime-cached API data (NetworkFirst with 7-day expiry), Google Fonts caching, branded offline fallback page, offline banners, cached song/setlist detail fallback, cached performance charts, and queued main-song edits that sync after reconnecting
- **Conflict Resolution** — optimistic concurrency on song saves with a merge dialog, field-by-field keep-mine/use-server choices, and an explicit overwrite fallback when you want last-write-wins behavior ✅ *Implemented*

### Accessibility & Device Support
- **Dark Mode** — eye-friendly for dim stages (already implemented in current site)
- **Responsive / Tablet-First Layout** — optimized for iPad and Android tablets on music stands (current site has mobile/tablet zoom breakpoints)
- **Font Scaling Shortcuts** — pinch-to-zoom or quick buttons for on-the-fly size adjustments (current site has zoom controls)

### History & Versioning
- **Song Edit History** — full changelog with diff view and rollback ✅ *Implemented*
- **Setlist Archive** — automatically save performed setlists with date, venue, and notes

---

## 🔄 Alternatives & Competitive Landscape

An extensive look at existing tools in the chord chart, setlist, and worship music space — what they do well, and where they fall short.

---

### 1. OnSong

> **Platform:** iOS only | **Price:** ~$25 one-time + in-app purchases | **Website:** [onsong.com](https://onsong.com)

**What it does well:**
- Industry-standard ChordPro rendering with inline chords above lyrics
- Instant transpose with capo support
- Auto-scroll (tempo-synced or manual speed)
- Setlist builder with drag-and-drop reordering
- MIDI integration — trigger patches, lighting, and effects per song
- Bluetooth foot pedal support (AirTurn, PageFlip, etc.)
- Import/export: ChordPro, OnSong, OpenSong, PDF, plain text
- Customizable fonts, colors, and layouts per song
- Sharing via email, Dropbox, or OnSong sharing
- Mature, battle-tested in live performance settings

**Where it falls short:**
- **iOS only** — no Android, no web, no desktop
- No real-time collaboration or multi-user editing
- No role-based access control
- Clunky song library management at scale (hundreds of songs)
- Limited versioning — no true edit history or rollback
- UI feels dated compared to modern web apps
- Syncing between devices can be unreliable
- No shared setlists with live push to band members
- Export options are limited in formatting control

---

### 2. Planning Center Services (+ Music Stand)

> **Platform:** Web + iOS + Android | **Price:** Free (5 members) to $239/mo | **Website:** [planningcenter.com/services](https://www.planningcenter.com/services)

**What it does well:**
- **Full service planning** — not just songs, but entire worship service flow
- Volunteer scheduling with availability, blockout dates, and auto-scheduling
- Song library with arrangements, multiple keys, and tags
- Transpose chord charts to any key
- Integrates with SongSelect (CCLI), PraiseCharts, and RehearsalMix for importing lyrics, chords, and audio
- **Music Stand** companion app — foot pedal support, annotations on sheet music
- Mobile media player for rehearsal (loop sections, isolate parts)
- CCLI reporting built in
- Real-time "Services LIVE" — shows team what item is happening in the service
- Permission levels for staff and volunteers
- Plan templates for recurring service structures
- Trusted by 100,000+ churches

**Where it falls short:**
- **Not a chord chart app** — it's a service planning platform; chord charts are secondary
- No inline chord editing or ChordPro authoring
- Relies on external sources for sheet music (SongSelect, PraiseCharts)
- No auto-scroll for lyrics/chords during performance
- Music Stand app is separate from the main Services app
- Can feel bloated for small bands that just want chords + setlists
- Expensive at scale ($69–$239/mo for larger teams)
- Not designed for non-church use cases (gigging bands, weddings, etc.)
- No custom song creation wizard
- No Nashville Number System support

---

### 3. BandHelper (formerly Set List Maker)

> **Platform:** iOS + Android + Mac + PC + Web + Apple Watch | **Price:** $3–$10/mo (covers whole band) | **Website:** [bandhelper.com](https://www.bandhelper.com)

**What it does well:**
- **Most comprehensive band management tool** — songs, schedules, contacts, finances, checklists, stage plots
- ChordPro import, auto-chord highlighting, transpose with personal key offsets
- Auto-scroll for lyrics and documents
- MIDI input/output, OSC output, DMX lighting control
- Backing tracks and click tracks with multi-route audio (iOS)
- Custom screen layouts — drag-and-drop interface builder
- "Smart copies" of songs that inherit from the original unless overridden
- "Smart lists" — auto-filter/sort songs by custom criteria
- Broadcast song selections wirelessly to up to 15 devices
- Screen sharing to other mobile devices
- Bluetooth/MIDI foot switch support
- Automation tracks — pre-record scroll positions, MIDI messages, recording triggers
- Apple Watch interface for on-the-go updates
- Schedule management with gig invitations, confirmations, reminders
- Income/expense tracking and payment share calculator
- Stage plot builder with drag-and-drop
- Practice log for tracking rehearsal time
- One subscription covers the whole band

**Where it falls short:**
- Steep learning curve — overwhelming number of features
- UI/UX is functional but dated and dense
- No web-based chord editing (data entry is web, but performance is mobile/desktop)
- Song creation is manual — no guided wizard
- No Nashville Number System rendering
- Doesn't integrate with song databases (SongSelect, PraiseCharts)
- Reports and analytics are basic
- Community/sharing features limited to your own band
- No song status indicators (missing chords, incomplete metadata)

---

### 4. SongSelect (by CCLI)

> **Platform:** Web | **Price:** Free (lyrics only) / $200–$250/year (Advanced/Premium) | **Website:** [ccli.com/songselect](https://ccli.com/songselect)

**What it does well:**
- **230,000+ worship songs** — the largest official lyrics and sheet music database
- Lyrics, chord sheets, lead sheets, and multi-part vocal sheets
- Instant transpose to any key
- ChordPro downloads (Premium tier)
- Thematic search — find songs by season, topic, or service theme
- Customization — change key, tempo marking, note size, columns, orientation
- Integrates with Planning Center, ProPresenter, EasyWorship, and many more
- Liturgy planning calendar with curated songs per Sunday
- **Rehearse** tool — helps musicians learn their parts with audio
- Lyric videos for projection
- One subscription serves the whole worship team
- Based on actual recordings — chords match specific album versions

**Where it falls short:**
- **Content library, not a performance tool** — no setlists, no auto-scroll, no live features
- Requires a CCLI Church Copyright License for full access
- 200 unique song print/download limit per year (Advanced/Premium)
- No personal song creation or custom songs
- No offline mode
- No chord chart editing — what you see is what you get
- Limited to worship/hymn repertoire (no secular songs)
- No collaboration, no sharing, no band management
- No MIDI, no foot pedal support, no stage tools
- Web-only — no dedicated mobile app for performance

---

### 5. OpenSong

> **Platform:** Windows, Mac, Linux (desktop) | **Price:** Free / Open Source (GPLv2) | **Website:** [opensong.org](https://www.opensong.org)

**What it does well:**
- **Completely free** and open source
- Chord/lyric sheet management with custom fonts and formatting per element
- Automatic transpose to any key
- Print sheets with regular chords and capo chords together
- Live presentation mode — project lyrics on screen for congregations
- Bible verse presentation (verse by verse)
- Timed slide loops for announcements
- Sets — combine songs, scriptures, and loops back-to-back
- Custom background colors and images
- Song metadata: title, author, copyright, CCLI #, tempo, time signature, theme, capo
- Cross-platform desktop support
- Active community on SourceForge

**Where it falls short:**
- **Desktop only** — no mobile app, no web version
- No auto-scroll
- UI is very dated (GTK+ / Win32)
- No MIDI or foot pedal support
- No collaboration or multi-user features
- No cloud sync — manual file sharing (some users use Dropbox workarounds)
- Printing has been buggy on modern Windows (user reports)
- No Nashville Number System
- No setlist sharing or team management
- Development pace is slow (volunteer-driven)
- **Not compatible with macOS Tahoe** at time of writing
- No audio playback, backing tracks, or click tracks

---

### 6. Worship Online

> **Platform:** Web + iOS + Android | **Price:** Subscription-based | **Website:** [worshiponline.com](https://www.worshiponline.com)

**What it does well:**
- **Album-accurate video tutorials** for every instrument and vocal part
- Step-by-step breakdowns: guitar, bass, keys, drums, vocals
- Exact vocal harmonies taught by professional instructors
- Instant key changes on tutorials
- Built-in setlists to keep the whole team aligned
- Instructors who play for Elevation, Phil Wickham, Brandon Lake, Lauren Daigle
- Mobile app (4,800+ five-star ratings) for practice on the go
- Loop sections and slow down for practice
- Growing library of 750+ songs
- Trusted by 8,500+ worship teams

**Where it falls short:**
- **Learning tool, not a performance tool** — no chord charts for stage use
- No ChordPro, no inline chords, no lead sheets
- No auto-scroll or live performance mode
- No setlist management for actual gigs
- No MIDI, no foot pedal, no stage integration
- Limited to songs in their library (can't add your own)
- No transpose of chord charts (only transpose of tutorial key)
- No offline access to videos
- Subscription required — no free tier for basic use
- Focused exclusively on worship (no secular/general use)

---

### 7. PraiseCharts

> **Platform:** Web | **Price:** Per-chart purchase or Pro subscription | **Website:** [praisecharts.com](https://www.praisecharts.com)

**What it does well:**
- **Professional-grade arrangements** — chord charts, lead sheets, full orchestrations
- Multi-part vocal sheets and rhythm charts
- Transpose to any key before download
- Charts based on specific recordings
- Choral arrangements available
- Integrates with Planning Center for easy import
- Theme-based browsing (Easter, Christmas, communion, etc.)
- High-quality engraving and layout
- Trusted by professional worship musicians

**Where it falls short:**
- **Chart store, not a performance app** — no setlists, no live tools
- Pay-per-chart model can get expensive
- No auto-scroll, no MIDI, no foot pedal support
- No personal song creation
- No collaboration or sharing features
- Web-only — no dedicated stage app
- Limited to their catalog (worship-focused)
- No offline mode
- No chord editing after download

---

### 8. Setlist Helper

> **Platform:** Web + iOS + Android | **Price:** Free/Subscription | **Website:** [setlisthelper.com](https://www.setlisthelper.com)

**What it does well:**
- Simple, focused setlist builder
- Drag-and-drop song ordering
- View total setlist time
- Print setlists with lyrics
- Mobile apps for iOS and Android
- Lightweight and easy to learn

**Where it falls short:**
- Very basic feature set — no chord chart rendering
- No ChordPro support
- No transpose
- No auto-scroll or performance mode
- No MIDI or foot pedal support
- No collaboration or sharing
- No cloud sync across devices
- No song metadata beyond basics
- No themes or styling options
- Appears to have minimal active development

---

### 9. SongBook (ChordPro)

> **Platform:** Android + Windows | **Price:** ~$5 one-time | **Website:** [songbookapp.com](https://www.songbookapp.com)

**What it does well:**
- Native ChordPro file rendering
- Transpose chords instantly
- Auto-scroll during performance
- Setlist creation
- Customizable display (fonts, colors, sizes)
- Import from Dropbox, Google Drive, or local files
- Lightweight and fast
- Affordable one-time purchase

**Where it falls short:**
- **No iOS version**
- No cloud-based collaboration
- No MIDI support
- No multi-user features or roles
- No song database integration
- Limited export options
- No Nashville Number System
- No web version
- Designed as a personal tool, not for teams

---

### 10. ProPresenter

> **Platform:** Mac + Windows | **Price:** $399 one-time | **Website:** [renewedvision.com/propresenter](https://www.renewedvision.com/propresenter)

**What it does well:**
- **Industry-standard presentation software** for live worship projection
- Multi-screen output (audience, stage, confidence monitors)
- Song lyrics with section-based slide navigation
- SongSelect integration for lyrics import
- Video and media playback during services
- Stage display with notes, chords, and next-slide preview
- MIDI and timecode triggering
- Powerful template and theming system
- NDI output for streaming integration

**Where it falls short:**
- **Projection-focused, not musician-focused** — no chord charts, no ChordPro
- Expensive ($399)
- No mobile app for performers
- No auto-scroll for musicians
- No setlist management from the musician's perspective
- No transpose
- No personal song variations or cloning
- Heavy resource requirements
- Steep learning curve
- No collaboration beyond a single operator

---

### Quick Comparison Matrix

| Feature | OnSong | Planning Center | BandHelper | SongSelect | OpenSong | VPC Music |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Web-based | - | ✅ | Partial | ✅ | - | ✅ |
| iOS | ✅ | ✅ | ✅ | - | - | ✅ (responsive) |
| Android | - | ✅ | ✅ | - | - | ✅ (responsive) |
| Desktop | - | ✅ | ✅ | ✅ | ✅ | ✅ |
| ChordPro support | ✅ | - | ✅ | ✅ | - | ✅ (native) |
| Transpose | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Auto-scroll | ✅ | - | ✅ | - | - | ✅ |
| Setlist builder | ✅ | ✅ | ✅ | - | ✅ | ✅ |
| MIDI integration | ✅ | - | ✅ | - | - | - |
| Foot pedal support | ✅ | ✅ | ✅ | - | - | ✅ Completed |
| Multi-user roles | - | ✅ | ✅ | - | - | ✅ (org-scoped: owner, admin, musician, observer) |
| Live sync to band | - | ✅ | ✅ | - | - | ✅ Completed |
| Song edit history | - | - | ✅ | - | - | ✅ Completed |
| Nashville Numbers | - | - | - | - | - | ✅ Completed |
| Custom themes | ✅ | - | ✅ | - | - | Partial (dark/light/system only) |
| Offline mode | ✅ | ✅ | ✅ | - | ✅ | ✅ Completed |
| Free tier | - | ✅ | - | ✅ | ✅ | TBD |
| Song database | - | Via integration | - | ✅ (230K+) | - | - |
| Clone/variations | - | - | ✅ | - | - | ✅ Completed |
| Sticky notes | ✅ | - | ✅ | - | - | ✅ Completed |
| Export/print control | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Completed |

---

## 🏗️ Architecture & Repository Structure

```
vpc-music/
├── .do/                        # DigitalOcean App Platform configs
│   ├── app.yaml                #   Production deployment
│   └── app.stg.yaml            #   Staging deployment
├── .github/workflows/          # CI/CD pipeline
│   └── ci.yml                  #   lint → typecheck → test → build → deploy
├── apps/
│   ├── api/                    # @vpc-music/api — Express.js backend
│   │   ├── src/
│   │   │   ├── index.js        #   Entry point (HTTP server + Socket.io)
│   │   │   ├── app.js          #   Express app (middleware + route mounting)
│   │   │   ├── db.js           #   PostgreSQL connection (Drizzle)
│   │   │   ├── config/         #   env.js
│   │   │   ├── schema/         #   Drizzle ORM table definitions
│   │   │   │   ├── users.js
│   │   │   │   ├── songs.js
│   │   │   │   ├── setlists.js
│   │   │   │   ├── events.js
│   │   │   │   ├── organizations.js
│   │   │   │   ├── organizationMembers.js
│   │   │   │   ├── shareTokens.js
│   │   │   │   ├── passwordResetTokens.js
│   │   │   │   └── index.js
│   │   │   ├── features/       #   Domain-driven feature modules
│   │   │   │   ├── songs/      #     CRUD + search + .chrd import + ChordPro export
│   │   │   │   ├── setlists/   #     Setlist CRUD + song ordering/add/remove
│   │   │   │   ├── events/     #     Event CRUD (upcoming events on dashboard)
│   │   │   │   ├── organizations/ #   Org CRUD (create, list, rename, owner delete)
│   │   │   │   ├── share/      #     Token-based read-only song sharing
│   │   │   │   ├── admin/      #     Org-scoped user management
│   │   │   │   └── platform/   #     User settings, profile, password change
│   │   │   ├── realtime/       #   Socket.io modules
│   │   │   │   └── conductor.js #    Live setlist conductor mode
│   │   │   ├── routes/         #   Top-level routes (auth: register, login, logout, me, forgot/reset password)
│   │   │   ├── middlewares/    #   auth, errorHandler, httpLogger, orgContext
│   │   │   └── utils/          #   logger
│   │   ├── src/test/           #   API tests (Vitest)
│   │   ├── drizzle.config.js
│   │   ├── vitest.config.js
│   │   ├── Dockerfile
│   │   └── package.json
│   └── web/                    # @vpc-music/web — React 19 SPA
│       ├── index.html          #   SPA entry point
│       ├── public/
│       │   ├── logo.svg         #   Vector logo source (treble clef + cross)
│       │   ├── logo.png         #   Generated 512×512 raster logo
│       │   ├── favicon.ico      #   Generated multi-size favicon
│       │   ├── manifest.json    #   PWA manifest
│       │   ├── fonts/           #   Vidaloka + Inter web fonts
│       │   └── icons/           #   Generated PWA icons (16–512px)
│       ├── src/
│       │   ├── main.tsx        #   App entry
│       │   ├── router.tsx      #   Route definitions (react-router 7)
│       │   ├── components/
│       │   │   ├── layout/     #     AppShell (logo, auth-aware nav, logout)
│       │   │   ├── songs/      #     ChordProRenderer, AutoScroll
│       │   │   └── shared/     #     ProtectedRoute, RouteErrorPage
│       │   ├── pages/
│       │   │   ├── auth/       #     LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage
│       │   │   ├── songs/      #     SongListPage, SongViewPage, SongEditPage
│       │   │   ├── setlists/   #     SetlistsPage, SetlistViewPage
│       │   │   ├── settings/   #     SettingsPage (theme, profile, password)
│       │   │   ├── LandingPage.tsx
│       │   │   ├── DashboardPage.tsx
│       │   │   └── NotFoundPage.tsx
│       │   ├── contexts/       #   ThemeContext, AuthContext
│       │   ├── hooks/          #   useConductor (Socket.io conductor mode)
│       │   ├── types/          #   vpc-music-shared.d.ts
│       │   ├── lib/            #   api-client (typed), utils (cn)
│       │   ├── styles/         #   Tailwind entry
│       │   └── test/           #   Web tests (Vitest + Testing Library)
│       ├── vite.config.ts
│       ├── vitest.config.ts
│       ├── tsconfig.json
│       ├── Dockerfile
│       ├── nginx.conf          #   SPA serving config
│       └── package.json
├── shared/                     # @vpc-music/shared — models, constants, utils
│   ├── constants/              #   music.js (scales, keys, Nashville numbers), roles.js
│   ├── models/                 #   song.js (Zod schemas)
│   ├── utils/                  #   chordpro.js (parser), transpose.js
│   ├── index.js
│   └── package.json
├── deploy/nginx/               # Production Nginx reverse proxy config
├── scripts/                    # Build, deploy, sync, preflight tooling
│   ├── build-router.mjs
│   ├── deploy-router.ps1
│   ├── deploy.ps1
│   ├── deploy-staging.ps1
│   ├── generate-icons.mjs
│   ├── preflight.mjs
│   ├── check-shared-drift.mjs
│   ├── sync-shared.ps1
│   └── db-push.mjs
├── compose.yml                 # Dev: PostgreSQL only
├── compose.stg.yml             # Staging: full-stack Docker
├── pnpm-workspace.yaml
├── package.json                # Root workspace scripts
└── .env.example
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   pnpm workspace                     │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   apps/web   │  │   apps/api   │  │  shared/   │ │
│  │  React 19    │  │  Express.js  │  │  Zod +     │ │
│  │  Vite 7      │→→│  Drizzle ORM │  │  ChordPro  │ │
│  │  TW4+Radix   │  │  PostgreSQL  │  │  Transpose │ │
│  │  TanStack Q  │  │  Socket.io   │  │  Constants │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────┘ │
│         │    /api proxy    │             ↑           │
│         └─────────────────→┘        workspace:*      │
│                                                     │
│  compose.yml          → Dev: Postgres only           │
│  compose.stg.yml      → Staging: full-stack Docker   │
│  .do/app.yaml         → DO App Platform (prod)       │
│  .github/workflows/   → CI: lint→typecheck→test→     │
│                          build→deploy                │
└─────────────────────────────────────────────────────┘
```

### API Route Map

| Route Prefix | Module | Description |
|---|---|---|
| `/health` | inline | Health check |
| `/api/auth` | `routes/auth.js` | Register, login, logout, me, forgot-password, reset-password, set-password, Google OAuth |
| `/api/songs` | `features/songs/` | CRUD with search (`?q`, `?tag`, `?key`), .chrd import, PDF import (multer + PDF.co), ChordPro/OnSong/PDF export |
| `/api/songs/:id/variations` | `features/songs/` | Song variation CRUD (POST, PUT, DELETE) |
| `/api/songs/:id/usage` | `features/songs/` | Song usage tracking (log, list, delete) |
| `/api/songs/:id/share` | `features/share/` | Create share link |
| `/api/songs/:id/shares` | `features/share/` | List, revoke, update share tokens |
| `/api/share-teams` | `features/share/` | Reusable authenticated share-team CRUD |
| `/api/share-organizations` | `features/share/` | List organizations available for admin batch sharing |
| `/api/songs/batch/organization-shares` | `features/share/` | List, create, and edit organization-level song shares in batch |
| `/api/shared/:token` | `features/share/` | Public song access via share token (no auth) |
| `/api/setlists` | `features/setlists/` | Setlist CRUD, add/remove/reorder songs, mark complete/reopen |
| `/api/events` | `features/events/` | Event CRUD with optional setlist links |
| `/api/organizations` | `features/organizations/` | Organization create/list/rename/delete, with owner-wide visibility and owner-only delete |
| `/api/platform` | `features/platform/` | User settings, profile update, password change |
| `/api/admin/users` | `features/admin/` | Team management — list, invite, update roles, remove members |

### Key Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start API + Web concurrently |
| `pnpm build` | Build web (or `build:api`, `build:web`) |
| `pnpm test` | Run web tests (Vitest) |
| `pnpm --filter @vpc-music/api test` | Run API tests (Vitest) |
| `pnpm lint` | Lint web app |
| `pnpm typecheck` | TypeScript check |
| `pnpm migrate:chrd` | Batch-convert `songList/` legacy `.chrd` files into sibling `.chopro` files and emit JSON/text migration reports |
| `pnpm deploy` | Route deploy by environment |
| `pnpm db:push` | Push Drizzle schema to DB |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run Drizzle migrations |
| `pnpm db:seed` | Seed database |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm docker:up` | Start dev PostgreSQL |
| `pnpm docker:stg` | Full staging stack |
| `pnpm preflight` | Pre-deploy checks |
| `pnpm sync:shared` | Sync `shared/` → `apps/api/shared/` |

---

## Testing

The project uses **Vitest** across the web app, API, and workspace scripts with **1,466 verified tests** in the main suites (**1,070 web + 302 API + 94 scripts**) — all passing in the latest full-suite validation before the direct shared-songs chunk. The direct shared-songs work was then validated with focused runs covering **162 web tests** and **159 API tests**.

### Web Tests (`apps/web`) — 1,070 tests, 54 files
- **Environment:** jsdom with `@testing-library/react` + `@testing-library/jest-dom`
- **Run:** `pnpm test` (from root or `apps/web`)
- **Coverage areas:**
  - **Pages:** Landing, Login, Dashboard, Songs (list/view/edit), Setlists, Settings, Admin, SharedSong, NotFound, ForgotPassword, ResetPassword
  - **Components:** ChordProRenderer (transpose controls, Nashville display, directives, sections, AutoScroll), ChordProEditor (section insert, chord popup, metadata sync, keyboard shortcuts), SyntaxHighlightOverlay, ValidationPanel, EditorHelpSection, print stylesheet, theme toggle, app shell
  - **Contexts:** AuthContext (login/register/logout, session restore, activeOrg derivation, setActiveOrganizationId sync), ThemeContext
  - **Hooks:** useConductor (Socket.IO conductor/member modes, room state updates, song navigation, scroll sync, cleanup), useKeyboardShortcuts
  - **Utilities:** transpose, Nashville numbers, OnSong/OpenSong conversion, plain text export, ChordPro parser, ChordPro tokenizer/highlighter, ChordPro validator, music constants, api-client (including preview/import flows and setlist zip export), oauth-popup (popup open/close, postMessage handling, origin validation)
  - **Features:** share management, song variations, real-time sync, export formats, plain text export, PDF import, OnSong/OpenSong import, bulk import progress, import preview, setlist zip export, song edit history, sticky notes, syntax highlighting, inline validation, performance mode, key compatibility
  - **PWA/Offline:** manifest, meta tags, Vite config, service worker registration, offline fallback, TypeScript declarations

### API Tests (`apps/api`) — 302 tests, 13 files
- **Environment:** Node.js
- **Run:** `pnpm --filter @vpc-music/api test`
- **Coverage areas:** Error handling middleware (`createError`, `asyncHandler`, `errorHandler`), auth middleware (JWT validation), org context middleware (`orgContext`, `requireOrg`, `requireOrgRole`), previously public route 401 regression coverage (including most-used endpoint), protected-route role matrix coverage, organization route auth/validation plus create/list/update/delete success-path coverage, email utilities (send, template builders), conductor/real-time sync (room management, events), PDF-to-ChordPro conversion pipeline (column detection, line assembly, chord classification, chord-to-lyric alignment, metadata extraction, section detection, plain-text fallback)

### Workspace Script Tests (`scripts/`) — 94 tests, 2 files
- **Environment:** Node.js
- **Run:** `pnpm test:scripts`
- **Coverage areas:** build/router and workspace script behavior covered by the root `vitest.config.mjs` suite

### Shared Package Tests (`shared/`)
- **Run:** `cd shared && npx vitest run`
- **Coverage areas:** Zod validation schemas (song, variation), role constants, music constants

Test files live alongside their source in `src/test/` directories within each app.

---

## Roadmap / TODO

> Tracked tasks for implementation work. Completed items first, then in-progress, then planned.

### Completed

- [x] **Landing page** — public marketing/welcome page shown to unauthenticated visitors; logged-in users automatically redirect to the dashboard
- [x] **Auth-gated routing** — if authenticated → `/dashboard`; if not → `/` (landing page); protect app routes behind `ProtectedRoute` auth guard
- [x] **Dashboard page** — post-login home view (recent songs, setlists overview, upcoming events, quick actions)
- [x] **Registration flow** — sign-up page with email/password (invite-only, no public registration)
- [x] **Forgot password / reset** — full password recovery flow with crypto token generation, expiry, and reset form
- [x] **Google OAuth** — sign in with Google via Passport + popup-based OAuth2 flow; invite-only (rejects unknown emails with a modal error)
- [x] **Invite-only access** — no public sign-up; unknown Google/email users are rejected with "Contact your worship team lead to get added"
- [x] **Admin user management** — worship leader (admin role) can list, invite, update roles, and remove team members via `/api/admin/users` endpoints
- [x] **Invite link with email pre-fill** — admin invite generates a `/login?email=...` link; login page reads the param, auto-expands the email form, and pre-fills the address
- [x] **Set-password flow** — invited users with no password are prompted to create one on first email login; Google OAuth users skip this entirely
- [x] **Seed script** — `pnpm db:seed` populates 3 sample users (admin worship leader, musician, observer — all with password `password123`), 3 worship songs (full ChordPro), 3 setlists, and 3 upcoming events; idempotent
- [x] **Sandbox mode** — set `VITE_SANDBOX=true` to show quick-login buttons on the login page pre-filling credentials for seeded demo accounts (Admin, Musician, Observer); env-gated, off by default
- [x] **Print stylesheet** — `@media print` rules for clean chord chart output; Print button on SongViewPage and SharedSongPage; hides toolbars, nav, modals, usage history, and footers in print; removes scroll constraints; forces light colors; avoids page breaks inside chord lines
- [x] **Share token management UI** — full dialog to manage share links from SongViewPage; create new links with optional label and expiry (1/7/30/90 days); list active and revoked tokens with status badges; copy share URL to clipboard; open link in new tab; inline label editing (click-to-rename, Enter/Escape); revoke with confirmation; PATCH API endpoint for label updates; 34 tests
- [x] **Admin UI** — full team management page at `/admin`; list org members with email, display name, role badges, invited status; invite new members by email with display name and role picker; change member roles (admin/musician/observer) via inline selector; remove members with confirmation; conditional nav link visible only to admins/owners; access-denied guard for non-admins; 25 tests
- [x] **Nashville Number System** — `chordToNashville(chord, key)` conversion utility maps chord names to Nashville numbers (1–7 with flats) preserving quality suffixes; slash chord support; `nashvilleChordPro()` for full ChordPro conversion; Nashville toggle button on SongViewPage and SharedSongPage (visible when chords on + song has a key); active-state styling; integrates with existing transpose (transpose first, then convert to numbers); 42 tests
- [x] **Events system** — full CRUD API for worship events (`/api/events`) with title, date, location, notes, and optional setlist link; upcoming events shown on dashboard
- [x] **Organization architecture** — multi-org model with `organizations` + `organization_members` tables; org-scoped content (songs, setlists, events); `orgContext` middleware auto-selects org + enforces per-org roles (admin/musician/observer); global `owner` role for super-admin; frontend `AuthContext` exposes `activeOrg` and api-client sends `X-Organization-Id` header
- [x] **Share links (read-only)** — token-based public song sharing via `share_tokens` table; `POST /api/songs/:id/share` generates a secure token; `GET /api/shared/:token` returns song data without auth; standalone `SharedSongPage` renders song with transpose/chords/auto-scroll but no edit/delete/upload/library access; share button on `SongViewPage` with one-click copy-to-clipboard
- [x] **Songs CRUD** — full API (`GET`, `POST`, `PUT`, `DELETE`) + list page, view page, edit page with search/filter
- [x] **Setlists CRUD** — full API + UI for setlists with song ordering, per-song key overrides, and notes
- [x] **Setlist completion** — setlists have a `draft`/`complete` status; "Mark Complete" logs usage for every song in the setlist automatically; "Reopen" reverts to draft; status badges on list and detail views
- [x] **Song usage tracking** — `song_usages` table tracks when each song was used; `POST /api/songs/:id/usage` logs a usage with date and optional notes; `GET /api/songs/:id/usage` returns full history; SongViewPage shows "Log Usage" button with date picker + usage history timeline; completing a setlist auto-logs all its songs
- [x] **ChordPro rendering** — parse and render ChordPro format with sections, directives, and chord-lyric pairs
- [x] **Transpose** — semitone up/down/reset with chord recalculation across the entire song
- [x] **Auto-scroll** — configurable speed-based lyrics scrolling during performance via `requestAnimationFrame`
- [x] **Dark / Light theme** — theme toggle (dark, light, system) persisted to localStorage with `prefers-color-scheme` support
- [x] **Settings page** — profile editing (display name), password change, and theme selector
- [x] **Import .chrd** — convert legacy `.chrd` format to ChordPro via heuristic chord-line detection and bracket-wrapping
- [x] **Import OnSong / OpenSong** — import `.onsong` plain-text files and OpenSong `.xml` files, normalize metadata/sections to ChordPro, and open the imported chart for review
- [x] **Export ChordPro** — download any song as a `.chopro` file
- [x] **Export Plain Text** — export `.txt` chord charts in chords-over-lyrics format; shared converter also supports lyrics-only output for future UI variants
- [x] **Real-time sync (backend)** — Socket.io conductor mode with room-based setlist sync (`conductor:join`, `member:join`, `conductor:goto`, `conductor:scroll`, `leave`) and `useConductor` hook
- [x] **Real-time sync (UI)** — SetlistViewPage live mode with Lead/Join session buttons, connection indicator, members count, now-playing banner, conductor song navigation (Go buttons), current song highlighting, scroll sync (broadcast + receive), conductor-left warning, and leave session flow
- [x] **Export OnSong / PDF** — export dropdown with ChordPro, OnSong (.onsong), and PDF (print-to-PDF) formats; `chordProToOnSong` converter in shared utilities; server-side OnSong conversion and PDF via styled HTML
- [x] **Export selected variation** — active variation can now be exported as ChordPro, OnSong, or PDF from SongViewPage via variation-aware export endpoints
- [x] **Email delivery** — transactional emails via Mailgun SMTP (nodemailer); branded HTML templates for password-reset and team-invite emails; dev fallback logs to console via `jsonTransport`
- [x] **Song variations** — full CRUD API for song variations (POST/PUT/DELETE), variation tabs on SongViewPage with content/key switching, create/edit/delete modals, pre-filled from original song content

### Recently Completed

- [x] **PDF import pipeline** — geometry-aware PDF → ChordPro conversion via PDF.co: 8-step pipeline (extract coordinates, column detection, line assembly, chord classification, chord-to-word alignment, metadata extraction, section detection, user review); multer file uploads; plain-text fallback ✅ *Implemented*
- [x] **Offline mode** — PWA with service worker, Workbox runtime caching (NetworkFirst for API data, CacheFirst for fonts), precached app shell, branded offline fallback page ✅ *Implemented*
- [x] **Security hardening pass (Section 0)** — added `auth` to previously unauthenticated song/setlist/event detail and export routes; added `requireOrgRole("admin", "musician")` to audited song, variation, setlist, event, share, sticky-note, and usage write routes; aligned shared role constants to `observer` / `musician` / `admin`; centralized shared `roleLabel()` for Worship Leader display; added dedicated 401 regression tests and protected-route role-matrix tests
- [x] **Organization management foundation (Section 1)** — added `/api/organizations` create/list/update/delete routes; owners now receive all orgs from `GET /api/auth/me`; AppShell now has a persisted org switcher with tested create/switch flows plus a dedicated creation dialog that automatically switches into the new org after create; users with no orgs see onboarding that opens the same creation flow; SettingsPage now includes organization rename, member counts for org admins/owners, and owner-only delete controls; org route tests now cover auth, validation, authorization, and create/list/update/delete success paths
- [x] **Roles & Permissions UX (Section 2)** — role-gated UI across all pages: observers see read-only views with hidden write actions; musicians see content tools but not admin nav; admins/owners see full controls; 22 dedicated role-gated rendering tests; updated `role.md` documentation
- [x] **Visual Polish & Design System (Section 3)** — comprehensive CSS design system in `@layer components {}` with btn/card/badge/modal/input/list/header/glass classes; AppShell redesign with sticky glass header, mobile hamburger menu, active nav indicator, user avatar; landing page hero refresh with gradient and feature cards; dashboard card elevation and empty states; song and setlist pages restyled with design system
- [x] **ChordPro Editor Phase 1 (Section 4)** — syntax highlighting via tokenizer engine + transparent textarea overlay architecture (chord/directive/section/lyrics/invalid token types); inline validation panel with error/warning counts and collapsible issue rows; collapsible help section with 4 tabs (Quick Tips, Keyboard Shortcuts, Common Directives, Section Templates) + localStorage persistence; 7 keyboard shortcuts (Ctrl+S save, Ctrl+/ toggle comment, Ctrl+K insert chord, Ctrl+Shift+V/C/B insert sections, Alt+Up/Down transpose); expanded insert menu with metadata block and song skeleton templates; 79 new tests across 5 new test files (855 total web tests passing)
- [x] **Performance & Stage Features (Section 7)** — full-screen PerformanceMode overlay (`PerformanceMode.tsx`) with configurable countdown timer (2–10 min, auto-start per song, progress bar with amber/red warning states), song-by-song navigation (prev/next buttons, N/P keys, ←/→ arrows, dot navigation), chord show/hide toggle, font size controls (12–36px), collapsible toolbar, AutoScroll integration, "Up next" banner; key compatibility checker (`key-compat.ts`) with `getKeyDistance()`, `keyTransitionLabel()`, `analyzeKeyTransitions()` computing semitone distances (0–6) with enharmonic normalization — integrated into SetlistViewPage with amber warnings between songs with distant keys (≥5 semitones); `GET /api/songs/most-used` endpoint aggregating song usage counts; Dashboard "Frequently Used" section showing top songs by play count; song status indicators (AlertCircle for missing key/tempo); these features remain covered within the latest 1,457 passing tests across web, API, and script suites
- [x] **Song library filtering (Section 9, chunk 1)** — SongListPage now loads tag options from `GET /api/songs/tags`, adds a tag filter alongside the existing search and key filters, preserves no-results messaging for filtered states, and includes focused plus full-suite test coverage; re-verified in the latest 1,457 passing tests across web, API, and script suites
- [x] **Tempo visual blinker (Section 9, chunk 2)** — added a reusable metronome-style pulse indicator for BPM metadata across SongListPage, DashboardPage, SongViewPage, SharedSongPage, and PerformanceMode, with focused coverage plus a full web re-run; re-verified in the latest 1,457 passing tests across web, API, and script suites
- [x] **Tempo range filter (Section 9, chunk 3)** — SongListPage now exposes minimum/maximum BPM filters backed by `tempoMin` / `tempoMax` song-list API query support, keeps filtered totals aligned with the active search criteria, and includes focused web plus API coverage along with full-suite validation; re-verified in the latest 1,457 passing tests across web, API, and script suites
- [x] **Associated shout (Section 9, chunk 4)** — songs now support optional spoken cue/callout metadata in the schema, API create/update/share responses, SongEditPage, SongViewPage, and SharedSongPage, with focused web coverage plus full-suite validation; re-verified in the latest 1,457 passing tests across web, API, and script suites
- [x] **AKA / alternate names (Section 9, chunk 5)** — songs now support optional alternate-title metadata in the schema, API create/update/share responses, SongEditPage, SongViewPage, SharedSongPage, and SongListPage, and song-library text search now matches alternate names with focused API plus web coverage and full-suite validation; re-verified in the latest 1,457 passing tests across web, API, and script suites
- [x] **Sort options (Section 9, chunk 6)** — SongListPage now exposes sort modes for last edited, title, recently added, and most used, backed by API `sort` query support and focused web plus API coverage with full-suite validation; re-verified in the latest 1,457 passing tests across web, API, and script suites
- [x] **Pagination (Section 9, chunk 7)** — SongListPage now uses API `limit` / `offset` support to render previous/next pagination controls, page counts, and visible-range summaries while resetting back to page 1 when filters or sort change; re-verified in the latest 1,457 passing tests across web, API, and script suites
- [x] **Key-aware search (Section 9, chunk 8)** — SongListPage now carries the active key filter into SongViewPage links so charts open in the requested key with focused song-list, song-view, and renderer coverage plus full-suite validation; re-verified in the latest 1,457 passing tests across web, API, and script suites
- [x] **Tag CRUD metadata coverage (Section 9, chunk 9)** — SongEditPage now has focused coverage for creating songs with tags, appending tags on edit, and clearing all tag pills back to an empty payload, completing the remaining metadata test gap for the song library; re-verified in the latest 1,457 passing tests across web, API, and script suites
- [x] **Song categories (Section 9.2, chunk 10)** — songs now support optional category metadata end-to-end across the schema, shared model, API create/update/share responses, SongEditPage, SongListPage category filtering, and authenticated plus shared song views, with focused coverage and full web/API/script suite validation; re-verified in the latest 1,457 passing tests across web, API, and script suites
- [x] **Song groups (Section 9.2, chunk 11)** — added reusable org-scoped song groups with `GET/POST/PUT/DELETE /api/songs/groups`, bulk membership management, song-library `groupId` filtering, SongListPage group filtering plus inline group management, and focused validation across 122 web tests plus 146 API tests covering the affected client, page, filter, and role-gating flows
- [x] **Delegated group management (Section 9.2, chunk 12)** — added delegated song-group managers via `song_group_managers`, org-admin assignment with `PUT /api/songs/groups/:groupId/managers`, per-group `canManage` state in the song-group listing response, delegated observer access to manage assigned groups from SongListPage, and focused validation across 125 web tests plus 152 API tests for the affected UI, client, permissions, and route coverage
- [x] **Direct shared songs (Section 9.2, chunk 13)** — added authenticated song-to-user sharing via `song_user_shares` with `POST/GET/DELETE /api/songs/:id/direct-shares`, locked authenticated `GET /api/songs/:id` access down to the active organization or a direct share, added a SongListPage “Shared with me” scope backed by `GET /api/songs?scope=shared`, extended ShareManageDialog with direct-user sharing by email, and validated the affected web/API/client coverage in focused runs (162 web tests + 159 API tests)
- [x] **Team shared songs (Section 9.2, chunk 14)** — added reusable org-scoped share teams via `share_teams`, `share_team_members`, and `song_team_shares`, exposed `GET/POST/DELETE /api/share-teams` plus `GET/POST/DELETE /api/songs/:id/team-shares`, expanded authenticated `GET /api/songs?scope=shared` and `GET /api/songs/:id` access checks to include team membership, extended ShareManageDialog with share-team creation and team-share management, and validated the affected focused coverage in 152 passing web tests plus 170 passing API tests
- [x] **Organization shared songs (Section 9.2, chunk 15)** — added admin batch sharing to other organizations via `song_organization_shares`, exposed `GET /api/share-organizations` plus `GET/POST/PATCH /api/songs/batch/organization-shares`, expanded authenticated `GET /api/songs?scope=shared` and `GET /api/songs/:id` access checks to include org-level shares, added SongListPage batch share/edit UI for owners and admins, and validated the affected focused coverage in 144 passing web tests plus 17 passing API tests
- [x] **Import / Export / Migration (Section 8, chunks 1–10)** — implemented `POST /api/songs/import/onsong` using shared `onSongToChordPro()` support for both `.onsong` plain-text files and OpenSong `.xml`; SongEditPage import picker now accepts `.onsong` and `.xml`; imported metadata (title, artist, key, tempo) is normalized into ChordPro directives before save; SongEditPage also now accepts multiple files and bulk imports ChordPro, `.chrd` / `.txt`, `.onsong`, OpenSong `.xml`, and PDF files with in-page progress and per-file result links; added preview-only conversion routes for `.chrd`, OnSong/OpenSong, and PDF so single-file imports now load into SongEditPage for rendered review before saving; added setlist zip export in ChordPro, OnSong, and plain text from SetlistViewPage via `/api/setlists/:id/export/zip`; added arbitrary multi-song library zip export from SongListPage via `/api/songs/export/zip` for selected songs in ChordPro, OnSong, and plain text; export endpoints now support `variationId` so the active variation can be exported as ChordPro, OnSong, or PDF from SongViewPage; added plain text `.txt` export via shared `chordProToPlainText()` and SongView export menu; extracted legacy `.chrd` parsing into shared `convertChrdToChordPro()` logic, reused it in the song import API, added `pnpm migrate:chrd` to batch-convert the documented `songList/` library into sibling `.chopro` files while preserving nested folders, preserve legacy `^` secondary chord lines as ChordPro comment lines during import and batch migration, and now emit `migration-report.json` plus `migration-report.txt` beside the converted library; re-verified across the latest suite passes with 1,457 passing tests across web, API, and script suites

### Still Pending From This Pass

- [x] **Current roadmap pass** — all currently tracked musician-facing items from this pass are implemented; richer future work is now additive rather than backlog carry-over

---

## Getting Started

### Prerequisites
- **Node.js 20+**
- **pnpm 9.15+** (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- **Docker** (for PostgreSQL, or use a local Postgres)

### Setup

```bash
# 1. Clone
git clone <repo-url> vpc-music && cd vpc-music

# 2. Install dependencies
pnpm install

# 3. Environment
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# Optional: enable sandbox quick-login buttons
# Set VITE_SANDBOX=true in apps/web/.env.local

# 4. Start PostgreSQL
pnpm docker:up

# 5. Push database schema
pnpm db:push

# 6. Start development
pnpm dev
```

- **API** runs at `http://localhost:3001`
- **Web** runs at `http://localhost:5176` (proxies `/api` → API)

## License

> _TBD_

# 🎶 VPC Music

A feature-rich song management and performance tool — blending the best of OnSong, our current site, and solutions to real pain points musicians face on stage and in rehearsal. **VPC Music uses [ChordPro](https://www.chordpro.org/) as its native song format**, with built-in converters to migrate existing `.chrd` and OnSong libraries.

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

> **Note:** PDF import will be a later-phase feature. The initial release will support manual paste-and-edit. The full geometry-aware pipeline is a targeted improvement once the core ChordPro engine is stable.

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
- **Sticky Notes** — attach personal reminders to any song or section
- **Song Status Indicator** — visual flags for incomplete data (e.g. missing chords, no tempo set)

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
  - Background / Page / Header colors
  - Chord / Note / Special element colors (primary chords, secondary chords, comments — each independently styled)
  - Font family + font background
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
- **Print Stylesheet** — clean print output that strips UI chrome and forces readable colors

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

- **Song Groups** — organize songs into reusable collections
- **Delegated Song Groups** — assign group management to other users
- **Shared Songs** — share individual songs with specific users or teams
- **Shared Sets** — share entire setlists for collaborative performance prep
- **Categories** — high-level buckets (e.g. Weddings, Church, Special Events)

### 👥 User Roles & Settings

- **Login** — secure authentication
- **Roles**
  | Role | Permissions |
  |---|---|
  | **Viewer** | View songs + customize personal copies |
  | **Editor** | Edit global songs (with versioning & tagging) |
  | **Admin** | Full access + delegate permissions |
- **User Settings**
  - Default themes
  - Notifications (new songs, modifications, shared content)

### 🛠️ Utility Tools

- **NoSleep Mode** — prevent screen dimming during performance with visual indicator (carried forward from current site)
- **Disable Double-Tap Zoom** — reliable stage tapping without accidental zoom on touch devices
- **Persistent User Preferences** — theme, bracket visibility, comment visibility, notation mode, zoom level all saved and restored per user
- **Toolbar Conditional Display** — song-specific controls hidden until a song is loaded (clean empty state)
- **Button Actions** — inline controls for transpose, song switching, scroll
- **Feedback & Recommendations** — in-app feedback loop for feature requests and song suggestions

---

## 💡 Suggested Additions

Here are some features worth considering that could take VPC Music to the next level:

### Performance Mode
- **Auto-Scroll** — configurable scroll speed per song, tempo-synced or manual
- **Setlist Countdown Timer** — track time remaining per song or full set
- **Foot Pedal / Bluetooth Control** — page turns and song navigation hands-free

### Collaboration & Rehearsal
- **Live Setlist Sync** — band leader pushes the current song/position to all connected devices in real time
- **Rehearsal Markers** — tag tricky sections during practice so they surface before the next gig
- **Comment Threads on Songs** — per-section discussion (e.g. "Let's extend the bridge here")

### Smart Features
- **Recently Played / Frequently Used** — quick access to your go-to songs
- **Duplicate Detection** — flag when a new song closely matches an existing one (title or lyrics)
- **AI Chord Suggestion** — auto-detect or suggest chords from lyrics/audio
- **Key Compatibility Checker** — when building a setlist, flag awkward key transitions between songs

### Offline & Sync
- **Offline Mode** — full functionality without a connection; sync when back online
- **Conflict Resolution** — smart merge when the same song is edited on multiple devices

### Accessibility & Device Support
- **Dark Mode** — eye-friendly for dim stages (already implemented in current site)
- **Responsive / Tablet-First Layout** — optimized for iPad and Android tablets on music stands (current site has mobile/tablet zoom breakpoints)
- **Font Scaling Shortcuts** — pinch-to-zoom or quick buttons for on-the-fly size adjustments (current site has zoom controls)

### History & Versioning
- **Song Edit History** — full changelog with diff view and rollback
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

| Feature | OnSong | Planning Center | BandHelper | SongSelect | OpenSong | VPC Music (Planned) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Web-based | - | ✅ | Partial | ✅ | - | ✅ |
| iOS | ✅ | ✅ | ✅ | - | - | ✅ (responsive) |
| Android | - | ✅ | ✅ | - | - | ✅ (responsive) |
| Desktop | - | ✅ | ✅ | ✅ | ✅ | ✅ |
| ChordPro support | ✅ | - | ✅ | ✅ | - | ✅ (native) |
| Transpose | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Auto-scroll | ✅ | - | ✅ | - | - | Planned |
| Setlist builder | ✅ | ✅ | ✅ | - | ✅ | ✅ |
| MIDI integration | ✅ | - | ✅ | - | - | - |
| Foot pedal support | ✅ | ✅ | ✅ | - | - | Planned |
| Multi-user roles | - | ✅ | ✅ | - | - | ✅ |
| Live sync to band | - | ✅ | ✅ | - | - | Planned |
| Song edit history | - | - | ✅ | - | - | Planned |
| Nashville Numbers | - | - | - | - | - | ✅ |
| Custom themes | ✅ | - | ✅ | - | - | ✅ |
| Offline mode | ✅ | ✅ | ✅ | - | ✅ | Planned |
| Free tier | - | ✅ | - | ✅ | ✅ | TBD |
| Song database | - | Via integration | - | ✅ (230K+) | - | - |
| Clone/variations | - | - | ✅ | - | - | ✅ |
| Sticky notes | ✅ | - | ✅ | - | - | ✅ |
| Export/print control | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Getting Started

> _Coming soon — setup instructions, tech stack, and contribution guidelines._

## License

> _TBD_

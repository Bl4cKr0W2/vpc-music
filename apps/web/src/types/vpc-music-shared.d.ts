/** Type declarations for @vpc-music/shared (plain JS package) */
declare module "@vpc-music/shared" {
  // ── Music Constants ────────────────────────────
  export const CHROMATIC_SHARP: string[];
  export const CHROMATIC_FLAT: string[];
  export const ALL_KEYS: string[];
  export const NASHVILLE_NUMBERS: string[];
  export const CHORD_REGEX: RegExp;
  export const SECTION_KEYWORDS: string[];

  // ── Roles ──────────────────────────────────────
  export const ROLES: Record<string, string>;

  // ── Song Schema (Zod) ─────────────────────────
  export const songSchema: any;
  export const songVariationSchema: any;

  // ── ChordPro Parser ────────────────────────────
  export interface ChordPosition {
    chord: string;
    position: number;
  }

  export interface ChordProLine {
    chords: ChordPosition[];
    lyrics: string;
  }

  export interface ChordProSection {
    name: string;
    lines: ChordProLine[];
  }

  export interface ChordProDocument {
    directives: Record<string, string>;
    sections: ChordProSection[];
  }

  export function parseChordPro(input: string): ChordProDocument;
  export function toChordProString(doc: ChordProDocument): string;

  // ── Transpose ──────────────────────────────────
  export function transposeChord(chord: string, semitones: number): string;
  export function transposeChordPro(input: string, semitones: number): string;
}

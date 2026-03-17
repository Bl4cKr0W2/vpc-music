export interface SectionEntry {
  id: string;
  name: string;
  startLine: number;
  endLine: number;
  rawStartIndex: number;
  rawEndIndexExclusive: number;
  preview: string;
}

function buildSectionEntries(source: string) {
  const lines = source.split("\n");
  const entries: SectionEntry[] = [];
  let current: SectionEntry | null = null;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const match = line.trim().match(/^\{comment:\s*(.*?)\}\s*$/i);
    if (match) {
      if (current) {
        current.endLine = index;
        current.rawEndIndexExclusive = index;
        entries.push(current);
      }

      current = {
        id: `${match[1]}-${index + 1}`,
        name: match[1].trim() || `Section ${entries.length + 1}`,
        startLine: index + 1,
        endLine: index + 1,
        rawStartIndex: index,
        rawEndIndexExclusive: lines.length,
        preview: "",
      };
      continue;
    }

    if (current) {
      current.endLine = index + 1;
      if (!current.preview && line.trim()) {
        current.preview = line.replace(/\[[^\]]+\]/g, "").trim();
      }
    }
  }

  if (current) {
    current.rawEndIndexExclusive = lines.length;
    entries.push(current);
  }

  return { lines, entries };
}

export function getOrganizedSections(source: string) {
  return buildSectionEntries(source).entries;
}

export function reorderChordProSections(source: string, fromId: string, toId: string) {
  const { lines, entries } = buildSectionEntries(source);
  if (entries.length < 2) {
    return source;
  }

  const fromIndex = entries.findIndex((entry) => entry.id === fromId);
  const toIndex = entries.findIndex((entry) => entry.id === toId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return source;
  }

  const prefix = lines.slice(0, entries[0].rawStartIndex);
  const rawSections = entries.map((entry) => lines.slice(entry.rawStartIndex, entry.rawEndIndexExclusive));
  const reordered = [...rawSections];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);

  return [...prefix, ...reordered.flat()].join("\n");
}

function nextDuplicateName(name: string, allNames: string[]) {
  const numberedMatch = name.match(/^(.*?)(?:\s+(\d+))?$/);
  const baseName = numberedMatch?.[1]?.trim() || name;
  const usedNumbers = allNames
    .map((entry) => entry.match(new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s+(\\d+))?$`)))
    .filter(Boolean)
    .map((match) => Number(match?.[1] ?? 1));

  const nextNumber = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 2;
  return `${baseName} ${nextNumber}`;
}

export function duplicateChordProSection(source: string, sectionId: string) {
  const { lines, entries } = buildSectionEntries(source);
  const entry = entries.find((item) => item.id === sectionId);
  if (!entry) {
    return source;
  }

  const allNames = entries.map((item) => item.name);
  const sectionLines = lines.slice(entry.rawStartIndex, entry.rawEndIndexExclusive);
  const duplicateLines = [...sectionLines];
  duplicateLines[0] = `{comment: ${nextDuplicateName(entry.name, allNames)}}`;

  const next = [...lines];
  next.splice(entry.rawEndIndexExclusive, 0, ...duplicateLines);
  return next.join("\n");
}

export function buildCollapsedChordProView(source: string, collapsedSectionIds: string[]) {
  if (collapsedSectionIds.length === 0) {
    return source;
  }

  const { lines, entries } = buildSectionEntries(source);
  const collapsed = new Set(collapsedSectionIds);
  const byStartIndex = new Map(entries.map((entry) => [entry.rawStartIndex, entry]));
  const result: string[] = [];

  for (let index = 0; index < lines.length; index++) {
    const section = byStartIndex.get(index);
    if (section && collapsed.has(section.id)) {
      result.push(lines[index]);
      const hiddenLineCount = Math.max(0, section.rawEndIndexExclusive - section.rawStartIndex - 1);
      if (hiddenLineCount > 0) {
        result.push(`… ${hiddenLineCount} lines hidden …`);
      }
      index = section.rawEndIndexExclusive - 1;
      continue;
    }

    result.push(lines[index]);
  }

  return result.join("\n");
}

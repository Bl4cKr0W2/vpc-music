export interface ArrangementSectionChoice {
  id: string;
  name: string;
  rawLines: string[];
}

export interface ArrangementItem {
  id: string;
  sectionId: string;
  repeatCount: number;
}

function parseArrangementTemplate(source: string) {
  const lines = source.split("\n");
  const prefixLines: string[] = [];
  const sections: ArrangementSectionChoice[] = [];
  let current: ArrangementSectionChoice | null = null;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const match = line.trim().match(/^\{comment:\s*(.*?)\}\s*$/i);
    if (match) {
      if (current) {
        sections.push(current);
      }
      current = {
        id: `${match[1]}-${index + 1}`,
        name: match[1].trim() || `Section ${sections.length + 1}`,
        rawLines: [line],
      };
      continue;
    }

    if (current) {
      current.rawLines.push(line);
    } else {
      prefixLines.push(line);
    }
  }

  if (current) {
    sections.push(current);
  }

  return { prefixLines, sections };
}

export function getArrangementSectionChoices(source: string) {
  return parseArrangementTemplate(source).sections;
}

export function buildArrangementSummary(items: ArrangementItem[], sections: ArrangementSectionChoice[]) {
  return items
    .map((item) => {
      const section = sections.find((choice) => choice.id === item.sectionId);
      if (!section) {
        return null;
      }
      return item.repeatCount > 1 ? `${section.name} ×${item.repeatCount}` : section.name;
    })
    .filter(Boolean)
    .join(" → ");
}

export function buildArrangementContent(source: string, items: ArrangementItem[]) {
  const { prefixLines, sections } = parseArrangementTemplate(source);
  if (items.length === 0) {
    return source;
  }

  const blocks = items
    .map((item) => {
      const section = sections.find((choice) => choice.id === item.sectionId);
      if (!section) {
        return null;
      }

      const sectionLines = [...section.rawLines];
      if (item.repeatCount > 1) {
        sectionLines[0] = `{comment: ${section.name} ×${item.repeatCount}}`;
      }
      return sectionLines.join("\n").trimEnd();
    })
    .filter((block): block is string => Boolean(block));

  const prefix = prefixLines.join("\n").trimEnd();
  return [prefix, ...blocks].filter(Boolean).join("\n\n");
}

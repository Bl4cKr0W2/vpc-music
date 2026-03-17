import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { convertChrdToChordPro } from "../shared/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

export function defaultChrdMigrationPaths(inputDir = resolve(repoRoot, "songList")) {
  return {
    inputDir,
    outputDir: resolve(dirname(inputDir), `${basename(inputDir)}-chordpro`),
  };
}

export function defaultChrdReportPaths(outputDir) {
  return {
    json: join(outputDir, "migration-report.json"),
    text: join(outputDir, "migration-report.txt"),
  };
}

function normalizeRelativePath(value) {
  return String(value || "").replace(/\\/g, "/");
}

export async function findChrdFiles(inputDir) {
  const entries = await readdir(inputDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const fullPath = join(inputDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findChrdFiles(fullPath));
    } else if (/\.chrd$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

export function buildChrdMigrationReport(summary) {
  return {
    generatedAt: new Date().toISOString(),
    inputDir: summary.inputDir,
    outputDir: summary.outputDir,
    convertedCount: summary.convertedCount,
    failedCount: summary.failedCount,
    warningCount: summary.warningCount,
    files: summary.files.map((file) => ({
      sourcePath: file.sourcePath,
      outputPath: file.outputPath,
      relativeSourcePath: file.relativeSourcePath,
      relativeOutputPath: file.relativeOutputPath,
      title: file.title,
      warnings: file.warnings,
    })),
    failures: summary.failures.map((failure) => ({
      sourcePath: failure.sourcePath,
      relativeSourcePath: failure.relativeSourcePath,
      error: failure.error,
    })),
  };
}

export function formatChrdMigrationReportText(report) {
  const lines = [
    "VPC Music .chrd Migration Report",
    "================================",
    `Generated: ${report.generatedAt}`,
    `Input: ${report.inputDir}`,
    `Output: ${report.outputDir}`,
    "",
    "Summary",
    `- Converted: ${report.convertedCount}`,
    `- Failed: ${report.failedCount}`,
    `- Warnings: ${report.warningCount}`,
    "",
    "Converted Files",
  ];

  if (report.files.length === 0) {
    lines.push("- None");
  } else {
    for (const file of report.files) {
      lines.push(`- ${file.relativeSourcePath} -> ${file.relativeOutputPath} (${file.title})`);
      if (file.warnings.length > 0) {
        for (const warning of file.warnings) {
          lines.push(`  warning: ${warning}`);
        }
      }
    }
  }

  lines.push("", "Failures");
  if (report.failures.length === 0) {
    lines.push("- None");
  } else {
    for (const failure of report.failures) {
      lines.push(`- ${failure.relativeSourcePath}: ${failure.error}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

export async function writeChrdMigrationReport(summary) {
  const report = buildChrdMigrationReport(summary);
  const reportPaths = defaultChrdReportPaths(summary.outputDir);

  await mkdir(summary.outputDir, { recursive: true });
  await writeFile(reportPaths.json, `${JSON.stringify(report, null, 2)}\n`, "utf-8");
  await writeFile(reportPaths.text, formatChrdMigrationReportText(report), "utf-8");

  return {
    report,
    reportPaths,
  };
}

export async function convertChrdLibrary({ inputDir, outputDir } = {}) {
  const defaults = defaultChrdMigrationPaths(inputDir ? resolve(inputDir) : undefined);
  const resolvedInputDir = inputDir ? resolve(inputDir) : defaults.inputDir;
  const resolvedOutputDir = outputDir ? resolve(outputDir) : defaults.outputDir;

  if (!existsSync(resolvedInputDir)) {
    throw new Error(`Input directory does not exist: ${resolvedInputDir}`);
  }

  const files = await findChrdFiles(resolvedInputDir);
  const summary = {
    inputDir: resolvedInputDir,
    outputDir: resolvedOutputDir,
    convertedCount: 0,
    failedCount: 0,
    warningCount: 0,
    files: [],
    failures: [],
  };

  for (const sourcePath of files) {
    try {
      const raw = await readFile(sourcePath, "utf-8");
      const conversion = convertChrdToChordPro(basename(sourcePath), raw);
      const outputRelativePath = normalizeRelativePath(
        relative(resolvedInputDir, sourcePath).replace(/\.chrd$/i, ".chopro")
      );
      const outputPath = join(resolvedOutputDir, outputRelativePath);
      const relativeSourcePath = normalizeRelativePath(relative(resolvedInputDir, sourcePath));

      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, `${conversion.chordProContent.trim()}\n`, "utf-8");

      summary.convertedCount += 1;
      summary.warningCount += conversion.warnings.length;
      summary.files.push({
        sourcePath,
        outputPath,
        relativeSourcePath,
        relativeOutputPath: outputRelativePath,
        title: conversion.metadata.title,
        warnings: conversion.warnings,
      });
    } catch (error) {
      summary.failedCount += 1;
      summary.failures.push({
        sourcePath,
        relativeSourcePath: normalizeRelativePath(relative(resolvedInputDir, sourcePath)),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const { report, reportPaths } = await writeChrdMigrationReport(summary);
  summary.report = report;
  summary.reportPaths = reportPaths;

  return summary;
}

async function runCli() {
  const inputArg = process.argv[2];
  const outputArg = process.argv[3];
  const summary = await convertChrdLibrary({
    inputDir: inputArg ? resolve(process.cwd(), inputArg) : undefined,
    outputDir: outputArg ? resolve(process.cwd(), outputArg) : undefined,
  });

  console.log(`Converted ${summary.convertedCount} .chrd file(s) from ${summary.inputDir}`);
  console.log(`Output written to ${summary.outputDir}`);
  console.log(`Report written to ${summary.reportPaths.json}`);
  console.log(`Text summary written to ${summary.reportPaths.text}`);

  if (summary.warningCount > 0) {
    console.log(`Warnings: ${summary.warningCount}`);
  }

  if (summary.failedCount > 0) {
    console.error(`Failures: ${summary.failedCount}`);
    for (const failure of summary.failures) {
      console.error(`- ${failure.sourcePath}: ${failure.error}`);
    }
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
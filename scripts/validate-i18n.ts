#!/usr/bin/env node
/**
 * i18n Key Sync Validator
 *
 * Per frontend-design/SKILL.md §6.2:
 * "The 'Sync or Sink' Rule: english.json is the Source of Truth.
 *  Structure and keys must be IDENTICAL across all language files."
 *
 * Usage: npx ts-node scripts/validate-i18n.ts
 *        npm run i18n:validate
 *
 * Exit codes:
 *   0 - All languages in sync
 *   1 - Mismatches found
 */

import * as fs from "fs";
import * as path from "path";

// Configuration
const LANGUAGES_DIR = path.join(process.cwd(), "src/constants/languages");
const SOURCE_OF_TRUTH = "english.json";
const SUPPORTED_LANGUAGES = [
  "english.json",
  "spanish.json",
  "french.json",
  "german.json",
  "portuguese.json",
];

// Types
interface KeyDiff {
  language: string;
  missingKeys: string[];
  extraKeys: string[];
}

interface ValidationResult {
  valid: boolean;
  diffs: KeyDiff[];
  summary: {
    totalKeys: number;
    languagesChecked: number;
    totalMissing: number;
    totalExtra: number;
  };
}

/**
 * Recursively extract all keys from a nested object
 * Returns dot-notation paths like "auth.login.headline"
 */
function extractKeys(obj: unknown, prefix = ""): string[] {
  const keys: string[] = [];

  if (obj === null || obj === undefined) {
    return keys;
  }

  if (typeof obj !== "object" || Array.isArray(obj)) {
    // Leaf node - return the current path
    return prefix ? [prefix] : [];
  }

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // Recurse into nested objects
      keys.push(...extractKeys(value, fullPath));
    } else {
      // Leaf node (string, number, array, etc.)
      keys.push(fullPath);
    }
  }

  return keys;
}

/**
 * Find keys that are in setA but not in setB
 */
function difference(setA: Set<string>, setB: Set<string>): string[] {
  return [...setA].filter((key) => !setB.has(key));
}

/**
 * Validate all language files against the source of truth
 */
function validateI18n(): ValidationResult {
  // Load source of truth (English)
  const englishPath = path.join(LANGUAGES_DIR, SOURCE_OF_TRUTH);
  if (!fs.existsSync(englishPath)) {
    console.error(`❌ Source of truth not found: ${englishPath}`);
    process.exit(1);
  }

  const englishContent = JSON.parse(fs.readFileSync(englishPath, "utf-8"));
  const englishKeys = new Set(extractKeys(englishContent));

  const diffs: KeyDiff[] = [];
  let totalMissing = 0;
  let totalExtra = 0;

  // Check each language file
  for (const langFile of SUPPORTED_LANGUAGES) {
    if (langFile === SOURCE_OF_TRUTH) continue;

    const langPath = path.join(LANGUAGES_DIR, langFile);

    if (!fs.existsSync(langPath)) {
      console.warn(`⚠️  Language file not found: ${langFile}`);
      diffs.push({
        language: langFile,
        missingKeys: [...englishKeys],
        extraKeys: [],
      });
      totalMissing += englishKeys.size;
      continue;
    }

    const langContent = JSON.parse(fs.readFileSync(langPath, "utf-8"));
    const langKeys = new Set(extractKeys(langContent));

    const missingKeys = difference(englishKeys, langKeys);
    const extraKeys = difference(langKeys, englishKeys);

    if (missingKeys.length > 0 || extraKeys.length > 0) {
      diffs.push({
        language: langFile,
        missingKeys,
        extraKeys,
      });
      totalMissing += missingKeys.length;
      totalExtra += extraKeys.length;
    }
  }

  return {
    valid: diffs.length === 0,
    diffs,
    summary: {
      totalKeys: englishKeys.size,
      languagesChecked: SUPPORTED_LANGUAGES.length - 1,
      totalMissing,
      totalExtra,
    },
  };
}

/**
 * Print validation results
 */
function printResults(result: ValidationResult): void {
  console.log("\n╔═══════════════════════════════════════════════════════╗");
  console.log("║          i18n Key Sync Validation Report             ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  console.log(`📋 Source of Truth: ${SOURCE_OF_TRUTH}`);
  console.log(`📊 Total Keys: ${result.summary.totalKeys}`);
  console.log(`🌐 Languages Checked: ${result.summary.languagesChecked}`);
  console.log("");

  if (result.valid) {
    console.log("✅ All languages are in sync!\n");
    return;
  }

  console.log("❌ Sync issues found:\n");

  for (const diff of result.diffs) {
    console.log(`\n─── ${diff.language} ───`);

    if (diff.missingKeys.length > 0) {
      console.log(`  🔴 Missing keys (${diff.missingKeys.length}):`);
      // Show first 10 missing keys
      const toShow = diff.missingKeys.slice(0, 10);
      toShow.forEach((key) => console.log(`     - ${key}`));
      if (diff.missingKeys.length > 10) {
        console.log(`     ... and ${diff.missingKeys.length - 10} more`);
      }
    }

    if (diff.extraKeys.length > 0) {
      console.log(`  🟡 Extra keys (${diff.extraKeys.length}):`);
      // Show first 10 extra keys
      const toShow = diff.extraKeys.slice(0, 10);
      toShow.forEach((key) => console.log(`     - ${key}`));
      if (diff.extraKeys.length > 10) {
        console.log(`     ... and ${diff.extraKeys.length - 10} more`);
      }
    }
  }

  console.log("\n───────────────────────────────────────────────────────");
  console.log(
    `📈 Summary: ${result.summary.totalMissing} missing, ${result.summary.totalExtra} extra`,
  );
  console.log("───────────────────────────────────────────────────────\n");
}

/**
 * Generate a JSON report for CI/CD integration
 */
function generateJsonReport(
  result: ValidationResult,
  outputPath?: string,
): void {
  const report = {
    timestamp: new Date().toISOString(),
    valid: result.valid,
    sourceOfTruth: SOURCE_OF_TRUTH,
    ...result.summary,
    issues: result.diffs.map((diff) => ({
      language: diff.language,
      missingCount: diff.missingKeys.length,
      extraCount: diff.extraKeys.length,
      missingKeys: diff.missingKeys,
      extraKeys: diff.extraKeys,
    })),
  };

  if (outputPath) {
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`📄 JSON report saved to: ${outputPath}`);
  }
}

// Main execution
function main(): void {
  console.log("🔍 Validating i18n key sync...\n");

  const result = validateI18n();
  printResults(result);

  // Generate JSON report if CI flag is set
  if (process.argv.includes("--json")) {
    const reportPath = path.join(process.cwd(), "i18n-validation-report.json");
    generateJsonReport(result, reportPath);
  }

  // Exit with appropriate code
  process.exit(result.valid ? 0 : 1);
}

main();

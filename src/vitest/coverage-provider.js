import { existsSync, readdirSync } from "node:fs";
import * as fs from "node:fs/promises";
import path from "node:path";
import coverage from "istanbul-lib-coverage";
import libReport from "istanbul-lib-report";
import reports from "istanbul-reports";
import { resolve } from "pathe";
import c from "tinyrainbow";
import pm from "picomatch";
import { coverageConfigDefaults } from "vitest/config";
import { FileCoverageMapService } from "./file-coverage-map-service.js";

/**
 * @import {
 *   BaseCoverageOptions,
 *   CoverageProvider,
 *   CoverageProviderModule,
 *   ResolvedCoverageOptions,
 *   Vitest
 * } from "vitest/node"
 * @import { CoverageMap, CoverageMapData } from "istanbul-lib-coverage"
 */

/** @type CoverageProviderModule */
const JsonSchemaCoverageProviderModule = {
  /** @type CoverageProviderModule["getProvider"] */
  getProvider() {
    return new JsonSchemaCoverageProvider();
  }
};

/** @implements CoverageProvider */
class JsonSchemaCoverageProvider {
  name = "@hyperjump/json-schema-coverage/vitest";

  ctx = /** @type Vitest */ ({});

  options = /** @type ResolvedCoverageOptions<"istanbul"> */ ({});

  /** @type Map<string, boolean> */
  globCache = new Map();

  coverageFilesDirectory = ".json-schema-coverage";
  coverageService = new FileCoverageMapService(path.join(".json-schema-coverage", "maps"));

  /** @type CoverageProvider["initialize"] */
  initialize(ctx) {
    this.ctx = ctx;

    const config = /** @type ResolvedCoverageOptions<"istanbul"> */ (ctx.config.coverage);

    this.options = /** @type ResolvedCoverageOptions<"istanbul"> */ ({
      ...coverageConfigDefaults,

      // User's options
      ...config,

      // Resolved fields
      reportsDirectory: resolve(
        ctx.config.root,
        config.reportsDirectory || coverageConfigDefaults.reportsDirectory
      ),
      reporter: resolveCoverageReporters(config.reporter || coverageConfigDefaults.reporter),
      thresholds: config.thresholds && {
        ...config.thresholds,
        lines: config.thresholds["100"] ? 100 : config.thresholds.lines,
        branches: config.thresholds["100"] ? 100 : config.thresholds.branches,
        functions: config.thresholds["100"] ? 100 : config.thresholds.functions,
        statements: config.thresholds["100"] ? 100 : config.thresholds.statements
      }
    });

    const buildScriptPath = path.resolve(import.meta.dirname, "build-coverage-maps.js");
    /** @type string[] */ (ctx.config.globalSetup).push(buildScriptPath);
  }

  /** @type CoverageProvider["resolveOptions"] */
  resolveOptions() {
    return /** @type NonNullable<any> */ (this.options);
  }

  /** @type CoverageProvider["clean"] */
  async clean(clean = true) {
    if (clean && existsSync(this.options.reportsDirectory)) {
      await fs.rm(this.options.reportsDirectory, {
        recursive: true,
        force: true,
        maxRetries: 10
      });
    }

    if (existsSync(this.coverageFilesDirectory)) {
      await fs.rm(this.coverageFilesDirectory, {
        recursive: true,
        force: true,
        maxRetries: 10
      });
    }

    await this.coverageService.open();

    await fs.mkdir(this.coverageFilesDirectory, { recursive: true });
  }

  /** @type () => Promise<void> */
  async cleanAfterRun() {
    await this.coverageService.close();
    await fs.rm(this.coverageFilesDirectory, { recursive: true });

    // Remove empty reports directory, e.g. when only text-reporter is used
    if (readdirSync(this.options.reportsDirectory).length === 0) {
      await fs.rm(this.options.reportsDirectory, { recursive: true });
    }
  }

  async onTestFailure() {
    await this.coverageService.close();
    await fs.rm(this.coverageFilesDirectory, { recursive: true });
  }

  /** @type CoverageProvider["reportCoverage"] */
  async reportCoverage(coverageMap) {
    this.#generateReports(/** @type CoverageMap */ (coverageMap) ?? coverage.createCoverageMap());

    // In watch mode we need to preserve the previous results if cleanOnRerun is disabled
    const keepResults = !this.options.cleanOnRerun && this.ctx.config.watch;

    if (!keepResults) {
      await this.cleanAfterRun();
    }
  }

  /** @type (coverageMap: CoverageMap) => void */
  #generateReports(coverageMap) {
    const context = libReport.createContext({
      dir: this.options.reportsDirectory,
      coverageMap
    });

    if (this.#hasTerminalReporter(this.options.reporter)) {
      this.ctx.logger.log(c.blue(" % ") + c.dim("Coverage report from ") + c.yellow(this.name));
    }

    for (const reporter of this.options.reporter) {
      // Type assertion required for custom reporters
      reports
        .create(/** @type Parameters<typeof reports.create>[0] */ (reporter[0]), {
          projectRoot: this.ctx.config.root,
          ...reporter[1]
        })
        .execute(context);
    }

    if (this.options.thresholds) {
      this.reportThresholds(coverageMap);
    }
  }

  /** @type (reporters: ResolvedCoverageOptions["reporter"])=> boolean */
  #hasTerminalReporter(reporters) {
    return reporters.some(([reporter]) => {
      return reporter === "text"
        || reporter === "text-summary"
        || reporter === "text-lcov"
        || reporter === "teamcity";
    });
  }

  /** @type CoverageProvider["onAfterSuiteRun"] */
  onAfterSuiteRun() {
    // The method is required by the interface, but doesn't seem to ever be called
    throw Error("Not Implemented");
  }

  /** @type CoverageProvider["generateCoverage"] */
  async generateCoverage() {
    const coverageMap = coverage.createCoverageMap();

    for (const file of await fs.readdir(this.coverageFilesDirectory, { recursive: true, withFileTypes: true })) {
      if (!file.isFile()) {
        continue;
      }

      const path = resolve(file.parentPath, file.name);
      /** @type CoverageMapData */
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const coverage = JSON.parse(await fs.readFile(path, "utf-8"));
      coverageMap.merge(coverage);
    }

    return coverageMap;
  }

  /**
   * @typedef {"lines" | "functions" | "statements" | "branches"} Threshold
   */

  /**
   * @typedef {{
   *   coverageMap: CoverageMap
   *   name: string
   *   thresholds: Partial<Record<Threshold, number | undefined>>
   * }} ResolvedThreshold
   */

  /** @type Set<Threshold> */
  #THRESHOLD_KEYS = new Set(["lines", "functions", "statements", "branches"]);
  #GLOBAL_THRESHOLDS_KEY = "global";

  /** @type (coverageMap: CoverageMap) => void */
  reportThresholds(coverageMap) {
    const resolvedThresholds = this.#resolveThresholds(coverageMap);
    this.#checkThresholds(resolvedThresholds);
  }

  /** @type (coverageMap: CoverageMap) => ResolvedThreshold[] */
  #resolveThresholds(coverageMap) {
    /** @type ResolvedThreshold[] */
    const resolvedThresholds = [];
    const files = coverageMap.files();
    const globalCoverageMap = coverage.createCoverageMap();

    const thresholds = /** @type NonNullable<typeof this.options.thresholds> */ (this.options.thresholds);
    for (const key of /** @type {`${keyof NonNullable<typeof this.options.thresholds>}`[]} */ (Object.keys(thresholds))) {
      if (key === "perFile" || key === "autoUpdate" || key === "100" || this.#THRESHOLD_KEYS.has(key)) {
        continue;
      }

      const glob = key;
      const globThresholds = resolveGlobThresholds(thresholds[glob]);
      const globCoverageMap = coverage.createCoverageMap();

      const matcher = pm(glob);
      const matchingFiles = files.filter((file) => {
        return matcher(path.relative(this.ctx.config.root, file));
      });

      for (const file of matchingFiles) {
        const fileCoverage = coverageMap.fileCoverageFor(file);
        globCoverageMap.addFileCoverage(fileCoverage);
      }

      resolvedThresholds.push({
        name: glob,
        coverageMap: globCoverageMap,
        thresholds: globThresholds
      });
    }

    // Global threshold is for all files, even if they are included by glob patterns
    for (const file of files) {
      const fileCoverage = coverageMap.fileCoverageFor(file);
      globalCoverageMap.addFileCoverage(fileCoverage);
    }

    resolvedThresholds.unshift({
      name: this.#GLOBAL_THRESHOLDS_KEY,
      coverageMap: globalCoverageMap,
      thresholds: {
        branches: this.options.thresholds?.branches,
        functions: this.options.thresholds?.functions,
        lines: this.options.thresholds?.lines,
        statements: this.options.thresholds?.statements
      }
    });

    return resolvedThresholds;
  }

  /** @type (allThresholds: ResolvedThreshold[]) => void */
  #checkThresholds(allThresholds) {
    for (const { coverageMap, thresholds, name } of allThresholds) {
      if (thresholds.branches === undefined && thresholds.functions === undefined && thresholds.lines === undefined && thresholds.statements === undefined) {
        continue;
      }

      // Construct list of coverage summaries where thresholds are compared against
      const summaries = this.options.thresholds?.perFile
        ? coverageMap.files().map((file) => {
            return {
              file,
              summary: coverageMap.fileCoverageFor(file).toSummary()
            };
          })
        : [{ file: null, summary: coverageMap.getCoverageSummary() }];

      // Check thresholds of each summary
      for (const { summary, file } of summaries) {
        for (const thresholdKey of this.#THRESHOLD_KEYS) {
          const threshold = thresholds[thresholdKey];

          if (threshold === undefined) {
            continue;
          }

          /**
           * Positive thresholds are treated as minimum coverage percentages (X means: X% of lines must be covered),
           * while negative thresholds are treated as maximum uncovered counts (-X means: X lines may be uncovered).
           */
          if (threshold >= 0) {
            const coverage = summary.data[thresholdKey].pct;

            if (coverage < threshold) {
              process.exitCode = 1;

              /**
               * Generate error message based on perFile flag:
               * - ERROR: Coverage for statements (33.33%) does not meet threshold (85%) for src/math.ts
               * - ERROR: Coverage for statements (50%) does not meet global threshold (85%)
               */
              let errorMessage = `ERROR: Coverage for ${thresholdKey} (${coverage}%) does not meet ${name === this.#GLOBAL_THRESHOLDS_KEY ? name : `"${name}"`} threshold (${threshold}%)`;

              if (this.options.thresholds?.perFile && file) {
                errorMessage += ` for ${path.relative("./", file).replace(/\\/g, "/")}`;
              }

              this.ctx.logger.error(errorMessage);
            }
          } else {
            const uncovered = summary.data[thresholdKey].total - summary.data[thresholdKey].covered;
            const absoluteThreshold = threshold * -1;

            if (uncovered > absoluteThreshold) {
              process.exitCode = 1;

              /**
               * Generate error message based on perFile flag:
               * - ERROR: Uncovered statements (33) exceed threshold (30) for src/math.ts
               * - ERROR: Uncovered statements (33) exceed global threshold (30)
               */
              let errorMessage = `ERROR: Uncovered ${thresholdKey} (${uncovered}) exceed ${name === this.#GLOBAL_THRESHOLDS_KEY ? name : `"${name}"`} threshold (${absoluteThreshold})`;

              if (this.options.thresholds?.perFile && file) {
                errorMessage += ` for ${path.relative("./", file).replace(/\\/g, "/")}`;
              }

              this.ctx.logger.error(errorMessage);
            }
          }
        }
      }
    }
  }
}

/** @type (configReporters: NonNullable<BaseCoverageOptions["reporter"]>) => [string, Record<string, unknown>][] */
const resolveCoverageReporters = (configReporters) => {
  // E.g. { reporter: "html" }
  if (!Array.isArray(configReporters)) {
    return [[configReporters, {}]];
  }

  /** @type [string, Record<string, unknown>][] */
  const resolvedReporters = [];

  for (const reporter of configReporters) {
    if (Array.isArray(reporter)) {
      // E.g. { reporter: [ ["html", { skipEmpty: true }], ["lcov"], ["json", { file: "map.json" }] ]}
      resolvedReporters.push([reporter[0], /** @type Record<string, unknown> */ (reporter[1]) ?? {}]);
    } else {
      // E.g. { reporter: ["html", "json"]}
      resolvedReporters.push([reporter, {}]);
    }
  }

  return resolvedReporters;
};

/** @type (thresholds: unknown) => ResolvedThreshold["thresholds"] */
const resolveGlobThresholds = (thresholds) => {
  if (!thresholds || typeof thresholds !== "object") {
    return {};
  }

  if ("100" in thresholds && thresholds["100"] === true) {
    return {
      lines: 100,
      branches: 100,
      functions: 100,
      statements: 100
    };
  }

  return {
    lines: "lines" in thresholds && typeof thresholds.lines === "number"
      ? thresholds.lines
      : undefined,
    branches: "branches" in thresholds && typeof thresholds.branches === "number"
      ? thresholds.branches
      : undefined,
    functions: "functions" in thresholds && typeof thresholds.functions === "number"
      ? thresholds.functions
      : undefined,
    statements: "statements" in thresholds && typeof thresholds.statements === "number"
      ? thresholds.statements
      : undefined
  };
};

export default JsonSchemaCoverageProviderModule;

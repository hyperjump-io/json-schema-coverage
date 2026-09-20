import { existsSync, readdirSync } from "node:fs";
import * as fs from "node:fs/promises";
import path from "node:path";
import { createCoverageMap } from "@vitest/istanbul-lib-coverage";
import { createAsync, createContext } from "@vitest/istanbul-lib-report";
import { resolve } from "pathe";
import c from "picocolors";
import { coverageConfigDefaults } from "vitest/config";
import { BaseCoverageProvider } from "vitest/node";
import { FileCoverageMapService } from "./file-coverage-map-service.js";

/**
 * @import {
 *   CoverageOptions,
 *   CoverageProvider,
 *   CoverageProviderModule,
 *   ResolvedCoverageOptions,
 *   Vitest
 * } from "vitest/node"
 * @import { CoverageMap, CoverageMapData } from "@vitest/istanbul-lib-coverage"
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

  options = /** @type ResolvedCoverageOptions */ ({});

  coverageFilesDirectory = ".json-schema-coverage";
  coverageService = new FileCoverageMapService(path.join(".json-schema-coverage", "maps"));

  #baseProvider = new BaseCoverageProvider();

  /** @type CoverageProvider["initialize"] */
  initialize(ctx) {
    this.ctx = ctx;
    this.#baseProvider.ctx = ctx;
    this.#baseProvider.createCoverageMap = () => createCoverageMap();

    const config = /** @type ResolvedCoverageOptions */ (ctx.config.coverage);

    this.options = /** @type ResolvedCoverageOptions */ ({
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
    this.#baseProvider.options = this.options;

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
    if (!this.options.reportOnFailure) {
      await this.coverageService.close();
      await fs.rm(this.coverageFilesDirectory, { recursive: true });
    }
  }

  /** @type CoverageProvider["reportCoverage"] */
  async reportCoverage(coverageMap, reportContext) {
    await this.#generateReports(/** @type CoverageMap */ (coverageMap) ?? createCoverageMap(), reportContext?.allTestsRun);

    // In watch mode we need to preserve the previous results if cleanOnRerun is disabled
    const keepResults = !this.options.cleanOnRerun && this.ctx.config.watch;

    if (!keepResults) {
      await this.cleanAfterRun();
    }
  }

  /** @type (coverageMap: CoverageMap, allTestsRun: boolean | undefined) => Promise<void> */
  async #generateReports(coverageMap, allTestsRun) {
    const context = createContext({
      dir: this.options.reportsDirectory,
      coverageMap
    });

    if (this.#baseProvider.hasTerminalReporter(this.options.reporter)) {
      this.ctx.logger.log(c.blue(" % ") + c.dim("Coverage report from ") + c.yellow(this.name));
    }

    for (const reporter of this.options.reporter) {
      const report = await createAsync(reporter[0], {
        projectRoot: this.ctx.config.root,
        ...reporter[1]
      });
      report.execute(context);
    }

    if (this.options.thresholds) {
      await this.#baseProvider.reportThresholds(coverageMap, allTestsRun);
    }
  }

  /** @type CoverageProvider["onAfterSuiteRun"] */
  onAfterSuiteRun() {
    // The method is required by the interface, but doesn't seem to ever be called
    throw Error("Not Implemented");
  }

  /** @type CoverageProvider["generateCoverage"] */
  async generateCoverage() {
    const coverageMap = createCoverageMap();

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
}

/** @type (configReporters: NonNullable<CoverageOptions["reporter"]>) => [string, Record<string, unknown>][] */
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

export default JsonSchemaCoverageProviderModule;

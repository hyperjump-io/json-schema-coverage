import { existsSync, readdirSync } from "node:fs";
import * as fs from "node:fs/promises";
import { createCoverageMap } from "istanbul-lib-coverage";
import { resolve } from "pathe";
import c from "tinyrainbow";
import libReport from "istanbul-lib-report";
import reports from "istanbul-reports";
import { coverageConfigDefaults } from "vitest/config";

/**
 * @import { BaseCoverageOptions, CoverageProvider, CoverageProviderModule, ResolvedCoverageOptions, Vitest} from "vitest"
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
  name = "../src/vitest/json-schema-coverage-provider.js";

  ctx = /** @type Vitest */ ({});
  options = /** @type ResolvedCoverageOptions<"custom"> */ ({});
  coverageFilesDirectory = "";

  /** @type CoverageProvider["initialize"] */
  initialize(ctx) {
    this.ctx = ctx;

    const config = ctx.config.coverage;

    /** @type ResolvedCoverageOptions<"custom"> */
    this.options = {
      ...coverageConfigDefaults,

      // User's options
      ...config,

      // Resolved fields
      provider: "custom",
      customProviderModule: this.name,
      reportsDirectory: resolve(
        ctx.config.root,
        config.reportsDirectory || coverageConfigDefaults.reportsDirectory
      ),
      reporter: resolveCoverageReporters(config.reporter || coverageConfigDefaults.reporter),
      extension: ".schema.json"
    };

    this.coverageFilesDirectory = "./.json-schema-coverage";
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

    await fs.mkdir(this.coverageFilesDirectory, { recursive: true });
  }

  /** @type () => Promise<void> */
  async cleanAfterRun() {
    await fs.rm(this.coverageFilesDirectory, { recursive: true });

    // Remove empty reports directory, e.g. when only text-reporter is used
    if (readdirSync(this.options.reportsDirectory).length === 0) {
      await fs.rm(this.options.reportsDirectory, { recursive: true });
    }
  }

  /** @type CoverageProvider["reportCoverage"] */
  async reportCoverage(coverageMap) {
    this.generateReports(/** @type CoverageMap */ (coverageMap) ?? this.createCoverageMap());

    // In watch mode we need to preserve the previous results if cleanOnRerun is disabled
    const keepResults = !this.options.cleanOnRerun && this.ctx.config.watch;

    if (!keepResults) {
      await this.cleanAfterRun();
    }
  }

  /** @type (coverageMap: CoverageMap) => void */
  generateReports(coverageMap) {
    const context = libReport.createContext({
      dir: this.options.reportsDirectory,
      coverageMap
    });

    if (this.hasTerminalReporter(this.options.reporter)) {
      this.ctx.logger.log(
        c.blue(" % ") + c.dim("Coverage report from ") + c.yellow(this.name)
      );
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
  }

  /** @type (reporters: ResolvedCoverageOptions["reporter"])=> boolean */
  hasTerminalReporter(reporters) {
    return reporters.some(
      ([reporter]) =>
        reporter === "text"
        || reporter === "text-summary"
        || reporter === "text-lcov"
        || reporter === "teamcity"
    );
  }

  /** @type () => CoverageMap */
  createCoverageMap() {
    return createCoverageMap({});
  }

  /** @type CoverageProvider["onAfterSuiteRun"] */
  onAfterSuiteRun() {
    // The method is required by the interface, but doesn't seem to ever be called
    throw Error("Not Implemented");
  }

  /** @type CoverageProvider["generateCoverage"] */
  async generateCoverage() {
    const coverageMap = this.createCoverageMap();

    for (const file of await fs.readdir(this.coverageFilesDirectory, { recursive: true, withFileTypes: true })) {
      const path = resolve(file.parentPath, file.name);
      /** @type CoverageMapData */
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const coverage = JSON.parse(await fs.readFile(path, "utf-8"));
      coverageMap.merge(coverage);
    }

    return coverageMap;
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

export default JsonSchemaCoverageProviderModule;

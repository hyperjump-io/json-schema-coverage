import { createHash } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import * as fs from "node:fs/promises";
import path from "node:path";
import coverage from "istanbul-lib-coverage";
import libReport from "istanbul-lib-report";
import reports from "istanbul-reports";
import ignore from "ignore";
import { glob } from "tinyglobby";
import { resolve } from "pathe";
import c from "tinyrainbow";
import { coverageConfigDefaults } from "vitest/config";
import { registerSchema } from "@hyperjump/json-schema/draft-2020-12";
import "@hyperjump/json-schema/draft-2019-09";
import "@hyperjump/json-schema/draft-07";
import "@hyperjump/json-schema/draft-06";
import "@hyperjump/json-schema/draft-04";
import { compile, getSchema } from "@hyperjump/json-schema/experimental";
import { astToCoverageMap } from "../coverage-util.js";
import { fromJson } from "../json-util.js";

/**
 * @import {
 *   BaseCoverageOptions,
 *   CoverageProvider,
 *   CoverageProviderModule,
 *   ResolvedCoverageOptions,
 *   Vitest
 * } from "vitest"
 * @import { CoverageMap, CoverageMapData } from "istanbul-lib-coverage"
 * @import { SchemaObject } from "@hyperjump/json-schema"
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
  name = "@hyperjump/json-schema-coverage/vitest-coverage-provider";

  ctx = /** @type Vitest */ ({});

  options = /** @type ResolvedCoverageOptions<"custom"> */ ({});

  /** @type Map<string, boolean> */
  globCache = new Map();

  coverageFilesDirectory = "";

  /** @type string[] */
  roots = [];

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
      reporter: resolveCoverageReporters(config.reporter || coverageConfigDefaults.reporter)
    };

    this.coverageFilesDirectory = "./.json-schema-coverage";

    // If --project filter is set pick only roots of resolved projects
    this.roots = ctx.config.project?.length
      ? [...new Set(ctx.projects.map((project) => project.config.root))]
      : [ctx.config.root];
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

    for (const root of this.roots) {
      let includedFiles = await glob(["**/*.schema.json", "**/schema.json"], {
        cwd: root,
        dot: true,
        onlyFiles: true
      });
      const gitignorePath = path.resolve(root, ".gitignore");
      const gitignore = await fs.readFile(gitignorePath, "utf-8");
      const files = ignore()
        .add(gitignore)
        .filter(includedFiles);

      // Register all schemas
      for (const file of files) {
        try {
          const schemaPath = path.resolve(root, file);
          const json = await fs.readFile(schemaPath, "utf-8");
          /** @type SchemaObject */
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const schema = JSON.parse(json);
          registerSchema(schema);
        } catch (_error) {
        }
      }

      for (const file of files) {
        const schemaPath = path.resolve(root, file);
        const schema = await getSchema(schemaPath);
        const compiledSchema = await compile(schema);
        const fileHash = createHash("md5").update(compiledSchema.schemaUri).digest("hex");
        const coverageFilePath = path.resolve(this.coverageFilesDirectory, fileHash);
        const json = await fs.readFile(schemaPath, "utf-8");
        const tree = fromJson(json);
        const coverageMap = astToCoverageMap(compiledSchema, path.resolve(root, file), tree);
        await fs.writeFile(coverageFilePath, JSON.stringify(coverageMap));
      }
    }
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
    this.generateReports(/** @type CoverageMap */ (coverageMap) ?? coverage.createCoverageMap());

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
  }

  /** @type (reporters: ResolvedCoverageOptions["reporter"])=> boolean */
  hasTerminalReporter(reporters) {
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

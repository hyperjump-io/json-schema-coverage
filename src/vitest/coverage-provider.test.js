import { describe, expect, test } from "vitest";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const vitestPackageJsonPath = require.resolve("vitest/package.json");
/** @type {{ bin: { vitest: string } }} */
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const vitestPackage = require(vitestPackageJsonPath);
const vitestBin = path.resolve(path.dirname(vitestPackageJsonPath), vitestPackage.bin.vitest);

const fixturesDirectory = path.resolve(import.meta.dirname, "fixtures");

/** @type (configPath: string, args?: string[]) => Promise<{ code: number, output: string }> */
const runVitest = (configPath, args = []) => new Promise((resolvePromise) => {
  // Vitest's `root` config option doesn't change the OS-level process cwd, and
  // this plugin's own scratch directory is a bare relative path resolved
  // against that cwd. Without setting it here, a spawned fixture run would
  // inherit this project's own cwd and collide with this project's own
  // coverage-provider instance (which is also running, via `npm test`
  // --coverage) on the exact same `.json-schema-coverage` directory.
  execFile(process.execPath, [vitestBin, "run", "--config", configPath, ...args], { cwd: path.dirname(configPath) }, (error, stdout, stderr) => {
    /** @type number */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const code = error ? /** @type any */ (error).code ?? 1 : 0;
    resolvePromise({ code, output: stdout + stderr });
  });
});

const singleSchemaConfig = path.resolve(fixturesDirectory, "single-schema", "vitest.config.js");
const globThresholdConfig = path.resolve(fixturesDirectory, "glob-threshold", "vitest.config.js");
const perFileThresholdConfig = path.resolve(fixturesDirectory, "glob-threshold", "vitest.perfile.config.js");
const reportOnFailureConfig = path.resolve(fixturesDirectory, "report-on-failure", "vitest.config.js");
const customReporterConfig = path.resolve(fixturesDirectory, "custom-reporter", "vitest.config.js");

describe("coverage thresholds", () => {
  test("the run passes when no thresholds are configured", async () => {
    const { code, output } = await runVitest(singleSchemaConfig);

    expect(code).toBe(0);
    expect(output).not.toContain("ERROR:");
  });

  test("the run fails when coverage is below a global threshold", async () => {
    const { code, output } = await runVitest(singleSchemaConfig, ["--coverage.thresholds.branches=100"]);

    expect(code).toBe(1);
    expect(output).toContain("ERROR: Coverage for branches (37.5%) does not meet global threshold (100%)");
  });

  test("the run passes when coverage meets a global threshold", async () => {
    const { code, output } = await runVitest(singleSchemaConfig, ["--coverage.thresholds.lines=50"]);

    expect(code).toBe(0);
    expect(output).not.toContain("ERROR:");
  });

  test("a glob threshold only applies to its own matching files", async () => {
    const { code, output } = await runVitest(globThresholdConfig);

    expect(code).toBe(1);
    expect(output).toContain("ERROR: Coverage for branches (50%) does not meet \"uncovered.schema.json\" threshold (100%)");
    // Note the leading quote: "uncovered.schema.json" would otherwise match too.
    expect(output).not.toContain("\"covered.schema.json\" threshold");
  });

  test("perFile checks each file against the threshold individually", async () => {
    const { code, output } = await runVitest(perFileThresholdConfig);

    expect(code).toBe(1);
    expect(output).toContain("ERROR: Coverage for branches (50%) does not meet global threshold (100%) for uncovered.schema.json");
    expect(output).not.toContain("for covered.schema.json");
  });
});

describe("reportOnFailure", () => {
  test("a failing run cleans up without crashing by default", async () => {
    const { code, output } = await runVitest(reportOnFailureConfig, ["--coverage.thresholds.branches=100"]);

    expect(code).toBe(1);
    expect(output).not.toContain("Unhandled Error");
    // Coverage isn't reported when tests fail, unless `reportOnFailure` is set.
    expect(output).not.toContain("ERROR: Coverage");
  });

  test("reportOnFailure still reports coverage without crashing", async () => {
    const { code, output } = await runVitest(reportOnFailureConfig, [
      "--coverage.reportOnFailure=true",
      "--coverage.thresholds.branches=100"
    ]);

    expect(code).toBe(1);
    expect(output).not.toContain("Unhandled Error");
    expect(output).toContain("ERROR: Coverage for branches (37.5%) does not meet global threshold (100%)");
  });
});

describe("custom reporters", () => {
  test("a custom, ESM-only reporter is loaded via createAsync and executed", async () => {
    const { code, output } = await runVitest(customReporterConfig);

    expect(code).toBe(0);
    expect(output).toContain("CUSTOM REPORTER EXECUTED");
  });
});

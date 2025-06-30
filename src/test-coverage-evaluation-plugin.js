import { existsSync, readFileSync } from "node:fs";
import { toAbsoluteIri } from "@hyperjump/uri";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

/**
 * @import { CoverageMapData } from "istanbul-lib-coverage"
 * @import { EvaluationPlugin } from "@hyperjump/json-schema/experimental"
 */

/** @implements EvaluationPlugin */
export class TestCoverageEvaluationPlugin {
  /** @type Record<string, string> */
  #filePathFor = {};

  constructor() {
    /** @type CoverageMapData */
    this.coverageMap = {};
  }

  /** @type NonNullable<EvaluationPlugin["beforeSchema"]> */
  beforeSchema(schemaUri) {
    const schemaLocation = toAbsoluteIri(schemaUri);
    if (!(schemaLocation in this.#filePathFor)) {
      const fileHash = createHash("md5").update(`${schemaLocation}#`).digest("hex");
      const coverageFilePath = resolve(".json-schema-coverage", fileHash);

      if (existsSync(coverageFilePath)) {
        const json = readFileSync(coverageFilePath, "utf-8");
        /** @type CoverageMapData */
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const coverageMapData = JSON.parse(json);
        const fileCoveragePath = Object.keys(coverageMapData)[0];
        Object.assign(this.coverageMap, coverageMapData);
        this.#filePathFor[schemaLocation] = fileCoveragePath;
      }
    }
  }

  /** @type NonNullable<EvaluationPlugin["afterKeyword"]> */
  afterKeyword([, keywordLocation], _instance, _context, valid) {
    const schemaLocation = toAbsoluteIri(keywordLocation);
    const filePath = this.#filePathFor[schemaLocation];
    if (!(filePath in this.coverageMap)) {
      return;
    }

    const fileCoverage = this.coverageMap[filePath];
    fileCoverage.s[keywordLocation]++;
    if (keywordLocation in fileCoverage.b) {
      fileCoverage.b[keywordLocation][Number(valid)]++;
    }
  }

  /** @type NonNullable<EvaluationPlugin["afterSchema"]> */
  afterSchema(schemaUri) {
    const schemaLocation = toAbsoluteIri(schemaUri);
    const filePath = this.#filePathFor[schemaLocation];
    if (!(filePath in this.coverageMap)) {
      return;
    }

    const fileCoverage = this.coverageMap[filePath];
    fileCoverage.s[schemaUri]++;
    fileCoverage.f[schemaUri]++;
  }
}

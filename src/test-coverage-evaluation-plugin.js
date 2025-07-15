import { toAbsoluteIri } from "@hyperjump/uri";

/**
 * @import { CoverageMapData } from "istanbul-lib-coverage"
 * @import { EvaluationPlugin } from "@hyperjump/json-schema/experimental"
 * @import { CoverageMapService } from "./coverage-map-service.js";
 */

/** @implements EvaluationPlugin */
export class TestCoverageEvaluationPlugin {
  /** @type CoverageMapData */
  coverage = {};

  /** @ype CoverageMapService */
  #coverageService;

  /**
   * @param {CoverageMapService} coverageService
   */
  constructor(coverageService) {
    this.#coverageService = coverageService;
  }

  /** @type NonNullable<EvaluationPlugin["beforeSchema"]> */
  beforeSchema(schemaUri) {
    const schemaPath = this.#coverageService.getSchemaPath(schemaUri);
    if (!(schemaPath in this.coverage)) {
      const schemaLocation = `${toAbsoluteIri(schemaUri)}#`;
      const coverageMapData = this.#coverageService.getCoverageMap(schemaLocation);
      Object.assign(this.coverage, coverageMapData);
    }
  }

  /** @type NonNullable<EvaluationPlugin["afterKeyword"]> */
  afterKeyword([, keywordLocation], _instance, _context, valid) {
    const schemaPath = this.#coverageService.getSchemaPath(keywordLocation);
    if (!(schemaPath in this.coverage)) {
      return;
    }

    const fileCoverage = this.coverage[schemaPath];
    fileCoverage.s[keywordLocation]++;
    if (keywordLocation in fileCoverage.b) {
      fileCoverage.b[keywordLocation][Number(valid)]++;
    }
  }

  /** @type NonNullable<EvaluationPlugin["afterSchema"]> */
  afterSchema(schemaUri) {
    const schemaPath = this.#coverageService.getSchemaPath(schemaUri);
    if (!(schemaPath in this.coverage)) {
      return;
    }

    const fileCoverage = this.coverage[schemaPath];
    fileCoverage.f[schemaUri]++;
  }
}

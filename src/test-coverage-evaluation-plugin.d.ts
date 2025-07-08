import type {
  EvaluationPlugin,
  Keyword,
  Node,
  ValidationContext
} from "@hyperjump/json-schema/experimental";
import type { JsonNode } from "@hyperjump/json-schema/instance/experimental";
import type { CoverageMapData } from "istanbul-lib-coverage";
import type { CoverageMapService } from "./coverage-map-service.d.ts";

/**
 * The `TestCoverageEvaluationPlugin` hooks into the evaluation process of the
 * [@hyperjump/json-schema](https://github.com/hyperjump-io/json-schema)
 * validator and uses the `CoverageMapService` to record when a keyword or
 * schema is visited. Once the evaluation process is completed, it contains an
 * [istanbul](https://istanbul.js.org/) coverage file. These files can then be
 * used to generate any report that supports [istanbul](https://istanbul.js.org/).
 */
export class TestCoverageEvaluationPlugin implements EvaluationPlugin {
  constructor(coverageService?: CoverageMapService);
  coverage: CoverageMapData;
  beforeSchema(url: string, instance: JsonNode, context: ValidationContext): void;
  beforeKeyword(keywordNode: Node<unknown>, instance: JsonNode, context: ValidationContext, schemaContext: ValidationContext, keyword: Keyword): void;
}

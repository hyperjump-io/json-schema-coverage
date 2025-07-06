import type {
  EvaluationPlugin,
  Keyword,
  Node,
  ValidationContext
} from "@hyperjump/json-schema/experimental";
import type { JsonNode } from "@hyperjump/json-schema/instance/experimental";
import type { CoverageMapData } from "istanbul-lib-coverage";
import type { CoverageMapService } from "./coverage-map-service.d.ts";

export class TestCoverageEvaluationPlugin implements EvaluationPlugin {
  constructor(coverageService?: CoverageMapService);
  coverage: CoverageMapData;
  beforeSchema(url: string, instance: JsonNode, context: ValidationContext): void;
  beforeKeyword(keywordNode: Node<unknown>, instance: JsonNode, context: ValidationContext, schemaContext: ValidationContext, keyword: Keyword): void;
}

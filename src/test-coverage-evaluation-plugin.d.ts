import type {
  EvaluationPlugin,
  Keyword,
  Node,
  ValidationContext
} from "@hyperjump/json-schema/experimental";
import type { JsonNode } from "@hyperjump/json-schema/instance/experimental";
import type { CoverageMapData } from "istanbul-lib-coverage";

export class TestCoverageEvaluationPlugin implements EvaluationPlugin {
  coverageMap: CoverageMapData;
  beforeSchema(url: string, instance: JsonNode, context: ValidationContext): void;
  beforeKeyword(keywordNode: Node<unknown>, instance: JsonNode, context: ValidationContext, schemaContext: ValidationContext, keyword: Keyword): void;
}

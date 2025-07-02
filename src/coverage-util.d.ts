import type { CompiledSchema } from "@hyperjump/json-schema/experimental";
import type { CoverageMapData } from "istanbul-lib-coverage";
import type { JsonNode } from "./jsonast.js";

export const astToCoverageMap: (compiledSchema: CompiledSchema, schemaPath: string, schemaNodes: Record<string, JsonNode>) => CoverageMapData;

export const registerSchema: (filePath: string) => Promise<void>;
export const parseToAst: (schemaPath: string) => Promise<JsonNode>;

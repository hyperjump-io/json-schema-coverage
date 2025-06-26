import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseIri } from "@hyperjump/uri";
import { fromJson, getNodeFromPointer } from "./json-util.js";

/**
 * @import { Position } from "unist"
 * @import { CoverageMapData, Range } from "istanbul-lib-coverage"
 * @import { AST, EvaluationPlugin } from "@hyperjump/json-schema/experimental"
 * @import { JsonNode } from "./jsonast.js"
 */

/** @implements EvaluationPlugin */
export class TestCoverageEvaluationPlugin {
  /** @type Record<string, JsonNode> */
  #schemaCache = {};

  constructor() {
    /** @type CoverageMapData */
    this.coverageMap = {};
  }

  /** @type NonNullable<EvaluationPlugin["beforeSchema"]> */
  beforeSchema(_schemaUri, _instance, context) {
    this.#buildCoverageMap(context.ast);
  }

  /** @type NonNullable<EvaluationPlugin["afterKeyword"]> */
  afterKeyword([, keywordLocation], _instance, _context, valid) {
    if (!keywordLocation.startsWith("file:")) {
      return;
    }

    const schemaPath = fileURLToPath(keywordLocation);
    this.coverageMap[schemaPath].s[keywordLocation]++;
    this.coverageMap[schemaPath].b[keywordLocation][Number(valid)]++;
  }

  /** @type NonNullable<EvaluationPlugin["afterSchema"]> */
  afterSchema(schemaUri) {
    if (!schemaUri.startsWith("file:")) {
      return;
    }

    const schemaPath = fileURLToPath(schemaUri);
    this.coverageMap[schemaPath].s[schemaUri]++;
    this.coverageMap[schemaPath].f[schemaUri]++;
  }

  /** @type (ast: AST) => void */
  #buildCoverageMap(ast) {
    for (const schemaLocation in ast) {
      if (schemaLocation === "metaData" || schemaLocation === "plugins" || !schemaLocation.startsWith("file:")) {
        continue;
      }

      const schemaPath = fileURLToPath(schemaLocation);

      if (!(schemaPath in this.coverageMap)) {
        this.coverageMap[schemaPath] = {
          path: schemaPath,
          statementMap: {},
          fnMap: {},
          branchMap: {},
          s: {},
          f: {},
          b: {}
        };
      }

      if (!(schemaPath in this.#schemaCache)) {
        const file = readFileSync(schemaPath, "utf8");
        this.#schemaCache[schemaPath] = fromJson(file);
      }

      const tree = this.#schemaCache[schemaPath];
      const pointer = decodeURI(parseIri(schemaLocation).fragment ?? "");
      const node = getNodeFromPointer(tree, pointer);

      const declRange = node.type === "json-property"
        ? positionToRange(node.children[0].position)
        : {
            start: { line: node.position.start.line, column: node.position.start.column - 1 },
            end: { line: node.position.start.line, column: node.position.start.column - 1 }
          };

      const locRange = positionToRange(node.position);

      // Create statement
      this.coverageMap[schemaPath].statementMap[schemaLocation] = locRange;
      this.coverageMap[schemaPath].s[schemaLocation] = 0;

      // Create function
      this.coverageMap[schemaPath].fnMap[schemaLocation] = {
        name: schemaLocation,
        decl: declRange,
        loc: locRange,
        line: node.position.start.line
      };
      this.coverageMap[schemaPath].f[schemaLocation] = 0;

      if (Array.isArray(ast[schemaLocation])) {
        for (const keywordNode of ast[schemaLocation]) {
          if (Array.isArray(keywordNode)) {
            const [, keywordLocation] = keywordNode;

            if (keywordLocation in this.coverageMap[schemaPath].branchMap) {
              continue;
            }

            const pointer = decodeURI(parseIri(keywordLocation).fragment ?? "");
            const node = getNodeFromPointer(tree, pointer);
            const range = positionToRange(node.position);

            // Create statement
            this.coverageMap[schemaPath].statementMap[keywordLocation] = range;
            this.coverageMap[schemaPath].s[keywordLocation] = 0;

            // Create branch
            this.coverageMap[schemaPath].branchMap[keywordLocation] = {
              line: range.start.line,
              type: "keyword",
              loc: range,
              locations: [range, range]
            };
            this.coverageMap[schemaPath].b[keywordLocation] = [0, 0];
          }
        }
      }
    }
  }
}

/** @type (position: Position) => Range */
const positionToRange = (position) => {
  return {
    start: { line: position.start.line, column: position.start.column - 1 },
    end: { line: position.end.line, column: position.end.column - 1 }
  };
};

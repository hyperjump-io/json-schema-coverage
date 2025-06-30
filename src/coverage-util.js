import { getKeyword } from "@hyperjump/json-schema/experimental";
import { parseIri } from "@hyperjump/uri";
import { getNodeFromPointer } from "./json-util.js";

/**
 * @import { Position } from "unist"
 * @import { CompiledSchema } from "@hyperjump/json-schema/experimental"
 * @import { CoverageMapData, FileCoverageData, Range } from "istanbul-lib-coverage"
 * @import { JsonNode } from "./jsonast.js"
 */

/** @type (compiledSchema: CompiledSchema, schemaPath: string, tree: JsonNode) => CoverageMapData */
export const astToCoverageMap = (compiledSchema, schemaPath, tree) => {
  /** @type FileCoverageData */
  const fileCoverage = {
    path: schemaPath,
    statementMap: {},
    branchMap: {},
    fnMap: {},
    s: {},
    b: {},
    f: {}
  };

  for (const schemaLocation in compiledSchema.ast) {
    if (schemaLocation === "metaData" || schemaLocation === "plugins" || !schemaLocation.startsWith(compiledSchema.schemaUri)) {
      continue;
    }

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
    fileCoverage.statementMap[schemaLocation] = locRange;
    fileCoverage.s[schemaLocation] = 0;

    // Create function
    fileCoverage.fnMap[schemaLocation] = {
      name: schemaLocation,
      decl: declRange,
      loc: locRange,
      line: node.position.start.line
    };
    fileCoverage.f[schemaLocation] = 0;

    if (Array.isArray(compiledSchema.ast[schemaLocation])) {
      for (const keywordNode of compiledSchema.ast[schemaLocation]) {
        if (Array.isArray(keywordNode)) {
          const [keywordUri, keywordLocation] = keywordNode;

          const pointer = decodeURI(parseIri(keywordLocation).fragment ?? "");
          const node = getNodeFromPointer(tree, pointer);
          const range = positionToRange(node.position);

          // Create statement
          fileCoverage.statementMap[keywordLocation] = range;
          fileCoverage.s[keywordLocation] = 0;

          if (annotationKeywords.has(keywordUri) || getKeyword(keywordUri).simpleApplicator) {
            continue;
          }

          // Create branch
          fileCoverage.branchMap[keywordLocation] = {
            line: range.start.line,
            type: "keyword",
            loc: range,
            locations: [range, range]
          };
          fileCoverage.b[keywordLocation] = [0, 0];
        }
      }
    }
  }

  return { [schemaPath]: fileCoverage };
};

/** @type (position: Position) => Range */
const positionToRange = (position) => {
  return {
    start: { line: position.start.line, column: position.start.column - 1 },
    end: { line: position.end.line, column: position.end.column - 1 }
  };
};

const annotationKeywords = new Set([
  "https://json-schema.org/keyword/comment",
  "https://json-schema.org/keyword/definitions",
  "https://json-schema.org/keyword/title",
  "https://json-schema.org/keyword/description",
  "https://json-schema.org/keyword/default",
  "https://json-schema.org/keyword/deprecated",
  "https://json-schema.org/keyword/readOnly",
  "https://json-schema.org/keyword/writeOnly",
  "https://json-schema.org/keyword/examples",
  "https://json-schema.org/keyword/format"
]);

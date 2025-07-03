import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import YAML from "yaml";
import { getKeyword } from "@hyperjump/json-schema/experimental";
import { parseIri, toAbsoluteIri } from "@hyperjump/uri";
import { registerSchema as register } from "./json-schema.js";
import { fromJson, fromYaml, getNodeFromPointer } from "./json-util.js";

/**
 * @import { Position } from "unist"
 * @import { FileCoverageData, Range } from "istanbul-lib-coverage"
 * @import { SchemaObject } from "@hyperjump/json-schema"
 * @import * as API from "./coverage-util.d.ts"
 */

/** @type API.astToCoverageMap */
export const astToCoverageMap = (compiledSchema, schemaPath, schemaNodes) => {
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
    if (schemaLocation === "metaData" || schemaLocation === "plugins") {
      continue;
    }

    if (!(toAbsoluteIri(schemaLocation) in schemaNodes)) {
      continue;
    }

    const pointer = decodeURI(parseIri(schemaLocation).fragment ?? "");
    const node = getNodeFromPointer(schemaNodes[toAbsoluteIri(schemaLocation)], pointer, true);

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

          if (nonStatementKeywords.has(keywordUri)) {
            continue;
          }

          const pointer = decodeURI(parseIri(keywordLocation).fragment ?? "");
          const node = getNodeFromPointer(schemaNodes[toAbsoluteIri(keywordLocation)], pointer, true);
          const range = positionToRange(node.position);

          // Create statement
          fileCoverage.statementMap[keywordLocation] = range;
          fileCoverage.s[keywordLocation] = 0;

          if (nonBranchingKeywords.has(keywordUri) || getKeyword(keywordUri).simpleApplicator) {
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

const nonStatementKeywords = new Set([
  "https://json-schema.org/keyword/comment",
  "https://json-schema.org/keyword/definitions"
]);

const nonBranchingKeywords = new Set([
  "https://json-schema.org/keyword/title",
  "https://json-schema.org/keyword/description",
  "https://json-schema.org/keyword/default",
  "https://json-schema.org/keyword/deprecated",
  "https://json-schema.org/keyword/readOnly",
  "https://json-schema.org/keyword/writeOnly",
  "https://json-schema.org/keyword/examples",
  "https://json-schema.org/keyword/format",
  "https://json-schema.org/keyword/if"
]);

/** @type API.registerSchema */
export const registerSchema = async (schemaPath) => {
  const text = await readFile(schemaPath, "utf-8");
  const extension = extname(schemaPath);

  /** @type SchemaObject | boolean */
  let schema;
  switch (extension) {
    case ".json":
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      schema = JSON.parse(text);
      break;
    case ".yaml":
    case ".yml":
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      schema = YAML.parse(text);
      break;
    default:
      throw Error(`File of type '${extension}' is not supported.`);
  }

  register(schema);
};

/** @type API.parseToAst */
export const parseToAst = async (schemaPath) => {
  const text = await readFile(schemaPath, "utf-8");
  const extension = extname(schemaPath);

  switch (extension) {
    case ".json":
      return fromJson(text);
    case ".yaml":
    case ".yml":
      return fromYaml(text);
    default:
      throw Error(`File of type '${extension}' is not supported.`);
  }
};

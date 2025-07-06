import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { compile, getKeyword, getSchema } from "@hyperjump/json-schema/experimental";
import { jrefTypeOf, Reference } from "@hyperjump/browser/jref";
import * as JsonPointer from "@hyperjump/json-pointer";
import { parseIri, toAbsoluteIri } from "@hyperjump/uri";
import { fromJson, fromYaml, getNodeFromPointer } from "./json-util.js";

/**
 * @import { CoverageMapData, FileCoverageData, Range } from "istanbul-lib-coverage"
 * @import { Position } from "unist"
 * @import { CompiledSchema } from "@hyperjump/json-schema/experimental";
 * @import { JRef } from "@hyperjump/browser/jref"
 * @import { JsonNode } from "./jsonast.js"
 */

export class CoverageMapService {
  /** @type Record<string, CoverageMapData> */
  #coverageMaps = {};

  /** @type Record<string, string> */
  #filePathFor = {};

  #nonStatementKeywords = new Set([
    "https://json-schema.org/keyword/comment",
    "https://json-schema.org/keyword/definitions"
  ]);

  #nonBranchingKeywords = new Set([
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

  /** @type (schemaPath: string) => Promise<string> */
  async addFromFile(schemaPath) {
    const schema = await getSchema(schemaPath);
    const compiledSchema = await compile(schema);
    const tree = await this.#parseToAst(schemaPath);

    /** @type Record<string, JsonNode> */
    const schemaNodes = {};
    for (const schemaUri in schema.document.embedded ?? {}) {
      const pointer = this.#findEmbedded(schema.document.root, schemaUri);
      schemaNodes[schemaUri] = getNodeFromPointer(tree, pointer);
    }
    const coverageMap = this.#astToCoverageMap(compiledSchema, schemaPath, schemaNodes);
    this.addCoverageMap(coverageMap);

    return compiledSchema.schemaUri;
  }

  /** @type (coverageMap: CoverageMapData) => void */
  addCoverageMap(coverageMap) {
    for (const filePath in coverageMap) {
      const [schemaUri] = Object.keys(coverageMap[filePath].statementMap);
      this.#coverageMaps[schemaUri] = coverageMap;

      for (const fileCoveragePath in coverageMap) {
        for (const location in coverageMap[fileCoveragePath].statementMap) {
          this.#filePathFor[location] = fileCoveragePath;
        }
      }
    }
  }

  /** @type (schemaUri: string) => string */
  getSchemaPath(schemaUri) {
    return this.#filePathFor[schemaUri];
  }

  /** @type (schemaUri: string) => CoverageMapData */
  getCoverageMap(schemaUri) {
    return this.#coverageMaps[schemaUri];
  }

  /** @type (schemaPath: string) => Promise<JsonNode> */
  async #parseToAst(schemaPath) {
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

  /** @type (root: JRef, uri: string) => string */
  #findEmbedded = (root, uri) => {
    for (const [pointer, node] of this.#allSchemaNodes(root, uri)) {
      if (node instanceof Reference) {
        const json = node.toJSON();
        if (typeof json === "object" && json !== null && !("$ref" in json) && node.href === uri) {
          return pointer;
        }
      }
    }

    return "";
  };

  /** @type (node: JRef, uri: string, pointer?: string) => Generator<[string, JRef]> */
  * #allSchemaNodes(node, uri, pointer = "") {
    yield [pointer, node];

    switch (jrefTypeOf(node)) {
      case "object":
        const jrefObject = /** @type Record<string, JRef> */ (node);
        for (const key in jrefObject) {
          yield* this.#allSchemaNodes(jrefObject[key], uri, JsonPointer.append(key, pointer));
        }
        break;

      case "array":
        const jrefArray = /** @type JRef[] */ (node);
        let index = 0;
        for (const item of jrefArray) {
          yield* this.#allSchemaNodes(item, uri, JsonPointer.append(`${index++}`, pointer));
        }
        break;
    }
  };

  /** @type (compiledSchema: CompiledSchema, schemaPath: string, schemaNodes: Record<string, JsonNode>) => CoverageMapData */
  #astToCoverageMap(compiledSchema, schemaPath, schemaNodes) {
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
        ? this.#positionToRange(node.children[0].position)
        : {
            start: { line: node.position.start.line, column: node.position.start.column - 1 },
            end: { line: node.position.start.line, column: node.position.start.column - 1 }
          };

      const locRange = this.#positionToRange(node.position);

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

            if (this.#nonStatementKeywords.has(keywordUri)) {
              continue;
            }

            const pointer = decodeURI(parseIri(keywordLocation).fragment ?? "");
            const node = getNodeFromPointer(schemaNodes[toAbsoluteIri(keywordLocation)], pointer, true);
            const range = this.#positionToRange(node.position);

            // Create statement
            fileCoverage.statementMap[keywordLocation] = range;
            fileCoverage.s[keywordLocation] = 0;

            if (this.#nonBranchingKeywords.has(keywordUri) || getKeyword(keywordUri).simpleApplicator) {
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
  #positionToRange(position) {
    return {
      start: { line: position.start.line, column: position.start.column - 1 },
      end: { line: position.end.line, column: position.end.column - 1 }
    };
  };
}

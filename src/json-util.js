import * as JsonPointer from "@hyperjump/json-pointer";
import { JsonLexer } from "./json-lexer.js";
import { parse as parseYaml } from "yaml-unist-parser";

/**
 * @import { Node, Position } from "unist"
 * @import { JsonToken } from "./json-lexer.js"
 * @import {
 *   JsonArrayNode,
 *   JsonNode,
 *   JsonObjectNode,
 *   JsonPropertyNameNode,
 *   JsonPropertyNode,
 *   JsonStringNode
 * } from "./jsonast.d.ts"
 * @import {
 *   YamlUnistNode,
 *   MappingKey,
 *   MappingItem,
 *   FlowMappingItem,
 *   ContentNode
 * } from "yaml-unist-parser"
 */

/** @type (json: string) => JsonNode */
export const fromJson = (json) => {
  const lexer = new JsonLexer(json);

  const token = lexer.nextToken();
  const jsonValue = parseValue(token, lexer, undefined);

  lexer.done();

  return jsonValue;
};

/** @type (token: JsonToken, lexer: JsonLexer, key: string | undefined) => JsonNode */
const parseValue = (token, lexer, _key) => {
  switch (token.type) {
    case "null":
    case "boolean":
    case "number":
    case "string":
      return parseScalar(token);
    case "[":
      return parseArray(token, lexer);
    case "{":
      return parseObject(token, lexer);
    default:
      throw lexer.syntaxError("Expected a JSON value", token);
  }
};

/** @type (token: JsonToken<"null" | "boolean" | "number" | "string">) => JsonNode */
const parseScalar = (token) => {
  return {
    type: "json",
    jsonType: token.type,
    value: JSON.parse(token.value), // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    position: tokenPosition(token)
  };
};

/** @type (token: JsonToken, lexer: JsonLexer, key: string) => JsonPropertyNode */
const parseProperty = (token, lexer, _key) => {
  if (token.type !== "string") {
    throw lexer.syntaxError("Expected a propertry", token);
  }

  /** @type JsonPropertyNameNode */
  const keyNode = {
    type: "json-property-name",
    jsonType: "string",
    value: JSON.parse(token.value), // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    position: tokenPosition(token)
  };

  if (lexer.nextToken().type !== ":") {
    throw lexer.syntaxError("Expected :", token);
  }

  const valueNode = parseValue(lexer.nextToken(), lexer, keyNode.value);

  return {
    type: "json-property",
    children: [keyNode, valueNode],
    position: {
      start: keyNode.position.start,
      end: valueNode.position.end
    }
  };
};

/**
 * @template A
 * @typedef {Node & { children: A[] }} ParentNode
 */

/**
 * @type <P extends ParentNode<C>, C extends JsonNode | JsonPropertyNode>(
 *   parseChild: (token: JsonToken, lexer: JsonLexer, key: string) => C,
 *   endToken: string
 * ) => (lexer: JsonLexer, node: P) => P
 */
const parseCommaSeparated = (parseChild, endToken) => (lexer, node) => {
  for (let index = 0; true; index++) {
    let token = lexer.nextToken();

    if (token.type === endToken) {
      /** @type Position */ (node.position).end = tokenPosition(token).end;
      return node;
    }

    if (index > 0) {
      if (token.type === ",") {
        token = lexer.nextToken();
      } else {
        throw lexer.syntaxError(`Expected , or ${endToken}`, token);
      }
    }

    const childNode = parseChild(token, lexer, `${index}`);
    if (childNode) {
      node.children.push(childNode);
    }
  }
};

/** @type (openToken: JsonToken, lexer: JsonLexer) => JsonArrayNode */
const parseArray = (openToken, lexer) => {
  return parseItems(lexer, {
    type: "json",
    jsonType: "array",
    children: [],
    position: tokenPosition(openToken)
  });
};

/** @type (token: JsonToken, lexer: JsonLexer, key: string) => JsonNode */
const parseItem = (token, lexer, key) => {
  return parseValue(token, lexer, key);
};

/** @type (lexer: JsonLexer, node: { type: "json" } & JsonArrayNode) => JsonArrayNode */
const parseItems = parseCommaSeparated(parseItem, "]");

/** @type (openToken: JsonToken, lexer: JsonLexer) => JsonObjectNode */
const parseObject = (openToken, lexer) => {
  return parseProperties(lexer, {
    type: "json",
    jsonType: "object",
    children: [],
    position: tokenPosition(openToken)
  });
};

/** @type (lexer: JsonLexer, node: { type: "json" } & JsonObjectNode) => JsonObjectNode */
const parseProperties = parseCommaSeparated(parseProperty, "}");

/** @type (startToken: JsonToken, endToken?: JsonToken) => Position */
const tokenPosition = (startToken, endToken) => {
  endToken ??= startToken;

  return {
    start: {
      line: startToken.line,
      column: startToken.col,
      offset: startToken.offset
    },
    end: {
      line: endToken.line,
      column: endToken.col + endToken.text.length - 1,
      offset: endToken.offset + endToken.text.length
    }
  };
};

/**
 * @overload
 * @param {JsonNode} tree
 * @param {string} pointer
 * @param {true} returnProperty
 * @return {JsonNode | JsonPropertyNode}
 *
 * @overload
 * @param {JsonNode} tree
 * @param {string} pointer
 * @return {JsonNode}
 *
 * @param {JsonNode} tree
 * @param {string} pointer
 * @param {true} [returnProperty]
 * @return {JsonNode | JsonPropertyNode}
 */
export const getNodeFromPointer = (tree, pointer, returnProperty) => {
  /** @type JsonNode | JsonPropertyNode | undefined */
  let node = tree;

  for (const segment of JsonPointer.pointerSegments(pointer)) {
    if (node.type === "json-property") {
      node = node.children[1];
    }

    switch (node.jsonType) {
      case "object":
        node = node.children.find((property) => property.children[0].value === segment);
        break;
      case "array":
        node = node.children[parseInt(segment, 10)];
        break;
    }

    if (!node) {
      throw Error("Invalid pointer");
    }
  }

  return node.type === "json-property" && !returnProperty ? node.children[1] : node;
};

/** @type (yaml: string) => JsonNode */
export const fromYaml = (yaml) => {
  const root = parseYaml(yaml);
  return yamlToJson(root);
};

/**
 * @overload
 * @param {MappingItem | FlowMappingItem} yamlNode
 * @returns {JsonPropertyNode}
 *
 * @overload
 * @param {MappingKey} yamlNode
 * @returns {JsonPropertyNameNode}
 *
 * @overload
 * @param {ContentNode} yamlNode
 * @returns {JsonStringNode}
 *
 * @overload
 * @param {YamlUnistNode} yamlNode
 * @returns {JsonNode}
 *
 * @param {YamlUnistNode} yamlNode
 * @returns {JsonNode | JsonPropertyNode | JsonPropertyNameNode}
 */
const yamlToJson = (yamlNode) => {
  switch (yamlNode.type) {
    case "root":
      return yamlToJson(yamlNode.children[0]);

    case "document":
      return yamlToJson(yamlNode.children[1]);

    case "documentHead":
      throw Error(`Not Implemented - ${yamlNode.type}`);

    case "documentBody":
      if (yamlNode.children.length === 0) {
        throw Error("YAML documents must contain a value");
      }
      return yamlToJson(yamlNode.children[0]);

    case "plain":
    case "quoteDouble":
    case "quoteSingle":
    case "blockLiteral":
    case "blockFolded":
      /** @type JsonStringNode */
      const stringNode = {
        type: "json",
        jsonType: "string",
        value: yamlNode.value,
        position: yamlNode.position
      };
      return stringNode;

    case "mapping":
    case "flowMapping":
      /** @type JsonObjectNode */
      const objectNode = {
        type: "json",
        jsonType: "object",
        children: yamlNode.children.map((mappingItemNode) => yamlToJson(mappingItemNode)),
        position: yamlNode.position
      };
      return objectNode;

    case "mappingItem":
    case "flowMappingItem":
      const [mappingKeyNode, mappingValueNode] = yamlNode.children;

      /** @type JsonPropertyNode */
      const propertyNode = {
        type: "json-property",
        children: [
          yamlToJson(mappingKeyNode),
          yamlToJson(mappingValueNode)
        ],
        position: yamlNode.position
      };

      return propertyNode;

    case "mappingKey":
      const contentNode = yamlToJson(/** @type ContentNode */ (yamlNode.children[0]));
      /** @type JsonPropertyNameNode */
      const propertyNameNode = {
        type: "json-property-name",
        jsonType: "string",
        value: contentNode.value,
        position: yamlNode.position
      };
      return propertyNameNode;

    case "mappingValue":
      return yamlToJson(/** @type ContentNode */ (yamlNode.children[0]));

    case "sequence":
    case "flowSequence":
      /** @type JsonArrayNode */
      const arrayNode = {
        type: "json",
        jsonType: "array",
        children: yamlNode.children.map((sequenceItemNode) => yamlToJson(sequenceItemNode)),
        position: yamlNode.position
      };
      return arrayNode;

    case "sequenceItem":
    case "flowSequenceItem":
      return yamlToJson(/** @type ContentNode */ (yamlNode.children[0]));

    default:
      throw Error(`YAML error. ${yamlNode.type}`);
  }
};

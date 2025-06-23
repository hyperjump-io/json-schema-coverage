import * as JsonPointer from "@hyperjump/json-pointer";
import { JsonLexer } from "./json-lexer.js";

/**
 * @import { Node, Position } from "unist"
 * @import { JsonToken } from "./json-lexer.js"
 * @import {
 *   JsonArrayNode,
 *   JsonNode,
 *   JsonObjectNode,
 *   JsonPropertyNameNode,
 *   JsonPropertyNode
 * } from "./jsonast.d.ts"
 */

/** @type (json: string, location?: string) => JsonNode */
export const fromJson = (json, location = "") => {
  const lexer = new JsonLexer(json);

  const token = lexer.nextToken();
  const jsonValue = parseValue(token, lexer, undefined, `${location}#`);

  lexer.done();

  return jsonValue;
};

/** @type (token: JsonToken, lexer: JsonLexer, key: string | undefined, location: string) => JsonNode */
const parseValue = (token, lexer, _key, location) => {
  switch (token.type) {
    case "null":
    case "boolean":
    case "number":
    case "string":
      return parseScalar(token, location);
    case "[":
      return parseArray(token, lexer, location);
    case "{":
      return parseObject(token, lexer, location);
    default:
      throw lexer.syntaxError("Expected a JSON value", token);
  }
};

/** @type (token: JsonToken<"null" | "boolean" | "number" | "string">, location: string) => JsonNode */
const parseScalar = (token, location) => {
  return {
    type: "json",
    jsonType: token.type,
    value: JSON.parse(token.value), // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    location: location,
    position: tokenPosition(token)
  };
};

/** @type (token: JsonToken, lexer: JsonLexer, key: string, location: string) => JsonPropertyNode */
const parseProperty = (token, lexer, _key, location) => {
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

  const valueNode = parseValue(lexer.nextToken(), lexer, keyNode.value, JsonPointer.append(keyNode.value, location));

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
 *   parseChild: (token: JsonToken, lexer: JsonLexer, key: string, location: string) => C,
 *   endToken: string
 * ) => (lexer: JsonLexer, node: P, location: string) => P
 */
const parseCommaSeparated = (parseChild, endToken) => (lexer, node, location) => {
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

    const childNode = parseChild(token, lexer, `${index}`, location);
    if (childNode) {
      node.children.push(childNode);
    }
  }
};

/** @type (openToken: JsonToken, lexer: JsonLexer, location: string) => JsonArrayNode */
const parseArray = (openToken, lexer, location) => {
  return parseItems(lexer, {
    type: "json",
    jsonType: "array",
    children: [],
    location: location,
    position: tokenPosition(openToken)
  }, location);
};

/** @type (token: JsonToken, lexer: JsonLexer, key: string, location: string) => JsonNode */
const parseItem = (token, lexer, key, location) => {
  return parseValue(token, lexer, key, JsonPointer.append(key, location));
};

/** @type (lexer: JsonLexer, node: { type: "json" } & JsonArrayNode, location: string) => JsonArrayNode */
const parseItems = parseCommaSeparated(parseItem, "]");

/** @type (openToken: JsonToken, lexer: JsonLexer, location: string) => JsonObjectNode */
const parseObject = (openToken, lexer, location) => {
  return parseProperties(lexer, {
    type: "json",
    jsonType: "object",
    children: [],
    location: location,
    position: tokenPosition(openToken)
  }, location);
};

/** @type (lexer: JsonLexer, node: { type: "json" } & JsonObjectNode, location: string) => JsonObjectNode */
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

/** @type (tree: JsonNode, pointer: string) => JsonNode | JsonPropertyNode */
export const getNodeFromPointer = (tree, pointer) => {
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

  return node;
};

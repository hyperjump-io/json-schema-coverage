import type { Position } from "unist";

export type JsonNullNode = {
  type: "json";
  jsonType: "null";
  value: null;
  position: Position;
};

export type JsonBooleanNode = {
  type: "json";
  jsonType: "boolean";
  value: boolean;
  position: Position;
};

export type JsonNumberNode = {
  type: "json";
  jsonType: "number";
  value: number;
  position: Position;
};

export type JsonStringNode = {
  type: "json";
  jsonType: "string";
  value: string;
  position: Position;
};

export type JsonArrayNode = {
  type: "json";
  jsonType: "array";
  children: JsonNode[];
  position: Position;
};

export type JsonPropertyNameNode = {
  type: "json-property-name";
  jsonType: "string";
  value: string;
  position: Position;
};

export type JsonPropertyNode = {
  type: "json-property";
  children: [JsonPropertyNameNode, JsonNode];
  position: Position;
};

export type JsonObjectNode = {
  type: "json";
  jsonType: "object";
  children: JsonPropertyNode[];
  position: Position;
};

// eslint-disable-next-line @stylistic/operator-linebreak
export type JsonNode =
  | JsonObjectNode
  | JsonArrayNode
  | JsonStringNode
  | JsonNumberNode
  | JsonBooleanNode
  | JsonNullNode;

export type JsonType = "null" | "boolean" | "number" | "string" | "array" | "object";

export type Json = null | boolean | number | string | Json[] | { [property: string]: Json };

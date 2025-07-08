import { CoverageMapData } from "istanbul-lib-coverage";

/**
 * The `CoverageMapService` creates [istanbul](https://istanbul.js.org/)
 * coverage maps for your schemas and stores them for use by the
 * `TestCoverageEvaluationPlugin`. A coverage map stores the file positions of
 * all the keywords, schemas, and branches in a schema.
 */
export class CoverageMapService {
  /**
   * This method takes a file path to a schema, generates a coverage map for it,
   * and stores it for later use. It returns the identifier for the schema
   * (usually the value of `$id`).
   */
  addFromFile(schemaPath: string): Promise<string>;

  /**
   * If you have a coverage map you created yourself or got from some other
   * source, you can add it using this method. You probably don't need this. Use
   * `addFromFile` to create and store the coverage map for you.
   */
  addCoverageMap(coverageMap: CoverageMapData): void;

  /**
   * Get the file path for the schema that is identified by the given URI.
   */
  getSchemaPath(schemaUri: string): string;

  /**
   * Retrieve a coverage map that was previously added through `addFromFile` or
   * `addCoverageMap`.
   */
  getCoverageMap(schemaUri: string): CoverageMapData;
}

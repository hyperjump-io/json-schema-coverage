import { CoverageMapData } from "istanbul-lib-coverage";

export class CoverageMapService {
  addFromFile(schemaPath: string): Promise<string>;
  addCoverageMap(coverageMap: CoverageMapData): void;
  getSchemaPath(schemaUri: string): string;
  getCoverageMap(schemaUri: string): CoverageMapData;
}

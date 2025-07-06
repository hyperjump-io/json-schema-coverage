import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CoverageMapService } from "../coverage-map-service.js";

/**
 * @import { CoverageMapData } from "istanbul-lib-coverage"
 */

export class FileCoverageMapService extends CoverageMapService {
  /** @type string */
  #coverageMapsDirectory;

  /**
   * @param {string} coverageMapsDirectory
   */
  constructor(coverageMapsDirectory) {
    super();

    this.#coverageMapsDirectory = coverageMapsDirectory;
  }

  async open() {
    if (existsSync(this.#coverageMapsDirectory)) {
      await this.close();
    }

    await mkdir(this.#coverageMapsDirectory, { recursive: true });
  }

  async close() {
    await rm(this.#coverageMapsDirectory, {
      recursive: true,
      force: true,
      maxRetries: 10
    });
  }

  /** @type (coverageMapsDirectory: string) => Promise<FileCoverageMapService> */
  static async restoreFrom(coverageMapsDirectory) {
    const service = new FileCoverageMapService(coverageMapsDirectory);

    for (const file of await readdir(service.#coverageMapsDirectory, { withFileTypes: true })) {
      const path = resolve(file.parentPath, file.name);
      /** @type CoverageMapData */
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const coverageMap = JSON.parse(await readFile(path, "utf-8"));
      service.addCoverageMap(coverageMap);
    }

    return service;
  }

  /** @type (schemaPath: string) => Promise<string> */
  async addFromFile(schemaPath) {
    const schemaUri = await super.addFromFile(schemaPath);

    const coverageMap = this.getCoverageMap(schemaUri);
    const fileHash = createHash("md5").update(schemaUri).digest("hex");
    const coverageMapFile = resolve(this.#coverageMapsDirectory, fileHash);
    await writeFile(coverageMapFile, JSON.stringify(coverageMap));

    return schemaUri;
  }
}

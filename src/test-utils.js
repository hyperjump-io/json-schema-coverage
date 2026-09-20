import { cwd } from "node:process";
import { pathToFileURL } from "node:url";

/**
 * @import { CoverageMapData, FileCoverageData } from "@vitest/istanbul-lib-coverage"
 */

const root = pathToFileURL(cwd()).toString();

/** @type (coverageMap: CoverageMapData) => CoverageMapData */
export const censorCoverageMap = (coverageMap) => {
  /** @type CoverageMapData */
  const censoredCoverageMap = {};
  for (const filePath in coverageMap) {
    // Always plain, parsed-JSON data here, never a `FileCoverage` class instance
    // (whose `path` is a readonly getter), so this narrowing is safe.
    const fileCoverageData = /** @type FileCoverageData */ (coverageMap[filePath]);

    const censoredFilePath = pathToFileURL(filePath).toString().slice(root.length + 1);
    censoredCoverageMap[censoredFilePath] = fileCoverageData;

    for (const key in fileCoverageData) {
      switch (key) {
        case "path":
          fileCoverageData.path = censoredFilePath;
          break;
        case "statementMap":
        case "branchMap":
        case "fnMap":
        case "s":
        case "b":
        case "f":
          for (const schemaUri in fileCoverageData[key]) {
            if (schemaUri.startsWith("file:")) {
              const censoredSchemaUri = schemaUri.slice(root.length + 1);
              fileCoverageData[key][censoredSchemaUri] = fileCoverageData[key][schemaUri];
              delete fileCoverageData[key][schemaUri];

              if (key === "fnMap") {
                fileCoverageData[key][censoredSchemaUri].name = censoredSchemaUri;
              }
            }
          }
          break;
      }
    }
  }
  const [filePath] = Object.keys(coverageMap);
  const censoredFilePath = pathToFileURL(filePath).toString().slice(root.length + 1);
  /** @type FileCoverageData */ (coverageMap[filePath]).path = censoredFilePath;
  return { [censoredFilePath]: coverageMap[filePath] };
};

import { cwd } from "node:process";

/**
 * @import { CoverageMapData } from "istanbul-lib-coverage"
 */

/** @type (coverageMap: CoverageMapData) => CoverageMapData */
export const censorCoverageMap = (coverageMap) => {
  /** @type CoverageMapData */
  const censoredCoverageMap = {};
  for (const filePath in coverageMap) {
    const fileCoverageData = coverageMap[filePath];

    const censoredFilePath = filePath.slice(cwd().length);
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
              const censoredSchemaUri = schemaUri.slice(cwd().length + 8);
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
  const censoredFilePath = filePath.slice(cwd().length);
  coverageMap[filePath].path = censoredFilePath;
  return { [censoredFilePath]: coverageMap[filePath] };
};

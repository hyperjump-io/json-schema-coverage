import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { glob } from "tinyglobby";
import ignore from "ignore";
import { registerSchema } from "./index.js";
import { FileCoverageMapService } from "./file-coverage-map-service.js";

/**
 * @import { TestProject } from "vitest/node"
 */

/** @type (projects: TestProject) => Promise<void> */
export const setup = async (projects) => {
  const config = projects.vitest.config;

  const coverageService = new FileCoverageMapService(join(".json-schema-coverage", "maps"));

  // If --project filter is set pick only roots of resolved projects
  const roots = config.project?.length
    ? [...new Set(projects.vitest.projects.map((project) => project.config.root))]
    : [config.root];

  const include = "include" in config.coverage
    ? /** @type string[] */ (config.coverage.include)
    : ["**/*.schema.(json|yaml|yml)"];

  // Build coverage maps
  for (const root of roots) {
    const i = ignore();
    const gitignorePath = resolve(root, ".gitignore");
    if (existsSync(gitignorePath)) {
      const gitignore = await readFile(gitignorePath, "utf-8");
      i.add(gitignore);
    }

    let includedFiles = await glob(include, {
      cwd: root,
      dot: true,
      onlyFiles: true
    });

    const files = i
      .filter(includedFiles)
      .map((file) => resolve(root, file));

    for (const schemaPath of files) {
      try {
        await registerSchema(schemaPath);
      } catch (_error) {
      }
    }

    for (const file of files) {
      await coverageService.addFromFile(file);
    }
  }
};

// A minimal custom Istanbul reporter, loaded via `createAsync` (an ESM
// `import()`, not the old synchronous `require`-based loader), to prove this
// plugin can load custom reporters that are ESM-only.
export default class CustomReporter {
  execute() {
    // eslint-disable-next-line no-console -- proving this reporter ran is the point of this fixture
    console.log("CUSTOM REPORTER EXECUTED");
  }
}

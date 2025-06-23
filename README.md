# Hyperjump - JSON Schema Test Coverage

## Usage

```bash
rm ./.nyc_output/*
npm test
npx nyc report --reporter=html --extension .schema.json
npx http-server coverage
```
## Legend

Statements = Keywords
Branches = true/false for each keyword
Functions = Subschemas


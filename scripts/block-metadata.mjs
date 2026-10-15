import ts from "typescript"

/** Read each literal block on its own: formatting and neighbouring entries must not change its metadata. */
export function blockMetadata(source) {
  const file = ts.createSourceFile("src/blocks/index.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  if (file.parseDiagnostics.length) throw new Error("Invalid TypeScript in src/blocks/index.ts")
  const declaration = file.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((item) => ts.isIdentifier(item.name) && item.name.text === "blocks")
  if (!declaration?.initializer || !ts.isArrayLiteralExpression(declaration.initializer)) {
    throw new Error("Expected a literal blocks array in src/blocks/index.ts")
  }

  const metadata = new Map()
  for (const entry of declaration.initializer.elements) {
    if (!ts.isCallExpression(entry) || !ts.isIdentifier(entry.expression) || entry.expression.text !== "block" ||
        entry.arguments.length !== 1 || !ts.isObjectLiteralExpression(entry.arguments[0])) {
      throw new Error("Expected block({...}) entries in src/blocks/index.ts")
    }
    const line = file.getLineAndCharacterOfPosition(entry.getStart(file)).line + 1
    const keys = ["name", "title", "description"]
    const keyOf = (property) => {
      if (ts.isSpreadAssignment(property)) return undefined
      const name = ts.isComputedPropertyName(property.name) ? property.name.expression : property.name
      return ts.isIdentifier(property.name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name) ? name.text : undefined
    }
    const unrelated = (property) => ts.isSpreadAssignment(property)
      ? ts.isObjectLiteralExpression(property.expression) && property.expression.properties.every(unrelated)
      : keyOf(property) !== undefined && !keys.includes(keyOf(property))
    const properties = new Map()
    for (const property of entry.arguments[0].properties) {
      // Either can replace an earlier literal at runtime, including its name. Do not emit stale metadata.
      const key = keyOf(property)
      if (key === undefined) {
        if (unrelated(property)) continue
        throw new Error(`Expected static block metadata properties at line ${line}`)
      }
      if (!keys.includes(key)) continue
      if (properties.has(key)) throw new Error(`Duplicate block metadata property: ${key} at line ${line}`)
      properties.set(key, property)
    }
    const string = (key) => {
      const property = properties.get(key)
      if (!property || !ts.isPropertyAssignment(property) || !ts.isStringLiteralLike(property.initializer)) {
        throw new Error(`Expected a literal ${key} in block metadata at line ${line}`)
      }
      return property.initializer.text
    }
    const name = string("name")
    if (metadata.has(name)) throw new Error(`Duplicate block metadata: ${name}`)
    metadata.set(name, { title: string("title"), description: string("description") })
  }
  return metadata
}

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
    const properties = entry.arguments[0].properties
    const string = (key) => {
      const property = properties.find((item) => ts.isPropertyAssignment(item) &&
        (ts.isIdentifier(item.name) || ts.isStringLiteral(item.name)) && item.name.text === key)
      if (!property || !ts.isStringLiteralLike(property.initializer)) {
        throw new Error(`Expected a literal ${key} in block metadata at line ${file.getLineAndCharacterOfPosition(entry.getStart(file)).line + 1}`)
      }
      return property.initializer.text
    }
    const name = string("name")
    if (metadata.has(name)) throw new Error(`Duplicate block metadata: ${name}`)
    metadata.set(name, { title: string("title"), description: string("description") })
  }
  return metadata
}

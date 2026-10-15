import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { blockMetadata } from "./block-metadata.mjs"

test("the existing workspace keeps its own multiline description", () => {
  const source = readFileSync(new URL("../src/blocks/index.ts", import.meta.url), "utf8")
  const metadata = blockMetadata(source)
  assert.equal(metadata.get("agent-workspace").description,
    "A workspace where an agent works: sessions, the thread, files and background tasks")
  assert.equal(metadata.get("dashboard-01").description, "A dashboard with sidebar, charts and data table")
})

test("metadata tolerates whitespace, comments, quotes, escapes and nested unrelated properties", () => {
  const source = `export const blocks = [block({
    name: 'first', title: /* description: "wrong" */ "First",
    description:\n 'A \\'quoted\\' description',
    other: { description: "nested", text: "})" },
  }), block({name: "second", title: "Second", description: "Own description"})]`
  assert.deepEqual([...blockMetadata(source)], [
    ["first", { title: "First", description: "A 'quoted' description" }],
    ["second", { title: "Second", description: "Own description" }],
  ])
})

test("a missing description cannot consume the next entry", () => {
  assert.throws(() => blockMetadata(`const blocks = [
    block({name: "first", title: "First"}),
    block({name: "second", title: "Second", description: "Not first"}),
  ]`), /literal description/)
})

test("missing arrays, dynamic metadata and duplicate names fail with a useful error", () => {
  assert.throws(() => blockMetadata("const other = []"), /literal blocks array/)
  assert.throws(() => blockMetadata(`const blocks = [block({name: "x", title: "X", description: other})]`), /literal description/)
  assert.throws(() => blockMetadata(`const blocks = [
    block({name: "x", title: "X", description: "One"}),
    block({name: "x", title: "X", description: "Two"}),
  ]`), /Duplicate block metadata: x/)
})

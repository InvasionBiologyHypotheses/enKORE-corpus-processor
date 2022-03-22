import { readJSON, writeTXT } from "https://deno.land/x/flat@0.0.15/mod.ts"

const filename = Deno.args[0]
const json = await readJSON(filename)
console.log(json)

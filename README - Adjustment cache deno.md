##### Note: Some extra files related to deno installation and cached scripts may require changes.

FILE-DENO:
#########
Local-machine: /home/username/.cache/deno/npm/registry.npmjs.org/@citation-js/name/0.4.2/lib/input.js:63:34
#########
Current-line:  const _end$split$reverse = end.split(particleSplitter, 2).reverse(),
#########
New-linee:  const _end$split$reverse = String(end).split(particleSplitter, 2).reverse(),
#########
Note: error: Uncaught TypeError: Cannot read properties of undefined (reading 'split') at parseName (file:///home/username/.cache/deno/npm/registry.npmjs.org/@citation-js/name/0.4.2/lib/input.js:63:34)
#########

# enKORE-corpus-processor

## Dependencies

git clone this repo:

```rubygit clone https://github.com/InvasionBiologyHypotheses/enKORE-corpus-processor.git```

install deno - see https://deno.land/manual@v1.28.3/getting_started/installation

## Running locally

To run the corpus locally, clone this repo, install deno and run:

`deno task process`

There are various flags that can be used to control the processor.

`deno run -A --unstable ./process.js -f ./corpus/entries.json`

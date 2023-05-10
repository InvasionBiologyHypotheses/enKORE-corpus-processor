<img align="center" src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Red_lionfish_near_Gilli_Banta_Island.JPG/440px-Red_lionfish_near_Gilli_Banta_Island.JPG" width="220" height="165">

# enKORE-corpus-processor

## Manual

For details, please read the project's wiki:

https://github.com/InvasionBiologyHypotheses/enKORE-corpus-processor/wiki

## Dependencies

git clone this repo:

```ruby
git clone https://github.com/InvasionBiologyHypotheses/enKORE-corpus-processor.git
```

install deno - see https://deno.land/manual@v1.28.3/getting_started/installation

## Running locally

To run the corpus locally, clone this repo, install deno and run:
```ruby
deno task process
```

There are various flags that can be used to control the processor.
```ruby
deno run -A --unstable ./process.js -f ./corpus/entries.json
```

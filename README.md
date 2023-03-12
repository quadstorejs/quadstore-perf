
# quadstore-perf 

The performance profile of `quadstore` is strongly influenced by its design
choices in terms of atomicity. As all update operations are implemented
through [AbstractLevel#batch][perf-1] operations that atomically update
all indexes, they are performed in a manner that closely approximates batch
random updates.

[perf-1]: https://github.com/Level/abstract-level
[perf-2]: https://github.com/Level/bench

The testing platform is a 2020 MacBook Pro (Apple Silicon M1 / arm64, 16 GB)
running Node v18.7.0.

### Reading quads

Sequential reads iterating through quads in any given index run at about
**~1M quads per second**.

```
node dist/read.js
```

### Importing quads

Our reference benchmark for import performance is the [`level-bench`][perf-2]
`batch-put` benchmark, which scores ~1M updates per second when run as follows:

```
node level-bench.js run batch-put leveldown --concurrency 1 --chained true --batchSize 10 --valueSize 256
```

We test import performance by importing the [`21million.rdf`][21mil-rdf] file
or a subset of it.

```
node dist/loadfile.js /path/to/21million.rdf
```

With the default six indexes and the `classic-level` backend, import performance
clocks at **~35k quads per second** when importing quads one-by-one, with a
density of **~6.5k quads per MB**. Due to the six indexes, this translates to
~210k batched update operations per second, ~0.21 times the reference target.

Setting the `batchSize` parameter to `100` leads to quads being imported in
groups of 100, which boosts performance up to **~50k quads per second**, roughly
~0.5 times the reference target when accounting for the six indexes.

[21mil-rdf]: https://github.com/dgraph-io/benchmarks/blob/master/data/21million.rdf.gz

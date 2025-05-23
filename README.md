
# quadstore-perf 

The performance profile of [`quadstore`][perf-0] is strongly influenced by its
design choices in terms of atomicity. As all update operations are implemented
through [AbstractLevel#batch][perf-1] operations that atomically update
all indexes, they are performed in a manner that closely approximates batch
random updates.

[perf-0]: https://github.com/quadstorejs/quadstore
[perf-1]: https://github.com/Level/abstract-level
[perf-2]: https://github.com/Level/bench

The testing platform is a 2020 MacBook Pro (Apple Silicon M1 / arm64, 16 GB)
running Node v20.19.0.

### Reading quads

Sequential reads iterating through quads in any given index run at about
**~1.7M quads per second**.

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
clocks at **~44k quads per second** when importing quads one-by-one, with a
density of **~6.7k quads per MB**. Due to the six indexes, this translates to
~264k batched update operations per second, ~0.25 times the reference target.

Setting the `batchSize` parameter to `128` leads to quads being imported in
groups of 128, which boosts performance up to **~65k quads per second**, roughly
~0.45 times the reference target when accounting for the six indexes.

[21mil-rdf]: https://github.com/dgraph-io/benchmarks/blob/master/data/21million.rdf.gz

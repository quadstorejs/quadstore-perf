/*
 * This benchmark was ported from LevelGraph's searchStream.js benchmark
 * https://github.com/levelgraph/levelgraph/tree/d918ff445e78e22410b4b5388e33af4a4cbcec8c/benchmarks
 */

import { Quadstore } from 'quadstore';
import { main, runTest, waitForEvent, round } from './utils.js';
import { DataFactory } from 'rdf-data-factory';
import { Engine } from 'quadstore-comunica';
import { Bindings } from '@rdfjs/types';
import assert from 'node:assert';

const dataFactory = new DataFactory();
const qty = 200_000;

const doWrites = async (store: Quadstore) => {
  for (let i = 0; i < qty; i += 1) {
    await store.put(dataFactory.quad(
      dataFactory.namedNode(`ex://s${i}`),
      dataFactory.namedNode(`ex://p${i}`),
      dataFactory.namedNode(`ex://o${i}`),
      dataFactory.defaultGraph(),
    ));
  }
};

main(async () => {

  const results = await runTest(async (backend, du, time, timeEnd, info) => {
    time('setup');
    const store = new Quadstore({
      backend,
      dataFactory,
    });
    const engine = new Engine(store);
    await store.open();
    timeEnd('setup');
    time('writes');
    await doWrites(store);
    timeEnd('writes');
    let count = 0;
    time('query - setup');
    const iterator = await engine.queryBindings(`SELECT * WHERE { ?s ?p ?o . }`);
    const onDataRest = (bindings: Bindings) => {
      count++;
    };
    const onDataFirst = (bindings: Bindings) => {
      onDataRest(bindings);
      timeEnd('query - setup');
      time('query - reads');
      iterator.on('data', onDataRest);
    };
    iterator.once('data', onDataFirst);
    iterator.on('error', (err) => {
      console.error(err);
    });
    await waitForEvent(iterator, 'end');
    const query_read_duration = timeEnd('query - reads');
    info('quads_per_second', round((qty / query_read_duration) * 1000, 2));
    assert(count === qty, 'mismatched count');
  });

  console.log(JSON.stringify(results, null, 2));

});


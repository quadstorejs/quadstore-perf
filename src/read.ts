/*
 * This benchmark was ported from LevelGraph's searchStream.js benchmark
 * https://github.com/levelgraph/levelgraph/tree/d918ff445e78e22410b4b5388e33af4a4cbcec8c/benchmarks
 */

import { Quadstore } from 'quadstore';
import { main, runTest, waitForEvent, round } from './utils.js';
import { DataFactory } from 'rdf-data-factory';
import assert from 'node:assert';

const dataFactory = new DataFactory();
const qty = 2 * 1e5;

const doWrites = async (store: Quadstore) => {
  for (let i = 0; i < qty; i += 1) {
    await store.put(dataFactory.quad(
      dataFactory.namedNode(`ex://s${i}`),
      dataFactory.namedNode(`ex://p${i}`),
      dataFactory.namedNode(`ex://o${i}`),
      dataFactory.namedNode(`ex://g${i}`),
    ));
  }
};

main(async () => {

  const results = await runTest(async (backend, du, time, timeEnd, info) => {
    const store = new Quadstore({
      backend,
      dataFactory,
    });
    await store.open();
    time('write');
    await doWrites(store);
    timeEnd('write');
    await du('post_write');
  
    
    let count = 0;
    const results = await store.getStream({});
    time('reading');
    results.iterator.on('data', () => {
      count++;
    });
    results.iterator.on('error', (err) => {
      console.error(err);
    });
    await waitForEvent(results.iterator, 'end');
    const duration = timeEnd('reading');
    assert(count === qty, 'count mismatch');

    info('quads_per_second', round((count / duration) * 1000, 2));
    await store.close();
  });

  console.log(JSON.stringify(results, null, 2));

});


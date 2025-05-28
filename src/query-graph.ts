/*
 * This benchmark was ported from LevelGraph's searchStream.js benchmark
 * https://github.com/levelgraph/levelgraph/tree/d918ff445e78e22410b4b5388e33af4a4cbcec8c/benchmarks
 */

import { Quadstore } from 'quadstore';
import { main, runTest, waitForEvent, round } from './utils.js';
import { DataFactory } from 'rdf-data-factory';
import { Engine as QuadstoreEngine } from 'quadstore-comunica';
import { Bindings, Quad } from '@rdfjs/types';
import { Store as N3Store } from 'n3';
import { RdfStore } from 'rdf-stores';
import { QueryEngine as ComunicaEngine } from '@comunica/query-sparql-rdfjs';
import assert from 'node:assert';

const dataFactory = new DataFactory();
const qty = 200_000;

const quads: Quad[] = new Array(qty).fill(true).map((_, i) => dataFactory.quad(
  dataFactory.namedNode(`ex://s${i}`),
  dataFactory.namedNode(`ex://p${i}`),
  dataFactory.namedNode(`ex://o${i}`),
  dataFactory.namedNode(`ex://g${i % 1000}`),
));

main(async () => {

  const quadstore_quadstorecomunica = await runTest(async (backend, du, time, timeEnd, info) => {
    time('setup');
    const store = new Quadstore({ backend, dataFactory });
    const engine = new QuadstoreEngine(store);
     await store.open();
    timeEnd('setup');
    time('writes');
    await store.multiPut(quads);
    timeEnd('writes');
    let count = 0;
    time('query - setup');
    // const iterator = await quadstore_engine.queryBindings(`SELECT DISTINCT ?g WHERE { GRAPH ?g { ?s ?p ?o . } }`);
    const iterator = await engine.queryBindings(`SELECT DISTINCT ?g WHERE { GRAPH ?g { ?s ?p ?o . } }`);
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
    info('quads read', count);
  });
  
  console.log('quadstore, quadstore-comunica: ', quadstore_quadstorecomunica['time']['partials']['query - reads']['time']);
  
  const n3store_quadstorecomunica = await runTest(async (backend, du, time, timeEnd, info) => {
    time('setup');
    const store = new N3Store();
    const engine = new QuadstoreEngine(store as unknown as Quadstore);
    timeEnd('setup');
    time('writes');
    store.addQuads(quads);
    timeEnd('writes');
    let count = 0;
    time('query - setup');
    // const iterator = await quadstore_engine.queryBindings(`SELECT DISTINCT ?g WHERE { GRAPH ?g { ?s ?p ?o . } }`);
    const iterator = await engine.queryBindings(`SELECT DISTINCT ?g WHERE { GRAPH ?g { ?s ?p ?o . } }`);
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
    info('quads read', count);
  });

  console.log('n3, quadstore-comunica: ', n3store_quadstorecomunica['time']['partials']['query - reads']['time']);
  
  const quadstore_comunica = await runTest(async (backend, du, time, timeEnd, info) => {
    time('setup');
    const store = new Quadstore({ backend, dataFactory });
    const engine = new ComunicaEngine();
    await store.open();
    timeEnd('setup');
    time('writes');
    await store.multiPut(quads);
    timeEnd('writes');
    let count = 0;
    time('query - setup');
    // const iterator = await quadstore_engine.queryBindings(`SELECT DISTINCT ?g WHERE { GRAPH ?g { ?s ?p ?o . } }`);
    const iterator = await engine.queryBindings(`SELECT DISTINCT ?g WHERE { GRAPH ?g { ?s ?p ?o . } }`, {
      sources: [store],
      destination: store,
    });
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
    info('quads read', count);
  });
  
  console.log('quadstore, comunica: ', quadstore_comunica['time']['partials']['query - reads']['time']);
  
  const n3store_comunica = await runTest(async (backend, du, time, timeEnd, info) => {
    time('setup');
    const store = new N3Store();
    const engine = new ComunicaEngine();
    timeEnd('setup');
    time('writes');
    store.addQuads(quads);
    timeEnd('writes');
    let count = 0;
    time('query - setup');
    const iterator = await engine.queryBindings(`SELECT DISTINCT ?g WHERE { GRAPH ?g { ?s ?p ?o . } }`, {
      sources: [store],
      destination: store,
    });
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
    info('quads read', count);
  });
  
  console.log('n3, comunica: ', n3store_comunica['time']['partials']['query - reads']['time']);
  
  const rdfstore_quadstorecomunica = await runTest(async (backend, du, time, timeEnd, info) => {
    time('setup');
    const store = RdfStore.createDefault();
    const engine = new QuadstoreEngine(store as any);
    timeEnd('setup');
    time('writes');
    quads.forEach(q => store.addQuad(q));
    timeEnd('writes');
    let count = 0;
    time('query - setup');
    const iterator = await engine.queryBindings(`SELECT DISTINCT ?g WHERE { GRAPH ?g { ?s ?p ?o . } }`, {
      sources: [store],
      destination: store,
    });
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
    info('quads read', count);
  });
  
  console.log('rdf-store, quadstore-comunica: ', rdfstore_quadstorecomunica['time']['partials']['query - reads']['time']);
  
});


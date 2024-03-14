
import { strictEqual } from  'assert';
import oxigraph from  'oxigraph';
import { Engine } from  'quadstore-comunica';
import { Quadstore } from  'quadstore';
import { DataFactory } from  'rdf-data-factory';
import { ClassicLevel } from  'classic-level';
import { main } from './utils.js';

const QTY = 1e5;

const dataFactory = new DataFactory();

const time = async (fn: () => any, name: string) => {
  console.time(name);
  await Promise.resolve(fn());
  console.timeEnd(name);
};

main(async () => {

  const oxistore = new oxigraph.Store();

  const quadstore = new Quadstore({
    dataFactory,
    backend: new ClassicLevel('./.quadstore.leveldb'),
  });

  await quadstore.open();
  await quadstore.clear();

  const engine = new Engine(quadstore);

  await time(async () => {
    for (let i = 0; i < QTY; i += 1) {
      oxistore.add(oxigraph.triple(
        oxigraph.namedNode('http://ex/s'),
        oxigraph.namedNode('http://ex/p'),
        oxigraph.literal(`${i}`, 'en'),
      ));
    }
  }, 'oxigraph - write');

  await time(async () => {
    for (let i = 0; i < QTY; i += 1) {
      await quadstore.put(dataFactory.quad(
        dataFactory.namedNode('http://ex/s'),
        dataFactory.namedNode('http://ex/p'),
        dataFactory.literal(`${i}`, 'en'),
      ));
    }
  }, 'quadstore - write');

  await time(async () => {
    let count = 0;
    for (const binding of oxistore.query('SELECT * WHERE { ?s ?p ?o }', {})) {
      count += 1;
    }
    strictEqual(count, QTY, 'bad count');
  }, 'oxigraph - SPARQL SELECT * WHERE { ?s ?p ?o }');

  await time(async () => {
    let count = 0;
    await engine.queryBindings('SELECT * WHERE { ?s ?p ?o }').then((iterator: any) => {
      return new Promise((resolve, reject) => {
        iterator.on('data', (binding: any) => {
          count += 1;
        }).once('end', resolve);
      });
    });
    strictEqual(count, QTY, 'bad count');
  }, 'quadstore - SPARQL SELECT * WHERE { ?s ?p ?o }');

  await time(async () => {
    const quads = oxistore.match(null, null, null, null);
    strictEqual(quads.length, QTY, 'bad count');
  }, 'oxigraph - sequential read from index (no streaming)');

  await time(async () => {
    let count = 0;
    const { iterator } = await quadstore.getStream({});
    await new Promise((resolve) => {
      iterator.on('data', (binding: any) => {
        count += 1;
      }).once('end', resolve);
    });
    strictEqual(count, QTY, 'bad count');
  }, 'quadstore - sequential read from index');



});

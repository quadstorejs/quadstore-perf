
import { strictEqual } from  'assert';
import oxigraph from  'oxigraph';
import { Engine } from  'quadstore-comunica';
import { Quadstore } from  'quadstore';
import { DataFactory } from  'rdf-data-factory';
import { ClassicLevel } from  'classic-level';

const QTY = 1e5;

const dataFactory = new DataFactory();

const time = async (fn: () => any, name: string) => {
  const before = Date.now();
  await Promise.resolve(fn());
  const after = Date.now();
  console.log(`${name}: ${after - before} ms`);
};

const main = (fn: () => any) => {
  Promise.resolve(fn()).catch((err) => {
    console.error(err);
    process.exit(1);
  });
};

main(async () => {

  const oxistore = new oxigraph.Store();

  const quadstore = new Quadstore({
    dataFactory,
    backend: new ClassicLevel('./.quadstore.leveldb'),
  });

  // await quadstore.open();
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
    let count = 0;
    for (const binding of oxistore.query('SELECT * WHERE { ?s ?p ?o }')) {
      count += 1;
    }
    strictEqual(count, QTY, 'bad count');
  }, 'oxigraph - sequential read');

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
    await engine.queryBindings('SELECT * WHERE { ?s ?p ?o }').then((iterator: any) => {
      return new Promise((resolve, reject) => {
        iterator.on('data', (binding: any) => {
          count += 1;
        }).once('end', resolve);
      });
    });
    strictEqual(count, QTY, 'bad count');
  }, 'quadstore - sequential read');

  await time(async () => {
    let count = 0;
    const { iterator } = await quadstore.getStream({});
    await new Promise((resolve) => {
      iterator.on('data', (binding: any) => {
        count += 1;
      }).once('end', resolve);
    });
    strictEqual(count, QTY, 'bad count');
  }, 'quadstore - sequential read w/o SPARQL');

});

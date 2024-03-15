
import { strictEqual } from  'assert';
import oxigraph from  'oxigraph';
import { Engine } from  'quadstore-comunica';
import { Quadstore } from  'quadstore';
import { DataFactory } from  'rdf-data-factory';
import { main, runTest, waitForEvent } from './utils.js';

const QTY = 1e5;

const dataFactory = new DataFactory();

main(async () => {

  const results = await runTest(async (backend, du, time, timeEnd, info) => {

    const oxistore = new oxigraph.Store();

    const quadstore = new Quadstore({
      dataFactory,
      backend,
    });

    await quadstore.open();
    await quadstore.clear();

    const engine = new Engine(quadstore);

    time('oxigraph - write');
    for (let i = 0; i < QTY; i += 1) {
      oxistore.add(oxigraph.triple(
        oxigraph.namedNode('http://ex/s'),
        oxigraph.namedNode('http://ex/p'),
        oxigraph.literal(`${i}`, 'en'),
      ));
    }
    timeEnd('oxigraph - write');

    time('quadstore - write');
    for (let i = 0; i < QTY; i += 1) {
      await quadstore.put(dataFactory.quad(
        dataFactory.namedNode('http://ex/s'),
        dataFactory.namedNode('http://ex/p'),
        dataFactory.literal(`${i}`, 'en'),
      ));
    }
    timeEnd('quadstore - write');
    

    time('oxigraph - SQL read');    
    let oxigraph_sql_count = 0;
    for (const binding of oxistore.query('SELECT * WHERE { ?s ?p ?o }', {})) {
      oxigraph_sql_count += 1;
    }
    strictEqual(oxigraph_sql_count, QTY, 'bad count');
    timeEnd('oxigraph - SQL read');    

    time('quadstore - SQL read');    
    let quadstore_sql_count = 0;
    const quadstore_sql_iterator = await engine.queryBindings('SELECT * WHERE { ?s ?p ?o }');
    quadstore_sql_iterator.on('data', (binding: any) => {
      quadstore_sql_count += 1;
    });
    await waitForEvent(quadstore_sql_iterator, 'end');
    strictEqual(quadstore_sql_count, QTY, 'bad count');
    timeEnd('quadstore - SQL read');  

    time('oxigraph - API read');  
    const quads = oxistore.match(null, null, null, null);
    strictEqual(quads.length, QTY, 'bad count');
    timeEnd('oxigraph - API read');  

    time('quadstore - API read');  
    let quadstore_api_count = 0;
    const { iterator: quadstore_api_iterator } = await quadstore.getStream({});
    quadstore_api_iterator.on('data', (binding: any) => {
      quadstore_api_count += 1;
    });
    await waitForEvent(quadstore_api_iterator, 'end');
    strictEqual(quadstore_api_count, QTY, 'bad count');
    timeEnd('quadstore - API read');  
    
  });

  console.log(JSON.stringify(results, null, 2));

});

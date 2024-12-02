
import { AbstractLevel } from 'abstract-level';
import fs from 'fs';
import path from 'path';
import { Quadstore } from 'quadstore';
import { ArrayIterator } from 'asynciterator';
import { DataFactory, StreamParser } from 'n3';
import { runTest, streamToArray } from './utils.js';
import { main, round } from './utils.js';

main(async () => {

  const args = process.argv.slice(2);

  const filePath = args[0];
  const format = args[1] || 'text/turtle';

  if (!filePath) {
    console.log('\n\n  USAGE: node loadfile.js <filePath> [mimeType]\n\n');
    return;
  }

  const results = await runTest(async (backend, du, time, timeEnd, info) => {

    const store = new Quadstore({
      backend,
      dataFactory: DataFactory,
    });

    await store.open();
    const scope = await store.initScope();

    const absFilePath = path.resolve(process.cwd(), filePath);

    const fileReader = fs.createReadStream(absFilePath);
    const streamParser = new StreamParser({ format });

    const quads = await streamToArray(fileReader.pipe(streamParser));

    const source = new ArrayIterator(quads);

    // const { time: putTime } = await time(() => store.putStream(source));
    // const { time: putTime } = await time(() => store.putStream(source, { scope }));
    time('write');
    await store.putStream(source, { /* batchSize: 128 */ });
    const duration = timeEnd('write');

    info('quads_per_second', round((quads.length / duration) * 1000, 2));

    await du('post_write');

    await store.close();

  });

  console.log(JSON.stringify(results, null, 2));

});

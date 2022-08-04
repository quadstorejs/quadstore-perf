
import { AbstractLevel } from 'abstract-level';
import fs from 'fs';
import path from 'path';
import { Quadstore } from 'quadstore';
import { ArrayIterator } from 'asynciterator';
import { DataFactory, StreamParser } from 'n3';
import {runTest, streamToArray, time} from './utils.js';

(async () => {

  const args = process.argv.slice(2);

  const filePath = args[0];
  const format = args[1] || 'text/turtle';

  if (!filePath) {
    console.log('\n\n  USAGE: node loadfile.js <filePath> [mimeType]\n\n');
    return;
  }

  await runTest(async (backend: AbstractLevel<any, any, any>, checkDiskUsage) => {

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

    console.log(`Loaded ${quads.length} quads in memory`);

    const source = new ArrayIterator(quads);

    // const { time: putTime } = await time(() => store.putStream(source));
    // const { time: putTime } = await time(() => store.putStream(source, { scope }));
    const { time: putTime } = await time(() => store.putStream(source, { batchSize: 100 }));

    const diskUsage = await checkDiskUsage();

    console.log(`TIME: ${putTime} s`);
    console.log(`DISK: ${diskUsage}`);

    await store.close();

  });

})();

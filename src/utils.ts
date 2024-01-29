
import { AbstractLevel } from 'abstract-level';
import { EventEmitter } from 'events';
import { uid } from 'uid';

export type DiskBackendType = 'classic' | 'rocksdb-nxtedition';

export type MemoryBackendType = 'memory';

export type BackendType = DiskBackendType | MemoryBackendType;

const du = async (absPath: string): Promise<number> => {
  const childProcess = await import('child_process');
  return await new Promise((resolve, reject) => {
    childProcess.exec(`du -m -s ${absPath}`, (err: Error|null, stdout: string) => {
      if (err) reject(err);
      else resolve(parseInt(`${stdout.split(/\s+/)[0]}`));
    });
  });
}

const runTestUsingDiskStorage = async (backendType: DiskBackendType, fn: (backend: AbstractLevel<any, any, any>, checkDiskUsage: () => Promise<number>) => Promise<any>): Promise<void> => {
  const os = await import('os');
  const path = await import('path');
  const fs = await import('fs/promises');
  let Level: new (location: string, opts?: any) => AbstractLevel<any, any, any>;
  switch (backendType) {
    case 'classic':
      Level = (await import('classic-level')).ClassicLevel;
      break;
    case 'rocksdb-nxtedition':
      // @ts-ignore
      Level = (await import('@nxtedition/rocksdb')).RocksLevel;
      break;
    default:
      throw new Error('unsupported');
  }
  const dir = path.join(os.tmpdir(), `node-quadstore-${uid()}`);
  const checkDiskUsage = () => du(dir);
  // const backend = new ClassicLevel(dir);
  const backend = new Level(dir);
  await fn(backend, checkDiskUsage);
  await fs.rm(dir, { recursive: true });
};

const runTestInMemory = async (backendType: MemoryBackendType, fn: (backend: AbstractLevel<any, any, any>, checkUsage: () => Promise<number>) => Promise<any>): Promise<void> => {
  const checkUsage = () => Promise.resolve(0);
  let Level: new (opts?: any) => AbstractLevel<any, any, any>;
  switch (backendType) {
    case 'memory':
      Level = (await import('memory-level')).MemoryLevel;
      break;
    default:
      throw new Error('unsupported');
  }
  const backend = new Level();
  await fn(backend, checkUsage);
};

export const runTest = async (fn: (backend: AbstractLevel<any, any, any>, checkDiskUsage: () => Promise<number>) => Promise<any>): Promise<void> => {
  const backendType = process.env.BACKEND ?? 'classic';
  switch (backendType) {
    case 'classic':
    case 'rocksdb-nxtedition':
      await runTestUsingDiskStorage(backendType, fn);
      break;
    case 'memory':
      await runTestInMemory(backendType, fn);
      break;
    default:
      throw new Error('unsupported');
  }
};

export const time = async <T>(fn: () => Promise<T>): Promise<{time: number, value: T }> => {
  const start = Date.now();
  const value = await fn();
  return { time: Date.now() - start, value };
};

export const waitForEvent = (emitter: EventEmitter, event: string, rejectOnError?: boolean): Promise<any> => {
  return new Promise((resolve, reject) => {
    const onceEvent = (arg: any) => {
      emitter.removeListener('error', onceError);
      resolve(arg);
    };
    const onceError = (err: Error) => {
      emitter.removeListener(event, onceEvent);
      reject(err);
    };
    emitter.once(event, onceEvent);
    if (rejectOnError) {
      emitter.once('error', onceError);
    }
  });
};

interface Readable<T> {
  read(): T | null;
  on(event: 'end', cb: () => any): void;
  on(event: 'data', cb: (item: T) => any): void;
  on(event: 'error', cb: (err: Error) => any): void;
}

export const streamToArray = <T>(source: Readable<T>): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    const buf: T[] = [];
    source.on('data', (item: T) => {
      buf.push(item);
    });
    source.on('error', (err: Error) => {
      reject(err);
    });
    source.on('end', () => {
      resolve(buf);
    });
  });
};

export const main = (fn: () => any) => {
  Promise.resolve(fn()).catch((err) => {
    console.error(err);
    process.exit(1);
  });
};

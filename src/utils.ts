
import { AbstractLevel } from 'abstract-level';
import { EventEmitter } from 'events';
import { uid } from 'uid';
import assert from 'node:assert';

export type DiskBackendType = 'classic' | 'rocksdb-nxtedition';

export type MemoryBackendType = 'memory';

export type BackendType = DiskBackendType | MemoryBackendType;

export type DiskUsageFn = (label: string) => Promise<void>;

export type TimeFn = (name: string) => void;

export type TimeEndFn = (name: string, info?: Record<string, any>) => number;

export type InfoFn = (label: string, value: any) => void;

export type TestFn = (backend: AbstractLevel<any, any, any>, du: DiskUsageFn, time: TimeFn, timeEnd: TimeEndFn, info: InfoFn) => Promise<void>;

export interface TestResults {
  time: { 
    total: number;
    partials: Record<string, { time: number }>;
  };
  disk: Record<string, number>;
  info: Record<string, any>;
}

const du = async (absPath: string, label: string, disk_results: TestResults['disk']): Promise<void> => {
  assert(!(label in disk_results), 'cannot reuse label for disk usage');
  const childProcess = await import('child_process');
  disk_results[label] = await new Promise((resolve, reject) => {
    childProcess.exec(`du -m -s ${absPath}`, (err: Error|null, stdout: string) => {
      if (err) reject(err);
      else resolve(parseInt(`${stdout.split(/\s+/)[0]}`));
    });
  });
}

const runTestUsingDiskStorage = async <T>(backendType: DiskBackendType, fn: TestFn, time: TimeFn, timeEnd: TimeEndFn, info: InfoFn, disk_results: TestResults['disk']): Promise<void> => {
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
  const checkDiskUsage: DiskUsageFn = (label: string) => du(dir, label, disk_results);
  const backend = new Level(dir);
  await fn(backend, (checkDiskUsage), time, timeEnd, info);
  await fs.rm(dir, { recursive: true });
};

const runTestInMemory = async (backendType: MemoryBackendType, fn: TestFn, time: TimeFn, timeEnd: TimeEndFn, info: InfoFn): Promise<void> => {
  const checkDiskUsage: DiskUsageFn = (label: string) => Promise.resolve();
  let Level: new (opts?: any) => AbstractLevel<any, any, any>;
  switch (backendType) {
    case 'memory':
      Level = (await import('memory-level')).MemoryLevel;
      break;
    default:
      throw new Error('unsupported');
  }
  const backend = new Level();
  return await fn(backend, checkDiskUsage, time, timeEnd, info);
};



export const runTest = async (fn: TestFn): Promise<TestResults> => {
  let test_started_at = Date.now();
  const partials: Record<string, TestResults['time']['partials'][string] & { started_at: number }> = {};
  const disk: TestResults['disk'] = {};
  const info: TestResults['info'] = {};
  const time: TimeFn = (name) => {
    assert(!(name in partials), `part ${name} already started`);
    partials[name] = { started_at: Date.now(), time: 0 };
  };
  const timeEnd: TimeEndFn = (name) => {
    assert(name in partials, `part ${name} not started`);
    const duration = Date.now() - partials[name].started_at
    partials[name].time = duration;
    return duration;
  };
  const infoFn: InfoFn = (label, value) => {
    assert(!(label in info), 'label already in use');
    info[label] = value;
  };
  const backendType = process.env.BACKEND ?? 'classic';
  switch (backendType) {
    case 'classic':
    case 'rocksdb-nxtedition':
      await runTestUsingDiskStorage(backendType, fn, time, timeEnd, infoFn, disk);
      break;
    case 'memory':
      await runTestInMemory(backendType, fn, time, timeEnd, infoFn);
      break;
    default:
      throw new Error('unsupported');
  }
  return { 
    time: { 
      total: Date.now() - test_started_at, 
      partials: Object.fromEntries(Object.entries(partials).map(([name, { time }]) => [name, { time }])) }, 
    disk, 
    info,
  };
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

export const round = (val: number, decimals: number): number => {
  const pow = Math.pow(10, decimals);
  return Math.round(val * pow) / pow;
};

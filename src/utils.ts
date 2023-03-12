
import { AbstractLevel } from 'abstract-level';
import { EventEmitter } from 'events';
import { uid } from 'uid';
import { MemoryLevel } from 'memory-level';

const du = async (absPath: string): Promise<number> => {
  const childProcess = await import('child_process');
  return await new Promise((resolve, reject) => {
    childProcess.exec(`du -m -s ${absPath}`, (err: Error|null, stdout: string) => {
      if (err) reject(err);
      else resolve(parseInt(`${stdout.split(/\s+/)[0]}`));
    });
  });
}

const runTestOnDisk = async (fn: (backend: AbstractLevel<any, any, any>, checkDiskUsage: () => Promise<number>) => Promise<any>): Promise<void> => {
  const os = await import('os');
  const path = await import('path');
  const fs = await import('fs/promises');
  const { ClassicLevel } = await import('classic-level');
  const dir = path.join(os.tmpdir(), `node-quadstore-${uid()}`);
  const checkDiskUsage = () => du(dir);
  const backend = new ClassicLevel(dir);
  await fn(backend, checkDiskUsage);
  await fs.rm(dir, { recursive: true });
};

const runTestInMemory = async (fn: (backend: AbstractLevel<any, any, any>, checkUsage: () => Promise<number>) => Promise<any>): Promise<void> => {
  const checkUsage = () => Promise.resolve(0);
  const backend = new MemoryLevel();
  await fn(backend, checkUsage);
};

export const runTest = (fn: (backend: AbstractLevel<any, any, any>, checkDiskUsage: () => Promise<number>) => Promise<any>): void => {
  try {
    (process.env.MEMORY ? runTestInMemory : runTestOnDisk)(fn)
      .then(() => (process.env.MEMORY ? runTestInMemory : runTestOnDisk)(fn))
      .catch((err) => {
        console.error(err);
      });
  } catch (err) {
    console.error(err);
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

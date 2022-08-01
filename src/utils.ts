
import { AbstractLevel } from 'abstract-level';
import { EventEmitter } from 'events';
import os from 'os';
import { uid } from 'uid';
import path from 'path';
import fs from 'fs-extra';
import { ClassicLevel } from 'classic-level';
import childProcess from 'child_process';

const du = (absPath: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    childProcess.exec(`du -s ${absPath}`, (err: Error|null, stdout: string) => {
      if (err) reject(err);
      else resolve(parseInt(`${stdout.split(/\s+/)[0]}`));
    });
  });
}

export const disk = async (fn: (backend: AbstractLevel<any, any, any>, checkDiskUsage: () => Promise<number>) => Promise<any>): Promise<void> => {
  const dir = path.join(os.tmpdir(), `node-quadstore-${uid()}`);
  const checkDiskUsage = () => du(dir);
  const backend = new ClassicLevel(dir);
  await fn(backend, checkDiskUsage);
  await fs.remove(dir);
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

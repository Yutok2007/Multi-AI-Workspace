import type { DatabaseStoreName } from '../shared/constants/storage';
import type { StoreRecordMap } from '../shared/storage/indexedDb';
import { sendContentRequest } from './runtime';

export async function listRecords<S extends DatabaseStoreName>(
  store: S,
): Promise<StoreRecordMap[S][]> {
  const response = await sendContentRequest({ type: 'database.list', store });
  return (response.value ?? []) as StoreRecordMap[S][];
}

export async function getRecord<S extends DatabaseStoreName>(
  store: S,
  id: string,
): Promise<StoreRecordMap[S] | undefined> {
  const response = await sendContentRequest({ type: 'database.get', store, id });
  return response.value as StoreRecordMap[S] | undefined;
}

export async function putRecord<S extends DatabaseStoreName>(
  store: S,
  record: StoreRecordMap[S],
): Promise<void> {
  await sendContentRequest({ type: 'database.put', store, record });
}

export async function deleteRecord(store: DatabaseStoreName, id: string): Promise<void> {
  await sendContentRequest({ type: 'database.delete', store, id });
}

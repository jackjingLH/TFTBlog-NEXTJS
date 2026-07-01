import { createInlineReferenceLoader } from './inline-data-references.mjs';

type DataReferenceType = 'champion' | 'trait' | 'item' | 'augment';

type DataResponse<T> = {
  items?: T[];
};

const loader = createInlineReferenceLoader({
  fetcher: async (type: DataReferenceType) => {
    const endpointTypeByReferenceType: Record<DataReferenceType, string> = {
      champion: 'champions',
      trait: 'traits',
      item: 'items',
      augment: 'augments',
    };
    const endpointType = endpointTypeByReferenceType[type];

    if (!endpointType) {
      return [];
    }

    const response = await fetch(`/api/data?type=${endpointType}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load ${type} references`);
    }

    const data = (await response.json()) as DataResponse<Record<string, unknown>>;
    return Array.isArray(data.items)
      ? data.items.map((item) => ({
          ...item,
          type,
        }))
      : [];
  },
});

export function loadInlineReferences(type: DataReferenceType) {
  return loader.load(type);
}

export function clearInlineReferenceCache(type?: DataReferenceType) {
  loader.clear(type);
}

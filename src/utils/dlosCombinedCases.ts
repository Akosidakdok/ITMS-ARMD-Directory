import type { DlosCase, DlosCasePage, DlosClassification } from '../types/dlos';

type CaseGroup = { classification: DlosClassification; items: DlosCase[]; total: number };

const sortValue = (item: DlosCase, sort: string) => {
  if (sort === 'docketNumber') return item.docketNumber.toLowerCase();
  if (sort === 'caseStatus') return item.caseStatus;
  if (sort === 'updatedAt') return item.updatedAt;
  return item.caseDate;
};

export const fetchCombinedDlosCases = async (
  params: URLSearchParams,
  fetchPage: (query: URLSearchParams) => Promise<DlosCasePage>
): Promise<DlosCasePage> => {
  const page = Number(params.get('page') || 1);
  const pageSize = Number(params.get('pageSize') || 10);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50) throw new Error('Page or page size is invalid.');
  const through = page * pageSize;
  if (!Number.isSafeInteger(through)) throw new Error('Page or page size is invalid.');
  const batchSize = Math.min(50, through);
  const groups: CaseGroup[] = [
    { classification: 'grave', items: [], total: Infinity },
    { classification: 'less_grave', items: [], total: Infinity }
  ];

  for (let requestPage = 1; groups.some(group => group.items.length < Math.min(group.total, through)); requestPage++) {
    await Promise.all(groups.filter(group => group.items.length < Math.min(group.total, through)).map(async group => {
      const query = new URLSearchParams(params);
      query.set('classification', group.classification);
      query.set('page', String(requestPage));
      query.set('pageSize', String(batchSize));
      const result = await fetchPage(query);
      if (!result.items.length && result.total > group.items.length) throw new Error('Unable to load all case types.');
      group.items.push(...result.items);
      group.total = result.total;
    }));
  }

  const direction = params.get('direction') === 'asc' ? 1 : -1;
  const sort = params.get('sort') || 'caseDate';
  const items = groups.flatMap(group => group.items).sort((a, b) => {
    const first = sortValue(a, sort);
    const second = sortValue(b, sort);
    if (first !== second) return (first < second ? -1 : 1) * direction;
    return a.id === b.id ? 0 : a.id < b.id ? 1 : -1;
  });

  return {
    items: items.slice((page - 1) * pageSize, through),
    total: groups.reduce((sum, group) => sum + group.total, 0),
    page,
    pageSize
  };
};

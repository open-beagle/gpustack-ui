type WorkerWithLabels = {
  labels?: Record<string, string>;
};

export const buildWorkerLabelOptions = (workers: WorkerWithLabels[]) => {
  const options = workers.reduce<Record<string, Set<string>>>(
    (result, worker) => {
      Object.entries(worker.labels || {}).forEach(([key, value]) => {
        if (!result[key]) result[key] = new Set<string>();
        result[key].add(String(value));
      });
      return result;
    },
    {}
  );

  return Object.fromEntries(
    Object.entries(options)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, values]) => [key, Array.from(values).sort()])
  );
};

export const loadWorkerLabelOptions = async (
  request: (
    page: number,
    perPage: number
  ) => Promise<Global.PageResponse<WorkerWithLabels>>
) => {
  const perPage = 100;
  const firstPage = await request(1, perPage);
  const workers = [...firstPage.items];

  for (let page = 2; page <= firstPage.pagination.totalPage; page += 1) {
    const response = await request(page, perPage);
    workers.push(...response.items);
  }

  return buildWorkerLabelOptions(workers);
};

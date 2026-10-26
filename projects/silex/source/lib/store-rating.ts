export type StoreRatingEntry = {
  rating?: number | null;
};

export type StoreRatingSummary = {
  average: number;
  count: number;
  label: string;
};

export function summarizeStoreRating(values: StoreRatingEntry[] = []): StoreRatingSummary {
  const ratings = values
    .map((entry) => Number(entry?.rating ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (ratings.length === 0) {
    return { average: 0, count: 0, label: "0.0" };
  }

  const average = Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1));

  return {
    average,
    count: ratings.length,
    label: average.toFixed(1),
  };
}

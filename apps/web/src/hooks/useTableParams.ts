import { useSearchParams } from 'react-router';
import { materialsListInput } from '@material-register/shared';
import type { MaterialsListInput } from '@material-register/shared';

type SetParamsOptions = { replace?: boolean };

// Parse once at module level — these are the values that should be omitted from the URL
const defaults = materialsListInput.parse(undefined) as MaterialsListInput;

function parseParams(searchParams: URLSearchParams): MaterialsListInput {
  const raw = Object.fromEntries(searchParams);
  const result = materialsListInput.safeParse(raw);
  if (result.success) return result.data;

  // Drop only the keys named in the error issues; keep everything else
  const badKeys = new Set(
    result.error.issues
      .map((issue) => issue.path[0])
      .filter((k): k is string => typeof k === 'string'),
  );
  const filtered: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!badKeys.has(k)) filtered[k] = v;
  }

  const retry = materialsListInput.safeParse(filtered);
  return retry.success ? retry.data : defaults;
}

export function useTableParams() {
  const [searchParams, setSearchParamsFn] = useSearchParams();
  const params = parseParams(searchParams);

  function setParams(partial: Partial<MaterialsListInput>, options: SetParamsOptions = {}) {
    const isOnlyPageChange = Object.keys(partial).every((k) => k === 'page');
    const nextPage = isOnlyPageChange ? (partial.page ?? params.page) : 1;

    const merged: MaterialsListInput = { ...params, ...partial, page: nextPage };

    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(merged) as [keyof MaterialsListInput, unknown][]) {
      if (value === undefined || value === defaults[key]) continue;
      next.set(key, String(value));
    }

    setSearchParamsFn(next, { replace: options.replace ?? false });
  }

  return { params, setParams };
}

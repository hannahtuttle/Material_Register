import { Group, Pagination, Select, Text } from '@mantine/core';
import { PAGE_SIZES } from '@material-register/shared';
import type { MaterialsListInput } from '@material-register/shared';

type Props = {
  total: number;
  params: MaterialsListInput;
  setParams: (partial: Partial<MaterialsListInput>) => void;
};

export function TablePagination({ total, params, setParams }: Props) {
  const { page, pageSize } = params;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <Group justify="space-between" mt="md" align="center">
      <Text size="sm" c="dimmed">
        {total === 0
          ? 'No results'
          : `Showing ${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()}`}
      </Text>
      <Group gap="sm" align="center">
        <Select
          data={PAGE_SIZES.map((s) => ({ value: String(s), label: String(s) }))}
          value={String(pageSize)}
          onChange={(v) =>
            v && setParams({ pageSize: Number(v) as (typeof PAGE_SIZES)[number] })
          }
          w={80}
          size="sm"
        />
        <Pagination
          total={totalPages}
          value={page}
          onChange={(p) => setParams({ page: p })}
          size="sm"
        />
      </Group>
    </Group>
  );
}

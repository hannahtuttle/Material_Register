import { useMemo } from 'react';
import { Badge, Group, Skeleton, Table, Text } from '@mantine/core';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { IconChevronDown, IconChevronUp, IconSelector } from '@tabler/icons-react';
import { SORT_COLUMNS } from '@material-register/shared';
import type { MaterialsListInput } from '@material-register/shared';
import { formatDate, formatNumber, formatPrice } from '../format';

type MaterialItem = {
  id: number;
  materialNumber: string;
  description: string;
  materialType: string;
  status: string;
  manufacturerPartNumber: string;
  unitOfMeasure: string;
  unitPrice: string; // numeric in string mode; formatPrice converts it
  quantityOnHand: number;
  updatedAt: string; // Drizzle timestamp; arrives as ISO string over JSON (no superjson transformer)
  plantCode: string;
  plantName: string;
  manufacturerName: string;
};

type Props = {
  items: MaterialItem[];
  params: MaterialsListInput;
  setParams: (partial: Partial<MaterialsListInput>) => void;
  isPending: boolean;
  isStale: boolean;
};

const sortableSet = new Set<string>(SORT_COLUMNS);

const statusColor: Record<string, string> = {
  Active: 'green',
  Obsolete: 'red',
  'Pending Review': 'yellow',
};

function SortIcon({ isSorted }: { isSorted: false | 'asc' | 'desc' }) {
  if (isSorted === 'asc') return <IconChevronUp size={14} />;
  if (isSorted === 'desc') return <IconChevronDown size={14} />;
  return <IconSelector size={14} />;
}

const columnHelper = createColumnHelper<MaterialItem>();

const columns = [
  columnHelper.accessor('materialNumber', {
    header: 'Material #',
    cell: (info) => (
      <Text ff="monospace" size="sm">
        {info.getValue()}
      </Text>
    ),
    enableSorting: sortableSet.has('materialNumber'),
  }),
  columnHelper.accessor('description', {
    header: 'Description',
    enableSorting: sortableSet.has('description'),
  }),
  columnHelper.accessor('materialType', {
    header: 'Type',
    enableSorting: false,
  }),
  columnHelper.accessor('manufacturerName', {
    header: 'Manufacturer',
    cell: (info) => (
      <div>
        <Text size="sm">{info.getValue()}</Text>
        {info.row.original.manufacturerPartNumber && (
          <Text size="xs" c="dimmed">
            {info.row.original.manufacturerPartNumber}
          </Text>
        )}
      </div>
    ),
    enableSorting: false,
  }),
  columnHelper.accessor('plantCode', {
    header: 'Plant',
    cell: (info) => (
      <Text size="sm">
        {info.getValue()} · {info.row.original.plantName}
      </Text>
    ),
    enableSorting: false,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => (
      <Badge color={statusColor[info.getValue()] ?? 'gray'}>{info.getValue()}</Badge>
    ),
    enableSorting: false,
  }),
  columnHelper.accessor('unitPrice', {
    header: 'Price',
    cell: (info) => (
      <Text size="sm" ta="right">
        {formatPrice(info.getValue())}
      </Text>
    ),
    enableSorting: sortableSet.has('unitPrice'),
  }),
  columnHelper.accessor('quantityOnHand', {
    header: 'Stock',
    cell: (info) => (
      <Text size="sm" ta="right">
        {formatNumber(info.getValue())}
      </Text>
    ),
    enableSorting: sortableSet.has('quantityOnHand'),
  }),
  columnHelper.accessor('unitOfMeasure', {
    header: 'UoM',
    enableSorting: false,
  }),
  columnHelper.accessor('updatedAt', {
    header: 'Last Updated',
    cell: (info) => formatDate(info.getValue()),
    enableSorting: sortableSet.has('updatedAt'),
  }),
];

const skeletonRows = Array.from({ length: 10 }, (_, i) => i);

export function MaterialsTable({ items, params, setParams, isPending, isStale }: Props) {
  const sorting: SortingState = useMemo(
    () => [{ id: params.sortBy, desc: params.sortDir === 'desc' }],
    [params.sortBy, params.sortDir],
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    manualSorting: true,
    manualPagination: true,
    enableSortingRemoval: false,
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      const col = next[0];
      if (!col) return;
      setParams({
        sortBy: col.id as (typeof SORT_COLUMNS)[number],
        sortDir: col.desc ? 'desc' : 'asc',
      });
    },
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table.ScrollContainer minWidth={900} mt="md">
      <Table striped highlightOnHover style={{ opacity: isStale ? 0.6 : 1 }}>
        <Table.Thead>
          {table.getHeaderGroups().map((hg) => (
            <Table.Tr key={hg.id}>
              {hg.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <Table.Th
                    key={header.id}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    style={{
                      cursor: canSort ? 'pointer' : undefined,
                      userSelect: canSort ? 'none' : undefined,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Group gap={4} wrap="nowrap">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort && <SortIcon isSorted={sorted} />}
                    </Group>
                  </Table.Th>
                );
              })}
            </Table.Tr>
          ))}
        </Table.Thead>
        <Table.Tbody>
          {isPending
            ? skeletonRows.map((i) => (
                <Table.Tr key={i}>
                  {columns.map((_, j) => (
                    <Table.Td key={j}>
                      <Skeleton height={16} radius="sm" />
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))
            : table.getRowModel().rows.map((row) => (
                <Table.Tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <Table.Td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

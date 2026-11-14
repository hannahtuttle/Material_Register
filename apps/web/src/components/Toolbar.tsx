import { useState, useEffect } from 'react';
import { Badge, Button, Group, Select, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch, IconX } from '@tabler/icons-react';
import { MATERIAL_STATUSES, MATERIAL_TYPES } from '@material-register/shared';
import type { MaterialsListInput } from '@material-register/shared';
import type { MaterialStatus, MaterialType } from '@material-register/shared';

type Props = {
  params: MaterialsListInput;
  setParams: (partial: Partial<MaterialsListInput>, options?: { replace?: boolean }) => void;
};

export function Toolbar({ params, setParams }: Props) {
  const [searchText, setSearchText] = useState(params.search ?? '');
  const [debouncedSearch] = useDebouncedValue(searchText, 300);

  // Sync local text when URL search changes from outside (e.g. Clear all button)
  useEffect(() => {
    setSearchText(params.search ?? '');
  }, [params.search]);

  // Push debounced value to URL with replace so typing doesn't fill history
  useEffect(() => {
    const normalized = debouncedSearch.trim() || undefined;
    if (normalized !== params.search) {
      setParams({ search: normalized }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const activeFilters =
    (params.search ? 1 : 0) + (params.materialType ? 1 : 0) + (params.status ? 1 : 0);

  function clearAll() {
    setSearchText('');
    setParams({ search: undefined, materialType: undefined, status: undefined });
  }

  return (
    <Group mb="md" align="flex-end" wrap="wrap">
      <TextInput
        placeholder="Search materials…"
        leftSection={<IconSearch size={16} />}
        rightSection={
          searchText ? (
            <IconX
              size={16}
              style={{ cursor: 'pointer' }}
              onClick={() => setSearchText('')}
            />
          ) : undefined
        }
        value={searchText}
        onChange={(e) => setSearchText(e.currentTarget.value)}
        style={{ flex: 1, minWidth: 200 }}
      />
      <Select
        placeholder="Type"
        data={MATERIAL_TYPES as unknown as string[]}
        value={params.materialType ?? null}
        onChange={(v) => setParams({ materialType: v ? (v as MaterialType) : undefined })}
        clearable
        w={160}
      />
      <Select
        placeholder="Status"
        data={MATERIAL_STATUSES as unknown as string[]}
        value={params.status ?? null}
        onChange={(v) => setParams({ status: v ? (v as MaterialStatus) : undefined })}
        clearable
        w={160}
      />
      {activeFilters > 0 && (
        <>
          <Badge variant="light" color="blue">
            {activeFilters} filter{activeFilters !== 1 ? 's' : ''} active
          </Badge>
          <Button variant="subtle" size="sm" onClick={clearAll}>
            Clear all
          </Button>
        </>
      )}
    </Group>
  );
}

import { useEffect } from 'react';
import { Alert, Button, Center, Container, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconPackageOff } from '@tabler/icons-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTRPC } from '../trpc';
import { useTableParams } from '../hooks/useTableParams';
import { Toolbar } from '../components/Toolbar';
import { MaterialsTable } from '../components/MaterialsTable';
import { TablePagination } from '../components/TablePagination';

export function MaterialsPage() {
  const { params, setParams } = useTableParams();
  const trpc = useTRPC();

  const { data, isPending, isPlaceholderData, isError, error, refetch } = useQuery(
    trpc.materials.list.queryOptions(params, { placeholderData: keepPreviousData }),
  );

  useEffect(() => {
    if (!error) return;
    // TRPCClientError extends Error and adds a data object from the server error formatter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tRPC augments Error with data; shape is verified at runtime
    const trpcError = error as any;
    console.error('materials.list error', {
      code: trpcError?.data?.code,
      httpStatus: trpcError?.data?.httpStatus,
      path: trpcError?.data?.path,
      requestId: trpcError?.data?.requestId,
    });
  }, [error]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <Container size="xl" py="xl">
      <Title mb="lg">Material Register</Title>
      <Toolbar params={params} setParams={setParams} />
      {isError ? (
        <Alert
          color="red"
          icon={<IconAlertCircle />}
          title="Failed to load materials"
          mt="md"
        >
          <Text size="sm" mb="sm">
            Something went wrong loading the materials list.
          </Text>
          <Button size="xs" color="red" variant="light" onClick={() => refetch()}>
            Retry
          </Button>
        </Alert>
      ) : !isPending && items.length === 0 ? (
        <Center mt="xl">
          <Stack align="center" gap="sm">
            <IconPackageOff size={48} color="gray" />
            <Text c="dimmed">No materials match these filters</Text>
            <Button
              variant="subtle"
              onClick={() =>
                setParams({ search: undefined, materialType: undefined, status: undefined })
              }
            >
              Clear filters
            </Button>
          </Stack>
        </Center>
      ) : (
        <MaterialsTable
          items={items}
          params={params}
          setParams={setParams}
          isPending={isPending}
          isStale={isPlaceholderData}
        />
      )}
      {!isError && !isPending && (
        <TablePagination total={total} params={params} setParams={setParams} />
      )}
    </Container>
  );
}

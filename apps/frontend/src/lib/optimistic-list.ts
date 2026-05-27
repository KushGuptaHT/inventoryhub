import type { QueryClient, QueryKey } from '@tanstack/react-query'

export type OptimisticListContext<TData> = {
  previous: TData | undefined
}

/** Cancel in-flight fetches, apply updater, return snapshot for rollback. */
export async function applyOptimisticListUpdate<TData, TVariables>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  variables: TVariables,
  updater: (current: TData | undefined, variables: TVariables) => TData | undefined,
): Promise<OptimisticListContext<TData>> {
  await queryClient.cancelQueries({ queryKey })
  const previous = queryClient.getQueryData<TData>(queryKey)
  const next = updater(previous, variables)
  if (next !== undefined) {
    queryClient.setQueryData<TData>(queryKey, next)
  }
  return { previous }
}

export function rollbackOptimisticListUpdate<TData>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  context: OptimisticListContext<TData> | undefined,
) {
  if (context?.previous !== undefined) {
    queryClient.setQueryData(queryKey, context.previous)
  }
}

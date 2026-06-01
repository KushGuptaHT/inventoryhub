import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { CategorySidebar } from '../components/CategorySidebar'
import { DataTable, type DataTableColumn } from '../components/DataTable'
import { SkuDetailStrip } from '../components/SkuDetailStrip'
import { Status } from '../components/Status'
import { TagFilterChips } from '../components/TagFilterChips'
import { useSkuListFilters } from '../hooks/useSkuListFilters'
import { apiRequest, toSkuListQueryString } from '../lib/api'
import { getStoredAuth } from '../lib/auth'
import {
  applyOptimisticListUpdate,
  rollbackOptimisticListUpdate,
} from '../lib/optimistic-list'
import { queryKeys } from '../lib/query-keys'
import { UserRole, type PaginatedResponse, type Sku } from '../types/api'

type SkuForm = {
  code: string
  name: string
  unitCost: string
  reorderThreshold: string
}

const emptyForm: SkuForm = {
  code: '',
  name: '',
  unitCost: '1.00',
  reorderThreshold: '50',
}

export function SkusPage() {
  const queryClient = useQueryClient()
  const auth = getStoredAuth()
  const canManage = auth?.user.role === UserRole.MANAGER
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(null)
  const perPage = 20

  const {
    filters,
    setCategoryId,
    toggleTagId,
    clearTags,
    setSearch,
    setPage,
    clearAllFilters,
    hasActiveFilters,
  } = useSkuListFilters()

  const skusQueryKey = [
    ...queryKeys.skus,
    filters.page,
    perPage,
    filters.search,
    filters.categoryId,
    filters.tagIds,
  ] as const

  const skus = useQuery({
    queryKey: skusQueryKey,
    queryFn: () =>
      apiRequest<PaginatedResponse<Sku>>(
        `/skus${toSkuListQueryString({
          page: filters.page,
          perPage,
          search: filters.search || undefined,
          includeDescendants: true,
          categoryIds: filters.categoryId ? [filters.categoryId] : undefined,
          tagIds: filters.tagIds.length > 0 ? filters.tagIds : undefined,
        })}`,
      ),
  })

  const createSku = useMutation({
    mutationFn: (input: SkuForm) =>
      apiRequest<Sku>('/skus', {
        method: 'POST',
        body: {
          code: input.code,
          name: input.name,
          unitCost: Number(input.unitCost),
          reorderThreshold: Number(input.reorderThreshold),
        },
      }),
    onSuccess: async () => {
      setForm(emptyForm)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.skus }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ])
    },
  })

  const deleteSku = useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/skus/${id}`, { method: 'DELETE' }),
    onMutate: async (deletedId) =>
      applyOptimisticListUpdate<PaginatedResponse<Sku>, string>(
        queryClient,
        skusQueryKey,
        deletedId,
        (current) =>
          current
            ? {
                ...current,
                items: current.items.filter((sku) => sku.id !== deletedId),
                total: Math.max(0, current.total - 1),
              }
            : current,
      ),
    onError: (_error, _id, context) => {
      rollbackOptimisticListUpdate(queryClient, skusQueryKey, context)
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.skus }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ])
    },
  })

  const updateSku = useMutation({
    mutationFn: (input: SkuForm & { id: string }) =>
      apiRequest<Sku>(`/skus/${input.id}`, {
        method: 'PATCH',
        body: {
          code: input.code,
          name: input.name,
          unitCost: Number(input.unitCost),
          reorderThreshold: Number(input.reorderThreshold),
        },
      }),
    onMutate: async (input) =>
      applyOptimisticListUpdate<PaginatedResponse<Sku>, SkuForm & { id: string }>(
        queryClient,
        skusQueryKey,
        input,
        (current) =>
          current
            ? {
                ...current,
                items: current.items.map((sku) =>
                  sku.id === input.id
                    ? {
                        ...sku,
                        code: input.code,
                        name: input.name,
                        unitCost: input.unitCost,
                        reorderThreshold: Number(input.reorderThreshold),
                      }
                    : sku,
                ),
              }
            : current,
      ),
    onError: (_error, _input, context) => {
      rollbackOptimisticListUpdate(queryClient, skusQueryKey, context)
    },
    onSuccess: () => {
      setEditingId(null)
      setEditForm(emptyForm)
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.skus }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.skuDetail(selectedSkuId ?? ''),
        }),
      ])
    },
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    createSku.mutate(form)
  }

  const startEdit = (sku: Sku) => {
    setEditingId(sku.id)
    setEditForm({
      code: sku.code,
      name: sku.name,
      unitCost: sku.unitCost,
      reorderThreshold: String(sku.reorderThreshold),
    })
  }

  const submitEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingId) {
      return
    }
    updateSku.mutate({ ...editForm, id: editingId })
  }

  const skuColumns = useMemo((): DataTableColumn<Sku>[] => {
    const base: DataTableColumn<Sku>[] = [
      {
        id: 'code',
        header: 'Code',
        cell: (row) => (
          <button
            type="button"
            className="sku-code-link"
            onClick={() => setSelectedSkuId(row.id)}
          >
            {row.code}
          </button>
        ),
      },
      { id: 'name', header: 'Name', cell: (row) => row.name },
      { id: 'unitCost', header: 'Unit cost', cell: (row) => row.unitCost },
      {
        id: 'threshold',
        header: 'Threshold',
        cell: (row) => row.reorderThreshold,
      },
    ]
    if (!canManage) {
      return base
    }
    return [
      ...base,
      {
        id: 'actions',
        header: 'Actions',
        cellClassName: 'actions',
        cell: (row) => (
          <>
            <button type="button" onClick={() => startEdit(row)}>
              Edit
            </button>
            <button
              type="button"
              onClick={() => deleteSku.mutate(row.id)}
              disabled={deleteSku.isPending}
            >
              Delete
            </button>
          </>
        ),
      },
    ]
  }, [canManage, deleteSku.isPending])

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Master data</p>
          <h2>SKUs</h2>
        </div>
        {hasActiveFilters ? (
          <button type="button" className="filter-clear-all" onClick={clearAllFilters}>
            Clear all filters
          </button>
        ) : null}
      </div>

      {canManage ? (
        <form className="inline-form" onSubmit={submit}>
          <input
            placeholder="Code"
            value={form.code}
            onChange={(event) => setForm({ ...form, code: event.target.value })}
          />
          <input
            placeholder="Name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <input
            placeholder="Unit cost"
            value={form.unitCost}
            onChange={(event) =>
              setForm({ ...form, unitCost: event.target.value })
            }
          />
          <input
            placeholder="Reorder threshold"
            value={form.reorderThreshold}
            onChange={(event) =>
              setForm({ ...form, reorderThreshold: event.target.value })
            }
          />
          <button type="submit" disabled={createSku.isPending}>
            Add SKU
          </button>
          {createSku.error ? (
            <p className="form-error">{createSku.error.message}</p>
          ) : null}
        </form>
      ) : (
        <p className="muted">Operators can view SKUs but cannot edit them.</p>
      )}

      <div className="sku-browse-layout">
        <CategorySidebar
          selectedCategoryId={filters.categoryId}
          onSelectCategory={setCategoryId}
          canManage={canManage}
        />

        <div className="sku-browse-main">
          <TagFilterChips
            selectedTagIds={filters.tagIds}
            onToggleTag={toggleTagId}
            onClearTags={clearTags}
            canManage={canManage}
          />

          <div className="inline-form">
            <input
              placeholder="Search SKU code or name"
              value={filters.search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {canManage && editingId ? (
            <form className="inline-form edit-panel" onSubmit={submitEdit}>
              <strong>Editing SKU</strong>
              <input
                placeholder="Code"
                value={editForm.code}
                onChange={(event) =>
                  setEditForm({ ...editForm, code: event.target.value })
                }
              />
              <input
                placeholder="Name"
                value={editForm.name}
                onChange={(event) =>
                  setEditForm({ ...editForm, name: event.target.value })
                }
              />
              <input
                placeholder="Unit cost"
                value={editForm.unitCost}
                onChange={(event) =>
                  setEditForm({ ...editForm, unitCost: event.target.value })
                }
              />
              <input
                placeholder="Reorder threshold"
                value={editForm.reorderThreshold}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    reorderThreshold: event.target.value,
                  })
                }
              />
              <button type="submit" disabled={updateSku.isPending}>
                Save edit
              </button>
              <button type="button" onClick={() => setEditingId(null)}>
                Cancel
              </button>
              {updateSku.error ? (
                <p className="form-error">{updateSku.error.message}</p>
              ) : null}
            </form>
          ) : null}

          <SkuDetailStrip
            skuId={selectedSkuId}
            onClose={() => setSelectedSkuId(null)}
            canManage={canManage}
          />

          <Status
            isLoading={skus.isLoading}
            error={skus.error}
            empty={skus.data?.items.length === 0}
          >
            <DataTable
              columns={skuColumns}
              data={skus.data?.items ?? []}
              getRowKey={(row) => row.id}
              getRowClassName={(row) =>
                selectedSkuId === row.id ? 'sku-row-selected' : undefined
              }
              pagination={{
                page: filters.page,
                perPage,
                total: skus.data?.total,
                totalPages: skus.data?.totalPages,
                itemsOnPage: skus.data?.items.length,
                onPageChange: setPage,
                itemLabel: 'active',
              }}
            />
            {deleteSku.error ? (
              <p className="form-error">{deleteSku.error.message}</p>
            ) : null}
          </Status>
        </div>
      </div>
    </section>
  )
}

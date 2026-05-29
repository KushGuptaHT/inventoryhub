import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Status } from '../components/Status'
import { apiRequest, toQueryString } from '../lib/api'
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
  const [page, setPage] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [search, setSearch] = useState('')
  const perPage = 20

  const skusQueryKey = [...queryKeys.skus, page, perPage, search] as const
  const skus = useQuery({
    queryKey: skusQueryKey,
    queryFn: () =>
      apiRequest<PaginatedResponse<Sku>>(
        `/skus${toQueryString({ page, perPage, search })}`,
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

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Master data</p>
          <h2>SKUs</h2>
        </div>
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

      <div className="inline-form">
        <input
          placeholder="Search SKU code or name"
          value={search}
          onChange={(event) => {
            setPage(1)
            setSearch(event.target.value)
          }}
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

      <Status
        isLoading={skus.isLoading}
        error={skus.error}
        empty={skus.data?.items.length === 0}
      >
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Unit cost</th>
                <th>Threshold</th>
                {canManage ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {skus.data?.items.map((sku) => (
                <tr key={sku.id}>
                  <td>{sku.code}</td>
                  <td>{sku.name}</td>
                  <td>{sku.unitCost}</td>
                  <td>{sku.reorderThreshold}</td>
                  {canManage ? (
                    <td className="actions">
                      <button type="button" onClick={() => startEdit(sku)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSku.mutate(sku.id)}
                        disabled={deleteSku.isPending}
                      >
                        Delete
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </button>
          <span>
            Page {page}
            {skus.data?.totalPages ? ` of ${skus.data.totalPages}` : ''}
            {` (${skus.data?.total ?? 0} active)`}
          </span>
          <button
            type="button"
            disabled={
              skus.data?.totalPages !== undefined
                ? page >= skus.data.totalPages
                : (skus.data?.items.length ?? 0) < perPage
            }
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
        {deleteSku.error ? (
          <p className="form-error">{deleteSku.error.message}</p>
        ) : null}
      </Status>
    </section>
  )
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Status } from '../components/Status'
import { apiRequest } from '../lib/api'
import { getStoredAuth } from '../lib/auth'
import { queryKeys } from '../lib/query-keys'
import { UserRole, type ListResponse, type Warehouse } from '../types/api'

type WarehouseForm = {
  code: string
  name: string
  address: string
}

const emptyForm: WarehouseForm = { code: '', name: '', address: '' }

export function WarehousesPage() {
  const queryClient = useQueryClient()
  const auth = getStoredAuth()
  const canManage = auth?.user.role === UserRole.MANAGER
  const [form, setForm] = useState(emptyForm)
  const [page, setPage] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const perPage = 20

  const warehouses = useQuery({
    queryKey: [...queryKeys.warehouses, page, perPage],
    queryFn: () =>
      apiRequest<ListResponse<Warehouse>>(
        `/warehouses?page=${page}&perPage=${perPage}`,
      ),
  })

  const createWarehouse = useMutation({
    mutationFn: (input: WarehouseForm) =>
      apiRequest<Warehouse>('/warehouses', { method: 'POST', body: input }),
    onSuccess: async () => {
      setForm(emptyForm)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.warehouses }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ])
    },
  })

  const deleteWarehouse = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/warehouses/${id}`, { method: 'DELETE' }),
    onSuccess: async (_result, deletedId) => {
      queryClient.setQueryData<ListResponse<Warehouse>>(
        [...queryKeys.warehouses, page, perPage],
        (current) =>
          current
            ? {
                ...current,
                data: current.data.filter(
                  (warehouse) => warehouse.id !== deletedId,
                ),
                total:
                  current.total === undefined
                    ? undefined
                    : Math.max(0, current.total - 1),
              }
            : current,
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.warehouses }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ])
    },
  })

  const updateWarehouse = useMutation({
    mutationFn: (input: WarehouseForm & { id: string }) =>
      apiRequest<Warehouse>(`/warehouses/${input.id}`, {
        method: 'PATCH',
        body: {
          code: input.code,
          name: input.name,
          address: input.address,
        },
      }),
    onSuccess: async () => {
      setEditingId(null)
      setEditForm(emptyForm)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.warehouses }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ])
    },
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    createWarehouse.mutate(form)
  }

  const startEdit = (warehouse: Warehouse) => {
    setEditingId(warehouse.id)
    setEditForm({
      code: warehouse.code,
      name: warehouse.name,
      address: warehouse.address,
    })
  }

  const submitEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingId) {
      return
    }
    updateWarehouse.mutate({ ...editForm, id: editingId })
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Master data</p>
          <h2>Warehouses</h2>
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
            placeholder="Address"
            value={form.address}
            onChange={(event) =>
              setForm({ ...form, address: event.target.value })
            }
          />
          <button type="submit" disabled={createWarehouse.isPending}>
            Add warehouse
          </button>
          {createWarehouse.error ? (
            <p className="form-error">{createWarehouse.error.message}</p>
          ) : null}
        </form>
      ) : (
        <p className="muted">Operators can view warehouses but cannot edit them.</p>
      )}

      {canManage && editingId ? (
        <form className="inline-form edit-panel" onSubmit={submitEdit}>
          <strong>Editing warehouse</strong>
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
            placeholder="Address"
            value={editForm.address}
            onChange={(event) =>
              setEditForm({ ...editForm, address: event.target.value })
            }
          />
          <button type="submit" disabled={updateWarehouse.isPending}>
            Save edit
          </button>
          <button type="button" onClick={() => setEditingId(null)}>
            Cancel
          </button>
          {updateWarehouse.error ? (
            <p className="form-error">{updateWarehouse.error.message}</p>
          ) : null}
        </form>
      ) : null}

      <Status
        isLoading={warehouses.isLoading}
        error={warehouses.error}
        empty={warehouses.data?.data.length === 0}
      >
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Address</th>
                <th>Status</th>
                {canManage ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {warehouses.data?.data.map((warehouse) => (
                <tr key={warehouse.id}>
                  <td>{warehouse.code}</td>
                  <td>{warehouse.name}</td>
                  <td>{warehouse.address}</td>
                  <td>{warehouse.isActive ? 'Active' : 'Inactive'}</td>
                  {canManage ? (
                    <td className="actions">
                      <button type="button" onClick={() => startEdit(warehouse)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteWarehouse.mutate(warehouse.id)}
                        disabled={deleteWarehouse.isPending}
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
            {warehouses.data?.totalPages ? ` of ${warehouses.data.totalPages}` : ''}
            {warehouses.data?.total !== undefined
              ? ` (${warehouses.data.total} active)`
              : ''}
          </span>
          <button
            type="button"
            disabled={
              warehouses.data?.totalPages !== undefined
                ? page >= warehouses.data.totalPages
                : (warehouses.data?.data.length ?? 0) < perPage
            }
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
        {deleteWarehouse.error ? (
          <p className="form-error">{deleteWarehouse.error.message}</p>
        ) : null}
      </Status>
    </section>
  )
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { queryKeys } from '../lib/query-keys'
import {
  createCategory,
  fetchCategoryFlat,
} from '../lib/taxonomy/category.service'

export function CategoryCreateForm() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')

  const flatCategories = useQuery({
    queryKey: [...queryKeys.categories, 'flat'] as const,
    queryFn: async () => {
      const response = await fetchCategoryFlat()
      return response.items
    },
  })

  const create = useMutation({
    mutationFn: () =>
      createCategory({
        name: name.trim(),
        parentId: parentId || null,
      }),
    onSuccess: async () => {
      setName('')
      setParentId('')
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories })
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      return
    }
    create.mutate()
  }

  return (
    <form className="taxonomy-create-form" onSubmit={submit}>
      <input
        placeholder="New category name"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <select
        value={parentId}
        onChange={(event) => setParentId(event.target.value)}
        aria-label="Parent category"
      >
        <option value="">Top level</option>
        {flatCategories.data?.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <button type="submit" disabled={create.isPending || !name.trim()}>
        Add
      </button>
      {create.error ? (
        <p className="form-error">{create.error.message}</p>
      ) : null}
    </form>
  )
}

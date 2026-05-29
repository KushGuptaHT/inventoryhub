import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { queryKeys } from '../lib/query-keys'
import { createTag } from '../lib/taxonomy/tag.service'

export function TagCreateForm() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366f1')

  const create = useMutation({
    mutationFn: () =>
      createTag({
        name: name.trim(),
        color: color || null,
      }),
    onSuccess: async () => {
      setName('')
      await queryClient.invalidateQueries({ queryKey: queryKeys.tags })
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
    <form className="taxonomy-create-form tag-create-form" onSubmit={submit}>
      <input
        placeholder="New tag name"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <input
        type="color"
        value={color}
        onChange={(event) => setColor(event.target.value)}
        aria-label="Tag color"
        title="Tag color"
      />
      <button type="submit" disabled={create.isPending || !name.trim()}>
        Add tag
      </button>
      {create.error ? (
        <p className="form-error">{create.error.message}</p>
      ) : null}
    </form>
  )
}

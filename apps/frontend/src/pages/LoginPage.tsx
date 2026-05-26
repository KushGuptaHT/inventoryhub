import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { apiRequest } from '../lib/api'
import { saveAuth } from '../lib/auth'
import type { AuthResponse } from '../types/api'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { register, handleSubmit, setError, formState } = useForm<LoginForm>({
    defaultValues: {
      email: 'manager@inventoryhub.test',
      password: 'Password123!',
    },
  })

  const login = useMutation({
    mutationFn: (input: LoginForm) =>
      apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: input,
      }),
    onSuccess: (data) => {
      saveAuth(data)
      navigate('/')
    },
  })

  const onSubmit = (input: LoginForm) => {
    const parsed = loginSchema.safeParse(input)
    if (!parsed.success) {
      setError('root', { message: 'Enter a valid email and password.' })
      return
    }
    login.mutate(parsed.data)
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <p className="eyebrow">InventoryHub</p>
        <h1>Sign in</h1>
        <p>Use the local manager or operator seed account.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="form-stack">
          <label>
            Email
            <input type="email" {...register('email')} />
          </label>
          <label>
            Password
            <input type="password" {...register('password')} />
          </label>
          {formState.errors.root ? (
            <p className="form-error">{formState.errors.root.message}</p>
          ) : null}
          {login.error ? <p className="form-error">{login.error.message}</p> : null}
          <button type="submit" disabled={login.isPending}>
            {login.isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}

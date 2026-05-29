import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { queryClient } from './lib/query-client'
import { WarehouseProvider } from './lib/warehouse-context'
import { router } from './routes'
import './App.css'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WarehouseProvider>
        <RouterProvider router={router} />
      </WarehouseProvider>
    </QueryClientProvider>
  )
}

export default App

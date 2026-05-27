import { useMutation, useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Status } from '../components/Status'
import { apiRequest } from '../lib/api'
import { queryKeys } from '../lib/query-keys'
import type { ImportJob, ImportRow } from '../types/api'

const skuCsvSample =
  'code,name,unitCost,reorderThreshold\nFRONTEND-SKU-001,Frontend Imported SKU,10,25'

const receiptCsvSample =
  'skuCode,warehouseCode,quantity,notes\nTEST-WIDGET,WH-DEMO-01,5,Frontend receipt import'

const parseCsvRows = (csv: string): Record<string, unknown>[] => {
  const [headerLine, ...rowLines] = csv
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (!headerLine) {
    return []
  }

  const headers = headerLine.split(',').map((header) => header.trim())
  return rowLines.map((line) => {
    const values = line.split(',').map((value) => value.trim())
    return headers.reduce<Record<string, unknown>>((row, header, index) => {
      const value = values[index]
      if (value === undefined || value === '') {
        return row
      }
      row[header] = ['unitCost', 'reorderThreshold', 'quantity'].includes(header)
        ? Number(value)
        : value
      return row
    }, {})
  })
}

export function ImportsPage() {
  const [importId, setImportId] = useState('')
  const [type, setType] = useState<'SKU_IMPORT' | 'RECEIPT_IMPORT'>('SKU_IMPORT')
  const [csvText, setCsvText] = useState(skuCsvSample)
  const [parseError, setParseError] = useState<string | null>(null)

  const importDetail = useQuery({
    queryKey: [...queryKeys.imports, importId],
    queryFn: () => apiRequest<ImportJob>(`/imports/${importId}`),
    enabled: Boolean(importId),
    refetchInterval: 3000,
  })

  const importRows = useQuery({
    queryKey: [...queryKeys.imports, importId, 'rows'],
    queryFn: () => apiRequest<{ data: ImportRow[] }>(`/imports/${importId}/rows`),
    enabled: Boolean(importId),
    refetchInterval: 3000,
  })

  const createImport = useMutation({
    mutationFn: () => {
      const rows = parseCsvRows(csvText)
      if (rows.length === 0) {
        throw new Error('Add at least one CSV row before starting an import.')
      }

      const fileName = `import-${new Date().toISOString()}.csv`
      return apiRequest<ImportJob>('/imports', {
        method: 'POST',
        body: {
          type,
          fileName,
          rows,
        },
      })
    },
    onSuccess: (data) => setImportId(data.id),
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setParseError(null)
    try {
      parseCsvRows(csvText)
    } catch {
      setParseError('CSV could not be parsed. Check the header and row values.')
      return
    }
    createImport.mutate()
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Background processing</p>
          <h2>Imports</h2>
        </div>
      </div>

      <form className="form-card wide" onSubmit={submit}>
        <label>
          Import type
          <select
            value={type}
            onChange={(event) => {
              const nextType = event.target.value as 'SKU_IMPORT' | 'RECEIPT_IMPORT'
              setType(nextType)
              setCsvText(
                nextType === 'SKU_IMPORT' ? skuCsvSample : receiptCsvSample,
              )
            }}
          >
            <option value="SKU_IMPORT">SKU import</option>
            <option value="RECEIPT_IMPORT">Receipt import</option>
          </select>
        </label>
        <label>
          CSV rows
          <textarea
            rows={8}
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
          />
        </label>
        <p className="muted">
          SKU columns: code,name,unitCost,reorderThreshold. Receipt imports need
          skuCode and warehouseCode values.
        </p>
        {parseError ? <p className="form-error">{parseError}</p> : null}
        {createImport.error ? (
          <p className="form-error">{createImport.error.message}</p>
        ) : null}
        <button type="submit" disabled={createImport.isPending}>
          Start SKU import
        </button>
      </form>

      {importId ? (
        <>
          <Status
            isLoading={importDetail.isLoading}
            error={importDetail.error}
            empty={!importDetail.data}
          >
            {importDetail.data ? (
              <div className="state-card">
                <strong>{importDetail.data.status}</strong>
                <span>
                  {importDetail.data.processedRows}/{importDetail.data.totalRows}{' '}
                  rows processed
                </span>
              </div>
            ) : null}
          </Status>

          <Status
            isLoading={importRows.isLoading}
            error={importRows.error}
            empty={importRows.data?.data.length === 0}
          >
            <div className="table-card">
              <table>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Status</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.data?.data.map((row) => (
                    <tr key={row.id}>
                      <td>{row.rowNumber}</td>
                      <td>{row.status}</td>
                      <td>{row.errorMessage ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Status>
        </>
      ) : null}
    </section>
  )
}

import type { TableModel } from '../mcp/normalize/types'

export function TableRenderer({ table }: { table: TableModel }) {
  return (
    <div className="panel">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {table.columns.map((c) => (
                <th key={c.key} className={c.align === 'right' ? 'num' : ''}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, idx) => (
              <tr key={idx}>
                {table.columns.map((c) => (
                  <td key={c.key} className={c.align === 'right' ? 'num' : ''}>
                    {String(row[c.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

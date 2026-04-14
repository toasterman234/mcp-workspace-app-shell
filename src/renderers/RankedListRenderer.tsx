import type { RankedListModel } from '../results/types'

export function RankedListRenderer({ ranked }: { ranked: RankedListModel }) {
  const rankKey = ranked.rankKey ?? ranked.columns[0]?.key
  return (
    <div className="panel ranked-list">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {ranked.columns.map((c) => (
                <th
                  key={c.key}
                  className={`${c.align === 'right' ? 'num' : ''}${c.key === rankKey ? ' ranked-list__emph' : ''}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranked.rows.map((row, idx) => (
              <tr key={idx}>
                {ranked.columns.map((c) => (
                  <td
                    key={c.key}
                    className={`${c.align === 'right' ? 'num' : ''}${c.key === rankKey ? ' ranked-list__emph' : ''}`}
                  >
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

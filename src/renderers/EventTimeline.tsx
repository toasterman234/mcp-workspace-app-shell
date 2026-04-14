import type { EventModel } from '../mcp/normalize/types'

export function EventTimeline({ events }: { events: EventModel[] }) {
  return (
    <div className="timeline">
      {events.map((e) => (
        <div key={e.id} className={`timeline-row timeline-row--${e.level}`}>
          <div className="timeline-ts">{new Date(e.ts).toLocaleString()}</div>
          <div className="timeline-msg">{e.message}</div>
        </div>
      ))}
    </div>
  )
}

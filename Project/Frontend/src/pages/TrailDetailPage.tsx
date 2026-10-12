import { useParams } from "react-router-dom"

export function TrailDetailPage() {
  const { trailId } = useParams()

  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">Trail Detail</h1>
      <p className="text-muted-foreground">Trail ID: {trailId}</p>
    </section>
  )
}

import { FlaskConical } from "lucide-react";
import { trailDataMode } from "../../services/trailService";

export function TrailDataBadge() {
  return trailDataMode === "demo"
    ? <span className="data-badge data-badge--demo"><FlaskConical size={13} />Demo trail data</span>
    : <span className="data-badge"><span className="live-dot" />Live Trail Service</span>;
}

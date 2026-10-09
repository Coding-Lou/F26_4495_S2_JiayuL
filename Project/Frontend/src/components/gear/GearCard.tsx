import { Backpack, BatteryCharging, Footprints, HardHat, MoreHorizontal, Pencil, ShieldCheck, Shirt, TentTree, Trash2 } from "lucide-react";
import { useState } from "react";
import type { GearItem } from "../../types/user";

const icons = { Clothing: Shirt, Footwear: Footprints, Backpack, Camping: TentTree, Safety: ShieldCheck, Electronics: BatteryCharging, Other: HardHat };

export function GearCard({ item, onEdit, onDelete }: { item: GearItem; onEdit: () => void; onDelete: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const Icon = icons[item.category as keyof typeof icons] ?? HardHat;
  return <article className="gear-card">
    <div className="gear-card__top"><span className={`gear-icon gear-icon--${(item.category ?? "other").toLowerCase()}`}><Icon size={23} /></span><div className="menu-wrap"><button className="icon-button" aria-label={`Actions for ${item.name}`} onClick={() => setMenuOpen((value) => !value)}><MoreHorizontal size={20} /></button>{menuOpen && <div className="context-menu"><button onClick={() => { setMenuOpen(false); onEdit(); }}><Pencil size={15} />Edit</button><button className="danger" onClick={() => { setMenuOpen(false); onDelete(); }}><Trash2 size={15} />Delete</button></div>}</div></div>
    <span className="category-label">{item.category || "Other"}</span><h3>{item.name}</h3><p>{item.description || "No description added yet."}</p>
  </article>;
}

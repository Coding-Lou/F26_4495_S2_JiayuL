import { Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "../components/common/AsyncState";
import { Modal } from "../components/common/Modal";
import { PageHeader } from "../components/common/PageHeader";
import { GearForm } from "../components/gear/GearForm";
import { GearCard } from "../components/gear/GearCard";
import { GEAR_CATEGORIES } from "../data/gearCategories";
import { getErrorMessage } from "../services/api";
import { userService } from "../services/userService";
import type { GearInput, GearItem } from "../types/user";

export function Pack() {
  const [gear, setGear] = useState<GearItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<GearItem | null>();
  const [deleting, setDeleting] = useState<GearItem>();
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { setGear(await userService.getGear()); } catch (reason) { setError(getErrorMessage(reason)); } finally { setLoading(false); } }, []);
  useEffect(() => {
    let active = true;
    void userService.getGear().then((items) => { if (active) setGear(items); }).catch((reason: unknown) => { if (active) setError(getErrorMessage(reason)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const visibleGear = useMemo(() => gear.filter((item) => (category === "All" || item.category === category) && (!search || item.name.toLowerCase().includes(search.toLowerCase()))), [gear, category, search]);
  const save = async (input: GearInput) => { setSaving(true); setActionError(""); try { if (editing) { const updated = await userService.updateGear(editing.id, input); setGear((items) => items.map((item) => item.id === updated.id ? updated : item)); } else { const created = await userService.createGear(input); setGear((items) => [created, ...items]); } setEditing(undefined); } catch (reason) { setActionError(getErrorMessage(reason)); } finally { setSaving(false); } };
  const remove = async () => { if (!deleting) return; setSaving(true); setActionError(""); try { await userService.deleteGear(deleting.id); setGear((items) => items.filter((item) => item.id !== deleting.id)); setDeleting(undefined); } catch (reason) { setActionError(getErrorMessage(reason)); } finally { setSaving(false); } };

  return <div className="page"><PageHeader eyebrow={<span className="live-api-label"><span className="live-dot" />Live User Service</span>} title="Your gear locker" description="Keep your kit organized and know exactly what is ready for the next trail." actions={<button className="button button--primary" onClick={() => { setActionError(""); setEditing(null); }}><Plus size={18} />Add gear</button>} />
    <div className="pack-summary"><div><span className="pack-summary__number">{gear.length}</span><span><strong>Total items</strong><small>in your inventory</small></span></div><div><span className="pack-summary__number">{new Set(gear.map((item) => item.category)).size}</span><span><strong>Categories</strong><small>organized and ready</small></span></div><div className="pack-summary__tip"><span>PACKING TIP</span><p>Check footwear and safety gear before every trip.</p></div></div>
    <div className="gear-toolbar"><div className="search-box"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your gear" /></div><div className="category-tabs"><button className={category === "All" ? "active" : ""} onClick={() => setCategory("All")}>All <span>{gear.length}</span></button>{GEAR_CATEGORIES.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div><button className="icon-button toolbar-filter" title="Filter"><SlidersHorizontal size={19} /></button></div>
    {loading ? <LoadingState label="Opening your gear locker…" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : visibleGear.length === 0 ? <EmptyState title={gear.length ? "Nothing matches this filter" : "Your gear locker is empty"} message={gear.length ? "Try another category or search term." : "Add your first item to start preparing for the trail."} action={!gear.length && <button className="button button--primary" onClick={() => setEditing(null)}><Plus size={17} />Add first item</button>} /> : <div className="gear-grid">{visibleGear.map((item) => <GearCard key={item.id} item={item} onEdit={() => { setActionError(""); setEditing(item); }} onDelete={() => { setActionError(""); setDeleting(item); }} />)}</div>}
    {editing !== undefined && <Modal title={editing ? "Edit gear item" : "Add gear item"} subtitle="Keep the details short and useful for packing." onClose={() => setEditing(undefined)}><GearForm item={editing ?? undefined} saving={saving} error={actionError} onSubmit={save} onCancel={() => setEditing(undefined)} /></Modal>}
    {deleting && <Modal title="Remove this item?" subtitle="The User Service will soft-delete it from your inventory." onClose={() => setDeleting(undefined)}><div className="delete-confirm"><span><Trash2 size={24} /></span><p><strong>{deleting.name}</strong> will no longer appear in your gear locker.</p>{actionError && <div className="inline-error">{actionError}</div>}<div className="form__actions"><button className="button button--ghost" onClick={() => setDeleting(undefined)}>Keep item</button><button className="button button--danger" disabled={saving} onClick={() => void remove()}>{saving ? "Removing…" : "Remove item"}</button></div></div></Modal>}
  </div>;
}

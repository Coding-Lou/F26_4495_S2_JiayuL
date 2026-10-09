import { useState, type FormEvent } from "react";
import { GEAR_CATEGORIES } from "../../data/gearCategories";
import type { GearInput, GearItem } from "../../types/user";

export function GearForm({ item, saving, error, onSubmit, onCancel }: { item?: GearItem; saving: boolean; error?: string; onSubmit: (input: GearInput) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<GearInput>({ name: item?.name ?? "", category: item?.category ?? "Other", description: item?.description ?? "" });
  const submit = (event: FormEvent) => { event.preventDefault(); void onSubmit({ name: form.name.trim(), category: form.category, description: form.description.trim() }); };

  return <form className="form" onSubmit={submit}>
    {error && <div className="inline-error" role="alert">{error}</div>}
    <label><span>Item name</span><input autoFocus required maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Waterproof hiking boots" /></label>
    <label><span>Category</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{GEAR_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
    <label><span>Description <small>Optional</small></span><textarea maxLength={255} rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Condition, size, or a reminder about this item…" /><small className="character-count">{form.description.length}/255</small></label>
    <div className="form__actions"><button type="button" className="button button--ghost" onClick={onCancel}>Cancel</button><button className="button button--primary" disabled={saving || !form.name.trim()}>{saving ? <><span className="button-spinner" />Saving…</> : item ? "Save changes" : "Add to inventory"}</button></div>
  </form>;
}

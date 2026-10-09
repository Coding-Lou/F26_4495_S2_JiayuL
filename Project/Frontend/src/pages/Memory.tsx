import { Camera, Footprints, ImagePlus, MapPinned, Plus, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { PageHeader } from "../components/common/PageHeader";

const memories = [
  { title: "Joffre Lakes", date: "September 14, 2026", stats: "9.2 km · 4h 10m", photo: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=85" },
  { title: "Lynn Canyon", date: "August 23, 2026", stats: "6.8 km · 2h 35m", photo: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=85" },
  { title: "Garibaldi Lake", date: "July 19, 2026", stats: "18.1 km · 6h 20m", photo: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85" },
];

export function Memory() {
  const [previews, setPreviews] = useState<string[]>([]);
  const [gpxName, setGpxName] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  const addPhotos = (files: FileList | null) => { if (files) setPreviews((items) => [...items, ...Array.from(files).map((file) => URL.createObjectURL(file))]); };

  return <div className="page"><PageHeader eyebrow={<span className="demo-label">Prototype · Local preview only</span>} title="Your trail memories" description="A home for the routes, photos, and moments you want to carry with you." actions={<button className="button button--primary" onClick={() => photoInput.current?.click()}><Plus size={18} />Add memory</button>} />
    <section className="memory-feature"><div><span className="section-kicker section-kicker--light">Your year outside</span><h2>3 adventures.<br />34.1 kilometres.<br /><em>Countless moments.</em></h2><p>This prototype previews selected files in your browser. Photos and GPX tracks are not uploaded or persisted yet.</p></div><div className="memory-feature__stats"><span><Footprints /><strong>12</strong><small>Hours outside</small></span><span><MapPinned /><strong>3</strong><small>Places explored</small></span><span><Camera /><strong>28</strong><small>Photos captured</small></span></div></section>
    <div className="section-heading"><div><span className="section-kicker">Look back</span><h2>Recent adventures</h2></div></div><div className="memory-grid">{memories.map((memory, index) => <article key={memory.title} className={index === 0 ? "memory-card memory-card--wide" : "memory-card"} style={{ backgroundImage: `linear-gradient(180deg,transparent 30%,rgba(5,25,17,.86)),url("${memory.photo}")` }}><span className="demo-label">Demo memory</span><div><p>{memory.date}</p><h3>{memory.title}</h3><small>{memory.stats}</small></div></article>)}</div>
    <section className="upload-studio"><div className="panel__header"><div><span className="section-kicker">Try the concept</span><h2>Create a local preview</h2></div><span className="demo-label">Not persisted</span></div><div className="upload-grid"><button className="drop-zone" onClick={() => photoInput.current?.click()}><span><ImagePlus size={26} /></span><strong>Choose trip photos</strong><small>JPG, PNG or HEIC · stays in this browser tab</small></button><label className="drop-zone"><span><Upload size={26} /></span><strong>{gpxName || "Choose a GPX track"}</strong><small>{gpxName ? "Ready for preview · not uploaded" : "GPX file · frontend preview only"}</small><input type="file" accept=".gpx" hidden onChange={(event) => setGpxName(event.target.files?.[0]?.name ?? "")} /></label></div>{previews.length > 0 && <div className="preview-strip">{previews.map((url) => <div key={url} style={{ backgroundImage: `url("${url}")` }}><button aria-label="Remove preview" onClick={() => setPreviews((items) => items.filter((item) => item !== url))}><X size={15} /></button></div>)}</div>}<input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={(event) => addPhotos(event.target.files)} /></section>
  </div>;
}

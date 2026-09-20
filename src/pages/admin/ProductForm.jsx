import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, ImagePlus, Trash2, Video, X, Plus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../lib/api";
import { showAlert } from "../../lib/feedback";
import { cachedGet, cacheClearPrefix, cacheRemove } from "../../lib/cache";
import ConfirmModal from "../../components/ConfirmModal";
import RefreshButton from "../../components/RefreshButton";

function MediaPreview({ item, onRemove, onUp, onDown, canUp, canDown }) {
  const isVideo = item.type === "video";
  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-black/5">
      <div className="aspect-square">
        {isVideo ? (
          <video src={item.preview} controls preload="metadata" className="h-full w-full object-cover" />
        ) : (
          <img loading="lazy" src={item.preview} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="absolute left-2 top-2 flex gap-1.5">
        <span className="badge bg-white/90 shadow-sm">{isVideo ? "Video" : "Photo"}</span>
        {item.existing && <span className="badge bg-white/90 shadow-sm">Saved</span>}
      </div>
      <button type="button" onClick={onRemove} className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-red-600 text-white shadow" title="Remove" aria-label="Remove media"><X size={17}/></button>
      <div className="absolute bottom-2 left-2 right-2 flex justify-between gap-2">
        <button type="button" disabled={!canUp} onClick={onUp} className="grid h-9 w-9 place-items-center rounded-xl bg-white/90 shadow disabled:opacity-30" title="Move up"><ArrowUp size={17}/></button>
        <button type="button" disabled={!canDown} onClick={onDown} className="grid h-9 w-9 place-items-center rounded-xl bg-white/90 shadow disabled:opacity-30" title="Move down"><ArrowDown size={17}/></button>
      </div>
    </div>
  );
}

export default function ProductForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const [cats, setCats] = useState([]), [collections, setCollections] = useState([]), [fashionSizes, setFashionSizes] = useState([]), [sizeCharts, setSizeCharts] = useState([]);
  const [form, setForm] = useState({ name: "", sku: "", category: "", brand: "", subcategory: "", fabric: "", pattern: "", occasion: "", season: "", tags: [], careInstructions: "", sizeChartId: null, sizeChart: { name: "", measurements: {} }, seoTitle: "", seoDescription: "", description: "", specifications: {}, stockQuantity: 1, colors: [], sizes: [], purchasePrice: 0, sellingPrice: 0, discountedPrice: "", isPriceVisible: true, isAvailable: true, isTodaysOffer: false, isMostDemanded: false, isFeatured: false, isNewArrival: false, collections: [] });
  const [media, setMedia] = useState([]);
  const [variants, setVariants] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [deleteModal, setDeleteModal] = useState(null);
  const [refreshing, setRefreshing] = useState(false), [refreshNonce, setRefreshNonce] = useState(0);
  const mediaRef = useRef([]);
  useEffect(() => { mediaRef.current = media; }, [media]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [cr, colr, sr, chr, pr] = await Promise.all([
          cachedGet(api, "/categories?active=false&page=1&limit=100", { key: "categories:admin:form" }),
          cachedGet(api, "/collections?active=false&page=1&limit=100", { key: "collections:admin:form" }),
          cachedGet(api, "/sizes?active=true", { key: "sizes:admin:form" }),
          cachedGet(api, "/size-charts?active=true", { key: "size-charts:admin:form" }),
          id ? cachedGet(api, `/products/admin/${id}`, { key: `product:admin:${id}` }) : Promise.resolve(null)
        ]);
        if (cancelled) return;
        setCats(cr.data?.items || cr.data || []);
        setCollections(colr?.data?.items || colr?.data || []);
        setFashionSizes(sr?.data?.items || sr?.data || []);
        setSizeCharts(chr?.data?.items || chr?.data || []);
        if (pr) {
          const p = pr.data;
          setForm({
            ...p,
            category: p.category?._id || p.category,
            collections: (p.collections || []).map(x => x?._id || x),
            sizeChartId: p.sizeChartId?._id || p.sizeChartId || null,
            discountedPrice: p.discountedPrice ?? ""
          });
          setVariants((p.variants || []).map(v => ({ ...v, discountedPrice: v.discountedPrice ?? "" })));
          setMedia([
            ...(p.images || []).map(m => ({ existing: true, type: "image", id: m.publicId, preview: m.secureUrl })),
            ...(p.videos || []).map(m => ({ existing: true, type: "video", id: m.publicId, preview: m.secureUrl }))
          ]);
        }
      } catch (e) {
        if (!cancelled) showAlert(e.response?.data?.message || "Could not load product.");
      } finally {
        if (!cancelled) { setLoading(false); setRefreshing(false); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, refreshNonce]);

  useEffect(() => () => mediaRef.current.forEach(m => !m.existing && m.preview?.startsWith("blob:") && URL.revokeObjectURL(m.preview)), []);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function addFiles(e) {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    const added = selected.map(file => ({ existing: false, type: file.type.startsWith("video/") ? "video" : "image", file, preview: URL.createObjectURL(file), token: crypto.randomUUID() }));
    setMedia(current => [...current, ...added]);
    e.target.value = "";
  }

  function removeMedia(index) {
    const item = media[index];
    if (!item) return;
    if (!item.existing) {
      URL.revokeObjectURL(item.preview);
      setMedia(current => current.filter((_, i) => i !== index));
      return;
    }
    setDeleteModal({ index, item });
  }

  function confirmRemoveExisting() {
    const index = deleteModal.index;
    setMedia(current => current.filter((_, i) => i !== index));
    setDeleteModal(null);
  }

  function moveMedia(index, direction) {
    setMedia(current => {
      const item = current[index];
      if (!item) return current;
      const sameTypeIndexes = current.map((m, i) => m.type === item.type ? i : -1).filter(i => i >= 0);
      const position = sameTypeIndexes.indexOf(index);
      const targetPosition = position + direction;
      if (targetPosition < 0 || targetPosition >= sameTypeIndexes.length) return current;
      const target = sameTypeIndexes[targetPosition];
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const images = useMemo(() => media.filter(m => m.type === "image"), [media]);
  const videos = useMemo(() => media.filter(m => m.type === "video"), [media]);

  async function refreshFromServer() {
    setRefreshing(true);
    try {
      await cacheClearPrefix("categories:");
      if (id) await cacheRemove(`product:admin:${id}`);
      setRefreshNonce(x => x + 1);
    } finally {
      // The loading effect clears this once the fresh server data arrives.
      // Keep the button responsive even if cache cleanup itself fails.
      if (!id) setRefreshing(false);
    }
  }

  function addOption(key) {
    setForm(f => ({ ...f, [key]: [...(f[key] || []), ""] }));
  }
  function updateOption(key, index, value) {
    setForm(f => ({ ...f, [key]: (f[key] || []).map((x, i) => i === index ? value : x) }));
  }
  function removeOption(key, index) {
    setForm(f => ({ ...f, [key]: (f[key] || []).filter((_, i) => i !== index) }));
  }

  function addVariant() {
    setVariants(current => [...current, {
      _id: undefined,
      sku: `${form.sku || "SKU"}-${current.length + 1}`,
      size: "",
      color: "",
      stockQuantity: 0,
      colorCode: "",
      barcode: "",
      image: null,
      purchasePrice: Number(form.purchasePrice) || 0,
      sellingPrice: Number(form.sellingPrice) || 0,
      discountedPrice: "",
      isAvailable: true
    }]);
  }

  function updateVariant(index, key, value) {
    setVariants(current => current.map((v, i) => i === index ? { ...v, [key]: value } : v));
  }

  function removeVariant(index) {
    setVariants(current => current.filter((_, i) => i !== index));
  }

  async function save(e) {
    e.preventDefault();
    if (form.discountedPrice !== "" && Number(form.discountedPrice) >= Number(form.sellingPrice)) {
      showAlert("Discounted price must be lower than selling price.");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      const newItems = media.filter(m => !m.existing);
      const tokenByItem = new Map(newItems.map((m, i) => [m.token, `new:${i}`]));
      const data = {
        name: form.name,
        sku: form.sku,
        category: form.category,
        collections: (form.collections || []).filter(Boolean),
        description: form.description || "",
        stockQuantity: Math.max(0, Math.floor(Number(form.stockQuantity) || 0)),
        colors: (form.colors || []).map(x => x.trim()).filter(Boolean),
        sizes: (form.sizes || []).map(x => x.trim()).filter(Boolean),
        specifications: form.specifications || {},
        purchasePrice: Number(form.purchasePrice),
        sellingPrice: Number(form.sellingPrice),
        brand: form.brand || "",
        subcategory: form.subcategory || "",
        fabric: form.fabric || "",
        pattern: form.pattern || "",
        occasion: form.occasion || "",
        season: form.season || "",
        tags: (form.tags || []).map(x => String(x).trim()).filter(Boolean),
        careInstructions: form.careInstructions || "",
        sizeChartId: form.sizeChartId || null,
        sizeChart: form.sizeChart || { name: "", measurements: {} },
        seoTitle: form.seoTitle || "",
        seoDescription: form.seoDescription || "",
        isFeatured: Boolean(form.isFeatured),
        isNewArrival: Boolean(form.isNewArrival),
        discountedPrice: form.discountedPrice === "" ? null : Number(form.discountedPrice),
        isPriceVisible: Boolean(form.isPriceVisible),
        isAvailable: Boolean(form.isAvailable),
        isTodaysOffer: Boolean(form.isTodaysOffer),
        isMostDemanded: Boolean(form.isMostDemanded),
        mediaOrder: {
          images: images.map(m => m.existing ? `existing:${m.id}` : tokenByItem.get(m.token)),
          videos: videos.map(m => m.existing ? `existing:${m.id}` : tokenByItem.get(m.token))
        }
      };
      fd.append("data", JSON.stringify(data));
      newItems.forEach(m => fd.append("media", m.file));
      const productResponse = await (id ? api.put(`/products/${id}`, fd) : api.post("/products", fd));
      const productId = id || productResponse.data?._id;
      if (!productId) throw new Error("Product was saved but its ID was not returned.");

      const cleanVariants = variants.map(v => ({
        ...(v._id ? { _id: v._id } : {}),
        sku: String(v.sku || "").trim(),
        size: String(v.size || "").trim(),
        color: String(v.color || "").trim(),
        colorCode: String(v.colorCode || "").trim(),
        barcode: String(v.barcode || "").trim(),
        image: v.image || null,
        stockQuantity: Math.max(0, Math.floor(Number(v.stockQuantity) || 0)),
        purchasePrice: Number(v.purchasePrice) || 0,
        sellingPrice: Number(v.sellingPrice) || 0,
        discountedPrice: v.discountedPrice === "" || v.discountedPrice == null ? null : Number(v.discountedPrice),
        isAvailable: Boolean(v.isAvailable)
      }));
      if (cleanVariants.length) {
        await api.put(`/variants/${productId}`, { variants: cleanVariants });
      } else if (id) {
        await api.put(`/variants/${productId}`, { variants: [] });
      }
      await cacheClearPrefix("products:"); await cacheClearPrefix("product:");
      await cacheClearPrefix("categories:");
      await cacheClearPrefix("collections:");
      await cacheClearPrefix("dashboard:");
      if (id) await cacheClearPrefix(`product:admin:${id}`);
      nav("/admin/products");
    } catch (e) {
      showAlert(e.response?.data?.message || "Could not save product");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="py-10 text-slate-500">Loading product...</div>;

  function MediaSection({ title, items }) {
    return (
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-black">{title}</h2><span className="text-xs font-semibold text-slate-400">{items.length} selected</span></div>
        {items.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map(item => {
              const index = media.indexOf(item);
              return <MediaPreview key={item.existing ? item.id : item.token} item={item} onRemove={() => removeMedia(index)} onUp={() => moveMedia(index, -1)} onDown={() => moveMedia(index, 1)} canUp={media.filter(m => m.type === item.type).findIndex(m => m === item) > 0} canDown={media.filter(m => m.type === item.type).findIndex(m => m === item) < media.filter(m => m.type === item.type).length - 1}/>;
            })}
          </div>
        ) : <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-400">No {title.toLowerCase()} yet.</div>}
      </section>
    );
  }

  return <div className="mx-auto max-w-5xl">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-3xl font-black">{id ? "Edit Product" : "Add Product"}</h1><p className="mt-1 text-sm text-slate-500">Manage product details, photos, videos, and their order.</p></div>
      <div className="flex gap-2">
        <RefreshButton onClick={refreshFromServer} busy={refreshing}/>
        <button type="button" className="btn-soft" onClick={() => nav("/admin/products")}><ArrowLeft size={17}/> Back</button>
      </div>
    </div>
    <form onSubmit={save} className="card mt-6 p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {[['name','Product Name','text'],['sku','SKU / Product Code','text'],['stockQuantity','Quantity / Stock','number'],['purchasePrice','Purchase Price','number'],['sellingPrice','Selling Price','number'],['discountedPrice','Discounted Price','number']].map(([k,l,t]) => <label key={k} className="text-sm font-bold">{l}<input type={t} value={form[k]} onChange={e => set(k, e.target.value)} className="mt-2 w-full rounded-2xl bg-slate-100 p-3" required={k !== 'discountedPrice'} min={t === 'number' ? 0 : undefined} step={k === 'stockQuantity' ? '1' : t === 'number' ? '0.01' : undefined}/></label>)}
        <label className="text-sm font-bold">Category<select required value={form.category} onChange={e => set('category', e.target.value)} className="mt-2 w-full rounded-2xl bg-slate-100 p-3"><option value="">Select category</option>{cats.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></label>
      </div>
      <section className="mt-5 rounded-3xl bg-slate-50 p-4 sm:p-5">
        <div>
          <h2 className="text-xl font-black">Collections</h2>
          <p className="mt-1 text-xs text-slate-500">Place this product in one or more merchandising collections.</p>
        </div>
        {collections.length ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map(c => (
              <label key={c._id} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/5">
                <input
                  type="checkbox"
                  checked={(form.collections || []).includes(c._id)}
                  onChange={e => set("collections", e.target.checked
                    ? [...new Set([...(form.collections || []), c._id])]
                    : (form.collections || []).filter(id => id !== c._id)
                  )}
                  className="h-5 w-5"
                />
                <span className="font-bold">{c.name}</span>
                {!c.isActive && <span className="ml-auto text-xs font-bold text-slate-400">Hidden</span>}
              </label>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed p-4 text-sm text-slate-500">
            No collections yet. Create one from Admin → Collections.
          </div>
        )}
      </section>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl bg-slate-50 p-4">
          <div><h2 className="font-black">Available Colors</h2><p className="text-xs text-slate-400">Add colors only when this product has color choices.</p></div>
          <button type="button" onClick={() => addOption("colors")} className="btn-soft mt-3 px-3 py-2 text-xs">+ Add Color</button>
          <div className="mt-3 grid gap-2">{(form.colors || []).map((value,index)=><div className="flex gap-2" key={`color-${index}`}><input value={value} onChange={e=>updateOption("colors",index,e.target.value)} className="min-w-0 flex-1 rounded-xl bg-white p-3 ring-1 ring-black/5" placeholder="e.g. Red"/><button type="button" onClick={()=>removeOption("colors",index)} className="btn-soft p-3 text-red-600"><Trash2 size={16}/></button></div>)}</div>
        </section>
        <section className="rounded-2xl bg-slate-50 p-4">
          <h2 className="font-black">Fashion Sizes</h2><p className="text-xs text-slate-400">Select tenant-configured sizes. Manage them from Admin → Fashion Sizes.</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{fashionSizes.map(s=><label key={s._id} className="flex items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-black/5"><input type="checkbox" checked={(form.sizes||[]).map(String).includes(String(s.key))} onChange={e=>set("sizes",e.target.checked?[...new Set([...(form.sizes||[]),s.key])]:((form.sizes||[]).filter(x=>String(x)!==String(s.key))))} className="h-4 w-4"/><span className="font-bold">{s.name} <span className="text-xs text-slate-400">({s.key})</span></span></label>)}</div>
        </section>
      </div>
      <section className="mt-5 rounded-2xl bg-slate-50 p-4">
        <h2 className="font-black">Reusable Size Chart</h2><p className="text-xs text-slate-400">Optionally attach a tenant size chart. It will appear on the public product page.</p>
        <select value={form.sizeChartId || ""} onChange={e=>set("sizeChartId",e.target.value || null)} className="mt-3 w-full rounded-2xl bg-white p-3 ring-1 ring-black/5">
          <option value="">No size chart</option>{sizeCharts.map(c=><option key={c._id} value={c._id}>{c.name} · {(c.sizes||[]).join(", ")}</option>)}
        </select>
      </section>
      <section className="mt-5 rounded-3xl bg-slate-50 p-4 sm:p-5">
        <h2 className="text-xl font-black">Fashion Details</h2>
        <p className="mt-1 text-xs text-slate-500">Capture fashion-specific attributes for search, merchandising and the public product page.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["brand", "Brand"], ["subcategory", "Subcategory"], ["fabric", "Fabric"],
            ["pattern", "Pattern"], ["occasion", "Occasion"], ["season", "Season"]
          ].map(([key,label]) => <label key={key} className="text-sm font-bold">{label}<input value={form[key] || ""} onChange={e => set(key, e.target.value)} className="mt-2 w-full rounded-2xl bg-white p-3 ring-1 ring-black/5" placeholder={`e.g. ${label}`}/></label>)}
        </div>
        <label className="mt-4 block text-sm font-bold">Tags<input value={(form.tags || []).join(", ")} onChange={e => set("tags", e.target.value.split(","))} className="mt-2 w-full rounded-2xl bg-white p-3 ring-1 ring-black/5" placeholder="wedding, festive, rayon"/><span className="mt-1 block text-xs font-normal text-slate-400">Separate tags with commas.</span></label>
        <label className="mt-4 block text-sm font-bold">Care Instructions<textarea rows="3" value={form.careInstructions || ""} onChange={e => set("careInstructions", e.target.value)} className="mt-2 w-full rounded-2xl bg-white p-3 ring-1 ring-black/5" placeholder="Machine wash cold, do not bleach..."/></label>
      </section>

      <section className="mt-5 rounded-3xl border border-dashed p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Fashion Variants</h2>
            <p className="mt-1 text-xs text-slate-500">Use variants when the same design is sold in different sizes, colors, or both. Each variant has its own SKU, stock and price.</p>
          </div>
          <button type="button" onClick={addVariant} className="btn-soft"><Plus size={17}/> Add Variant</button>
        </div>

        {variants.length ? (
          <div className="mt-4 grid gap-4">
            {variants.map((v, index) => (
              <div key={v._id || `new-${index}`} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-black">Variant {index + 1}</span>
                  <button type="button" onClick={() => removeVariant(index)} className="btn-soft p-2 text-red-600" aria-label={`Remove variant ${index + 1}`}><Trash2 size={16}/></button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["sku","Variant SKU","text"],
                    ["size","Size","text"],
                    ["color","Color","text"],
                    ["colorCode","Color Code","text"],
                    ["barcode","Barcode","text"],
                    ["stockQuantity","Stock","number"],
                    ["purchasePrice","Purchase Price","number"],
                    ["sellingPrice","Selling Price","number"],
                    ["discountedPrice","Discounted Price","number"]
                  ].map(([key,label,type]) => (
                    <label key={key} className="text-xs font-bold">{label}
                      <input type={type} value={v[key]} onChange={e => updateVariant(index, key, e.target.value)} className="mt-1.5 w-full rounded-xl bg-white p-2.5 ring-1 ring-black/5" min={type === "number" ? 0 : undefined} step={type === "number" && key !== "stockQuantity" ? "0.01" : undefined} required={["sku","sellingPrice"].includes(key)}/>
                    </label>
                  ))}
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={Boolean(v.isAvailable)} onChange={e => updateVariant(index, "isAvailable", e.target.checked)} className="h-4 w-4"/> Variant available</label>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">
            No variants. This product will use its main product stock and price.
          </div>
        )}
      </section>

      <label className="mt-4 block text-sm font-bold">Description<textarea rows="5" value={form.description || ""} onChange={e => set('description', e.target.value)} className="mt-2 w-full rounded-2xl bg-slate-100 p-3"/></label>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[['isPriceVisible','Show Public Price'],['isAvailable','Available'],['isTodaysOffer',"Today's Offer"],['isMostDemanded','Most Demanded'],['isFeatured','Featured'],['isNewArrival','New Arrival']].map(([k,l]) => <label key={k} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 font-bold"><input type="checkbox" checked={Boolean(form[k])} onChange={e => set(k, e.target.checked)} className="h-5 w-5"/>{l}</label>)}</div>

      <section className="mt-5 rounded-3xl bg-slate-50 p-4 sm:p-5">
        <h2 className="text-xl font-black">Size Chart</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">Chart Name<input value={form.sizeChart?.name || ""} onChange={e => set("sizeChart", { ...(form.sizeChart || {}), name: e.target.value })} className="mt-2 w-full rounded-2xl bg-white p-3 ring-1 ring-black/5" placeholder="Standard Ladies Size Chart"/></label>
          <label className="text-sm font-bold">Measurements JSON<textarea rows="3" value={JSON.stringify(form.sizeChart?.measurements || {}, null, 2)} onChange={e => { try { set("sizeChart", { ...(form.sizeChart || {}), measurements: JSON.parse(e.target.value || "{}") }); } catch {} }} className="mt-2 w-full rounded-2xl bg-white p-3 font-mono text-xs ring-1 ring-black/5" placeholder='{"M":"Bust 38, Waist 34, Hip 40"}'/></label>
        </div>
      </section>
      <section className="mt-5 rounded-3xl bg-slate-50 p-4 sm:p-5">
        <h2 className="text-xl font-black">SEO</h2>
        <div className="mt-4 grid gap-4">
          <label className="text-sm font-bold">SEO Title<input value={form.seoTitle || ""} onChange={e => set("seoTitle", e.target.value)} className="mt-2 w-full rounded-2xl bg-white p-3 ring-1 ring-black/5" maxLength={160}/></label>
          <label className="text-sm font-bold">SEO Description<textarea rows="3" value={form.seoDescription || ""} onChange={e => set("seoDescription", e.target.value)} className="mt-2 w-full rounded-2xl bg-white p-3 ring-1 ring-black/5" maxLength={320}/></label>
        </div>
      </section>
      <section className="mt-7 rounded-3xl bg-slate-50 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Media</h2><p className="mt-1 text-xs text-slate-500">Add more without overwriting existing media. Remove anything you do not want and use the arrows to reorder.</p></div><label className="btn-primary cursor-pointer"><ImagePlus size={17}/> Add photos / videos<input hidden multiple type="file" accept="image/*,video/*" onChange={addFiles}/></label></div>
        <MediaSection title="Photos" items={images}/>
        <MediaSection title="Videos" items={videos}/>
      </section>
      <button disabled={saving} className="btn-primary mt-6 w-full sm:w-auto">{saving ? "Saving..." : id ? "Save Changes" : "Create Product"}</button>
    </form>
    <ConfirmModal open={Boolean(deleteModal)} title="Remove this saved media?" message="It will be removed from this product when you save. The original file will also be removed from Cloudinary." confirmText="Remove" onConfirm={confirmRemoveExisting} onClose={() => setDeleteModal(null)}/>
  </div>;
}

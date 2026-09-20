import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MessageCircle,
  PlayCircle,
  ShoppingBag,
  Minus,
  Plus,
  CalendarCheck,
} from "lucide-react";
import api from "../lib/api";
import { money } from "../lib/utils";
import { showAlert } from "../lib/feedback";
import Loading from "../components/Loading";
import SEO from "../components/SEO";
import ShopLogoPlaceholder from "../components/ShopLogoPlaceholder";
import { useStore, storePath } from "../context/StoreContext";
import { useCart } from "../context/CartContext";

export default function Product() {
  const { slug } = useParams();
  const { tenantSlug, store } = useStore();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    customerName: "",
    customerPhone: "",
    email: "",
    accepted: false,
  });
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const r = await api.get(`/products/${encodeURIComponent(slug)}`);
        if (!cancelled) {
          setProduct(r.data);
          setSelected(0);
          setSelectedVariantId(r.data?.variants?.[0]?._id || "");
        }
      } catch {
        if (!cancelled) setProduct(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug, tenantSlug]);

  async function bookForStore() {
    if (!selectedVariantId && product.variantEnabled)
      return showAlert("Select a size/color before booking.");
    if (!bookingForm.accepted)
      return showAlert(
        "Accept the contact, Terms and Privacy policy before booking.",
      );
    setBookingBusy(true);
    try {
      const r = await api.post("/bookings", {
        productId: product._id,
        variantId: selectedVariantId || null,
        quantity,
        customerName: bookingForm.customerName,
        customerPhone: bookingForm.customerPhone,
        email: bookingForm.email,
        acceptedTerms: bookingForm.accepted,
      });
      setBookingResult(r.data?.booking || null);
      setBookingOpen(false);
    } catch (e) {
      showAlert(e.response?.data?.message || "Could not reserve this item.");
    } finally {
      setBookingBusy(false);
    }
  }

  if (loading) return <Loading />;

  if (!product) {
    return (
      <div className="container-app py-16 text-center">
        <ShopLogoPlaceholder className="h-24 w-24" />
        <h1 className="mt-4 text-3xl font-black">Product not found</h1>
        <p className="mt-2 text-slate-500">
          This product may have been removed or is no longer available.
        </p>
        <Link
          to={storePath(tenantSlug, "/categories")}
          className="btn-primary mt-6 inline-flex"
        >
          Browse Collection
        </Link>
      </div>
    );
  }

  const media = [
    ...(product.images || []).map((m) => ({ ...m, mediaType: "image" })),
    ...(product.videos || []).map((m) => ({ ...m, mediaType: "video" })),
  ];
  const current = media[selected] || media[0];
  const selectedVariant =
    (product.variants || []).find(
      (v) => String(v._id) === String(selectedVariantId),
    ) || null;
  const displaySellingPrice =
    selectedVariant?.sellingPrice ?? product.sellingPrice;
  const displayDiscountedPrice =
    selectedVariant?.discountedPrice ?? product.discountedPrice;

  const seoDescription =
    product.seoDescription ||
    product.description ||
    `View ${product.name} at ${store?.settings?.shopName || "our fashion store"}.`;
  const seoImage = product.images?.[0]?.secureUrl || "";
  const seoPrice = displayDiscountedPrice ?? displaySellingPrice;
  const productSchema = {
    "@type": "Product",
    name: product.name,
    description: seoDescription,
    url: window.location.href.split("#")[0],
    ...(seoImage ? { image: [seoImage] } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.brand
      ? { brand: { "@type": "Brand", name: product.brand } }
      : {}),
    ...(product.category?.name ? { category: product.category.name } : {}),
    ...(product.isPriceVisible && Number.isFinite(Number(seoPrice))
      ? {
          offers: {
            "@type": "Offer",
            url: window.location.href.split("#")[0],
            priceCurrency: "INR",
            price: Number(seoPrice),
            availability: product.isAvailable
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/NewCondition",
          },
        }
      : {}),
  };
  return (
    <>
      <div className="container-app py-7 sm:py-10">
        <SEO
          title={
            product.seoTitle ||
            `${product.name} | ${store?.settings?.shopName || "Ladies Fashion"}`
          }
          description={seoDescription}
          image={seoImage}
          structuredData={productSchema}
        />
        <Link
          to={storePath(tenantSlug, "/categories")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:underline"
        >
          <ArrowLeft size={17} /> Back to Collection
        </Link>

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <div className="overflow-hidden rounded-[2rem] bg-slate-100">
              {current?.mediaType === "video" ? (
                <video
                  src={current.secureUrl}
                  controls
                  className="aspect-square w-full object-contain"
                />
              ) : current?.secureUrl ? (
                <img
                  loading="lazy"
                  src={current.secureUrl}
                  alt={product.name}
                  className="aspect-square w-full object-contain"
                />
              ) : (
                <div className="grid aspect-square place-items-center">
                  <ShopLogoPlaceholder className="h-2/3 w-2/3" />
                </div>
              )}
            </div>

            {media.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {media.map((m, i) => (
                  <button
                    key={`${m.publicId || m.secureUrl}-${i}`}
                    type="button"
                    onClick={() => setSelected(i)}
                    className={`relative overflow-hidden rounded-xl bg-slate-100 ring-2 ${selected === i ? "ring-slate-950" : "ring-transparent"}`}
                  >
                    {m.mediaType === "video" ? (
                      <div className="relative">
                        <video
                          src={m.secureUrl}
                          muted
                          preload="metadata"
                          className="aspect-square w-full object-cover"
                        />
                        <PlayCircle
                          className="absolute inset-0 m-auto text-white drop-shadow"
                          size={25}
                        />
                      </div>
                    ) : (
                      <img
                        loading="lazy"
                        src={m.secureUrl}
                        alt=""
                        className="aspect-square w-full object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap gap-2">
              {product.isTodaysOffer && (
                <span className="badge bg-rose-500 text-white">
                  🏷️ Today's Offer
                </span>
              )}
              {product.isMostDemanded && (
                <span className="badge bg-amber-300 text-slate-950">
                  🔥 Most Demanded
                </span>
              )}
              {!product.isAvailable && (
                <span className="badge bg-slate-900 text-white">
                  Out of Stock
                </span>
              )}
            </div>

            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">
              {product.category?.name || "Fashion"}
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              {product.name}
            </h1>
            {product.sku && (
              <p className="mt-2 text-sm text-slate-400">SKU: {product.sku}</p>
            )}

            {product.colors?.length > 0 && (
              <div className="mt-6">
                <h2 className="text-sm font-black">Available Colors</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.colors.map((color) => (
                    <span
                      key={color}
                      className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold"
                    >
                      {color}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {product.sizeChart && product.sizeChart.name && (
              <div className="mt-5 rounded-2xl border bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-black">
                      {product.sizeChart.name}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {product.sizeChart.description || "Size measurements"}
                    </p>
                  </div>
                </div>
                {Array.isArray(product.sizeChart.measurements) &&
                  product.sizeChart.measurements.length > 0 && (
                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="p-2">Measurement</th>
                            {(product.sizeChart.sizes || []).map((s) => (
                              <th key={s} className="p-2">
                                {s}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {product.sizeChart.measurements.map((m, i) => (
                            <tr key={i} className="border-b last:border-0">
                              <td className="p-2 font-bold">
                                {m.label}{" "}
                                <span className="font-normal text-slate-400">
                                  ({m.unit})
                                </span>
                              </td>
                              {(product.sizeChart.sizes || []).map((s) => (
                                <td key={s} className="p-2">
                                  {m.values?.[s] || "—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>
            )}

            {product.sizes?.length > 0 && (
              <div className="mt-5">
                <h2 className="text-sm font-black">Available Sizes</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <span
                      key={size}
                      className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold"
                    >
                      {size}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {product.variantEnabled && product.variants?.length > 0 && (
              <div className="mt-6">
                <h2 className="text-sm font-black">Choose Size / Color</h2>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {product.variants.map((v) => (
                    <button
                      key={v._id}
                      type="button"
                      onClick={() => setSelectedVariantId(String(v._id))}
                      className={`rounded-2xl border p-3 text-left ${String(selectedVariantId) === String(v._id) ? "border-slate-950 ring-2 ring-slate-950/10" : "border-slate-200"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold">
                          {[v.size, v.color].filter(Boolean).join(" • ") ||
                            "Standard"}
                        </span>
                        <span className="text-xs text-slate-400">
                          SKU {v.sku}
                        </span>
                      </div>
                      {product.isPriceVisible && (
                        <div className="mt-1 text-sm font-black">
                          {v.discountedPrice != null
                            ? money(v.discountedPrice)
                            : money(v.sellingPrice)}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-slate-500">
                        {v.stockQuantity} in stock
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5">
              {product.isPriceVisible ? (
                product.discountedPrice != null ? (
                  <div className="flex items-center gap-3">
                    <span className="text-lg text-slate-400 line-through">
                      {money(displaySellingPrice)}
                    </span>
                    <span className="text-3xl font-black">
                      {money(displayDiscountedPrice)}
                    </span>
                  </div>
                ) : (
                  <span className="text-3xl font-black">
                    {money(displaySellingPrice)}
                  </span>
                )
              ) : (
                <span className="font-bold">Visit Shop for Price</span>
              )}
            </div>

            {product.description && (
              <div className="mt-7">
                <h2 className="text-xl font-black">Description</h2>
                <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-600">
                  {product.description}
                </p>
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-2">
              {!product.isAvailable ? (
                <span className="rounded-2xl bg-slate-100 px-5 py-3 font-bold text-slate-500">
                  Currently unavailable
                </span>
              ) : (
                <>
                  <div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-1">
                    <button
                      type="button"
                      className="rounded-xl p-2"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      <Minus size={16} />
                    </button>
                    <span className="min-w-8 text-center font-black">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      className="rounded-xl p-2"
                      onClick={() => setQuantity((q) => q + 1)}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      if (product.variantEnabled && !selectedVariant)
                        return showAlert(
                          "Please select a size / color variant first.",
                        );
                      if (
                        selectedVariant &&
                        quantity > Number(selectedVariant.stockQuantity || 0)
                      )
                        return showAlert("Not enough stock for this variant.");
                      if (
                        !selectedVariant &&
                        quantity > Number(product.stockQuantity || 0)
                      )
                        return showAlert("Not enough stock.");
                      addItem(product, selectedVariant, quantity);
                      showAlert("Added to cart.");
                    }}
                  >
                    <ShoppingBag size={17} /> Add to Cart
                  </button>
                  <button
                    type="button"
                    className="btn-soft"
                    onClick={() => {
                      if (product.variantEnabled && !selectedVariant)
                        return showAlert(
                          "Please select a size / color variant first.",
                        );
                      if (
                        selectedVariant &&
                        quantity > Number(selectedVariant.stockQuantity || 0)
                      )
                        return showAlert("Not enough stock for this variant.");
                      if (
                        !selectedVariant &&
                        quantity > Number(product.stockQuantity || 0)
                      )
                        return showAlert("Not enough stock.");
                      addItem(product, selectedVariant, quantity);
                      navigate(storePath(tenantSlug, "/checkout"));
                    }}
                  >
                    Buy Now
                  </button>
                </>
              )}
              <button
                type="button"
                className="btn-soft w-full justify-center"
                onClick={() => setBookingOpen(true)}
                disabled={
                  !product.isAvailable ||
                  (product.variantEnabled && !selectedVariantId)
                }
              >
                <CalendarCheck size={18} /> Book to visit store
              </button>
              <p className="text-xs text-slate-500">
                Reserve this item for up to 24 hours. If you do not respond
                within 24 hours, the reservation is released automatically.
              </p>
              <Link to={storePath(tenantSlug, "/shop")} className="btn-soft">
                <MessageCircle size={17} /> Contact Store
              </Link>
            </div>
          </div>
        </div>
      </div>
      {bookingResult && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="text-xs font-bold uppercase tracking-wide text-emerald-600">
              Reservation confirmed
            </div>
            <h2 className="mt-2 text-2xl font-black">
              Booking {bookingResult.bookingNumber}
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Visit the store within 24 hours. If you do not respond within 24
              hours, this reservation will be released and the item becomes
              available again.
            </p>
            <button
              className="btn-primary mt-5 w-full justify-center"
              onClick={() => setBookingResult(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}
      {bookingOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase text-slate-400">
                  Book to visit store
                </div>
                <h2 className="mt-1 text-2xl font-black">{product.name}</h2>
              </div>
              <button
                className="btn-soft"
                onClick={() => setBookingOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="mt-5 grid gap-3">
              <input
                className="input"
                placeholder="Your name"
                value={bookingForm.customerName}
                onChange={(e) =>
                  setBookingForm((v) => ({
                    ...v,
                    customerName: e.target.value,
                  }))
                }
              />
              <input
                className="input"
                placeholder="Contact number"
                value={bookingForm.customerPhone}
                onChange={(e) =>
                  setBookingForm((v) => ({
                    ...v,
                    customerPhone: e.target.value,
                  }))
                }
              />
              <input
                className="input"
                type="email"
                placeholder="Email (optional)"
                value={bookingForm.email}
                onChange={(e) =>
                  setBookingForm((v) => ({ ...v, email: e.target.value }))
                }
              />
              <label className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                <input
                  type="checkbox"
                  checked={bookingForm.accepted}
                  onChange={(e) =>
                    setBookingForm((v) => ({
                      ...v,
                      accepted: e.target.checked,
                    }))
                  }
                />
                <span>
                  I agree that the shop may contact me about this item and I
                  accept the Terms and Privacy Policy. If there is no response
                  within 24 hours, the reservation may be released.
                </span>
              </label>
              <button
                className="btn-primary justify-center"
                disabled={bookingBusy}
                onClick={bookForStore}
              >
                {bookingBusy ? "Booking…" : "Confirm booking"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

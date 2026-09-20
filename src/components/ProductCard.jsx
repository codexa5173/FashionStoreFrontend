import { Link } from "react-router-dom";
import { PlayCircle } from "lucide-react";
import { discountPercent, money } from "../lib/utils";
import { storePath, useStore } from "../context/StoreContext";
import ShopLogoPlaceholder from "./ShopLogoPlaceholder";

export default function ProductCard({ product }) {
  const { tenantSlug } = useStore();
  const productPath = storePath(tenantSlug, `/products/${product.slug}`);
  const image = product.images?.[0]?.secureUrl;
  const off = discountPercent(product.sellingPrice, product.discountedPrice);

  return (
    <article
      className={`group flex h-full min-w-0 flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5 ${
        !product.isAvailable ? "opacity-75" : ""
      }`}
    >
      {/* IMAGE */}
      <Link to={productPath} className="block shrink-0">
        <div className="relative aspect-square overflow-hidden bg-slate-100">
          {image ? (
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid h-full place-items-center"><ShopLogoPlaceholder/></div>
          )}

          {/* BADGES */}
          <div className="absolute left-2.5 top-2.5 flex max-w-[90%] flex-wrap gap-1.5">
            {!product.isAvailable && (
              <span className="badge bg-slate-900 text-white">
                Out of Stock
              </span>
            )}

            {product.isTodaysOffer && (
              <span className="badge bg-rose-500 text-white">🏷️ Offer</span>
            )}

            {product.isMostDemanded && (
              <span className="badge bg-amber-300 text-slate-950">
                🔥 Popular
              </span>
            )}
          </div>

          {/* VIDEO INDICATOR */}
          {product.videos?.length > 0 && (
            <span className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow-sm">
              <PlayCircle size={18} />
            </span>
          )}
        </div>
      </Link>

      {/* CONTENT */}
      <div className="flex flex-1 flex-col p-4">
        {/* CATEGORY */}
        <p className="min-h-[32px] text-xs font-bold uppercase leading-4 tracking-wide text-slate-400">
          {product.category?.name || "Fashion"}
        </p>

        {/* PRODUCT NAME */}
        <Link
          to={productPath}
          className="mt-1 line-clamp-2 min-h-[48px] text-base font-bold leading-6 text-slate-950 hover:underline"
        >
          {product.name}
        </Link>

        {/* PRICE */}
        <div className="mt-3 min-h-[58px]">
          {product.isPriceVisible ? (
            product.discountedPrice != null ? (
              <div className="flex min-h-[58px] flex-wrap content-start items-center gap-x-2 gap-y-1">
                <span className="text-sm text-slate-400 line-through">
                  {money(product.sellingPrice)}
                </span>

                <span className="text-lg font-black text-slate-950">
                  {money(product.discountedPrice)}
                </span>

                {off > 0 && (
                  <span className="badge bg-emerald-500">{off}% OFF</span>
                )}
              </div>
            ) : (
              <div className="flex min-h-[58px] items-center">
                <span className="text-lg font-black text-slate-950">
                  {money(product.sellingPrice)}
                </span>
              </div>
            )
          ) : (
            <div className="flex min-h-[58px] items-center">
              <span className="text-sm font-bold text-slate-950">
                Visit Shop for Price
              </span>
            </div>
          )}
        </div>

        {/* BUTTON ALWAYS AT BOTTOM */}
        <div className="mt-auto pt-3">
          <Link
            to={productPath}
            className="btn-soft flex w-full"
          >
            View Details
          </Link>
        </div>
      </div>
    </article>
  );
}

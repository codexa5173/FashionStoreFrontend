import { useStore } from "../context/StoreContext";
export default function ShopLogoPlaceholder({ className="h-full w-full", rounded="rounded-2xl" }) {
 const { store } = useStore();
 const logo = store?.settings?.branding?.logo?.secureUrl || store?.settings?.logo?.secureUrl || store?.tenant?.logo?.secureUrl;
 return logo ? <img loading="lazy" src={logo} alt={store?.tenant?.name || "Shop"} className={`${className} ${rounded} object-contain bg-white p-3`} /> : <span className="text-5xl" aria-hidden="true">👗</span>;
}

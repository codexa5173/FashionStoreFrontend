import SEO from "../components/SEO";
import { useStore } from "../context/StoreContext";

export default function ReturnPolicy() {
  const { store } = useStore();
  const s = store?.settings || {};
  const name = s.shopName || store?.tenant?.name || "Ladies Fashion Store";
  const custom = s.policies?.returnPolicy?.trim();
  return <div className="container-app py-10"><SEO title={`Return Policy | ${name}`} description={`Return policy for ${name}.`} /><article className="prose max-w-3xl"><h1>Return Policy</h1>{custom ? <div className="whitespace-pre-wrap">{custom}</div> : <><p>Please review the return conditions before placing an order with {name}.</p><h2>Online orders</h2><p className="font-bold">Online orders are not eligible for return or cancellation after submission.</p><p>If you need assistance with an online order, please contact the store or visit the physical store.</p><h2>Store purchases</h2><p>Return or exchange conditions for in-store purchases are handled according to the store's applicable policy.</p></>}</article></div>;
}

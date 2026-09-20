import SEO from "../components/SEO";
import { useStore } from "../context/StoreContext";

export default function ShippingInformation() {
  const { store } = useStore();
  const s = store?.settings || {};
  const name = s.shopName || store?.tenant?.name || "Ladies Fashion Store";
  const custom = s.policies?.shippingInformation?.trim();
  return <div className="container-app py-10"><SEO title={`Shipping Information | ${name}`} description={`Shipping information for ${name}.`} /><article className="prose max-w-3xl"><h1>Shipping Information</h1>{custom ? <div className="whitespace-pre-wrap">{custom}</div> : <><p>Shipping arrangements for {name} depend on the delivery address, courier availability and order confirmation.</p><h2>Order processing</h2><p>After payment is confirmed, the shop starts processing the order. The shop may contact you to confirm payment and delivery details.</p><h2>Tracking</h2><p>When a courier tracking ID is assigned, you can use the tracking ID and the courier link shown in your order tracking page to follow delivery progress.</p><h2>Need help?</h2><p>Contact the store using the contact details shown on the Shop Details page.</p></>}</article></div>;
}

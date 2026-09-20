import SEO from "../components/SEO";
import { useStore } from "../context/StoreContext";

export default function Terms() {
  const { store } = useStore();
  const s = store?.settings || {};
  const name = s.shopName || store?.tenant?.name || "Ladies Fashion Store";
  const custom = s.policies?.terms?.trim();
  return <div className="container-app py-10"><SEO title={`Terms & Conditions | ${name}`} description={`Terms and conditions for ${name}.`}/><article className="prose max-w-3xl">
    <h1>Terms & Conditions</h1>
    {custom ? <div className="whitespace-pre-wrap">{custom}</div> : <><p>Welcome to {name}. This website provides product and shop information.</p><h2>Product information</h2><p>Prices, availability, images, colors, sizes and offers may change. Please confirm product details with the shop before purchase.</p><h2>Website use</h2><p>Please use the website lawfully and do not attempt to disrupt, abuse or gain unauthorized access to the service.</p></>}
  </article></div>;
}

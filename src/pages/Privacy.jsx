import SEO from "../components/SEO";
import { useStore } from "../context/StoreContext";

export default function Privacy() {
  const { store } = useStore();
  const s = store?.settings || {};
  const name = s.shopName || store?.tenant?.name || "Ladies Fashion Store";
  const custom = s.policies?.privacy?.trim();
  return <div className="container-app py-10"><SEO title={`Privacy Policy | ${name}`} description={`Privacy policy for ${name}.`}/><article className="prose max-w-3xl">
    <h1>Privacy Policy</h1>
    {custom ? <div className="whitespace-pre-wrap">{custom}</div> : <><p>{name} respects your privacy.</p><h2>Information we receive</h2><p>Contact details voluntarily provided through the shop are used to respond to enquiries and provide requested services.</p><h2>Storage</h2><p>The website may use browser storage to improve loading speed and remember preferences.</p></>}
  </article></div>;
}

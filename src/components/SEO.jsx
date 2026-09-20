import { useEffect } from "react";
import { useStore } from "../context/StoreContext";

function setMeta(name, content, attr = "name") {
  if (content === undefined || content === null || content === "") return;
  let el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", String(content));
}

function absoluteUrl(value) {
  if (!value) return "";
  try { return new URL(value, window.location.origin).href; } catch { return String(value); }
}

function upsertLink(id, rel, href) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("link");
    el.id = id;
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
  return el;
}

export default function SEO({
  title,
  description,
  canonical,
  image,
  type = "website",
  noindex = false,
  structuredData = null
}) {
  const { store } = useStore();
  const shopName = store?.settings?.shopName || store?.tenant?.name || "Ladies Fashion Store";
  const desc = description || store?.settings?.description || `Discover beautiful ladies fashion at ${shopName}.`;
  const logo = absoluteUrl(image || store?.settings?.branding?.logo?.secureUrl || store?.settings?.logo?.secureUrl || store?.tenant?.logo?.secureUrl || "");
  const finalTitle = title || shopName;
  const defaultCanonical = window.location.href.split("#")[0];
  const finalCanonical = canonical ? absoluteUrl(canonical) : defaultCanonical;

  useEffect(() => {
    document.title = finalTitle;
    setMeta("description", desc);
    setMeta("robots", noindex ? "noindex,nofollow" : "index,follow");
    setMeta("og:title", finalTitle, "property");
    setMeta("og:description", desc, "property");
    setMeta("og:type", type, "property");
    setMeta("og:url", finalCanonical, "property");
    setMeta("twitter:card", logo ? "summary_large_image" : "summary");
    setMeta("twitter:title", finalTitle);
    setMeta("twitter:description", desc);
    if (logo) {
      setMeta("og:image", logo, "property");
      setMeta("twitter:image", logo);
    }

    upsertLink("seo-canonical", "canonical", finalCanonical);

    const schemaId = "store-seo-jsonld";
    let script = document.getElementById(schemaId);
    if (!script) {
      script = document.createElement("script");
      script.id = schemaId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }

    const baseSchema = {
      "@context": "https://schema.org",
      "@type": "ClothingStore",
      name: shopName,
      description: desc,
      url: finalCanonical,
      ...(logo ? { image: logo, logo } : {}),
      ...(store?.settings?.contact?.address || store?.settings?.address ? {
        address: { "@type": "PostalAddress", streetAddress: store.settings.contact?.address || store.settings.address }
      } : {}),
      ...(store?.settings?.contact?.phone || store?.settings?.phone ? { telephone: store.settings.contact?.phone || store.settings.phone } : {}),
      ...(store?.settings?.contact?.email ? { email: store.settings.contact.email } : {})
    };
    const payload = structuredData
      ? (Array.isArray(structuredData) ? { "@context": "https://schema.org", "@graph": [baseSchema, ...structuredData] } : { "@context": "https://schema.org", "@graph": [baseSchema, structuredData] })
      : baseSchema;
    script.textContent = JSON.stringify(payload);

    return () => script?.remove();
  }, [finalTitle, desc, finalCanonical, logo, type, noindex, shopName, store, structuredData]);

  return null;
}

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useStore } from "./StoreContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { tenantSlug } = useStore();
  const storageKey = `noorie:cart:${tenantSlug || "default"}`;
  const [items, setItems] = useState([]);

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(storageKey) || "[]")); }
    catch { setItems([]); }
  }, [storageKey]);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(items)); } catch {}
  }, [storageKey, items]);

  const addItem = (product, variant = null, quantity = 1) => {
    const price = variant?.discountedPrice ?? product.discountedPrice ?? product.sellingPrice ?? 0;
    const key = `${product._id}:${variant?._id || ""}`;
    setItems(current => {
      const found = current.find(i => i.key === key);
      if (found) return current.map(i => i.key === key ? { ...i, quantity: i.quantity + quantity } : i);
      return [...current, {
        key, product: product._id, variant: variant?._id || null, name: product.name,
        image: product.images?.[0]?.secureUrl || "", sku: variant?.sku || product.sku || "",
        size: variant?.size || "", color: variant?.color || "",
        unitPrice: Number(price), quantity
      }];
    });
  };

  const removeItem = key => setItems(current => current.filter(i => i.key !== key));
  const updateQuantity = (key, quantity) => setItems(current => current.map(i => i.key === key ? { ...i, quantity: Math.max(1, Math.floor(Number(quantity) || 1)) } : i));
  const clear = () => setItems([]);
  const subtotal = useMemo(() => items.reduce((sum, i) => sum + Number(i.unitPrice || 0) * Number(i.quantity || 0), 0), [items]);
  const count = useMemo(() => items.reduce((sum, i) => sum + Number(i.quantity || 0), 0), [items]);

  return <CartContext.Provider value={{ items, count, subtotal, addItem, removeItem, updateQuantity, clear }}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext) || { items: [], count: 0, subtotal: 0, addItem() {}, removeItem() {}, updateQuantity() {}, clear() {} };
}

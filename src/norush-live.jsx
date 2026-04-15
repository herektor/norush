import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════════
   SUPABASE CONNECTION
═══════════════════════════════════════════════════════════════════ */
const SUPABASE_URL = "https://eslxeqhrlalocofesogj.supabase.co";
const SUPABASE_KEY = "sb_publishable_SOLnrfEa0I_8YCmOyVd6nQ_no9yv-OV";

async function db(table, method = "GET", body = null, filters = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${filters}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "",
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("DB error:", err);
    return null;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Real-time subscription via Supabase websocket
function subscribeToOrders(onChange) {
  const ws = new WebSocket(
    `wss://eslxeqhrlalocofesogj.supabase.co/realtime/v1/websocket?apikey=${SUPABASE_KEY}&vsn=1.0.0`
  );
  ws.onopen = () => {
    ws.send(JSON.stringify({ topic: "realtime:public:orders", event: "phx_join", payload: {}, ref: "1" }));
  };
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.event === "postgres_changes" || msg.payload?.data) onChange();
  };
  ws.onerror = (e) => console.log("WS error", e);
  return () => ws.close();
}

/* ═══════════════════════════════════════════════════════════════════
   THEME
═══════════════════════════════════════════════════════════════════ */
const C = {
  bg: "#0A0A0F", sf: "#13131A", hi: "#1E1E2A", br: "#2A2A38",
  ac: "#FF3B2F", tx: "#F0EDF8", mu: "#6A6A88", gr: "#00C896",
  yw: "#FFB800", bl: "#3B82F6",
};
const L = {
  bg: "#F7F4EE", sf: "#FFFFFF", hi: "#EDEAD4", br: "#E0DDD4",
  ac: "#FF3B2F", tx: "#1A1714", mu: "#8A8480", gr: "#1A9E5C",
};

/* ═══════════════════════════════════════════════════════════════════
   MAP — Real Lauttasaari coordinates using Leaflet
═══════════════════════════════════════════════════════════════════ */
function LeafletMap({ restaurant, customerLat, customerLng, courierLat, courierLng, height = 220 }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    if (mapInstance.current) return;

    // Load Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = () => {
      const L = window.L;
      const map = L.map(mapRef.current, { zoomControl: false }).setView(
        [restaurant?.lat || 60.1575, restaurant?.lng || 24.8855], 14
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Restaurant marker
      if (restaurant) {
        const icon = L.divIcon({
          html: `<div style="background:#FF3B2F;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🍽</div>`,
          className: "", iconSize: [36, 36], iconAnchor: [18, 18],
        });
        markersRef.current.restaurant = L.marker([restaurant.lat, restaurant.lng], { icon })
          .addTo(map)
          .bindPopup(`<b>${restaurant.name}</b>`);
      }

      // Customer marker
      if (customerLat && customerLng) {
        const icon = L.divIcon({
          html: `<div style="background:#FF3B2F;color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3)">📍</div>`,
          className: "", iconSize: [32, 32], iconAnchor: [16, 16],
        });
        markersRef.current.customer = L.marker([customerLat, customerLng], { icon })
          .addTo(map).bindPopup("Your address");
      }

      // Courier marker
      if (courierLat && courierLng) {
        const icon = L.divIcon({
          html: `<div style="background:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 3px 10px rgba(0,0,0,0.25)">🛵</div>`,
          className: "", iconSize: [36, 36], iconAnchor: [18, 18],
        });
        markersRef.current.courier = L.marker([courierLat, courierLng], { icon })
          .addTo(map).bindPopup("Your courier");
      }

      mapInstance.current = map;
    };
    document.head.appendChild(script);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Update courier position live
  useEffect(() => {
    if (!mapInstance.current || !window.L) return;
    if (courierLat && courierLng) {
      if (markersRef.current.courier) {
        markersRef.current.courier.setLatLng([courierLat, courierLng]);
      } else {
        const icon = window.L.divIcon({
          html: `<div style="background:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 3px 10px rgba(0,0,0,0.25)">🛵</div>`,
          className: "", iconSize: [36, 36], iconAnchor: [18, 18],
        });
        markersRef.current.courier = window.L.marker([courierLat, courierLng], { icon })
          .addTo(mapInstance.current).bindPopup("Your courier");
      }
    }
  }, [courierLat, courierLng]);

  return <div ref={mapRef} style={{ height, width: "100%", borderRadius: 0 }} />;
}

/* ═══════════════════════════════════════════════════════════════════
   STATUS HELPERS
═══════════════════════════════════════════════════════════════════ */
const STATUS_META = {
  new:          { label: "New Order",       short: "New",       color: "#E74C3C", bg: "#FDEDEC" },
  accepted:     { label: "Accepted",        short: "Accepted",  color: "#2980B9", bg: "#EBF5FB" },
  heading_to_restaurant: { label: "Courier en route", short: "En route", color: "#1ABC9C", bg: "#E8F8F5" },
  preparing:    { label: "Preparing",       short: "Cooking",   color: "#E67E22", bg: "#FEF9E7" },
  ready:        { label: "Ready",           short: "Ready",     color: "#8E44AD", bg: "#F5EEF8" },
  picked_up:    { label: "On the way",      short: "Delivering",color: "#3B82F6", bg: "#EBF5FB" },
  delivered:    { label: "Delivered!",      short: "Done",      color: "#27AE60", bg: "#EAFAF1" },
};

function SBadge({ status }) {
  const m = STATUS_META[status] || { label: status, short: status, color: "#888", bg: "#eee" };
  return (
    <span style={{ background: m.bg, color: m.color, fontSize: 10, fontWeight: 800,
      padding: "2px 8px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.04em",
      display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.color,
        ...( ["new","preparing"].includes(status) ? { animation: "blink 1.2s infinite" } : {}) }} />
      {m.short}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CUSTOMER APP
═══════════════════════════════════════════════════════════════════ */
function CustomerApp({ onOrderPlaced, activeOrder, refreshOrder }) {
  const [scr, setScr] = useState("home");
  const [restaurants, setRestaurants] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [rest, setRest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("Aino K.");
  const [address, setAddress] = useState("Lauttasaarentie 8, Helsinki");
  // Lauttasaari customer coords
  const customerLat = 60.1560;
  const customerLng = 24.8820;

  useEffect(() => {
    db("restaurants", "GET", null, "?is_active=eq.true&select=*").then(data => {
      if (data) setRestaurants(data);
    });
  }, []);

  useEffect(() => {
    if (activeOrder && scr !== "track") setScr("track");
  }, [activeOrder]);

  const loadMenu = async (r) => {
    setRest(r);
    const items = await db("menu_items", "GET", null, `?restaurant_id=eq.${r.id}&is_available=eq.true&select=*`);
    if (items) setMenuItems(items);
    setScr("menu");
  };

  const addC = (item) => setCart(p => {
    const ex = p.find(i => i.id === item.id);
    return ex ? p.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i) : [...p, { ...item, qty: 1 }];
  });
  const remC = (id) => setCart(p => p.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i).filter(i => i.qty > 0));
  const qty = (id) => cart.find(i => i.id === id)?.qty || 0;
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const deliveryFee = rest ? parseFloat(rest.delivery_fee || 1.90) : 1.90;
  const total = subtotal + deliveryFee;
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const placeOrder = async () => {
    setLoading(true);
    const orderItems = cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty }));
    const order = await db("orders", "POST", {
      restaurant_id: rest.id,
      customer_name: name,
      customer_address: address,
      customer_lat: customerLat,
      customer_lng: customerLng,
      items: orderItems,
      subtotal,
      delivery_fee: deliveryFee,
      total,
      status: "new",
      pay_method: "card",
    });
    setLoading(false);
    if (order && order[0]) {
      onOrderPlaced(order[0]);
      setCart([]);
      setScr("track");
    }
  };

  /* HOME */
  if (scr === "home") return (
    <div style={{ background: C.bg, height: "100%", overflowY: "auto", color: C.tx, fontFamily: "inherit" }}>
      <div style={{ padding: "16px 14px 0" }}>
        <div style={{ fontSize: 10, color: C.mu, marginBottom: 3 }}>📍 Lauttasaari, Helsinki</div>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.5px", lineHeight: 1.2, marginBottom: 12 }}>
          Hungry?<br /><span style={{ color: C.ac }}>Order now.</span>
        </div>
        <div style={{ background: `linear-gradient(130deg,${C.ac},#FF6535)`, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.8 }}>Lauttasaari pilot</div>
          <div style={{ fontSize: 15, fontWeight: 900, marginTop: 2 }}>Free delivery — first order</div>
          <div style={{ fontSize: 10, fontWeight: 700, marginTop: 5, background: "rgba(0,0,0,0.2)", display: "inline-block", padding: "2px 9px", borderRadius: 20 }}>NORUSHTRY</div>
        </div>
      </div>
      <div style={{ padding: "0 14px 40px" }}>
        <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 8, color: C.mu, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {restaurants.length === 0 ? "Loading restaurants..." : `${restaurants.length} restaurant${restaurants.length !== 1 ? "s" : ""} nearby`}
        </div>
        {restaurants.map(r => (
          <div key={r.id} onClick={() => loadMenu(r)}
            style={{ background: C.sf, borderRadius: 12, overflow: "hidden", marginBottom: 8, cursor: "pointer", border: `1px solid ${C.br}`, transition: "transform 0.1s" }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.01)"}
            onMouseLeave={e => e.currentTarget.style.transform = ""}>
            <div style={{ height: 56, background: `linear-gradient(135deg,#FF3B2F44,#FF6B3522)`, display: "flex", alignItems: "center", gap: 12, padding: "0 14px" }}>
              <span style={{ fontSize: 32 }}>🍽</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>{r.name}</div>
                <div style={{ color: C.mu, fontSize: 10 }}>{r.cuisine} · {r.address}</div>
              </div>
            </div>
            <div style={{ padding: "8px 14px", display: "flex", gap: 12, fontSize: 10, color: C.mu }}>
              <span>⏱ 25–35 min</span>
              <span>🛵 €{deliveryFee.toFixed(2)} delivery</span>
              <span style={{ color: C.gr }}>● Open now</span>
            </div>
          </div>
        ))}
        {restaurants.length === 0 && (
          <div style={{ textAlign: "center", padding: 30, color: C.mu, fontSize: 12 }}>
            Connecting to database...
          </div>
        )}
      </div>
    </div>
  );

  /* MENU */
  if (scr === "menu") return (
    <div style={{ background: C.bg, height: "100%", overflowY: "auto", color: C.tx, fontFamily: "inherit", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, background: C.bg, position: "sticky", top: 0, zIndex: 5, borderBottom: `1px solid ${C.br}` }}>
        <button onClick={() => setScr("home")} style={{ background: C.hi, border: "none", color: C.tx, width: 30, height: 30, borderRadius: 7, cursor: "pointer", fontSize: 15 }}>‹</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 13 }}>{rest?.name}</div>
          <div style={{ fontSize: 10, color: C.mu }}>{rest?.address}</div>
        </div>
      </div>
      <div style={{ flex: 1, padding: "10px 12px", paddingBottom: cartCount > 0 ? 75 : 20 }}>
        {menuItems.length === 0 && <div style={{ textAlign: "center", padding: 30, color: C.mu }}>Loading menu...</div>}
        {/* Group by category */}
        {[...new Set(menuItems.map(i => i.category))].map(cat => (
          <div key={cat}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.mu, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, marginTop: 12 }}>{cat}</div>
            {menuItems.filter(i => i.category === cat).map(item => {
              const q = qty(item.id);
              return (
                <div key={item.id} style={{ background: C.sf, borderRadius: 10, padding: "10px 12px", marginBottom: 7, display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${q > 0 ? C.ac + "55" : C.br}` }}>
                  <div style={{ flex: 1, marginRight: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{item.name}</div>
                    <div style={{ color: C.mu, fontSize: 10, marginTop: 1 }}>{item.description}</div>
                    {item.allergens?.length > 0 && <div style={{ fontSize: 9, color: C.mu, marginTop: 2 }}>⚠️ {item.allergens.join(", ")}</div>}
                    <div style={{ color: C.ac, fontWeight: 800, fontSize: 12, marginTop: 4 }}>€{item.price.toFixed(2)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {q > 0 && <><button onClick={() => remC(item.id)} style={{ width: 24, height: 24, borderRadius: 6, background: C.hi, border: "none", color: C.tx, cursor: "pointer", fontSize: 15, fontFamily: "inherit" }}>−</button><span style={{ fontWeight: 800, fontSize: 12, minWidth: 10, textAlign: "center" }}>{q}</span></>}
                    <button onClick={() => addC(item)} style={{ width: 24, height: 24, borderRadius: 6, background: C.ac, border: "none", color: "#fff", cursor: "pointer", fontSize: 15, fontFamily: "inherit" }}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {cartCount > 0 && (
        <div style={{ position: "sticky", bottom: 0, padding: "7px 12px 14px", background: C.bg + "F5", borderTop: `1px solid ${C.br}` }}>
          <button onClick={() => setScr("checkout")} style={{ width: "100%", background: C.ac, color: "#fff", border: "none", borderRadius: 10, padding: "11px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", justifyContent: "space-between", fontFamily: "inherit" }}>
            <span style={{ background: "rgba(0,0,0,0.2)", borderRadius: 5, padding: "1px 7px" }}>{cartCount}</span>
            <span>Checkout</span>
            <span>€{subtotal.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  );

  /* CHECKOUT */
  if (scr === "checkout") return (
    <div style={{ background: C.bg, height: "100%", overflowY: "auto", color: C.tx, fontFamily: "inherit" }}>
      <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.br}` }}>
        <button onClick={() => setScr("menu")} style={{ background: C.hi, border: "none", color: C.tx, width: 30, height: 30, borderRadius: 7, cursor: "pointer", fontSize: 15 }}>‹</button>
        <div style={{ fontWeight: 800, fontSize: 13 }}>Checkout</div>
      </div>
      <div style={{ padding: "12px 12px 90px" }}>
        <div style={{ background: C.sf, borderRadius: 10, padding: "10px 12px", marginBottom: 8, border: `1px solid ${C.br}` }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: C.mu, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Your name</div>
          <input value={name} onChange={e => setName(e.target.value)} style={{ background: "none", border: "none", outline: "none", color: C.tx, fontSize: 13, fontWeight: 700, width: "100%", fontFamily: "inherit" }} />
        </div>
        <div style={{ background: C.sf, borderRadius: 10, padding: "10px 12px", marginBottom: 8, border: `1px solid ${C.br}` }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: C.mu, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Delivering to</div>
          <input value={address} onChange={e => setAddress(e.target.value)} style={{ background: "none", border: "none", outline: "none", color: C.tx, fontSize: 13, fontWeight: 700, width: "100%", fontFamily: "inherit" }} />
        </div>
        <div style={{ background: C.sf, borderRadius: 10, padding: "10px 12px", marginBottom: 8, border: `1px solid ${C.br}` }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: C.mu, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Order · {rest?.name}</div>
          {cart.map(i => <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.mu, marginBottom: 5 }}><span>{i.qty}× {i.name}</span><span style={{ color: C.tx, fontWeight: 600 }}>€{(i.price * i.qty).toFixed(2)}</span></div>)}
          <div style={{ borderTop: `1px solid ${C.br}`, paddingTop: 7, marginTop: 3 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.mu, marginBottom: 4 }}><span>Delivery</span><span>€{deliveryFee.toFixed(2)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: 13 }}><span>Total</span><span style={{ color: C.ac }}>€{total.toFixed(2)}</span></div>
          </div>
        </div>
        <div style={{ background: C.sf, borderRadius: 10, padding: "10px 12px", border: `1px solid ${C.br}` }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: C.mu, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Payment</div>
          <div style={{ fontWeight: 700, fontSize: 12 }}>💳 Test mode — no real charge</div>
        </div>
      </div>
      <div style={{ position: "sticky", bottom: 0, padding: "7px 12px 14px", background: C.bg + "F5", borderTop: `1px solid ${C.br}` }}>
        <button onClick={placeOrder} disabled={loading} style={{ width: "100%", background: loading ? C.mu : C.ac, color: "#fff", border: "none", borderRadius: 10, padding: "13px 14px", fontSize: 13, fontWeight: 900, cursor: loading ? "not-allowed" : "pointer", display: "flex", justifyContent: "space-between", fontFamily: "inherit" }}>
          <span>{loading ? "Placing order..." : "Place order 🚀"}</span>
          <span>€{total.toFixed(2)}</span>
        </button>
      </div>
    </div>
  );

  /* TRACKING */
  if (scr === "track" && activeOrder) {
    const si = Object.keys(STATUS_META).indexOf(activeOrder.status);
    const isDone = activeOrder.status === "delivered";
    return (
      <div style={{ background: C.bg, height: "100%", overflowY: "auto", color: C.tx, fontFamily: "inherit" }}>
        <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.br}` }}>
          <div style={{ fontWeight: 800, fontSize: 13, flex: 1 }}>Live tracking</div>
          <SBadge status={activeOrder.status} />
          <button onClick={refreshOrder} style={{ background: C.hi, border: "none", color: C.mu, padding: "4px 8px", borderRadius: 6, cursor: "pointer", fontSize: 10, fontFamily: "inherit" }}>↻ Refresh</button>
        </div>

        {/* REAL MAP */}
        <LeafletMap
          restaurant={restaurants.find(r => r.id === activeOrder.restaurant_id) || { lat: 60.1575, lng: 24.8855, name: activeOrder.restaurant_name }}
          customerLat={activeOrder.customer_lat}
          customerLng={activeOrder.customer_lng}
          courierLat={activeOrder.courier_lat}
          courierLng={activeOrder.courier_lng}
          height={200}
        />

        <div style={{ padding: "10px 12px" }}>
          <div style={{ background: isDone ? C.gr + "18" : C.ac + "18", border: `1px solid ${isDone ? C.gr + "44" : C.ac + "44"}`, borderRadius: 12, padding: "12px 14px", display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: isDone ? C.gr : C.ac, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
              {isDone ? "🎉" : activeOrder.status === "picked_up" ? "🛵" : activeOrder.status === "preparing" ? "👨‍🍳" : "✓"}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{STATUS_META[activeOrder.status]?.label || activeOrder.status}</div>
              <div style={{ fontSize: 10, color: C.mu, marginTop: 2 }}>Order #{activeOrder.id?.slice(0, 8)}</div>
            </div>
          </div>

          {/* Progress */}
          <div style={{ background: C.sf, borderRadius: 10, padding: "10px 12px", marginBottom: 10, border: `1px solid ${C.br}` }}>
            {Object.entries(STATUS_META).map(([s, m], i) => {
              const currentIdx = Object.keys(STATUS_META).indexOf(activeOrder.status);
              const done = i < currentIdx, active = i === currentIdx;
              return (
                <div key={s} style={{ display: "flex", gap: 8, marginBottom: i < Object.keys(STATUS_META).length - 1 ? 8 : 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: done ? C.gr : active ? C.ac : C.hi, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", flexShrink: 0, transition: "background 0.3s" }}>{done ? "✓" : i + 1}</div>
                    {i < Object.keys(STATUS_META).length - 1 && <div style={{ width: 2, height: 8, marginTop: 1, background: done ? C.gr : C.br }} />}
                  </div>
                  <div style={{ paddingTop: 1 }}><div style={{ fontSize: 11, fontWeight: active ? 800 : 400, color: active ? C.tx : done ? C.mu : "#444" }}>{m.label}</div></div>
                </div>
              );
            })}
          </div>

          <div style={{ background: C.sf, borderRadius: 10, padding: "10px 12px", border: `1px solid ${C.br}`, marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 8 }}>Order summary</div>
            {activeOrder.items?.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.mu, marginBottom: 4 }}>
                <span>{item.qty}× {item.name}</span>
                <span>€{(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${C.br}`, paddingTop: 6, marginTop: 4, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 12 }}>
              <span>Total</span><span style={{ color: C.ac }}>€{activeOrder.total?.toFixed(2)}</span>
            </div>
          </div>

          {isDone && (
            <button onClick={() => { setScr("home"); }} style={{ width: "100%", background: C.gr, color: "#fff", border: "none", borderRadius: 10, padding: 12, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
              Order again 🔄
            </button>
          )}
        </div>
      </div>
    );
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   RESTAURANT DASHBOARD
═══════════════════════════════════════════════════════════════════ */
function RestaurantDash({ orders, refreshOrders }) {
  const [sel, setSel] = useState(null);
  const [updating, setUpdating] = useState(null);
  const D = L;

  const STATUS_NEXT = {
    new: "accepted",
    accepted: "preparing",
    preparing: "ready",
    heading_to_restaurant: "ready",
  };
  const BTN_LABEL = {
    new: "✓ Accept order",
    accepted: "🍳 Start cooking",
    preparing: "🔔 Mark ready",
    heading_to_restaurant: "🔔 Mark ready",
  };

  async function advance(order) {
    const next = STATUS_NEXT[order.status];
    if (!next) return;
    setUpdating(order.id);
    await db("orders", "PATCH", { status: next }, `?id=eq.${order.id}`);
    await refreshOrders();
    setUpdating(null);
  }

  const selected = orders.find(o => o.id === sel);
  const newCount = orders.filter(o => o.status === "new").length;
  const revenue = orders.filter(o => o.status === "delivered").reduce((s, o) => s + (o.total || 0), 0);

  return (
    <div style={{ background: D.bg, height: "100%", display: "flex", flexDirection: "column", fontFamily: "inherit", color: D.tx }}>
      <div style={{ padding: "10px 12px", background: D.sf, borderBottom: `1px solid ${D.br}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: D.ac, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🍽</div>
          <div><div style={{ fontWeight: 900, fontSize: 12 }}>Restaurant Panel</div><div style={{ fontSize: 9, color: D.mu }}>Lauttasaari</div></div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button onClick={refreshOrders} style={{ background: D.hi, border: "none", borderRadius: 7, padding: "4px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer", color: D.mu, fontFamily: "inherit" }}>↻ Refresh</button>
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#EAFAF1", color: D.gr, padding: "3px 8px", borderRadius: 20, fontSize: 9, fontWeight: 800 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: D.gr, animation: "blink 2s infinite" }} />Open
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 5, padding: "7px 10px", background: D.sf, borderBottom: `1px solid ${D.br}`, flexShrink: 0 }}>
        {[{ l: "Revenue", v: `€${revenue.toFixed(0)}`, c: D.gr, bg: "#EAFAF1" }, { l: "New", v: newCount, c: D.ac, bg: "#FDEDEC" }, { l: "Active", v: orders.filter(o => !["delivered"].includes(o.status)).length, c: "#2980B9", bg: "#EBF5FB" }, { l: "Total", v: orders.length, c: D.mu, bg: D.hi }].map(k => (
          <div key={k.l} style={{ flex: 1, background: k.bg, borderRadius: 7, padding: "5px 7px" }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: k.c }}>{k.v}</div>
            <div style={{ fontSize: 8, fontWeight: 800, color: k.c, textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.l}</div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {/* Order list */}
        <div style={{ width: 175, borderRight: `1px solid ${D.br}`, overflowY: "auto" }}>
          {orders.length === 0 && <div style={{ padding: 16, textAlign: "center", color: D.mu, fontSize: 10 }}>No orders yet.<br />Waiting...</div>}
          {orders.map(o => {
            const isNew = o.status === "new";
            const isSel = sel === o.id;
            return (
              <div key={o.id} onClick={() => setSel(o.id)} style={{ padding: "8px 10px", borderBottom: `1px solid ${D.br}`, cursor: "pointer", background: isSel ? D.ac + "0F" : "transparent", borderLeft: `3px solid ${isSel ? D.ac : isNew ? D.ac + "66" : "transparent"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontWeight: 900, fontSize: 11 }}>#{o.id?.slice(0, 6)}</span>
                  <SBadge status={o.status} />
                </div>
                <div style={{ fontSize: 10, color: D.mu, marginBottom: 3 }}>{o.customer_name}</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                  <span style={{ color: D.mu }}>{o.items?.length || 0} items</span>
                  <span style={{ fontWeight: 700 }}>€{o.total?.toFixed(2)}</span>
                </div>
                {STATUS_NEXT[o.status] && (
                  <button onClick={e => { e.stopPropagation(); advance(o); }} disabled={updating === o.id} style={{ width: "100%", marginTop: 5, padding: "4px 0", background: isNew ? D.ac : "#333", color: "#fff", border: "none", borderRadius: 5, fontSize: 9, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", opacity: updating === o.id ? 0.6 : 1 }}>
                    {updating === o.id ? "..." : BTN_LABEL[o.status]} →
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Detail */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
          {!selected ? (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: D.mu, gap: 7 }}>
              <div style={{ fontSize: 32 }}>📋</div>
              <div style={{ fontWeight: 700, fontSize: 12 }}>Select an order</div>
              <div style={{ fontSize: 10, textAlign: "center" }}>Real orders from customers<br />appear here instantly</div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div><div style={{ fontWeight: 900, fontSize: 14 }}>Order #{selected.id?.slice(0, 8)}</div><div style={{ fontSize: 10, color: D.mu }}>{selected.customer_name} · {selected.customer_address}</div></div>
                <SBadge status={selected.status} />
              </div>
              <div style={{ display: "flex", gap: 2, marginBottom: 10 }}>
                {Object.keys(STATUS_META).map((s, i) => { const idx = Object.keys(STATUS_META).indexOf(selected.status); return (<div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= idx ? (i === idx ? D.ac : D.gr) : D.br }} />); })}
              </div>
              <div style={{ background: D.hi, borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
                <div style={{ fontSize: 8, fontWeight: 800, color: D.mu, textTransform: "uppercase", marginBottom: 6 }}>Items</div>
                {selected.items?.map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: D.mu }}>{item.qty}× {item.name}</span>
                    <span style={{ fontWeight: 700 }}>€{(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${D.br}`, paddingTop: 6, marginTop: 3, display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: 12 }}>
                  <span>Total</span><span style={{ color: D.ac }}>€{selected.total?.toFixed(2)}</span>
                </div>
              </div>
              {STATUS_NEXT[selected.status] && (
                <button onClick={() => advance(selected)} disabled={updating === selected.id} style={{ width: "100%", padding: "11px 0", background: D.ac, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>
                  {updating === selected.id ? "Updating..." : BTN_LABEL[selected.status]} →
                </button>
              )}
              {selected.status === "delivered" && <div style={{ textAlign: "center", padding: 8, background: "#EAFAF1", borderRadius: 8, color: D.gr, fontWeight: 800, fontSize: 11 }}>✅ Completed</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   COURIER APP
═══════════════════════════════════════════════════════════════════ */
function CourierApp({ orders, refreshOrders }) {
  const [online, setOnline] = useState(true);
  const [scr, setScr] = useState("jobs");
  const [myLat, setMyLat] = useState(60.1590);
  const [myLng, setMyLng] = useState(24.8870);
  const [updating, setUpdating] = useState(null);
  const C2 = C;

  // Get real GPS position
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        pos => { setMyLat(pos.coords.latitude); setMyLng(pos.coords.longitude); },
        err => console.log("GPS error:", err),
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    }
  }, []);

  const available = orders.filter(o => ["accepted", "preparing"].includes(o.status) && !o.courier_id);
  const myActive = orders.filter(o => o.courier_id === "self" && !["delivered"].includes(o.status));
  const myDone = orders.filter(o => o.courier_id === "self" && o.status === "delivered");

  async function acceptJob(orderId) {
    setUpdating(orderId);
    await db("orders", "PATCH", { status: "heading_to_restaurant", courier_id: "self" }, `?id=eq.${orderId}`);
    await refreshOrders();
    setUpdating(null);
    setScr("active");
  }

  async function confirmPickup(orderId) {
    setUpdating(orderId);
    await db("orders", "PATCH", { status: "picked_up" }, `?id=eq.${orderId}`);
    await refreshOrders();
    setUpdating(null);
  }

  async function confirmDelivery(orderId) {
    setUpdating(orderId);
    await db("orders", "PATCH", { status: "delivered" }, `?id=eq.${orderId}`);
    await refreshOrders();
    setUpdating(null);
    setScr("jobs");
  }

  return (
    <div style={{ background: C2.bg, height: "100%", display: "flex", flexDirection: "column", color: C2.tx, fontFamily: "inherit" }}>
      <div style={{ padding: "10px 12px", background: C2.sf, borderBottom: `1px solid ${C2.br}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: online ? C2.gr + "22" : C2.hi, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛵</div>
            <div><div style={{ fontWeight: 800, fontSize: 12 }}>Courier App</div><div style={{ fontSize: 9, color: C2.mu }}>📍 Lauttasaari</div></div>
          </div>
          <button onClick={() => setOnline(p => !p)} style={{ background: online ? C2.gr + "22" : C2.hi, color: online ? C2.gr : C2.mu, border: `1px solid ${online ? C2.gr + "44" : C2.br}`, borderRadius: 20, padding: "4px 10px", fontSize: 10, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
            {online ? "● Online" : "○ Offline"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", background: C2.sf, borderBottom: `1px solid ${C2.br}`, flexShrink: 0 }}>
        {[{ k: "jobs", l: "Jobs", b: available.length }, { k: "active", l: "Active", b: myActive.length }, { k: "earnings", l: "Earnings" }].map(t => (
          <button key={t.k} onClick={() => setScr(t.k)} style={{ flex: 1, padding: "8px 0", border: "none", background: "none", borderBottom: `2px solid ${scr === t.k ? C2.ac : "transparent"}`, color: scr === t.k ? C2.ac : C2.mu, fontWeight: 800, fontSize: 11, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            {t.l}{t.b > 0 && <span style={{ background: scr === t.k ? C2.ac : C2.hi, color: scr === t.k ? "#fff" : C2.mu, borderRadius: 20, padding: "0 5px", fontSize: 9 }}>{t.b}</span>}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
        {scr === "jobs" && (
          <>
            {!online && <div style={{ background: C2.sf, borderRadius: 10, padding: 16, textAlign: "center", color: C2.mu }}><div style={{ fontSize: 24, marginBottom: 6 }}>😴</div><div style={{ fontWeight: 700, fontSize: 12 }}>You're offline</div></div>}
            {online && available.length === 0 && <div style={{ background: C2.sf, borderRadius: 10, padding: 16, textAlign: "center", color: C2.mu }}><div style={{ fontSize: 24, marginBottom: 6 }}>🕐</div><div style={{ fontWeight: 700, fontSize: 12 }}>No jobs right now</div><div style={{ fontSize: 10, marginTop: 3 }}>Jobs appear as soon as restaurant accepts</div><button onClick={refreshOrders} style={{ marginTop: 10, background: C2.hi, border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", color: C2.mu, fontFamily: "inherit" }}>↻ Refresh</button></div>}
            {online && available.map(o => (
              <div key={o.id} style={{ background: C2.sf, borderRadius: 12, padding: "12px 14px", marginBottom: 10, border: `1px solid ${C2.br}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div><div style={{ fontWeight: 800, fontSize: 12 }}>Order #{o.id?.slice(0, 6)}</div><div style={{ fontSize: 9, color: C2.mu, marginTop: 2 }}>📍 {o.customer_address}</div></div>
                  <div style={{ textAlign: "right" }}><div style={{ fontWeight: 900, fontSize: 15, color: C2.gr }}>+€{((o.delivery_fee || 1.9) * 0.75).toFixed(2)}</div><div style={{ fontSize: 8, color: C2.mu }}>your cut</div></div>
                </div>
                {/* Mini real map */}
                <div style={{ borderRadius: 8, overflow: "hidden", marginBottom: 8, height: 100 }}>
                  <LeafletMap restaurant={{ lat: 60.1575, lng: 24.8855, name: "Restaurant" }} customerLat={o.customer_lat} customerLng={o.customer_lng} courierLat={myLat} courierLng={myLng} height={100} />
                </div>
                <div style={{ fontSize: 10, color: C2.yw, fontWeight: 700, marginBottom: 8 }}>
                  {o.status === "preparing" ? "👨‍🍳 Kitchen cooking — head over now" : "✅ Restaurant accepted — pick up ready soon"}
                </div>
                <button onClick={() => acceptJob(o.id)} disabled={updating === o.id} style={{ width: "100%", background: C2.gr, color: "#fff", border: "none", borderRadius: 9, padding: "10px 0", fontSize: 12, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>
                  {updating === o.id ? "Accepting..." : "Accept & head to restaurant →"}
                </button>
              </div>
            ))}
          </>
        )}

        {scr === "active" && (
          <>
            {myActive.length === 0 && <div style={{ background: C2.sf, borderRadius: 10, padding: 16, textAlign: "center", color: C2.mu }}><div style={{ fontSize: 24, marginBottom: 6 }}>🛵</div><div style={{ fontWeight: 700, fontSize: 12 }}>No active deliveries</div></div>}
            {myActive.map(o => (
              <div key={o.id} style={{ background: C2.sf, borderRadius: 12, padding: "12px 14px", marginBottom: 10, border: `1px solid ${C2.gr}44` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontWeight: 900, fontSize: 13 }}>Order #{o.id?.slice(0, 6)}</div>
                  <SBadge status={o.status} />
                </div>
                <div style={{ borderRadius: 8, overflow: "hidden", marginBottom: 8, height: 130 }}>
                  <LeafletMap restaurant={{ lat: 60.1575, lng: 24.8855, name: "Restaurant" }} customerLat={o.customer_lat} customerLng={o.customer_lng} courierLat={myLat} courierLng={myLng} height={130} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8 }}>
                  {[{ i: "📦", l: "From", v: "Test Restaurant" }, { i: "📍", l: "To", v: o.customer_address }].map(row => (
                    <div key={row.l} style={{ display: "flex", gap: 7, alignItems: "center", background: C2.hi, borderRadius: 6, padding: "5px 8px" }}>
                      <span style={{ fontSize: 13 }}>{row.i}</span><span style={{ fontSize: 9, color: C2.mu, minWidth: 28 }}>{row.l}</span><span style={{ fontSize: 10, fontWeight: 700 }}>{row.v}</span>
                    </div>
                  ))}
                </div>
                {o.status === "ready" && <button onClick={() => confirmPickup(o.id)} disabled={updating === o.id} style={{ width: "100%", background: C2.yw, color: "#000", border: "none", borderRadius: 9, padding: "10px 0", fontSize: 12, fontWeight: 900, cursor: "pointer", fontFamily: "inherit", marginBottom: 6 }}>{updating === o.id ? "..." : "Confirm pickup 📦"}</button>}
                {o.status === "picked_up" && <button onClick={() => confirmDelivery(o.id)} disabled={updating === o.id} style={{ width: "100%", background: C2.gr, color: "#fff", border: "none", borderRadius: 9, padding: "10px 0", fontSize: 12, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>{updating === o.id ? "..." : "Confirm delivery ✓"}</button>}
                {["heading_to_restaurant", "preparing"].includes(o.status) && <div style={{ textAlign: "center", fontSize: 10, color: C2.mu, padding: "6px 0" }}>🛵 Navigate to restaurant to pick up order</div>}
              </div>
            ))}
          </>
        )}

        {scr === "earnings" && (
          <div style={{ background: C2.sf, borderRadius: 12, padding: "14px", border: `1px solid ${C2.br}` }}>
            <div style={{ fontSize: 10, color: C2.mu, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800 }}>Today</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: C2.gr }}>€{myDone.reduce((s, o) => s + (o.delivery_fee || 1.9) * 0.75, 0).toFixed(2)}</div>
            <div style={{ fontSize: 10, color: C2.mu, marginTop: 3 }}>{myDone.length} deliveries completed</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════════════ */
export default function App() {
  const [orders, setOrders] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const fetchOrders = async () => {
    const data = await db("orders", "GET", null, "?select=*&order=created_at.desc&limit=50");
    if (data) setOrders(data);
  };

  const refreshActiveOrder = async () => {
    if (!activeOrder) return;
    const data = await db("orders", "GET", null, `?id=eq.${activeOrder.id}&select=*`);
    if (data && data[0]) setActiveOrder(data[0]);
  };

  // Poll every 8 seconds for updates (simple, reliable)
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders();
      refreshActiveOrder();
    }, 8000);
    return () => clearInterval(interval);
  }, [activeOrder?.id]);

  const panels = [
    { key: "customer", label: "Customer App", dot: "#FF3B2F" },
    { key: "restaurant", label: "Restaurant", dot: "#F39C12" },
    { key: "courier", label: "Courier App", dot: "#00C896" },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", height: "100vh", display: "flex", flexDirection: "column", background: "#000", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 2px; } ::-webkit-scrollbar-thumb { background: #444; border-radius: 2px; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        .leaflet-container { font-family: 'DM Sans', sans-serif !important; }
      `}</style>

      {/* Top bar */}
      <div style={{ display: "flex", background: "#070707", borderBottom: "1px solid #181818", flexShrink: 0, alignItems: "stretch" }}>
        <div style={{ padding: "7px 12px", display: "flex", alignItems: "center", gap: 6, borderRight: "1px solid #181818", flexShrink: 0 }}>
          <div style={{ width: 20, height: 20, borderRadius: 5, background: "#FF3B2F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>🛵</div>
          <span style={{ fontSize: 11, fontWeight: 900, color: "#fff", letterSpacing: "-0.3px" }}>NoRush</span>
          <span style={{ fontSize: 8, color: "#00C896", marginLeft: 2, fontWeight: 700 }}>● LIVE</span>
        </div>
        {panels.map((p, i) => (
          <div key={p.key} style={{ flex: 1, padding: "7px 10px", display: "flex", alignItems: "center", gap: 5, borderRight: i < panels.length - 1 ? "1px solid #181818" : "none" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.dot, flexShrink: 0 }} />
            <span style={{ fontSize: 9, fontWeight: 800, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em" }}>{p.label}</span>
          </div>
        ))}
        <div style={{ padding: "7px 12px", display: "flex", alignItems: "center", borderLeft: "1px solid #181818" }}>
          <span style={{ fontSize: 9, color: "#333", fontWeight: 600 }}>Supabase ● connected</span>
        </div>
      </div>

      {/* 3-panel grid */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", overflow: "hidden", gap: "1px", background: "#111" }}>
        <CustomerApp
          onOrderPlaced={(order) => { setActiveOrder(order); fetchOrders(); }}
          activeOrder={activeOrder}
          refreshOrder={refreshActiveOrder}
        />
        <RestaurantDash orders={orders} refreshOrders={fetchOrders} />
        <CourierApp orders={orders} refreshOrders={fetchOrders} />
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════════
   SUPABASE — auth + database
═══════════════════════════════════════════════════════════════════ */
const SURL = "https://eslxeqhrlalocofesogj.supabase.co";
const SKEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbHhlcWhybGFsb2NvZmVzb2dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDUxNzgsImV4cCI6MjA5MTcyMTE3OH0.47bY9RBN8M6_GyURH0xaq3BpjBXQGqO7HwNxlqdeTls";

// Raw REST API call (no auth)
async function db(table, method="GET", body=null, filters="") {
  const res = await fetch(`${SURL}/rest/v1/${table}${filters}`, {
    method,
    headers: {
      apikey: SKEY,
      Authorization: `Bearer ${SKEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : null,
  });
  const text = await res.text();
  if (!res.ok) { console.error("DB error", res.status, text); return null; }
  return text ? JSON.parse(text) : [];
}

// Auth API call (with user token)
async function dbAuth(table, method="GET", body=null, filters="", token=null) {
  const res = await fetch(`${SURL}/rest/v1/${table}${filters}`, {
    method,
    headers: {
      apikey: SKEY,
      Authorization: `Bearer ${token || SKEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : null,
  });
  const text = await res.text();
  if (!res.ok) { console.error("dbAuth error", res.status, text); return null; }
  return text ? JSON.parse(text) : [];
}

// Supabase Auth functions
async function signUp(email, password) {
  const res = await fetch(`${SURL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: SKEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

async function signIn(email, password) {
  const res = await fetch(`${SURL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SKEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

async function signOut(token) {
  await fetch(`${SURL}/auth/v1/logout`, {
    method: "POST",
    headers: { apikey: SKEY, Authorization: `Bearer ${token}` },
  });
}

// Geocode address to lat/lng using OpenStreetMap (free, no API key)
async function geocode(address) {
  try {
    const q = encodeURIComponent(address + ", Finland");
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`);
    const data = await res.json();
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch(e) { console.log("Geocode error:", e); }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   THEME
═══════════════════════════════════════════════════════════════════ */
const D = { bg:"#0A0A0F",sf:"#13131A",hi:"#1E1E2A",br:"#2A2A38",ac:"#FF3B2F",tx:"#F0EDF8",mu:"#6A6A88",gr:"#00C896",yw:"#FFB800",bl:"#3B82F6" };
const L = { bg:"#F5F2EC",sf:"#FFFFFF",hi:"#EDE9E0",br:"#DDD9D0",ac:"#FF3B2F",tx:"#1A1714",mu:"#8A8480",gr:"#1A9E5C",yw:"#E07B20",bl:"#2563EB" };
const N = { bg:"#080C14",sf:"#0F1520",hi:"#162030",br:"#1E2D42",ac:"#FF3B2F",tx:"#E8F0FE",mu:"#6B8099",gr:"#00C896",yw:"#FFB800",pu:"#A855F7" };

/* ═══════════════════════════════════════════════════════════════════
   SHARED UI COMPONENTS
═══════════════════════════════════════════════════════════════════ */
const STATUS_META = {
  new:                   { label:"Order confirmed",    short:"New",        color:"#E74C3C", bg:"#FDEDEC" },
  accepted:              { label:"Restaurant accepted", short:"Accepted",   color:"#2980B9", bg:"#EBF5FB" },
  heading_to_restaurant: { label:"Courier en route",   short:"En route",   color:"#1ABC9C", bg:"#E8F8F5" },
  preparing:             { label:"Kitchen cooking",    short:"Cooking",    color:"#E67E22", bg:"#FEF9E7" },
  ready:                 { label:"Ready for pickup",   short:"Ready",      color:"#8E44AD", bg:"#F5EEF8" },
  picked_up:             { label:"On the way to you",  short:"Delivering", color:"#3B82F6", bg:"#EBF5FB" },
  delivered:             { label:"Delivered! 🎉",      short:"Done",       color:"#27AE60", bg:"#EAFAF1" },
};
const SK = Object.keys(STATUS_META);

function Badge({ status, large }) {
  const m = STATUS_META[status] || { label:status, short:status, color:"#888", bg:"#eee" };
  return (
    <span style={{ background:m.bg, color:m.color, fontSize:large?12:10, fontWeight:800,
      padding:large?"4px 12px":"2px 8px", borderRadius:20, textTransform:"uppercase",
      letterSpacing:"0.04em", display:"inline-flex", alignItems:"center", gap:4, whiteSpace:"nowrap" }}>
      <span style={{ width:5,height:5,borderRadius:"50%",background:m.color,
        ...(["new","preparing"].includes(status)?{animation:"blink 1.2s infinite"}:{}) }}/>
      {large ? m.label : m.short}
    </span>
  );
}

function Input({ label, ...props }) {
  const T = props.theme || D;
  return (
    <div style={{ marginBottom:14 }}>
      {label && <div style={{ fontSize:11, fontWeight:700, color:T.mu, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>}
      <input {...props} style={{ width:"100%", padding:"12px 14px", borderRadius:10, fontSize:14,
        border:`1.5px solid ${T.br}`, background:T.sf, color:T.tx, fontFamily:"inherit",
        outline:"none", transition:"border-color 0.15s", ...props.style }}
        onFocus={e=>e.target.style.borderColor=T.ac}
        onBlur={e=>e.target.style.borderColor=T.br}
      />
    </div>
  );
}

function Btn({ children, onClick, variant="primary", T=D, disabled, style={} }) {
  const styles = {
    primary: { background:T.ac, color:"#fff" },
    secondary: { background:T.hi, color:T.tx },
    green: { background:T.gr, color:"#fff" },
    outline: { background:"transparent", color:T.ac, border:`1.5px solid ${T.ac}` },
    ghost: { background:"transparent", color:T.mu },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant], border:"none", borderRadius:11, padding:"13px 20px",
      fontSize:14, fontWeight:800, cursor:disabled?"not-allowed":"pointer",
      fontFamily:"inherit", transition:"opacity 0.15s", opacity:disabled?0.5:1,
      width:"100%", ...style,
    }}>{children}</button>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LEAFLET MAP
═══════════════════════════════════════════════════════════════════ */
function LiveMap({ restLat=60.1575, restLng=24.8855, restName="Restaurant",
                   custLat, custLng, courLat, courLng, height=220, zoom=14 }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const marks = useRef({});

  const mkIcon = (emoji, bg, size=36) => window.L?.divIcon({
    html:`<div style="background:${bg};border-radius:50%;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*.48)}px;box-shadow:0 3px 10px rgba(0,0,0,.3);border:2px solid rgba(255,255,255,.5)">${emoji}</div>`,
    className:"", iconSize:[size,size], iconAnchor:[size/2,size/2],
  });

  useEffect(()=>{
    if(mapRef.current) return;
    if(!document.getElementById("lf-css")){
      const l=document.createElement("link"); l.id="lf-css"; l.rel="stylesheet";
      l.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(l);
    }
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    s.onload=()=>{
      const Lf=window.L;
      const m=Lf.map(ref.current,{zoomControl:false}).setView([restLat,restLng],zoom);
      Lf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap"}).addTo(m);
      Lf.control.zoom({position:"bottomright"}).addTo(m);
      marks.current.rest=Lf.marker([restLat,restLng],{icon:mkIcon("🍽","#FF3B2F")}).addTo(m).bindPopup(restName);
      if(custLat&&custLng) marks.current.cust=Lf.marker([custLat,custLng],{icon:mkIcon("📍","#FF3B2F",32)}).addTo(m).bindPopup("Delivery address");
      if(courLat&&courLng) marks.current.cour=Lf.marker([courLat,courLng],{icon:mkIcon("🛵","#00C896")}).addTo(m).bindPopup("Courier");
      const pts=[[restLat,restLng]];
      if(custLat&&custLng) pts.push([custLat,custLng]);
      if(courLat&&courLng) pts.push([courLat,courLng]);
      if(pts.length>1) m.fitBounds(pts,{padding:[40,40]});
      mapRef.current=m;
    };
    document.head.appendChild(s);
    return()=>{ if(mapRef.current){mapRef.current.remove();mapRef.current=null;} };
  },[]);

  useEffect(()=>{
    if(!mapRef.current||!window.L||!courLat||!courLng) return;
    if(marks.current.cour) marks.current.cour.setLatLng([courLat,courLng]);
    else marks.current.cour=window.L.marker([courLat,courLng],{icon:mkIcon("🛵","#00C896")}).addTo(mapRef.current).bindPopup("Courier");
  },[courLat,courLng]);

  return <div ref={ref} style={{height,width:"100%",flexShrink:0}}/>;
}

/* ═══════════════════════════════════════════════════════════════════
   AUTH SCREEN — login / signup
═══════════════════════════════════════════════════════════════════ */
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const T = D;

  const roles = [
    { key:"customer",   emoji:"📱", label:"Customer",   color:"#FF3B2F" },
    { key:"restaurant", emoji:"🍽",  label:"Restaurant", color:"#F39C12" },
    { key:"courier",    emoji:"🛵", label:"Courier",    color:"#00C896" },
    { key:"admin",      emoji:"⚡", label:"Admin",      color:"#A855F7" },
  ];

  const handleSubmit = async () => {
    if (!email || !password) { setError("Please fill in all fields"); return; }
    if (mode === "signup" && !role) { setError("Please select your role"); return; }
    setLoading(true); setError("");
    try {
      let result;
      if (mode === "signup") {
        result = await signUp(email, password);
        if (result.error) { setError(result.error.message || result.msg || "Signup failed"); setLoading(false); return; }
        // After signup, sign in to get token
        result = await signIn(email, password);
      } else {
        result = await signIn(email, password);
      }
      if (result.error || result.error_description) {
        setError(result.error_description || result.error?.message || "Login failed");
        setLoading(false); return;
      }
      const token = result.access_token;
      const userId = result.user?.id;
      onAuth({ token, userId, email, role: mode === "signup" ? role : null });
    } catch(e) {
      setError("Connection error — check your internet");
    }
    setLoading(false);
  };

  return (
    <div style={{ background:T.bg, minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"inherit" }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontSize:52, marginBottom:8 }}>🛵</div>
          <div style={{ fontSize:28, fontWeight:900, color:T.tx, letterSpacing:"-0.8px" }}>NoRush</div>
          <div style={{ fontSize:13, color:T.mu, marginTop:4 }}>Lauttasaari · Helsinki</div>
        </div>

        <div style={{ background:T.sf, borderRadius:16, padding:24, border:`1px solid ${T.br}` }}>
          {/* Mode toggle */}
          <div style={{ display:"flex", background:T.hi, borderRadius:10, padding:3, marginBottom:20 }}>
            {[["login","Sign in"],["signup","Create account"]].map(([m,l])=>(
              <button key={m} onClick={()=>setMode(m)} style={{ flex:1, padding:"8px 0", border:"none", borderRadius:8,
                background:mode===m?T.sf:"transparent", color:mode===m?T.tx:T.mu,
                fontWeight:800, fontSize:13, cursor:"pointer", fontFamily:"inherit",
                boxShadow:mode===m?"0 1px 4px rgba(0,0,0,0.15)":"none", transition:"all 0.2s" }}>{l}</button>
            ))}
          </div>

          {/* Role selector — only on signup */}
          {mode==="signup" && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.mu, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.06em" }}>I am a</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {roles.map(r=>(
                  <button key={r.key} onClick={()=>setRole(r.key)} style={{
                    padding:"10px 8px", borderRadius:10, border:`2px solid ${role===r.key?r.color:T.br}`,
                    background:role===r.key?r.color+"18":T.hi, cursor:"pointer", fontFamily:"inherit",
                    display:"flex", alignItems:"center", gap:8, transition:"all 0.15s",
                  }}>
                    <span style={{ fontSize:20 }}>{r.emoji}</span>
                    <span style={{ fontSize:12, fontWeight:800, color:role===r.key?r.color:T.tx }}>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Input label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.fi" theme={T}/>
          <Input label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" theme={T}/>

          {error && <div style={{ background:"#EF444415", color:"#EF4444", fontSize:12, padding:"8px 12px", borderRadius:8, marginBottom:14, fontWeight:600 }}>{error}</div>}

          <Btn onClick={handleSubmit} disabled={loading} T={T}>
            {loading ? "Please wait..." : mode==="login" ? "Sign in →" : "Create account →"}
          </Btn>
        </div>

        <div style={{ textAlign:"center", marginTop:16, fontSize:12, color:T.mu }}>
          {mode==="login" ? "New here? " : "Already have an account? "}
          <span onClick={()=>setMode(mode==="login"?"signup":"login")} style={{ color:T.ac, fontWeight:700, cursor:"pointer" }}>
            {mode==="login" ? "Create account" : "Sign in"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CUSTOMER PROFILE SETUP
═══════════════════════════════════════════════════════════════════ */
function CustomerSetup({ user, onComplete }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [gettingGps, setGettingGps] = useState(false);
  const T = D;

  const getGps = () => {
    setGettingGps(true);
    navigator.geolocation?.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        // Reverse geocode to get address
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const data = await res.json();
          setAddress(data.display_name?.split(",").slice(0,3).join(",") || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } catch(e) { setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`); }
        setGettingGps(false);
      },
      () => setGettingGps(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const save = async () => {
    if (!name.trim() || !address.trim()) { alert("Please fill in name and address"); return; }
    setLoading(true);
    // Geocode address
    const coords = await geocode(address);
    const result = await dbAuth("customers", "POST", {
      user_id: user.userId,
      full_name: name,
      phone,
      address,
      lat: coords?.lat || 60.1560,
      lng: coords?.lng || 24.8820,
      email: user.email,
      profile_complete: true,
    }, "", user.token);
    setLoading(false);
    if (result) onComplete({ ...user, profile: result[0], role: "customer" });
    else alert("Error saving profile — try again");
  };

  return (
    <div style={{ background:T.bg, minHeight:"100vh", padding:24, fontFamily:"inherit", color:T.tx }}>
      <div style={{ maxWidth:420, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:32, paddingTop:20 }}>
          <div style={{ fontSize:44 }}>📱</div>
          <div style={{ fontSize:22, fontWeight:900, marginTop:8 }}>Set up your account</div>
          <div style={{ fontSize:13, color:T.mu, marginTop:4 }}>Just a few details to get started</div>
        </div>
        <div style={{ background:T.sf, borderRadius:16, padding:24, border:`1px solid ${T.br}` }}>
          <Input label="Your full name" value={name} onChange={e=>setName(e.target.value)} placeholder="Aino Korhonen" theme={T}/>
          <Input label="Phone number" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+358 40 123 4567" theme={T}/>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.mu, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.06em" }}>Delivery address</div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Lauttasaarentie 8, Helsinki"
                style={{ flex:1, padding:"12px 14px", borderRadius:10, fontSize:14, border:`1.5px solid ${T.br}`,
                  background:T.sf, color:T.tx, fontFamily:"inherit", outline:"none" }}
                onFocus={e=>e.target.style.borderColor=T.ac}
                onBlur={e=>e.target.style.borderColor=T.br}
              />
              <button onClick={getGps} style={{ padding:"0 14px", background:T.hi, border:`1.5px solid ${T.br}`,
                borderRadius:10, cursor:"pointer", fontSize:18, flexShrink:0 }}>
                {gettingGps ? "..." : "📍"}
              </button>
            </div>
            <div style={{ fontSize:11, color:T.mu, marginTop:4 }}>Tap 📍 to use your current location</div>
          </div>
          <Btn onClick={save} disabled={loading} T={T}>{loading ? "Saving..." : "Start ordering →"}</Btn>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   RESTAURANT SETUP — multi-step onboarding
═══════════════════════════════════════════════════════════════════ */
function RestaurantSetup({ user, onComplete }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [gettingGps, setGettingGps] = useState(false);
  const [form, setForm] = useState({
    name:"", ytunnus:"", address:"", phone:"", email:user.email||"",
    cuisine:"Finnish", description:"", iban:"", accountName:"",
    lat:60.1575, lng:24.8855,
    hours:{ mon:true, tue:true, wed:true, thu:true, fri:true, sat:true, sun:false },
  });
  const [menuCats, setMenuCats] = useState([
    { id:1, name:"Starters", items:[{ id:1, name:"", price:"", desc:"" }] },
    { id:2, name:"Mains", items:[{ id:1, name:"", price:"", desc:"" }] },
  ]);
  const T = L;
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const getGps = () => {
    setGettingGps(true);
    navigator.geolocation?.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        set("lat", lat); set("lng", lng);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const data = await res.json();
          const addr = data.address;
          const formatted = [addr.road, addr.house_number, addr.city||addr.town].filter(Boolean).join(" ");
          if (formatted) set("address", formatted);
        } catch(e) {}
        setGettingGps(false);
      },
      () => setGettingGps(false),
      { enableHighAccuracy:true, timeout:10000 }
    );
  };

  const geocodeAddress = async () => {
    if (!form.address) return;
    const coords = await geocode(form.address);
    if (coords) { set("lat", coords.lat); set("lng", coords.lng); }
  };

  const submit = async () => {
    setLoading(true);
    // Create restaurant
    const rest = await dbAuth("restaurants", "POST", {
      owner_id: user.userId,
      name: form.name,
      address: form.address,
      lat: form.lat,
      lng: form.lng,
      phone: form.phone,
      email: form.email,
      cuisine: form.cuisine,
      description: form.description,
      ytunnus: form.ytunnus,
      iban: form.iban,
      hours: form.hours,
      is_active: false,
      is_approved: false,
      commission_rate: 0.15,
    }, "", user.token);

    if (rest?.[0]) {
      const restId = rest[0].id;
      // Create menu items
      for (const cat of menuCats) {
        for (const item of cat.items) {
          if (item.name && item.price) {
            await dbAuth("menu_items", "POST", {
              restaurant_id: restId,
              name: item.name,
              description: item.desc,
              price: parseFloat(item.price),
              category: cat.name,
              is_available: true,
            }, "", user.token);
          }
        }
      }
      onComplete({ ...user, profile: rest[0], role: "restaurant" });
    } else {
      alert("Error creating restaurant — try again");
    }
    setLoading(false);
  };

  const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];
  const DAY_L = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const CUISINES = ["Finnish","Italian","Asian","Japanese","Pizza","Burgers","Seafood","Vegetarian","Middle Eastern","Other"];

  const steps = ["Business","Location","Menu","Payout"];

  return (
    <div style={{ background:T.bg, minHeight:"100vh", fontFamily:"inherit", color:T.tx }}>
      {/* Header */}
      <div style={{ padding:"16px 20px", background:T.sf, borderBottom:`1px solid ${T.br}`, display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:36,height:36,borderRadius:9,background:T.ac,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>🍽</div>
        <div>
          <div style={{ fontWeight:900, fontSize:15 }}>Restaurant signup</div>
          <div style={{ fontSize:11, color:T.mu }}>Step {step+1} of {steps.length} — {steps[step]}</div>
        </div>
      </div>
      {/* Progress */}
      <div style={{ display:"flex", gap:3, padding:"12px 20px 0" }}>
        {steps.map((_,i)=><div key={i} style={{ flex:1,height:3,borderRadius:2,background:i<=step?T.ac:T.br,transition:"background 0.3s" }}/>)}
      </div>

      <div style={{ padding:"20px 20px 100px" }}>
        {step===0 && <>
          <div style={{ fontWeight:900, fontSize:18, marginBottom:16 }}>Business details</div>
          <Input label="Restaurant name *" value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Ravintola Savu" theme={T}/>
          <Input label="Y-tunnus (Finnish business ID) *" value={form.ytunnus} onChange={e=>set("ytunnus",e.target.value)} placeholder="1234567-8" theme={T}/>
          <Input label="Phone *" value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="+358 40 000 0000" theme={T}/>
          <Input label="Email *" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="info@restaurant.fi" theme={T}/>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.mu, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.06em" }}>Cuisine type</div>
            <select value={form.cuisine} onChange={e=>set("cuisine",e.target.value)} style={{ width:"100%",padding:"12px 14px",borderRadius:10,fontSize:14,border:`1.5px solid ${T.br}`,background:T.sf,color:T.tx,fontFamily:"inherit",outline:"none" }}>
              {CUISINES.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.mu, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.06em" }}>Opening days</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {DAYS.map((d,i)=>(
                <div key={d} onClick={()=>set("hours",{...form.hours,[d]:!form.hours[d]})} style={{ padding:"7px 12px", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer",
                  background:form.hours[d]?T.ac:T.hi, color:form.hours[d]?"#fff":T.mu,
                  border:`1.5px solid ${form.hours[d]?T.ac:T.br}`, transition:"all 0.15s" }}>{DAY_L[i]}</div>
              ))}
            </div>
          </div>
        </>}

        {step===1 && <>
          <div style={{ fontWeight:900, fontSize:18, marginBottom:4 }}>Restaurant location</div>
          <div style={{ fontSize:13, color:T.mu, marginBottom:16 }}>This is shown to couriers and customers on the map</div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.mu, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.06em" }}>Street address</div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={form.address} onChange={e=>set("address",e.target.value)} onBlur={geocodeAddress}
                placeholder="Lauttasaarentie 1, Helsinki"
                style={{ flex:1,padding:"12px 14px",borderRadius:10,fontSize:14,border:`1.5px solid ${T.br}`,background:T.sf,color:T.tx,fontFamily:"inherit",outline:"none" }}
                onFocus={e=>e.target.style.borderColor=T.ac}
              />
              <button onClick={getGps} style={{ padding:"0 14px",background:T.hi,border:`1.5px solid ${T.br}`,borderRadius:10,cursor:"pointer",fontSize:18,flexShrink:0 }}>
                {gettingGps?"...":"📍"}
              </button>
            </div>
            <div style={{ fontSize:11, color:T.mu, marginTop:4 }}>Tap 📍 to use your phone's GPS for exact location</div>
          </div>
          {form.lat && form.lng && (
            <div style={{ borderRadius:12, overflow:"hidden", height:200, marginTop:8 }}>
              <LiveMap restLat={form.lat} restLng={form.lng} restName={form.name||"Your restaurant"} height={200} zoom={15}/>
            </div>
          )}
          {form.lat && <div style={{ background:T.hi, borderRadius:8, padding:"8px 12px", marginTop:8, fontSize:11, color:T.mu }}>
            📍 Location set: {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
          </div>}
        </>}

        {step===2 && <>
          <div style={{ fontWeight:900, fontSize:18, marginBottom:4 }}>Menu</div>
          <div style={{ fontSize:13, color:T.mu, marginBottom:16 }}>Add your dishes. You can edit this anytime from your dashboard.</div>
          {menuCats.map((cat,ci)=>(
            <div key={cat.id} style={{ background:T.sf, borderRadius:12, padding:14, marginBottom:12, border:`1px solid ${T.br}` }}>
              <input value={cat.name} onChange={e=>setMenuCats(p=>p.map((c,i)=>i===ci?{...c,name:e.target.value}:c))}
                style={{ width:"100%",padding:"8px 10px",borderRadius:8,fontSize:14,fontWeight:800,border:`1px solid ${T.br}`,background:T.hi,color:T.tx,fontFamily:"inherit",outline:"none",marginBottom:10 }}
                placeholder="Category name"
              />
              {cat.items.map((item,ii)=>(
                <div key={item.id} style={{ background:T.hi, borderRadius:9, padding:10, marginBottom:8 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:"0 8px" }}>
                    <div style={{ marginBottom:6 }}>
                      <input value={item.name} onChange={e=>setMenuCats(p=>p.map((c,ci2)=>ci2===ci?{...c,items:c.items.map((it,ii2)=>ii2===ii?{...it,name:e.target.value}:it)}:c))}
                        placeholder="Dish name" style={{ width:"100%",padding:"8px 10px",borderRadius:7,fontSize:13,border:`1px solid ${T.br}`,background:T.sf,color:T.tx,fontFamily:"inherit",outline:"none" }}/>
                    </div>
                    <div style={{ marginBottom:6 }}>
                      <input value={item.price} onChange={e=>setMenuCats(p=>p.map((c,ci2)=>ci2===ci?{...c,items:c.items.map((it,ii2)=>ii2===ii?{...it,price:e.target.value}:it)}:c))}
                        placeholder="€ price" type="number" style={{ width:"100%",padding:"8px 10px",borderRadius:7,fontSize:13,border:`1px solid ${T.br}`,background:T.sf,color:T.tx,fontFamily:"inherit",outline:"none" }}/>
                    </div>
                  </div>
                  <input value={item.desc} onChange={e=>setMenuCats(p=>p.map((c,ci2)=>ci2===ci?{...c,items:c.items.map((it,ii2)=>ii2===ii?{...it,desc:e.target.value}:it)}:c))}
                    placeholder="Short description" style={{ width:"100%",padding:"7px 10px",borderRadius:7,fontSize:12,border:`1px solid ${T.br}`,background:T.sf,color:T.tx,fontFamily:"inherit",outline:"none" }}/>
                </div>
              ))}
              <button onClick={()=>setMenuCats(p=>p.map((c,i)=>i===ci?{...c,items:[...c.items,{id:Date.now(),name:"",price:"",desc:""}]}:c))}
                style={{ width:"100%",padding:"8px 0",background:"transparent",border:`1.5px dashed ${T.br}`,borderRadius:8,fontSize:12,fontWeight:700,color:T.mu,cursor:"pointer",fontFamily:"inherit" }}>
                + Add dish
              </button>
            </div>
          ))}
          <button onClick={()=>setMenuCats(p=>[...p,{id:Date.now(),name:"New category",items:[{id:Date.now(),name:"",price:"",desc:""}]}])}
            style={{ width:"100%",padding:"10px 0",background:"transparent",border:`1.5px dashed ${T.br}`,borderRadius:10,fontSize:13,fontWeight:700,color:T.mu,cursor:"pointer",fontFamily:"inherit",marginTop:4 }}>
            + Add category
          </button>
        </>}

        {step===3 && <>
          <div style={{ fontWeight:900, fontSize:18, marginBottom:4 }}>Payout details</div>
          <div style={{ fontSize:13, color:T.mu, marginBottom:16 }}>Weekly payouts every Monday to your Finnish bank account</div>
          <div style={{ background:"#EBF5FB", border:"1px solid #2980B922", borderRadius:10, padding:"12px 14px", marginBottom:16, fontSize:12, color:"#2980B9" }}>
            ℹ️ NoRush takes <strong>15% commission</strong> per order — half of what Wolt charges. You receive 85% of food revenue weekly.
          </div>
          <Input label="Account holder name *" value={form.accountName||""} onChange={e=>set("accountName",e.target.value)} placeholder="Ravintola Savu Oy" theme={T}/>
          <Input label="IBAN *" value={form.iban} onChange={e=>set("iban",e.target.value)} placeholder="FI12 3456 7890 1234 56" theme={T}/>
          <div style={{ background:T.hi, borderRadius:10, padding:"12px 14px", marginTop:4, fontSize:12, color:T.mu }}>
            ⚠️ Your application will be reviewed by NoRush within 1–2 business days. You'll get an email when approved.
          </div>
        </>}
      </div>

      {/* Navigation */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, padding:"12px 20px 24px", background:T.bg, borderTop:`1px solid ${T.br}`, display:"flex", gap:10 }}>
        {step>0 && <Btn variant="secondary" onClick={()=>setStep(s=>s-1)} T={T} style={{ flex:0.4 }}>← Back</Btn>}
        {step<steps.length-1
          ? <Btn onClick={()=>setStep(s=>s+1)} T={T} style={{ flex:1 }}>Continue →</Btn>
          : <Btn variant="green" onClick={submit} disabled={loading} T={T} style={{ flex:1 }}>{loading?"Submitting...":"Submit application ✓"}</Btn>
        }
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   COURIER SETUP
═══════════════════════════════════════════════════════════════════ */
function CourierSetup({ user, onComplete }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name:"", phone:"", vehicle:"bicycle", henkilotunnus:"", iban:"", accountName:"",
    hasHygiene:false, hasId:false, hasLicense:false,
    agreedTerms:false, agreedContractor:false,
  });
  const T = D;
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const steps = ["Personal","Vehicle","Documents","Agreement"];

  const submit = async () => {
    setLoading(true);
    const result = await dbAuth("couriers", "POST", {
      user_id: user.userId,
      name: form.name,
      phone: form.phone,
      email: user.email,
      vehicle: form.vehicle,
      iban: form.iban,
      henkilotunnus: form.henkilotunnus,
      has_hygiene_cert: form.hasHygiene,
      has_id_doc: form.hasId,
      status: "offline",
      is_approved: false,
      profile_complete: true,
      lat: 60.1575,
      lng: 24.8855,
    }, "", user.token);
    setLoading(false);
    if (result?.[0]) onComplete({ ...user, profile: result[0], role: "courier" });
    else alert("Error saving — try again");
  };

  const VEHICLES = [
    { k:"bicycle", e:"🚲", l:"Bicycle" },
    { k:"ebike",   e:"⚡", l:"E-Bike" },
    { k:"scooter", e:"🛵", l:"Scooter" },
    { k:"car",     e:"🚗", l:"Car" },
  ];

  return (
    <div style={{ background:T.bg, minHeight:"100vh", fontFamily:"inherit", color:T.tx }}>
      <div style={{ padding:"16px 20px", background:T.sf, borderBottom:`1px solid ${T.br}`, display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:36,height:36,borderRadius:9,background:"#00C896",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>🛵</div>
        <div>
          <div style={{ fontWeight:900, fontSize:15 }}>Courier signup</div>
          <div style={{ fontSize:11, color:T.mu }}>Step {step+1} of {steps.length} — {steps[step]}</div>
        </div>
      </div>
      <div style={{ display:"flex", gap:3, padding:"12px 20px 0" }}>
        {steps.map((_,i)=><div key={i} style={{ flex:1,height:3,borderRadius:2,background:i<=step?"#00C896":T.br,transition:"background 0.3s" }}/>)}
      </div>

      <div style={{ padding:"20px 20px 100px" }}>
        {step===0 && <>
          <div style={{ fontWeight:900, fontSize:18, marginBottom:16 }}>Personal details</div>
          <Input label="Full name *" value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Mikko Korhonen" theme={T}/>
          <Input label="Phone *" value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="+358 40 123 4567" theme={T}/>
          <Input label="Henkilötunnus *" type="password" value={form.henkilotunnus} onChange={e=>set("henkilotunnus",e.target.value)} placeholder="010190-1234" theme={T}/>
          <div style={{ background:T.hi, borderRadius:8, padding:"8px 12px", fontSize:11, color:T.mu }}>🔒 Encrypted and stored securely. Required to process your payments in Finland.</div>
        </>}

        {step===1 && <>
          <div style={{ fontWeight:900, fontSize:18, marginBottom:16 }}>Your vehicle</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {VEHICLES.map(v=>(
              <div key={v.k} onClick={()=>set("vehicle",v.k)} style={{ padding:"16px 12px",borderRadius:12,border:`2px solid ${form.vehicle===v.k?"#00C896":T.br}`,background:form.vehicle===v.k?"#00C89618":T.sf,cursor:"pointer",textAlign:"center",transition:"all 0.15s" }}>
                <div style={{ fontSize:32 }}>{v.e}</div>
                <div style={{ fontSize:13,fontWeight:800,marginTop:6,color:form.vehicle===v.k?"#00C896":T.tx }}>{v.l}</div>
              </div>
            ))}
          </div>
          <div style={{ background:"#00C89618", border:"1px solid #00C89633", borderRadius:10, padding:"12px 14px", marginTop:16, fontSize:12, color:"#00C896" }}>
            💰 You keep <strong>75% of every delivery fee</strong>. Earnings paid daily to your IBAN.
          </div>
          <Input label="IBAN *" value={form.iban} onChange={e=>set("iban",e.target.value)} placeholder="FI12 3456 7890 1234 56" theme={T} style={{ marginTop:14 }}/>
          <Input label="Account holder name *" value={form.accountName||""} onChange={e=>set("accountName",e.target.value)} placeholder="Mikko Korhonen" theme={T}/>
        </>}

        {step===2 && <>
          <div style={{ fontWeight:900, fontSize:18, marginBottom:4 }}>Documents</div>
          <div style={{ fontSize:13, color:T.mu, marginBottom:16 }}>Required by Finnish law before you can start delivering</div>
          {[
            { k:"hasId", l:"Government-issued ID", sub:"Passport, ID card, or residence permit", required:true },
            { k:"hasHygiene", l:"Food hygiene certificate", sub:"Hygieniapassi — required in Finland", required:true },
            { k:"hasLicense", l:"Driver's license", sub:"Required for scooter or car only", required:["scooter","car"].includes(form.vehicle) },
          ].map(doc=>(
            <div key={doc.k} onClick={()=>set(doc.k,!form[doc.k])} style={{ background:T.sf, borderRadius:12, padding:"14px 16px", marginBottom:10, border:`1.5px solid ${form[doc.k]?"#00C896":T.br}`, cursor:"pointer", display:"flex", gap:12, alignItems:"center", transition:"border-color 0.15s" }}>
              <div style={{ width:36,height:36,borderRadius:9,background:form[doc.k]?"#00C89618":T.hi,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>
                {form[doc.k]?"✅":"📄"}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:13 }}>{doc.l}{doc.required&&<span style={{ color:T.ac }}> *</span>}</div>
                <div style={{ fontSize:11, color:T.mu, marginTop:2 }}>{doc.sub}</div>
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:form[doc.k]?"#00C896":T.mu }}>
                {form[doc.k]?"Confirmed":"Tap to confirm"}
              </div>
            </div>
          ))}
        </>}

        {step===3 && <>
          <div style={{ fontWeight:900, fontSize:18, marginBottom:16 }}>Agreement</div>
          {[
            { k:"agreedTerms", l:"I agree to the NoRush Courier Service Agreement" },
            { k:"agreedContractor", l:"I understand I am an independent contractor, responsible for my own tax obligations" },
          ].map(a=>(
            <div key={a.k} onClick={()=>set(a.k,!form[a.k])} style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"12px 0", borderBottom:`1px solid ${T.br}`, cursor:"pointer" }}>
              <div style={{ width:22,height:22,borderRadius:6,border:`2px solid ${form[a.k]?T.ac:T.br}`,background:form[a.k]?T.ac:"transparent",flexShrink:0,marginTop:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff" }}>
                {form[a.k]&&"✓"}
              </div>
              <div style={{ fontSize:13, color:T.tx, lineHeight:1.5 }}>{a.l}</div>
            </div>
          ))}
          <div style={{ background:T.hi, borderRadius:10, padding:"12px 14px", marginTop:16, fontSize:12, color:T.mu }}>
            ⏱ Background check takes 2–5 business days. You'll be notified when approved.
          </div>
        </>}
      </div>

      <div style={{ position:"fixed", bottom:0, left:0, right:0, padding:"12px 20px 24px", background:T.bg, borderTop:`1px solid ${T.br}`, display:"flex", gap:10 }}>
        {step>0 && <Btn variant="secondary" onClick={()=>setStep(s=>s-1)} T={T} style={{ flex:0.4 }}>← Back</Btn>}
        {step<steps.length-1
          ? <Btn onClick={()=>setStep(s=>s+1)} T={T} style={{ flex:1 }}>Continue →</Btn>
          : <Btn variant="green" onClick={submit} disabled={loading||!form.agreedTerms||!form.agreedContractor} T={T} style={{ flex:1 }}>{loading?"Submitting...":"Submit application ✓"}</Btn>
        }
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PENDING APPROVAL SCREEN
═══════════════════════════════════════════════════════════════════ */
function PendingApproval({ role, onSignOut }) {
  const T = D;
  const info = role === "restaurant"
    ? { emoji:"🍽", title:"Application submitted!", sub:"We'll review your restaurant within 1–2 business days. You'll receive an email when approved.", color:"#F39C12" }
    : { emoji:"🛵", title:"Application submitted!", sub:"Background check takes 2–5 days. We'll email you when your account is approved and ready.", color:"#00C896" };
  return (
    <div style={{ background:T.bg, minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, fontFamily:"inherit", color:T.tx, textAlign:"center" }}>
      <div style={{ fontSize:64, marginBottom:16 }}>{info.emoji}</div>
      <div style={{ fontSize:22, fontWeight:900, marginBottom:10 }}>{info.title}</div>
      <div style={{ fontSize:14, color:T.mu, maxWidth:300, lineHeight:1.6, marginBottom:32 }}>{info.sub}</div>
      <div style={{ background:T.sf, borderRadius:14, padding:"16px 20px", border:`1px solid ${T.br}`, marginBottom:24, width:"100%", maxWidth:320 }}>
        <div style={{ fontSize:11, fontWeight:800, color:T.mu, textTransform:"uppercase", marginBottom:8 }}>What happens next</div>
        {["NoRush reviews your application","You get an email with the decision","Once approved, you're live and earning"].map((s,i)=>(
          <div key={i} style={{ display:"flex", gap:10, alignItems:"center", marginBottom:8 }}>
            <div style={{ width:22,height:22,borderRadius:"50%",background:info.color+"22",color:info.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0 }}>{i+1}</div>
            <div style={{ fontSize:12, color:T.mu }}>{s}</div>
          </div>
        ))}
      </div>
      <button onClick={onSignOut} style={{ background:"none",border:"none",color:T.mu,fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>Sign out</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CUSTOMER APP — full ordering experience
═══════════════════════════════════════════════════════════════════ */
function CustomerApp({ user, onSignOut, orders, fetchOrders }) {
  const [scr, setScr] = useState("home");
  const [restaurants, setRestaurants] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [rest, setRest] = useState(null);
  const [myOrderId, setMyOrderId] = useState(null);
  const [loading, setLoading] = useState(false);
  const T = D;
  const profile = user.profile;

  useEffect(()=>{
    db("restaurants","GET",null,"?is_approved=eq.true&select=*").then(d=>{ if(d) setRestaurants(d); });
  },[]);

  const myOrder = orders.find(o=>o.id===myOrderId)||null;
  useEffect(()=>{ if(myOrderId) setScr("track"); },[myOrderId]);

  const addC=(item)=>setCart(p=>{const ex=p.find(i=>i.id===item.id);return ex?p.map(i=>i.id===item.id?{...i,qty:i.qty+1}:i):[...p,{...item,qty:1}];});
  const remC=(id)=>setCart(p=>p.map(i=>i.id===id?{...i,qty:i.qty-1}:i).filter(i=>i.qty>0));
  const qty=(id)=>cart.find(i=>i.id===id)?.qty||0;
  const sub=cart.reduce((s,i)=>s+i.price*i.qty,0);
  const fee=1.90,tot=sub+fee;
  const cnt=cart.reduce((s,i)=>s+i.qty,0);

  const loadMenu=async(r)=>{
    setRest(r);
    const items=await db("menu_items","GET",null,`?restaurant_id=eq.${r.id}&is_available=eq.true&select=*&order=category.asc`);
    if(items) setMenuItems(items);
    setScr("menu");
  };

  const placeOrder=async()=>{
    setLoading(true);
    const result=await dbAuth("orders","POST",{
      restaurant_id:rest.id,
      customer_id:profile?.id||null,
      customer_name:profile?.full_name||user.email,
      customer_address:profile?.address||"Lauttasaari",
      customer_lat:profile?.lat||60.1560,
      customer_lng:profile?.lng||24.8820,
      items:cart.map(i=>({id:i.id,name:i.name,price:i.price,qty:i.qty})),
      subtotal:sub,delivery_fee:fee,total:tot,status:"new",pay_method:"card",
    },"",user.token);
    setLoading(false);
    if(result?.[0]){setMyOrderId(result[0].id);await fetchOrders();setCart([]);}
    else alert("Order failed — try again");
  };

  // TOP BAR
  const TopBar = ({ title, back }) => (
    <div style={{ padding:"12px 16px", display:"flex", alignItems:"center", gap:10, background:T.bg, position:"sticky", top:0, zIndex:5, borderBottom:`1px solid ${T.br}` }}>
      {back && <button onClick={back} style={{ background:T.hi, border:"none", color:T.tx, width:34, height:34, borderRadius:9, cursor:"pointer", fontSize:18 }}>‹</button>}
      <div style={{ flex:1, fontWeight:800, fontSize:14 }}>{title}</div>
      <button onClick={onSignOut} style={{ background:"none", border:"none", color:T.mu, fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>Sign out</button>
    </div>
  );

  if(scr==="home") return(
    <div style={{ background:T.bg, minHeight:"100vh", color:T.tx, fontFamily:"inherit" }}>
      <div style={{ padding:"16px 16px 0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
          <div style={{ fontSize:10, color:T.mu }}>📍 {profile?.address?.split(",")[0]||"Lauttasaari, Helsinki"}</div>
          <button onClick={onSignOut} style={{ background:"none", border:"none", color:T.mu, fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>Sign out</button>
        </div>
        <div style={{ fontSize:22,fontWeight:900,letterSpacing:"-0.5px",lineHeight:1.2,marginBottom:14 }}>
          Hey {profile?.full_name?.split(" ")[0]||"there"} 👋<br/><span style={{ color:T.ac }}>What are you craving?</span>
        </div>
        <div style={{ background:`linear-gradient(130deg,${T.ac},#FF6535)`,borderRadius:14,padding:"14px 16px",marginBottom:18,position:"relative",overflow:"hidden" }}>
          <div style={{ position:"absolute",right:-10,bottom:-10,fontSize:72,opacity:0.1 }}>🛵</div>
          <div style={{ fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",opacity:0.8 }}>Lauttasaari pilot</div>
          <div style={{ fontSize:15,fontWeight:900,marginTop:3 }}>Lower fees. Faster delivery.</div>
        </div>
      </div>
      <div style={{ padding:"0 16px 40px" }}>
        <div style={{ fontSize:11,fontWeight:800,color:T.mu,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10 }}>
          {restaurants.length===0?"Loading...":restaurants.length+" restaurant"+(restaurants.length!==1?"s":"")+" nearby"}
        </div>
        {restaurants.map(r=>(
          <div key={r.id} onClick={()=>loadMenu(r)} style={{ background:T.sf,borderRadius:14,overflow:"hidden",marginBottom:10,cursor:"pointer",border:`1px solid ${T.br}`,transition:"transform 0.1s" }}
            onMouseEnter={e=>e.currentTarget.style.transform="scale(1.01)"}
            onMouseLeave={e=>e.currentTarget.style.transform=""}>
            <div style={{ height:62,background:`linear-gradient(135deg,#FF3B2F33,#FF6B3511)`,display:"flex",alignItems:"center",gap:14,padding:"0 16px" }}>
              <span style={{ fontSize:32 }}>🍽</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800,fontSize:14 }}>{r.name}</div>
                <div style={{ color:T.mu,fontSize:11 }}>{r.cuisine} · {r.address}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:11,color:T.gr,fontWeight:700 }}>● Open</div>
                <div style={{ fontSize:10,color:T.mu }}>🛵 €{fee.toFixed(2)}</div>
              </div>
            </div>
          </div>
        ))}
        {restaurants.length===0&&<div style={{ textAlign:"center",padding:40,color:T.mu,fontSize:12 }}>Loading restaurants...</div>}
      </div>
    </div>
  );

  if(scr==="menu") return(
    <div style={{ background:T.bg,minHeight:"100vh",color:T.tx,fontFamily:"inherit",display:"flex",flexDirection:"column" }}>
      <TopBar title={rest?.name} back={()=>setScr("home")}/>
      <div style={{ flex:1,padding:"12px 14px",paddingBottom:cnt>0?90:24,overflowY:"auto" }}>
        {menuItems.length===0&&<div style={{ textAlign:"center",padding:30,color:T.mu }}>Loading menu...</div>}
        {[...new Set(menuItems.map(i=>i.category))].map(cat=>(
          <div key={cat}>
            <div style={{ fontSize:11,fontWeight:800,color:T.mu,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8,marginTop:16 }}>{cat}</div>
            {menuItems.filter(i=>i.category===cat).map(item=>{
              const q=qty(item.id);
              return(
                <div key={item.id} style={{ background:T.sf,borderRadius:12,padding:"12px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${q>0?T.ac+"55":T.br}` }}>
                  <div style={{ flex:1,marginRight:10 }}>
                    <div style={{ fontWeight:700,fontSize:13 }}>{item.name}</div>
                    <div style={{ color:T.mu,fontSize:11,marginTop:1 }}>{item.description}</div>
                    {item.allergens?.length>0&&<div style={{ fontSize:9,color:T.yw,marginTop:2 }}>⚠️ {item.allergens.join(", ")}</div>}
                    <div style={{ color:T.ac,fontWeight:800,fontSize:13,marginTop:5 }}>€{item.price.toFixed(2)}</div>
                  </div>
                  <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                    {q>0&&<><button onClick={()=>remC(item.id)} style={{ width:28,height:28,borderRadius:7,background:T.hi,border:"none",color:T.tx,cursor:"pointer",fontSize:17,fontFamily:"inherit" }}>−</button><span style={{ fontWeight:800,fontSize:13,minWidth:14,textAlign:"center" }}>{q}</span></>}
                    <button onClick={()=>addC(item)} style={{ width:28,height:28,borderRadius:7,background:T.ac,border:"none",color:"#fff",cursor:"pointer",fontSize:17,fontFamily:"inherit" }}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {cnt>0&&(
        <div style={{ position:"fixed",bottom:0,left:0,right:0,padding:"10px 16px 20px",background:T.bg+"F8",borderTop:`1px solid ${T.br}` }}>
          <button onClick={()=>setScr("checkout")} style={{ width:"100%",background:T.ac,color:"#fff",border:"none",borderRadius:12,padding:"13px 16px",fontSize:14,fontWeight:800,cursor:"pointer",display:"flex",justifyContent:"space-between",fontFamily:"inherit" }}>
            <span style={{ background:"rgba(0,0,0,0.2)",borderRadius:6,padding:"2px 9px" }}>{cnt}</span>
            <span>Checkout</span>
            <span>€{sub.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  );

  if(scr==="checkout") return(
    <div style={{ background:T.bg,minHeight:"100vh",color:T.tx,fontFamily:"inherit" }}>
      <TopBar title="Checkout" back={()=>setScr("menu")}/>
      <div style={{ padding:"14px 14px 110px" }}>
        <div style={{ background:T.sf,borderRadius:12,padding:"12px 14px",marginBottom:10,border:`1px solid ${T.br}` }}>
          <div style={{ fontSize:10,fontWeight:800,color:T.mu,textTransform:"uppercase",marginBottom:4 }}>Delivering to</div>
          <div style={{ fontWeight:700,fontSize:13 }}>{profile?.full_name}</div>
          <div style={{ fontSize:12,color:T.mu,marginTop:2 }}>{profile?.address}</div>
        </div>
        <div style={{ background:T.sf,borderRadius:12,padding:"12px 14px",marginBottom:10,border:`1px solid ${T.br}` }}>
          <div style={{ fontSize:10,fontWeight:800,color:T.mu,textTransform:"uppercase",marginBottom:8 }}>Order · {rest?.name}</div>
          {cart.map(i=><div key={i.id} style={{ display:"flex",justifyContent:"space-between",fontSize:12,color:T.mu,marginBottom:5 }}><span>{i.qty}× {i.name}</span><span style={{ color:T.tx,fontWeight:600 }}>€{(i.price*i.qty).toFixed(2)}</span></div>)}
          <div style={{ borderTop:`1px solid ${T.br}`,paddingTop:8,marginTop:4 }}>
            <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,color:T.mu,marginBottom:4 }}><span>Delivery fee</span><span>€{fee.toFixed(2)}</span></div>
            <div style={{ display:"flex",justifyContent:"space-between",fontWeight:900,fontSize:15 }}><span>Total</span><span style={{ color:T.ac }}>€{tot.toFixed(2)}</span></div>
          </div>
        </div>
        <div style={{ background:T.sf,borderRadius:12,padding:"12px 14px",border:`1px solid ${T.br}` }}>
          <div style={{ fontWeight:700,fontSize:13 }}>💳 Test mode — no real charge</div>
        </div>
      </div>
      <div style={{ position:"fixed",bottom:0,left:0,right:0,padding:"10px 16px 20px",background:T.bg+"F8",borderTop:`1px solid ${T.br}` }}>
        <button onClick={placeOrder} disabled={loading} style={{ width:"100%",background:loading?T.mu:T.ac,color:"#fff",border:"none",borderRadius:12,padding:"14px 16px",fontSize:14,fontWeight:900,cursor:loading?"not-allowed":"pointer",display:"flex",justifyContent:"space-between",fontFamily:"inherit" }}>
          <span>{loading?"Placing...":"Place order 🚀"}</span><span>€{tot.toFixed(2)}</span>
        </button>
      </div>
    </div>
  );

  if(scr==="track") return(
    <div style={{ background:T.bg,minHeight:"100vh",color:T.tx,fontFamily:"inherit" }}>
      <TopBar title="Live tracking"/>
      {myOrder?(
        <>
          <LiveMap restLat={restaurants.find(r=>r.id===myOrder?.restaurant_id)?.lat||60.1575} restLng={restaurants.find(r=>r.id===myOrder?.restaurant_id)?.lng||24.8855} custLat={myOrder?.customer_lat} custLng={myOrder?.customer_lng} courLat={myOrder?.courier_lat} courLng={myOrder?.courier_lng} height={220}/>
          <div style={{ padding:"12px 14px" }}>
            <div style={{ background:myOrder.status==="delivered"?T.gr+"18":T.ac+"18",border:`1px solid ${myOrder.status==="delivered"?T.gr+"44":T.ac+"44"}`,borderRadius:14,padding:"14px 16px",display:"flex",gap:14,alignItems:"center",marginBottom:12 }}>
              <div style={{ width:40,height:40,borderRadius:11,background:myOrder.status==="delivered"?T.gr:T.ac,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>
                {myOrder.status==="delivered"?"🎉":myOrder.status==="picked_up"?"🛵":myOrder.status==="preparing"?"👨‍🍳":"✓"}
              </div>
              <div>
                <div style={{ fontWeight:800,fontSize:14 }}>{STATUS_META[myOrder.status]?.label}</div>
                <div style={{ fontSize:11,color:T.mu,marginTop:2 }}>Order #{myOrder.id?.slice(0,8)} · €{myOrder.total?.toFixed(2)}</div>
              </div>
            </div>
            <div style={{ background:T.sf,borderRadius:12,padding:"12px 14px",marginBottom:12,border:`1px solid ${T.br}` }}>
              {SK.map((s,i)=>{
                const done=i<SK.indexOf(myOrder.status),active=i===SK.indexOf(myOrder.status);
                return(
                  <div key={s} style={{ display:"flex",gap:10,marginBottom:i<SK.length-1?10:0 }}>
                    <div style={{ display:"flex",flexDirection:"column",alignItems:"center" }}>
                      <div style={{ width:22,height:22,borderRadius:"50%",background:done?T.gr:active?T.ac:T.hi,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",flexShrink:0,transition:"background 0.3s" }}>{done?"✓":i+1}</div>
                      {i<SK.length-1&&<div style={{ width:2,height:10,marginTop:2,background:done?T.gr:T.br }}/>}
                    </div>
                    <div style={{ paddingTop:1 }}><div style={{ fontSize:12,fontWeight:active?800:400,color:active?T.tx:done?T.mu:"#444" }}>{STATUS_META[s].label}</div></div>
                  </div>
                );
              })}
            </div>
            <button onClick={fetchOrders} style={{ width:"100%",background:T.hi,border:"none",borderRadius:10,padding:"10px 0",fontSize:12,fontWeight:700,cursor:"pointer",color:T.mu,fontFamily:"inherit",marginBottom:8 }}>↻ Refresh status</button>
            {myOrder.status==="delivered"&&<Btn onClick={()=>{setMyOrderId(null);setScr("home");}} T={T}>Order again 🔄</Btn>}
          </div>
        </>
      ):(
        <div style={{ padding:30,textAlign:"center",color:T.mu }}>Loading order...<br/><button onClick={fetchOrders} style={{ marginTop:10,background:T.hi,border:"none",borderRadius:7,padding:"7px 14px",fontSize:11,fontWeight:700,cursor:"pointer",color:T.mu,fontFamily:"inherit" }}>↻ Refresh</button></div>
      )}
    </div>
  );
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   RESTAURANT APP
═══════════════════════════════════════════════════════════════════ */
function RestaurantApp({ user, onSignOut, orders, fetchOrders }) {
  const [sel, setSel] = useState(null);
  const [updating, setUpdating] = useState(null);
  const T = L;
  const NEXT={new:"accepted",accepted:"preparing",heading_to_restaurant:"preparing",preparing:"ready"};
  const BTN={new:"✓ Accept",accepted:"🍳 Start cooking",heading_to_restaurant:"🍳 Start cooking",preparing:"🔔 Mark ready"};

  // Filter to only this restaurant's orders
  const myOrders = orders.filter(o => o.restaurant_id === user.profile?.id);

  async function advance(order){
    const next=NEXT[order.status]; if(!next) return;
    setUpdating(order.id);
    await dbAuth("orders","PATCH",{status:next},`?id=eq.${order.id}`,user.token);
    await fetchOrders(); setUpdating(null);
  }

  const selected = myOrders.find(o=>o.id===sel);
  const revenue = myOrders.filter(o=>o.status==="delivered").reduce((s,o)=>s+(o.total||0),0);

  return(
    <div style={{ background:T.bg,minHeight:"100vh",display:"flex",flexDirection:"column",fontFamily:"inherit",color:T.tx }}>
      <div style={{ padding:"12px 16px",background:T.sf,borderBottom:`1px solid ${T.br}`,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:34,height:34,borderRadius:9,background:T.ac,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>🍽</div>
          <div><div style={{ fontWeight:900,fontSize:15 }}>{user.profile?.name||"Restaurant"}</div><div style={{ fontSize:10,color:T.mu }}>Lauttasaari</div></div>
        </div>
        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
          <button onClick={fetchOrders} style={{ background:T.hi,border:"none",borderRadius:7,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer",color:T.mu,fontFamily:"inherit" }}>↻</button>
          <button onClick={onSignOut} style={{ background:"none",border:"none",color:T.mu,fontSize:11,cursor:"pointer",fontFamily:"inherit" }}>Sign out</button>
        </div>
      </div>
      <div style={{ display:"flex",gap:6,padding:"10px 12px",background:T.sf,borderBottom:`1px solid ${T.br}` }}>
        {[{l:"Revenue",v:`€${revenue.toFixed(0)}`,c:T.gr,bg:"#EAFAF1"},{l:"New",v:myOrders.filter(o=>o.status==="new").length,c:T.ac,bg:"#FDEDEC"},{l:"Active",v:myOrders.filter(o=>o.status!=="delivered").length,c:T.bl,bg:"#EBF5FB"},{l:"Total",v:myOrders.length,c:T.mu,bg:T.hi}].map(k=>(
          <div key={k.l} style={{ flex:1,background:k.bg,borderRadius:8,padding:"6px 10px" }}>
            <div style={{ fontSize:16,fontWeight:900,color:k.c }}>{k.v}</div>
            <div style={{ fontSize:9,fontWeight:800,color:k.c,textTransform:"uppercase",letterSpacing:"0.05em" }}>{k.l}</div>
          </div>
        ))}
      </div>
      <div style={{ flex:1,display:"flex",overflow:"hidden" }}>
        <div style={{ width:"44%",borderRight:`1px solid ${T.br}`,overflowY:"auto" }}>
          {myOrders.length===0&&<div style={{ padding:20,textAlign:"center",color:T.mu,fontSize:11 }}>No orders yet.<br/>Waiting...</div>}
          {myOrders.map(o=>{
            const isNew=o.status==="new",isSel=sel===o.id;
            return(
              <div key={o.id} onClick={()=>setSel(o.id)} style={{ padding:"10px 12px",borderBottom:`1px solid ${T.br}`,cursor:"pointer",background:isSel?T.ac+"0F":"transparent",borderLeft:`3px solid ${isSel?T.ac:isNew?T.ac+"66":"transparent"}` }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3 }}>
                  <span style={{ fontWeight:900,fontSize:12 }}>#{o.id?.slice(0,6)}</span>
                  <Badge status={o.status}/>
                </div>
                <div style={{ fontSize:11,color:T.mu,marginBottom:3 }}>{o.customer_name}</div>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:11 }}>
                  <span style={{ color:T.mu }}>{o.items?.length||0} items</span>
                  <span style={{ fontWeight:700 }}>€{o.total?.toFixed(2)}</span>
                </div>
                {NEXT[o.status]&&<button onClick={e=>{e.stopPropagation();advance(o);}} disabled={updating===o.id} style={{ width:"100%",marginTop:6,padding:"5px 0",background:isNew?T.ac:"#333",color:"#fff",border:"none",borderRadius:6,fontSize:10,fontWeight:800,cursor:"pointer",fontFamily:"inherit",opacity:updating===o.id?0.6:1 }}>
                  {updating===o.id?"...":BTN[o.status]} →
                </button>}
              </div>
            );
          })}
        </div>
        <div style={{ flex:1,overflowY:"auto" }}>
          {!selected?(
            <div style={{ height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:T.mu,gap:8,padding:20 }}>
              <div style={{ fontSize:36 }}>📋</div>
              <div style={{ fontWeight:700,fontSize:13 }}>Select an order</div>
            </div>
          ):(
            <div style={{ padding:"14px" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
                <div><div style={{ fontWeight:900,fontSize:15 }}>#{selected.id?.slice(0,8)}</div><div style={{ fontSize:11,color:T.mu,marginTop:2 }}>{selected.customer_name}</div></div>
                <Badge status={selected.status} large/>
              </div>
              {selected.courier_lat&&selected.courier_lng&&(
                <div style={{ borderRadius:12,overflow:"hidden",marginBottom:12 }}>
                  <LiveMap restLat={user.profile?.lat||60.1575} restLng={user.profile?.lng||24.8855} custLat={selected.customer_lat} custLng={selected.customer_lng} courLat={selected.courier_lat} courLng={selected.courier_lng} height={150} zoom={13}/>
                  <div style={{ background:T.hi,padding:"6px 12px",fontSize:10,fontWeight:700,color:T.mu }}>🛵 {selected.courier_name||"Courier"} — live</div>
                </div>
              )}
              <div style={{ background:T.hi,borderRadius:10,padding:"10px 12px",marginBottom:10 }}>
                {selected.items?.map((item,i)=>(<div key={i} style={{ display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5 }}><span style={{ color:T.mu }}>{item.qty}× {item.name}</span><span style={{ fontWeight:700 }}>€{(item.price*item.qty).toFixed(2)}</span></div>))}
                <div style={{ borderTop:`1px solid ${T.br}`,paddingTop:7,marginTop:3,display:"flex",justifyContent:"space-between",fontWeight:900,fontSize:13 }}>
                  <span>Total</span><span style={{ color:T.ac }}>€{selected.total?.toFixed(2)}</span>
                </div>
              </div>
              {NEXT[selected.status]&&<button onClick={()=>advance(selected)} disabled={updating===selected.id} style={{ width:"100%",padding:"12px 0",background:T.ac,color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:900,cursor:"pointer",fontFamily:"inherit" }}>{updating===selected.id?"Updating...":BTN[selected.status]} →</button>}
              {selected.status==="delivered"&&<div style={{ textAlign:"center",padding:10,background:"#EAFAF1",borderRadius:10,color:T.gr,fontWeight:800,fontSize:12 }}>✅ Completed</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   COURIER APP — real GPS, proper active tab
═══════════════════════════════════════════════════════════════════ */
function CourierApp({ user, onSignOut, orders, fetchOrders }) {
  const [online, setOnline] = useState(false);
  const [scr, setScr] = useState("jobs");
  const [myLat, setMyLat] = useState(null);
  const [myLng, setMyLng] = useState(null);
  const [gps, setGps] = useState("off");
  const [updating, setUpdating] = useState(null);
  const watchRef = useRef(null);
  const pushRef = useRef(null);
  const T = D;
  const courierId = user.profile?.id;

  useEffect(()=>{
    if(!online){
      if(watchRef.current) navigator.geolocation?.clearWatch(watchRef.current);
      clearInterval(pushRef.current); setGps("off"); return;
    }
    if(!navigator.geolocation){setGps("unavailable");return;}
    setGps("getting");
    watchRef.current=navigator.geolocation.watchPosition(
      p=>{setMyLat(p.coords.latitude);setMyLng(p.coords.longitude);setGps("active");},
      e=>{console.log("GPS:",e.message);setGps("error");},
      {enableHighAccuracy:true,maximumAge:4000,timeout:10000}
    );
    return()=>{ if(watchRef.current)navigator.geolocation.clearWatch(watchRef.current); clearInterval(pushRef.current); };
  },[online]);

  // Push GPS to active order every 5s
  const activeOrder = orders.find(o=>o.courier_id===courierId&&!["delivered"].includes(o.status));
  useEffect(()=>{
    clearInterval(pushRef.current);
    if(!activeOrder?.id||!myLat||!myLng) return;
    const push=()=>dbAuth("orders","PATCH",{courier_lat:myLat,courier_lng:myLng},`?id=eq.${activeOrder.id}`,user.token);
    push();
    pushRef.current=setInterval(push,5000);
    return()=>clearInterval(pushRef.current);
  },[activeOrder?.id,myLat,myLng]);

  const available = orders.filter(o=>["accepted","preparing"].includes(o.status)&&!o.courier_id&&online);
  const myActive = orders.filter(o=>o.courier_id===courierId&&!["delivered"].includes(o.status));
  const myDone = orders.filter(o=>o.courier_id===courierId&&o.status==="delivered");
  const earnings = myDone.reduce((s,o)=>s+(o.delivery_fee||1.9)*0.75,0);

  async function acceptJob(orderId){
    setUpdating(orderId);
    await dbAuth("orders","PATCH",{
      status:"heading_to_restaurant",
      courier_id:courierId,
      courier_name:user.profile?.name||"Courier",
      courier_lat:myLat||60.1590,
      courier_lng:myLng||24.8870,
    },`?id=eq.${orderId}`,user.token);
    await fetchOrders();
    setUpdating(null);
    setScr("active");
  }

  async function confirmPickup(orderId){
    setUpdating(orderId);
    await dbAuth("orders","PATCH",{status:"picked_up"},`?id=eq.${orderId}`,user.token);
    await fetchOrders(); setUpdating(null);
  }

  async function confirmDelivery(orderId){
    setUpdating(orderId);
    await dbAuth("orders","PATCH",{status:"delivered"},`?id=eq.${orderId}`,user.token);
    await fetchOrders(); setUpdating(null); setScr("jobs");
  }

  return(
    <div style={{ background:T.bg,minHeight:"100vh",display:"flex",flexDirection:"column",color:T.tx,fontFamily:"inherit" }}>
      <div style={{ padding:"12px 16px",background:T.sf,borderBottom:`1px solid ${T.br}`,flexShrink:0 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:34,height:34,borderRadius:9,background:online?T.gr+"22":T.hi,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>🛵</div>
            <div>
              <div style={{ fontWeight:800,fontSize:14 }}>{user.profile?.name||"Courier"}</div>
              <div style={{ fontSize:10,color:gps==="active"?T.gr:T.mu }}>
                {gps==="active"?`📍 GPS live · ${myLat?.toFixed(4)}, ${myLng?.toFixed(4)}`:gps==="getting"?"📍 Getting GPS...":gps==="error"?"⚠️ GPS error":"Go online to enable GPS"}
              </div>
            </div>
          </div>
          <div style={{ display:"flex",gap:8,alignItems:"center" }}>
            <button onClick={()=>setOnline(p=>!p)} style={{ background:online?T.gr+"22":T.hi,color:online?T.gr:T.mu,border:`1px solid ${online?T.gr+"44":T.br}`,borderRadius:20,padding:"5px 14px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"inherit" }}>
              {online?"● Online":"○ Go online"}
            </button>
            <button onClick={onSignOut} style={{ background:"none",border:"none",color:T.mu,fontSize:11,cursor:"pointer",fontFamily:"inherit" }}>Out</button>
          </div>
        </div>
      </div>
      <div style={{ display:"flex",background:T.sf,borderBottom:`1px solid ${T.br}`,flexShrink:0 }}>
        {[{k:"jobs",l:"Jobs",b:available.length},{k:"active",l:"Active",b:myActive.length},{k:"earnings",l:"Earnings"}].map(t=>(
          <button key={t.k} onClick={()=>setScr(t.k)} style={{ flex:1,padding:"10px 0",border:"none",background:"none",borderBottom:`2px solid ${scr===t.k?T.ac:"transparent"}`,color:scr===t.k?T.ac:T.mu,fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5 }}>
            {t.l}{t.b>0&&<span style={{ background:T.ac,color:"#fff",borderRadius:20,padding:"0 6px",fontSize:10,fontWeight:900 }}>{t.b}</span>}
          </button>
        ))}
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:"12px 14px" }}>
        {scr==="jobs"&&(
          <>
            {!online&&<div style={{ background:T.sf,borderRadius:12,padding:24,textAlign:"center",color:T.mu }}><div style={{ fontSize:36,marginBottom:8 }}>😴</div><div style={{ fontWeight:700,fontSize:14 }}>You're offline</div><div style={{ fontSize:12,marginTop:4 }}>Tap "Go online" to see jobs</div></div>}
            {online&&available.length===0&&<div style={{ background:T.sf,borderRadius:12,padding:24,textAlign:"center",color:T.mu }}><div style={{ fontSize:36,marginBottom:8 }}>🕐</div><div style={{ fontWeight:700,fontSize:14 }}>No jobs right now</div><button onClick={fetchOrders} style={{ marginTop:14,background:T.hi,border:"none",borderRadius:8,padding:"7px 16px",fontSize:12,fontWeight:700,cursor:"pointer",color:T.mu,fontFamily:"inherit" }}>↻ Refresh</button></div>}
            {online&&available.map(o=>(
              <div key={o.id} style={{ background:T.sf,borderRadius:14,padding:"14px 16px",marginBottom:12,border:`1px solid ${T.br}` }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
                  <div><div style={{ fontWeight:800,fontSize:14 }}>Order #{o.id?.slice(0,6)}</div><div style={{ fontSize:11,color:T.mu,marginTop:2 }}>📍 {o.customer_address}</div></div>
                  <div style={{ textAlign:"right" }}><div style={{ fontWeight:900,fontSize:18,color:T.gr }}>+€{((o.delivery_fee||1.9)*0.75).toFixed(2)}</div><div style={{ fontSize:9,color:T.mu }}>your cut</div></div>
                </div>
                {myLat&&myLng&&<div style={{ borderRadius:10,overflow:"hidden",marginBottom:10,height:120 }}><LiveMap restLat={60.1575} restLng={24.8855} custLat={o.customer_lat} custLng={o.customer_lng} courLat={myLat} courLng={myLng} height={120} zoom={13}/></div>}
                <button onClick={()=>acceptJob(o.id)} disabled={updating===o.id} style={{ width:"100%",background:T.gr,color:"#fff",border:"none",borderRadius:10,padding:"12px 0",fontSize:13,fontWeight:900,cursor:"pointer",fontFamily:"inherit" }}>{updating===o.id?"Accepting...":"Accept & head to restaurant →"}</button>
              </div>
            ))}
          </>
        )}
        {scr==="active"&&(
          <>
            {myActive.length===0&&<div style={{ background:T.sf,borderRadius:12,padding:24,textAlign:"center",color:T.mu }}><div style={{ fontSize:36,marginBottom:8 }}>🛵</div><div style={{ fontWeight:700,fontSize:14 }}>No active deliveries</div><button onClick={fetchOrders} style={{ marginTop:14,background:T.hi,border:"none",borderRadius:8,padding:"7px 16px",fontSize:12,fontWeight:700,cursor:"pointer",color:T.mu,fontFamily:"inherit" }}>↻ Refresh</button></div>}
            {myActive.map(o=>(
              <div key={o.id} style={{ background:T.sf,borderRadius:14,padding:"14px 16px",marginBottom:12,border:`1px solid ${T.gr}44` }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                  <div style={{ fontWeight:900,fontSize:14 }}>Order #{o.id?.slice(0,6)}</div>
                  <Badge status={o.status} large/>
                </div>
                {myLat&&myLng&&<div style={{ borderRadius:10,overflow:"hidden",marginBottom:10,height:160 }}><LiveMap restLat={60.1575} restLng={24.8855} custLat={o.customer_lat} custLng={o.customer_lng} courLat={myLat} courLng={myLng} height={160} zoom={14}/></div>}
                {[{i:"📦",l:"Pick up from",v:o.restaurant_name||"Restaurant"},{i:"📍",l:"Deliver to",v:o.customer_address}].map(row=>(
                  <div key={row.l} style={{ display:"flex",gap:8,alignItems:"center",background:T.hi,borderRadius:8,padding:"7px 10px",marginBottom:6 }}>
                    <span style={{ fontSize:16 }}>{row.i}</span><span style={{ fontSize:10,color:T.mu,minWidth:70 }}>{row.l}</span><span style={{ fontSize:12,fontWeight:700 }}>{row.v}</span>
                  </div>
                ))}
                <div style={{ marginTop:10 }}>
                  {o.status==="ready"&&<button onClick={()=>confirmPickup(o.id)} disabled={updating===o.id} style={{ width:"100%",background:T.yw,color:"#000",border:"none",borderRadius:10,padding:"12px 0",fontSize:13,fontWeight:900,cursor:"pointer",fontFamily:"inherit",marginBottom:8 }}>{updating===o.id?"...":"📦 Confirm pickup"}</button>}
                  {o.status==="picked_up"&&<button onClick={()=>confirmDelivery(o.id)} disabled={updating===o.id} style={{ width:"100%",background:T.gr,color:"#fff",border:"none",borderRadius:10,padding:"12px 0",fontSize:13,fontWeight:900,cursor:"pointer",fontFamily:"inherit" }}>{updating===o.id?"...":"✓ Confirm delivery"}</button>}
                  {["heading_to_restaurant","preparing"].includes(o.status)&&<div style={{ textAlign:"center",fontSize:11,color:T.mu,padding:"8px 0" }}>🛵 Head to restaurant — wait for food to be ready</div>}
                </div>
              </div>
            ))}
          </>
        )}
        {scr==="earnings"&&(
          <div>
            <div style={{ background:T.sf,borderRadius:14,padding:"18px 16px",border:`1px solid ${T.br}`,marginBottom:12 }}>
              <div style={{ fontSize:11,color:T.mu,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:800 }}>Today's earnings</div>
              <div style={{ fontSize:34,fontWeight:900,color:T.gr }}>€{earnings.toFixed(2)}</div>
              <div style={{ fontSize:11,color:T.mu,marginTop:4 }}>{myDone.length} deliveries</div>
            </div>
            {myDone.map(o=>(<div key={o.id} style={{ background:T.sf,borderRadius:10,padding:"10px 14px",marginBottom:8,border:`1px solid ${T.br}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}><div><div style={{ fontSize:12,fontWeight:700 }}>#{o.id?.slice(0,6)}</div><div style={{ fontSize:10,color:T.mu,marginTop:2 }}>→ {o.customer_address?.split(",")[0]}</div></div><div style={{ color:T.gr,fontWeight:800,fontSize:14 }}>+€{((o.delivery_fee||1.9)*0.75).toFixed(2)}</div></div>))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ADMIN APP
═══════════════════════════════════════════════════════════════════ */
function AdminApp({ user, onSignOut, orders, fetchOrders }) {
  const [tab, setTab] = useState("orders");
  const [pending, setPending] = useState({ restaurants:[], couriers:[] });
  const T = N;

  useEffect(()=>{
    dbAuth("restaurants","GET",null,"?is_approved=eq.false&select=*",user.token).then(d=>{ if(d) setPending(p=>({...p,restaurants:d})); });
    dbAuth("couriers","GET",null,"?is_approved=eq.false&select=*",user.token).then(d=>{ if(d) setPending(p=>({...p,couriers:d})); });
  },[]);

  const approve = async (type, id) => {
    await dbAuth(type,"PATCH",{is_approved:true,is_active:true},`?id=eq.${id}`,user.token);
    setPending(p=>({...p,[type]:p[type].filter(x=>x.id!==id)}));
  };
  const reject = async (type, id) => {
    setPending(p=>({...p,[type]:p[type].filter(x=>x.id!==id)}));
  };
  const forceStatus = async (id, status) => {
    await dbAuth("orders","PATCH",{status},`?id=eq.${id}`,user.token);
    fetchOrders();
  };

  const revenue = orders.reduce((s,o)=>s+(o.total||0),0);
  const commission = orders.filter(o=>o.status==="delivered").reduce((s,o)=>s+(o.total||0)*0.15,0);
  const pendingCount = pending.restaurants.length + pending.couriers.length;

  return(
    <div style={{ background:T.bg,minHeight:"100vh",display:"flex",flexDirection:"column",color:T.tx,fontFamily:"inherit" }}>
      <div style={{ padding:"12px 16px",background:T.sf,borderBottom:`1px solid ${T.br}`,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:34,height:34,borderRadius:9,background:`linear-gradient(135deg,${T.ac},#FF6535)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>⚡</div>
          <div><div style={{ fontWeight:900,fontSize:15 }}>NoRush Admin</div><div style={{ fontSize:10,color:T.mu }}>{user.email}</div></div>
        </div>
        <button onClick={onSignOut} style={{ background:"none",border:"none",color:T.mu,fontSize:11,cursor:"pointer",fontFamily:"inherit" }}>Sign out</button>
      </div>
      <div style={{ display:"flex",background:T.sf,borderBottom:`1px solid ${T.br}` }}>
        {[{k:"orders",l:"Orders"},{k:"approvals",l:`Approvals${pendingCount>0?` (${pendingCount})`:""}`},{k:"finance",l:"Finance"}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{ flex:1,padding:"10px 0",border:"none",background:"none",borderBottom:`2px solid ${tab===t.k?T.ac:"transparent"}`,color:tab===t.k?T.ac:T.mu,fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit" }}>{t.l}</button>
        ))}
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:"14px" }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16 }}>
          {[{l:"GMV",v:`€${revenue.toFixed(0)}`,c:T.gr,bg:T.gr+"18"},{l:"Commission",v:`€${commission.toFixed(0)}`,c:T.pu,bg:T.pu+"18"},{l:"Active",v:orders.filter(o=>o.status!=="delivered").length,c:T.bl,bg:T.bl+"18"},{l:"Delivered",v:orders.filter(o=>o.status==="delivered").length,c:"#22C55E",bg:"#22C55E18"}].map(k=>(
            <div key={k.l} style={{ background:k.bg,border:`1px solid ${k.c}22`,borderRadius:12,padding:"12px 14px" }}>
              <div style={{ fontSize:22,fontWeight:900,color:k.c }}>{k.v}</div>
              <div style={{ fontSize:10,fontWeight:800,color:k.c,textTransform:"uppercase",letterSpacing:"0.05em",marginTop:2 }}>{k.l}</div>
            </div>
          ))}
        </div>

        {tab==="orders"&&(
          <>
            <button onClick={fetchOrders} style={{ width:"100%",background:T.hi,border:"none",borderRadius:8,padding:"8px 0",fontSize:12,fontWeight:700,cursor:"pointer",color:T.mu,fontFamily:"inherit",marginBottom:12 }}>↻ Refresh all orders</button>
            {orders.length===0&&<div style={{ background:T.sf,borderRadius:12,padding:24,textAlign:"center",color:T.mu,fontSize:12 }}>No orders yet.</div>}
            {orders.map(o=>(
              <div key={o.id} style={{ background:T.sf,borderRadius:12,padding:"12px 14px",marginBottom:10,border:`1px solid ${T.br}` }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <span style={{ fontWeight:900,fontSize:13 }}>#{o.id?.slice(0,8)}</span>
                    <Badge status={o.status}/>
                  </div>
                  <span style={{ fontWeight:800,fontSize:13,color:T.gr }}>€{o.total?.toFixed(2)}</span>
                </div>
                <div style={{ fontSize:11,color:T.mu,marginBottom:8 }}>{o.customer_name} · {o.customer_address?.split(",")[0]}{o.courier_name&&<span style={{ color:T.gr }}> · 🛵 {o.courier_name}</span>}</div>
                <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
                  {Object.keys(STATUS_META).filter(s=>s!==o.status).map(s=>(
                    <button key={s} onClick={()=>forceStatus(o.id,s)} style={{ background:T.hi,color:T.mu,border:`1px solid ${T.br}`,borderRadius:6,padding:"3px 8px",fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>→{STATUS_META[s].short}</button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {tab==="approvals"&&(
          <>
            <div style={{ fontSize:11,fontWeight:800,color:T.mu,textTransform:"uppercase",marginBottom:10 }}>Pending restaurants</div>
            {pending.restaurants.length===0&&<div style={{ background:T.sf,borderRadius:10,padding:16,textAlign:"center",color:T.mu,fontSize:12,marginBottom:16 }}>No pending restaurants</div>}
            {pending.restaurants.map(r=>(
              <div key={r.id} style={{ background:T.sf,borderRadius:12,padding:"12px 14px",marginBottom:10,border:`1px solid ${T.br}` }}>
                <div style={{ fontWeight:800,fontSize:14,marginBottom:4 }}>{r.name}</div>
                <div style={{ fontSize:11,color:T.mu,marginBottom:10 }}>{r.cuisine} · {r.address}<br/>{r.email} · {r.ytunnus}</div>
                <div style={{ display:"flex",gap:8 }}>
                  <button onClick={()=>approve("restaurants",r.id)} style={{ flex:1,background:"#22C55E",color:"#fff",border:"none",borderRadius:8,padding:"9px 0",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit" }}>✓ Approve</button>
                  <button onClick={()=>reject("restaurants",r.id)} style={{ flex:0.4,background:T.hi,color:T.mu,border:"none",borderRadius:8,padding:"9px 0",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit" }}>✗ Reject</button>
                </div>
              </div>
            ))}
            <div style={{ fontSize:11,fontWeight:800,color:T.mu,textTransform:"uppercase",marginBottom:10,marginTop:16 }}>Pending couriers</div>
            {pending.couriers.length===0&&<div style={{ background:T.sf,borderRadius:10,padding:16,textAlign:"center",color:T.mu,fontSize:12 }}>No pending couriers</div>}
            {pending.couriers.map(c=>(
              <div key={c.id} style={{ background:T.sf,borderRadius:12,padding:"12px 14px",marginBottom:10,border:`1px solid ${T.br}` }}>
                <div style={{ fontWeight:800,fontSize:14,marginBottom:4 }}>{c.name}</div>
                <div style={{ fontSize:11,color:T.mu,marginBottom:4 }}>{c.vehicle} · {c.email}</div>
                <div style={{ display:"flex",gap:6,marginBottom:10,flexWrap:"wrap" }}>
                  {[["ID",c.has_id_doc],["Hygiene",c.has_hygiene_cert]].map(([l,ok])=>(
                    <span key={l} style={{ background:ok?"#22C55E18":"#EF444418",color:ok?"#22C55E":"#EF4444",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:6 }}>{ok?"✓":"✗"} {l}</span>
                  ))}
                </div>
                <div style={{ display:"flex",gap:8 }}>
                  <button onClick={()=>approve("couriers",c.id)} style={{ flex:1,background:"#22C55E",color:"#fff",border:"none",borderRadius:8,padding:"9px 0",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit" }}>✓ Approve</button>
                  <button onClick={()=>reject("couriers",c.id)} style={{ flex:0.4,background:T.hi,color:T.mu,border:"none",borderRadius:8,padding:"9px 0",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit" }}>✗ Reject</button>
                </div>
              </div>
            ))}
          </>
        )}

        {tab==="finance"&&(
          <div style={{ background:T.sf,borderRadius:12,padding:"14px 16px",border:`1px solid ${T.br}` }}>
            <div style={{ fontSize:11,fontWeight:800,color:T.mu,textTransform:"uppercase",marginBottom:12 }}>Platform P&L</div>
            {[
              {l:"Gross order value",v:`€${revenue.toFixed(2)}`,c:T.tx},
              {l:"Commission revenue (15%)",v:`+€${commission.toFixed(2)}`,c:T.gr},
              {l:"Courier payouts (75% of fees)",v:`-€${orders.filter(o=>o.status==="delivered").reduce((s,o)=>s+(o.delivery_fee||1.9)*0.75,0).toFixed(2)}`,c:"#EF4444"},
              {l:"Restaurant payouts (85%)",v:`-€${orders.filter(o=>o.status==="delivered").reduce((s,o)=>s+(o.subtotal||0)*0.85,0).toFixed(2)}`,c:"#EF4444"},
            ].map(k=>(
              <div key={k.l} style={{ display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.br}` }}>
                <span style={{ fontSize:12,color:T.mu }}>{k.l}</span>
                <span style={{ fontSize:13,fontWeight:800,color:k.c }}>{k.v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ROOT — orchestrates everything
═══════════════════════════════════════════════════════════════════ */
export default function App() {
  const [user, setUser] = useState(null); // { token, userId, email, role, profile }
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);

  // Check for saved session on load
  useEffect(()=>{
    const saved = localStorage.getItem("norush_session");
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch(e) {}
    }
    setLoading(false);
  },[]);

  const fetchOrders = async () => {
    const data = await db("orders","GET",null,"?select=*&order=created_at.desc&limit=100");
    if (data) setOrders(data);
  };

  useEffect(()=>{
    if (!user) return;
    fetchOrders();
    const iv = setInterval(fetchOrders, 5000);
    return () => clearInterval(iv);
  },[user?.userId]);

  const handleAuth = async ({ token, userId, email, role }) => {
    setLoading(true);
    // Check if user already has a profile
    let detectedRole = role;
    let profile = null;

    // Check each table for existing profile
    if (!detectedRole) {
      const customer = await dbAuth("customers","GET",null,`?user_id=eq.${userId}&select=*`,token);
      if (customer?.[0]) { detectedRole = "customer"; profile = customer[0]; }
    }
    if (!detectedRole) {
      const restaurant = await dbAuth("restaurants","GET",null,`?owner_id=eq.${userId}&select=*`,token);
      if (restaurant?.[0]) { detectedRole = "restaurant"; profile = restaurant[0]; }
    }
    if (!detectedRole) {
      const courier = await dbAuth("couriers","GET",null,`?user_id=eq.${userId}&select=*`,token);
      if (courier?.[0]) { detectedRole = "courier"; profile = courier[0]; }
    }
    if (!detectedRole) {
      const admin = await dbAuth("admin_users","GET",null,`?user_id=eq.${userId}&select=*`,token);
      if (admin?.[0]) { detectedRole = "admin"; profile = admin[0]; }
    }

    const session = { token, userId, email, role: detectedRole, profile };
    setUser(session);
    localStorage.setItem("norush_session", JSON.stringify(session));
    setLoading(false);
  };

  const handleSignOut = async () => {
    if (user?.token) await signOut(user.token);
    localStorage.removeItem("norush_session");
    setUser(null);
    setOrders([]);
  };

  const handleProfileComplete = (updatedUser) => {
    localStorage.setItem("norush_session", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  if (loading) return (
    <div style={{ background:"#0A0A0F", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ textAlign:"center", color:"#6A6A88" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>🛵</div>
        <div style={{ fontSize:13 }}>Loading NoRush...</div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", minHeight:"100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar{width:3px;} ::-webkit-scrollbar-thumb{background:#444;border-radius:3px;}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        input,select,textarea,button{font-family:'DM Sans',sans-serif;}
      `}</style>

      {/* NOT LOGGED IN */}
      {!user && <AuthScreen onAuth={handleAuth}/>}

      {/* LOGGED IN — needs profile setup */}
      {user && !user.profile && user.role === "customer" && <CustomerSetup user={user} onComplete={handleProfileComplete}/>}
      {user && !user.profile && user.role === "restaurant" && <RestaurantSetup user={user} onComplete={handleProfileComplete}/>}
      {user && !user.profile && user.role === "courier" && <CourierSetup user={user} onComplete={handleProfileComplete}/>}

      {/* LOGGED IN — pending approval */}
      {user && user.profile && user.role === "restaurant" && !user.profile.is_approved && <PendingApproval role="restaurant" onSignOut={handleSignOut}/>}
      {user && user.profile && user.role === "courier" && !user.profile.is_approved && <PendingApproval role="courier" onSignOut={handleSignOut}/>}

      {/* LOGGED IN — active apps */}
      {user && user.profile && user.role === "customer" && <CustomerApp user={user} onSignOut={handleSignOut} orders={orders} fetchOrders={fetchOrders}/>}
      {user && user.profile && user.role === "restaurant" && user.profile.is_approved && <RestaurantApp user={user} onSignOut={handleSignOut} orders={orders} fetchOrders={fetchOrders}/>}
      {user && user.profile && user.role === "courier" && user.profile.is_approved && <CourierApp user={user} onSignOut={handleSignOut} orders={orders} fetchOrders={fetchOrders}/>}
      {user && user.role === "admin" && <AdminApp user={user} onSignOut={handleSignOut} orders={orders} fetchOrders={fetchOrders}/>}
    </div>
  );
}

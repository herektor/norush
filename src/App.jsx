import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════════
   SUPABASE
═══════════════════════════════════════════════════════════════════ */
const SURL = "https://eslxeqhrlalocofesogj.supabase.co";
const SKEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbHhlcWhybGFsb2NvZmVzb2dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDUxNzgsImV4cCI6MjA5MTcyMTE3OH0.47bY9RBN8M6_GyURH0xaq3BpjBXQGqO7HwNxlqdeTls";

async function db(table, method = "GET", body = null, filters = "") {
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

/* ═══════════════════════════════════════════════════════════════════
   THEME
═══════════════════════════════════════════════════════════════════ */
const DARK  = { bg:"#0A0A0F",sf:"#13131A",hi:"#1E1E2A",br:"#2A2A38",ac:"#FF3B2F",tx:"#F0EDF8",mu:"#6A6A88",gr:"#00C896",yw:"#FFB800",bl:"#3B82F6" };
const LIGHT = { bg:"#F5F2EC",sf:"#FFFFFF",hi:"#EDE9E0",br:"#DDD9D0",ac:"#FF3B2F",tx:"#1A1714",mu:"#8A8480",gr:"#1A9E5C",yw:"#E07B20",bl:"#2563EB" };
const NAVY  = { bg:"#080C14",sf:"#0F1520",hi:"#162030",br:"#1E2D42",ac:"#FF3B2F",tx:"#E8F0FE",mu:"#6B8099",gr:"#00C896",yw:"#FFB800",pu:"#A855F7" };

/* ═══════════════════════════════════════════════════════════════════
   STATUS
═══════════════════════════════════════════════════════════════════ */
const STATUS_META = {
  new:                   { label:"Order confirmed",     short:"New",        color:"#E74C3C", bg:"#FDEDEC" },
  accepted:              { label:"Restaurant accepted",  short:"Accepted",   color:"#2980B9", bg:"#EBF5FB" },
  heading_to_restaurant: { label:"Courier en route",     short:"En route",   color:"#1ABC9C", bg:"#E8F8F5" },
  preparing:             { label:"Kitchen cooking",      short:"Cooking",    color:"#E67E22", bg:"#FEF9E7" },
  ready:                 { label:"Ready for pickup",     short:"Ready",      color:"#8E44AD", bg:"#F5EEF8" },
  picked_up:             { label:"On the way to you",    short:"Delivering", color:"#3B82F6", bg:"#EBF5FB" },
  delivered:             { label:"Delivered!",           short:"Done",       color:"#27AE60", bg:"#EAFAF1" },
};
const STATUS_KEYS = Object.keys(STATUS_META);

function SBadge({ status, large }) {
  const m = STATUS_META[status] || { label:status, short:status, color:"#888", bg:"#eee" };
  return (
    <span style={{ background:m.bg, color:m.color, fontSize:large?12:10, fontWeight:800,
      padding:large?"4px 12px":"2px 8px", borderRadius:20, textTransform:"uppercase",
      letterSpacing:"0.04em", display:"inline-flex", alignItems:"center", gap:4, whiteSpace:"nowrap" }}>
      <span style={{ width:5,height:5,borderRadius:"50%",background:m.color,
        ...( ["new","preparing"].includes(status)?{animation:"blink 1.2s infinite"}:{}) }}/>
      {large ? m.label : m.short}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   REAL MAP — Leaflet + OpenStreetMap
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
      const L=window.L;
      const m=L.map(ref.current,{zoomControl:false}).setView([restLat,restLng],zoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap"}).addTo(m);
      L.control.zoom({position:"bottomright"}).addTo(m);
      marks.current.rest = L.marker([restLat,restLng],{icon:mkIcon("🍽","#FF3B2F")}).addTo(m).bindPopup(restName);
      if(custLat&&custLng) marks.current.cust=L.marker([custLat,custLng],{icon:mkIcon("📍","#FF3B2F",32)}).addTo(m).bindPopup("Delivery address");
      if(courLat&&courLng) marks.current.cour=L.marker([courLat,courLng],{icon:mkIcon("🛵","#00C896")}).addTo(m).bindPopup("Courier");
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
   ROLE SELECTOR
═══════════════════════════════════════════════════════════════════ */
function RoleSelector({ onSelect }) {
  const T=DARK;
  const roles=[
    {key:"customer",  emoji:"📱",title:"I'm ordering",      sub:"Browse restaurants & track delivery",   color:"#FF3B2F"},
    {key:"restaurant",emoji:"🍽", title:"I'm the restaurant",sub:"Manage incoming orders",                color:"#F39C12"},
    {key:"courier",   emoji:"🛵",title:"I'm delivering",    sub:"Accept jobs & navigate deliveries",     color:"#00C896"},
    {key:"admin",     emoji:"⚡",title:"Admin",             sub:"Full platform overview & controls",     color:"#A855F7"},
  ];
  return(
    <div style={{background:T.bg,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"inherit",color:T.tx}}>
      <div style={{marginBottom:36,textAlign:"center"}}>
        <div style={{fontSize:52,marginBottom:8}}>🛵</div>
        <div style={{fontSize:30,fontWeight:900,letterSpacing:"-0.8px"}}>NoRush</div>
        <div style={{fontSize:13,color:T.mu,marginTop:4}}>Lauttasaari · Helsinki</div>
        <div style={{fontSize:11,color:T.gr,marginTop:6,fontWeight:700}}>● Connected to live database</div>
      </div>
      <div style={{width:"100%",maxWidth:380,display:"flex",flexDirection:"column",gap:12}}>
        {roles.map(r=>(
          <button key={r.key} onClick={()=>onSelect(r.key)} style={{
            background:T.sf,border:`1px solid ${T.br}`,borderRadius:16,
            padding:"16px 20px",cursor:"pointer",fontFamily:"inherit",
            display:"flex",alignItems:"center",gap:14,textAlign:"left",
            transition:"transform 0.1s,border-color 0.15s",
          }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=r.color;e.currentTarget.style.transform="translateX(4px)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=T.br;e.currentTarget.style.transform="";}}
          >
            <div style={{width:48,height:48,borderRadius:13,background:r.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{r.emoji}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:15,color:T.tx}}>{r.title}</div>
              <div style={{fontSize:12,color:T.mu,marginTop:2}}>{r.sub}</div>
            </div>
            <div style={{color:r.color,fontSize:22,fontWeight:300}}>›</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CUSTOMER APP
═══════════════════════════════════════════════════════════════════ */
function CustomerApp({ orders, fetchOrders }) {
  const [scr,setScr]=useState("home");
  const [restaurants,setRestaurants]=useState([]);
  const [menuItems,setMenuItems]=useState([]);
  const [cart,setCart]=useState([]);
  const [rest,setRest]=useState(null);
  const [loading,setLoading]=useState(false);
  const [name,setName]=useState("");
  const [address,setAddress]=useState("Lauttasaarentie 8, Helsinki");
  const [myOrderId,setMyOrderId]=useState(null);
  const T=DARK;
  const CLAT=60.1560,CLNG=24.8820;

  useEffect(()=>{ db("restaurants","GET",null,"?is_active=eq.true&select=*").then(d=>{if(d)setRestaurants(d);}); },[]);

  const myOrder = orders.find(o=>o.id===myOrderId)||null;
  useEffect(()=>{ if(myOrderId&&scr!=="track") setScr("track"); },[myOrderId]);

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
    if(!name.trim()){alert("Please enter your name");return;}
    setLoading(true);
    const result=await db("orders","POST",{
      restaurant_id:rest.id,customer_name:name,customer_address:address,
      customer_lat:CLAT,customer_lng:CLNG,
      items:cart.map(i=>({id:i.id,name:i.name,price:i.price,qty:i.qty})),
      subtotal:sub,delivery_fee:fee,total:tot,status:"new",pay_method:"card",
    });
    setLoading(false);
    if(result?.[0]){setMyOrderId(result[0].id);await fetchOrders();setCart([]);}
    else alert("Order failed — check F12 console");
  };

  if(scr==="home") return(
    <div style={{background:T.bg,minHeight:"100vh",color:T.tx,fontFamily:"inherit",overflowY:"auto"}}>
      <div style={{padding:"20px 16px 0"}}>
        <div style={{fontSize:10,color:T.mu,marginBottom:3}}>📍 Lauttasaari, Helsinki</div>
        <div style={{fontSize:24,fontWeight:900,letterSpacing:"-0.5px",lineHeight:1.2,marginBottom:14}}>Hungry?<br/><span style={{color:T.ac}}>Order now.</span></div>
        <div style={{background:`linear-gradient(130deg,${T.ac},#FF6535)`,borderRadius:14,padding:"14px 16px",marginBottom:18,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",right:-10,bottom:-10,fontSize:72,opacity:0.1}}>🛵</div>
          <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",opacity:0.8}}>Lauttasaari pilot</div>
          <div style={{fontSize:16,fontWeight:900,marginTop:3}}>Lower fees. Faster delivery.</div>
        </div>
      </div>
      <div style={{padding:"0 16px 40px"}}>
        <div style={{fontSize:11,fontWeight:800,color:T.mu,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10}}>
          {restaurants.length===0?"Connecting...":restaurants.length+" restaurant"+(restaurants.length!==1?"s":"")+" nearby"}
        </div>
        {restaurants.map(r=>(
          <div key={r.id} onClick={()=>loadMenu(r)} style={{background:T.sf,borderRadius:14,overflow:"hidden",marginBottom:10,cursor:"pointer",border:`1px solid ${T.br}`,transition:"transform 0.1s"}}
            onMouseEnter={e=>e.currentTarget.style.transform="scale(1.01)"}
            onMouseLeave={e=>e.currentTarget.style.transform=""}>
            <div style={{height:62,background:`linear-gradient(135deg,#FF3B2F33,#FF6B3511)`,display:"flex",alignItems:"center",gap:14,padding:"0 16px"}}>
              <span style={{fontSize:32}}>🍽</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:14}}>{r.name}</div>
                <div style={{color:T.mu,fontSize:11}}>{r.cuisine} · {r.address}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:11,color:T.gr,fontWeight:700}}>● Open</div>
                <div style={{fontSize:10,color:T.mu}}>🛵 €{fee.toFixed(2)}</div>
              </div>
            </div>
          </div>
        ))}
        {restaurants.length===0&&<div style={{textAlign:"center",padding:40,color:T.mu,fontSize:12}}>Loading...<br/><span style={{fontSize:10}}>Check F12 if stuck</span></div>}
      </div>
    </div>
  );

  if(scr==="menu") return(
    <div style={{background:T.bg,minHeight:"100vh",color:T.tx,fontFamily:"inherit",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:10,background:T.bg,position:"sticky",top:0,zIndex:5,borderBottom:`1px solid ${T.br}`}}>
        <button onClick={()=>setScr("home")} style={{background:T.hi,border:"none",color:T.tx,width:34,height:34,borderRadius:9,cursor:"pointer",fontSize:18}}>‹</button>
        <div style={{flex:1}}><div style={{fontWeight:800,fontSize:14}}>{rest?.name}</div><div style={{fontSize:10,color:T.mu}}>{rest?.address}</div></div>
      </div>
      <div style={{flex:1,padding:"12px 14px",paddingBottom:cnt>0?90:24,overflowY:"auto"}}>
        {menuItems.length===0&&<div style={{textAlign:"center",padding:30,color:T.mu}}>Loading menu...</div>}
        {[...new Set(menuItems.map(i=>i.category))].map(cat=>(
          <div key={cat}>
            <div style={{fontSize:11,fontWeight:800,color:T.mu,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8,marginTop:16}}>{cat}</div>
            {menuItems.filter(i=>i.category===cat).map(item=>{
              const q=qty(item.id);
              return(
                <div key={item.id} style={{background:T.sf,borderRadius:12,padding:"12px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${q>0?T.ac+"55":T.br}`}}>
                  <div style={{flex:1,marginRight:10}}>
                    <div style={{fontWeight:700,fontSize:13}}>{item.name}</div>
                    <div style={{color:T.mu,fontSize:11,marginTop:1}}>{item.description}</div>
                    {item.allergens?.length>0&&<div style={{fontSize:9,color:T.yw,marginTop:2}}>⚠️ {item.allergens.join(", ")}</div>}
                    <div style={{color:T.ac,fontWeight:800,fontSize:13,marginTop:5}}>€{item.price.toFixed(2)}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    {q>0&&<><button onClick={()=>remC(item.id)} style={{width:28,height:28,borderRadius:7,background:T.hi,border:"none",color:T.tx,cursor:"pointer",fontSize:17,fontFamily:"inherit"}}>−</button><span style={{fontWeight:800,fontSize:13,minWidth:14,textAlign:"center"}}>{q}</span></>}
                    <button onClick={()=>addC(item)} style={{width:28,height:28,borderRadius:7,background:T.ac,border:"none",color:"#fff",cursor:"pointer",fontSize:17,fontFamily:"inherit"}}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {cnt>0&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,padding:"10px 16px 20px",background:T.bg+"F8",borderTop:`1px solid ${T.br}`}}>
          <button onClick={()=>setScr("checkout")} style={{width:"100%",background:T.ac,color:"#fff",border:"none",borderRadius:12,padding:"13px 16px",fontSize:14,fontWeight:800,cursor:"pointer",display:"flex",justifyContent:"space-between",fontFamily:"inherit"}}>
            <span style={{background:"rgba(0,0,0,0.2)",borderRadius:6,padding:"2px 9px"}}>{cnt}</span>
            <span>Checkout</span>
            <span>€{sub.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  );

  if(scr==="checkout") return(
    <div style={{background:T.bg,minHeight:"100vh",color:T.tx,fontFamily:"inherit"}}>
      <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${T.br}`}}>
        <button onClick={()=>setScr("menu")} style={{background:T.hi,border:"none",color:T.tx,width:34,height:34,borderRadius:9,cursor:"pointer",fontSize:18}}>‹</button>
        <div style={{fontWeight:800,fontSize:15}}>Checkout</div>
      </div>
      <div style={{padding:"14px 14px 110px"}}>
        {[{l:"Your name *",c:<input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Aino Korhonen" style={{background:"none",border:"none",outline:"none",color:T.tx,fontSize:14,fontWeight:700,width:"100%",fontFamily:"inherit"}}/>},
          {l:"Delivering to",c:<input value={address} onChange={e=>setAddress(e.target.value)} style={{background:"none",border:"none",outline:"none",color:T.tx,fontSize:14,fontWeight:700,width:"100%",fontFamily:"inherit"}}/>},
        ].map(({l,c})=>(
          <div key={l} style={{background:T.sf,borderRadius:12,padding:"12px 14px",marginBottom:10,border:`1px solid ${T.br}`}}>
            <div style={{fontSize:10,fontWeight:800,color:T.mu,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:6}}>{l}</div>{c}
          </div>
        ))}
        <div style={{background:T.sf,borderRadius:12,padding:"12px 14px",marginBottom:10,border:`1px solid ${T.br}`}}>
          <div style={{fontSize:10,fontWeight:800,color:T.mu,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>Order · {rest?.name}</div>
          {cart.map(i=><div key={i.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,color:T.mu,marginBottom:5}}><span>{i.qty}× {i.name}</span><span style={{color:T.tx,fontWeight:600}}>€{(i.price*i.qty).toFixed(2)}</span></div>)}
          <div style={{borderTop:`1px solid ${T.br}`,paddingTop:8,marginTop:4}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:T.mu,marginBottom:4}}><span>Delivery fee</span><span>€{fee.toFixed(2)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",fontWeight:900,fontSize:15}}><span>Total</span><span style={{color:T.ac}}>€{tot.toFixed(2)}</span></div>
          </div>
        </div>
      </div>
      <div style={{position:"fixed",bottom:0,left:0,right:0,padding:"10px 16px 20px",background:T.bg+"F8",borderTop:`1px solid ${T.br}`}}>
        <button onClick={placeOrder} disabled={loading||!name.trim()} style={{width:"100%",background:loading||!name.trim()?T.mu:T.ac,color:"#fff",border:"none",borderRadius:12,padding:"14px 16px",fontSize:14,fontWeight:900,cursor:loading?"not-allowed":"pointer",display:"flex",justifyContent:"space-between",fontFamily:"inherit"}}>
          <span>{loading?"Placing...":"Place order 🚀"}</span><span>€{tot.toFixed(2)}</span>
        </button>
      </div>
    </div>
  );

  if(scr==="track") return(
    <div style={{background:T.bg,minHeight:"100vh",color:T.tx,fontFamily:"inherit"}}>
      <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${T.br}`}}>
        <div style={{fontWeight:800,fontSize:14,flex:1}}>Live tracking</div>
        {myOrder&&<SBadge status={myOrder.status}/>}
        <button onClick={fetchOrders} style={{background:T.hi,border:"none",color:T.mu,padding:"5px 10px",borderRadius:7,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>↻</button>
      </div>
      {myOrder?(
        <>
          <LiveMap
            restLat={restaurants.find(r=>r.id===myOrder.restaurant_id)?.lat||60.1575}
            restLng={restaurants.find(r=>r.id===myOrder.restaurant_id)?.lng||24.8855}
            restName={restaurants.find(r=>r.id===myOrder.restaurant_id)?.name}
            custLat={myOrder.customer_lat} custLng={myOrder.customer_lng}
            courLat={myOrder.courier_lat} courLng={myOrder.courier_lng}
            height={220}
          />
          <div style={{padding:"12px 14px"}}>
            <div style={{background:myOrder.status==="delivered"?T.gr+"18":T.ac+"18",border:`1px solid ${myOrder.status==="delivered"?T.gr+"44":T.ac+"44"}`,borderRadius:14,padding:"14px 16px",display:"flex",gap:14,alignItems:"center",marginBottom:12}}>
              <div style={{width:40,height:40,borderRadius:11,background:myOrder.status==="delivered"?T.gr:T.ac,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                {myOrder.status==="delivered"?"🎉":myOrder.status==="picked_up"?"🛵":myOrder.status==="preparing"?"👨‍🍳":"✓"}
              </div>
              <div>
                <div style={{fontWeight:800,fontSize:14}}>{STATUS_META[myOrder.status]?.label}</div>
                <div style={{fontSize:11,color:T.mu,marginTop:2}}>Order #{myOrder.id?.slice(0,8)} · €{myOrder.total?.toFixed(2)}</div>
              </div>
            </div>
            <div style={{background:T.sf,borderRadius:12,padding:"12px 14px",marginBottom:12,border:`1px solid ${T.br}`}}>
              {STATUS_KEYS.map((s,i)=>{
                const done=i<STATUS_KEYS.indexOf(myOrder.status),active=i===STATUS_KEYS.indexOf(myOrder.status);
                return(
                  <div key={s} style={{display:"flex",gap:10,marginBottom:i<STATUS_KEYS.length-1?10:0}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                      <div style={{width:22,height:22,borderRadius:"50%",background:done?T.gr:active?T.ac:T.hi,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",flexShrink:0,transition:"background 0.3s"}}>{done?"✓":i+1}</div>
                      {i<STATUS_KEYS.length-1&&<div style={{width:2,height:10,marginTop:2,background:done?T.gr:T.br}}/>}
                    </div>
                    <div style={{paddingTop:1}}><div style={{fontSize:12,fontWeight:active?800:400,color:active?T.tx:done?T.mu:"#444"}}>{STATUS_META[s].label}</div></div>
                  </div>
                );
              })}
            </div>
            {myOrder.status==="delivered"&&<button onClick={()=>{setMyOrderId(null);setScr("home");}} style={{width:"100%",background:T.gr,color:"#fff",border:"none",borderRadius:12,padding:14,fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>Order again 🔄</button>}
          </div>
        </>
      ):(
        <div style={{padding:30,textAlign:"center",color:T.mu,fontSize:12}}>Loading order...<br/><button onClick={fetchOrders} style={{marginTop:10,background:T.hi,border:"none",borderRadius:7,padding:"7px 14px",fontSize:11,fontWeight:700,cursor:"pointer",color:T.mu,fontFamily:"inherit"}}>↻ Refresh</button></div>
      )}
    </div>
  );
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   RESTAURANT APP
═══════════════════════════════════════════════════════════════════ */
function RestaurantApp({ orders, fetchOrders }) {
  const [sel,setSel]=useState(null);
  const [updating,setUpdating]=useState(null);
  const T=LIGHT;
  const NEXT={new:"accepted",accepted:"preparing",heading_to_restaurant:"preparing",preparing:"ready"};
  const BTN={new:"✓ Accept",accepted:"🍳 Start cooking",heading_to_restaurant:"🍳 Start cooking",preparing:"🔔 Mark ready"};

  async function advance(order){
    const next=NEXT[order.status]; if(!next) return;
    setUpdating(order.id);
    await db("orders","PATCH",{status:next},`?id=eq.${order.id}`);
    await fetchOrders(); setUpdating(null);
  }

  const selected=orders.find(o=>o.id===sel);
  const revenue=orders.filter(o=>o.status==="delivered").reduce((s,o)=>s+(o.total||0),0);

  return(
    <div style={{background:T.bg,minHeight:"100vh",display:"flex",flexDirection:"column",fontFamily:"inherit",color:T.tx}}>
      <div style={{padding:"12px 16px",background:T.sf,borderBottom:`1px solid ${T.br}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:9,background:T.ac,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🍽</div>
          <div><div style={{fontWeight:900,fontSize:15}}>Restaurant Panel</div><div style={{fontSize:10,color:T.mu}}>Lauttasaari</div></div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={fetchOrders} style={{background:T.hi,border:"none",borderRadius:7,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer",color:T.mu,fontFamily:"inherit"}}>↻ Refresh</button>
          <div style={{display:"flex",alignItems:"center",gap:4,background:"#EAFAF1",color:T.gr,padding:"4px 10px",borderRadius:20,fontSize:10,fontWeight:800}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:T.gr,animation:"blink 2s infinite"}}/>Open
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:6,padding:"10px 12px",background:T.sf,borderBottom:`1px solid ${T.br}`}}>
        {[{l:"Revenue",v:`€${revenue.toFixed(0)}`,c:T.gr,bg:"#EAFAF1"},{l:"New",v:orders.filter(o=>o.status==="new").length,c:T.ac,bg:"#FDEDEC"},{l:"Active",v:orders.filter(o=>o.status!=="delivered").length,c:T.bl,bg:"#EBF5FB"},{l:"Total",v:orders.length,c:T.mu,bg:T.hi}].map(k=>(
          <div key={k.l} style={{flex:1,background:k.bg,borderRadius:8,padding:"6px 10px"}}>
            <div style={{fontSize:16,fontWeight:900,color:k.c}}>{k.v}</div>
            <div style={{fontSize:9,fontWeight:800,color:k.c,textTransform:"uppercase",letterSpacing:"0.05em"}}>{k.l}</div>
          </div>
        ))}
      </div>
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        <div style={{width:"44%",borderRight:`1px solid ${T.br}`,overflowY:"auto"}}>
          {orders.length===0&&<div style={{padding:20,textAlign:"center",color:T.mu,fontSize:11}}>No orders yet.<br/>Waiting...</div>}
          {orders.map(o=>{
            const isNew=o.status==="new",isSel=sel===o.id;
            return(
              <div key={o.id} onClick={()=>setSel(o.id)} style={{padding:"10px 12px",borderBottom:`1px solid ${T.br}`,cursor:"pointer",background:isSel?T.ac+"0F":"transparent",borderLeft:`3px solid ${isSel?T.ac:isNew?T.ac+"66":"transparent"}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                  <span style={{fontWeight:900,fontSize:12}}>#{o.id?.slice(0,6)}</span>
                  <SBadge status={o.status}/>
                </div>
                <div style={{fontSize:11,color:T.mu,marginBottom:3}}>{o.customer_name}</div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
                  <span style={{color:T.mu}}>{o.items?.length||0} items</span>
                  <span style={{fontWeight:700}}>€{o.total?.toFixed(2)}</span>
                </div>
                {NEXT[o.status]&&<button onClick={e=>{e.stopPropagation();advance(o);}} disabled={updating===o.id} style={{width:"100%",marginTop:6,padding:"5px 0",background:isNew?T.ac:"#333",color:"#fff",border:"none",borderRadius:6,fontSize:10,fontWeight:800,cursor:"pointer",fontFamily:"inherit",opacity:updating===o.id?0.6:1}}>
                  {updating===o.id?"...":BTN[o.status]} →
                </button>}
              </div>
            );
          })}
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {!selected?(
            <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:T.mu,gap:8,padding:20}}>
              <div style={{fontSize:36}}>📋</div>
              <div style={{fontWeight:700,fontSize:13}}>Select an order</div>
              <div style={{fontSize:11,textAlign:"center"}}>Orders appear here in real time</div>
            </div>
          ):(
            <div style={{padding:"14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div><div style={{fontWeight:900,fontSize:15}}>Order #{selected.id?.slice(0,8)}</div><div style={{fontSize:11,color:T.mu,marginTop:2}}>{selected.customer_name} · {selected.customer_address}</div></div>
                <SBadge status={selected.status} large/>
              </div>
              <div style={{display:"flex",gap:2,marginBottom:14}}>
                {STATUS_KEYS.map((s,i)=>{const idx=STATUS_KEYS.indexOf(selected.status);return(<div key={s} style={{flex:1,height:3,borderRadius:2,background:i<=idx?(i===idx?T.ac:T.gr):T.br,transition:"background 0.3s"}}/>);})}
              </div>
              {selected.courier_lat&&selected.courier_lng&&(
                <div style={{borderRadius:12,overflow:"hidden",marginBottom:12}}>
                  <LiveMap restLat={60.1575} restLng={24.8855} restName="Restaurant" custLat={selected.customer_lat} custLng={selected.customer_lng} courLat={selected.courier_lat} courLng={selected.courier_lng} height={160} zoom={13}/>
                  <div style={{background:T.hi,padding:"6px 12px",fontSize:10,fontWeight:700,color:T.mu}}>🛵 {selected.courier_name||"Courier"} — live location</div>
                </div>
              )}
              <div style={{background:T.hi,borderRadius:10,padding:"10px 12px",marginBottom:10}}>
                <div style={{fontSize:9,fontWeight:800,color:T.mu,textTransform:"uppercase",marginBottom:8}}>Items</div>
                {selected.items?.map((item,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
                    <span style={{color:T.mu}}>{item.qty}× {item.name}</span>
                    <span style={{fontWeight:700}}>€{(item.price*item.qty).toFixed(2)}</span>
                  </div>
                ))}
                <div style={{borderTop:`1px solid ${T.br}`,paddingTop:7,marginTop:3,display:"flex",justifyContent:"space-between",fontWeight:900,fontSize:13}}>
                  <span>Total</span><span style={{color:T.ac}}>€{selected.total?.toFixed(2)}</span>
                </div>
              </div>
              {NEXT[selected.status]&&<button onClick={()=>advance(selected)} disabled={updating===selected.id} style={{width:"100%",padding:"12px 0",background:T.ac,color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:900,cursor:"pointer",fontFamily:"inherit"}}>{updating===selected.id?"Updating...":BTN[selected.status]} →</button>}
              {selected.status==="delivered"&&<div style={{textAlign:"center",padding:10,background:"#EAFAF1",borderRadius:10,color:T.gr,fontWeight:800,fontSize:12}}>✅ Completed</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   COURIER APP — real GPS pushed to Supabase every 5s
═══════════════════════════════════════════════════════════════════ */
function CourierApp({ orders, fetchOrders }) {
  const [online,setOnline]=useState(false);
  const [scr,setScr]=useState("jobs");
  const [myLat,setMyLat]=useState(null);
  const [myLng,setMyLng]=useState(null);
  const [gps,setGps]=useState("off");
  const [updating,setUpdating]=useState(null);
  const [myActiveId,setMyActiveId]=useState(null);
  const watchRef=useRef(null);
  const pushRef=useRef(null);
  const T=DARK;
  const CID="courier_self"; // courier identifier for testing

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
    return()=>{if(watchRef.current)navigator.geolocation.clearWatch(watchRef.current);clearInterval(pushRef.current);};
  },[online]);

  // Push GPS to Supabase every 5s when on an active delivery
  useEffect(()=>{
    clearInterval(pushRef.current);
    if(!myActiveId||!myLat||!myLng) return;
    const push=()=>db("orders","PATCH",{courier_lat:myLat,courier_lng:myLng},`?id=eq.${myActiveId}`);
    push();
    pushRef.current=setInterval(push,5000);
    return()=>clearInterval(pushRef.current);
  },[myActiveId,myLat,myLng]);

  // FIX: filter correctly — available = unassigned, accepted/preparing
  const available=orders.filter(o=>["accepted","preparing"].includes(o.status)&&!o.courier_id&&online);
  // FIX: myActive = orders where THIS courier is assigned and not yet delivered
  const myActive=orders.filter(o=>o.courier_id===CID&&o.status!=="delivered");
  const myDone=orders.filter(o=>o.courier_id===CID&&o.status==="delivered");
  const earnings=myDone.reduce((s,o)=>s+(o.delivery_fee||1.9)*0.75,0);

  async function acceptJob(orderId){
    setUpdating(orderId);
    await db("orders","PATCH",{
      status:"heading_to_restaurant",courier_id:CID,courier_name:"Mikko K.",
      courier_lat:myLat||60.1590,courier_lng:myLng||24.8870,
    },`?id=eq.${orderId}`);
    setMyActiveId(orderId);
    await fetchOrders();
    setUpdating(null);
    setScr("active"); // switch to active tab immediately
  }

  async function confirmPickup(orderId){
    setUpdating(orderId);
    await db("orders","PATCH",{status:"picked_up"},`?id=eq.${orderId}`);
    await fetchOrders(); setUpdating(null);
  }

  async function confirmDelivery(orderId){
    setUpdating(orderId);
    await db("orders","PATCH",{status:"delivered"},`?id=eq.${orderId}`);
    setMyActiveId(null);
    await fetchOrders(); setUpdating(null); setScr("jobs");
  }

  return(
    <div style={{background:T.bg,minHeight:"100vh",display:"flex",flexDirection:"column",color:T.tx,fontFamily:"inherit"}}>
      <div style={{padding:"12px 16px",background:T.sf,borderBottom:`1px solid ${T.br}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:9,background:online?T.gr+"22":T.hi,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🛵</div>
            <div>
              <div style={{fontWeight:800,fontSize:14}}>Courier App</div>
              <div style={{fontSize:10,color:gps==="active"?T.gr:T.mu}}>
                {gps==="active"?`📍 GPS live · ${myLat?.toFixed(4)}, ${myLng?.toFixed(4)}`:
                 gps==="getting"?"📍 Getting GPS...":
                 gps==="error"?"⚠️ GPS error":
                 gps==="unavailable"?"GPS not available":
                 "Go online to enable GPS"}
              </div>
            </div>
          </div>
          <button onClick={()=>setOnline(p=>!p)} style={{background:online?T.gr+"22":T.hi,color:online?T.gr:T.mu,border:`1px solid ${online?T.gr+"44":T.br}`,borderRadius:20,padding:"5px 14px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>
            {online?"● Online":"○ Go online"}
          </button>
        </div>
      </div>
      <div style={{display:"flex",background:T.sf,borderBottom:`1px solid ${T.br}`,flexShrink:0}}>
        {[{k:"jobs",l:"Jobs",b:available.length},{k:"active",l:"Active",b:myActive.length},{k:"earnings",l:"Earnings"}].map(t=>(
          <button key={t.k} onClick={()=>setScr(t.k)} style={{flex:1,padding:"10px 0",border:"none",background:"none",borderBottom:`2px solid ${scr===t.k?T.ac:"transparent"}`,color:scr===t.k?T.ac:T.mu,fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
            {t.l}{t.b>0&&<span style={{background:T.ac,color:"#fff",borderRadius:20,padding:"0 6px",fontSize:10,fontWeight:900}}>{t.b}</span>}
          </button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 14px"}}>
        {scr==="jobs"&&(
          <>
            {!online&&<div style={{background:T.sf,borderRadius:12,padding:24,textAlign:"center",color:T.mu}}><div style={{fontSize:36,marginBottom:8}}>😴</div><div style={{fontWeight:700,fontSize:14}}>You're offline</div><div style={{fontSize:12,marginTop:4}}>Tap "Go online" to see jobs</div></div>}
            {online&&available.length===0&&<div style={{background:T.sf,borderRadius:12,padding:24,textAlign:"center",color:T.mu}}><div style={{fontSize:36,marginBottom:8}}>🕐</div><div style={{fontWeight:700,fontSize:14}}>No jobs right now</div><div style={{fontSize:12,marginTop:4,maxWidth:200,margin:"8px auto 0"}}>Jobs appear when restaurant accepts an order</div><button onClick={fetchOrders} style={{marginTop:14,background:T.hi,border:"none",borderRadius:8,padding:"7px 16px",fontSize:12,fontWeight:700,cursor:"pointer",color:T.mu,fontFamily:"inherit"}}>↻ Refresh</button></div>}
            {online&&available.map(o=>(
              <div key={o.id} style={{background:T.sf,borderRadius:14,padding:"14px 16px",marginBottom:12,border:`1px solid ${T.br}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div>
                    <div style={{fontWeight:800,fontSize:14}}>Order #{o.id?.slice(0,6)}</div>
                    <div style={{fontSize:11,color:T.mu,marginTop:2}}>📍 {o.customer_address}</div>
                    <div style={{fontSize:11,color:T.yw,fontWeight:700,marginTop:4}}>{o.status==="preparing"?"👨‍🍳 Cooking now — head over":"✅ Accepted — pickup soon"}</div>
                  </div>
                  <div style={{textAlign:"right"}}><div style={{fontWeight:900,fontSize:18,color:T.gr}}>+€{((o.delivery_fee||1.9)*0.75).toFixed(2)}</div><div style={{fontSize:9,color:T.mu}}>your cut</div></div>
                </div>
                {myLat&&myLng&&<div style={{borderRadius:10,overflow:"hidden",marginBottom:10,height:120}}><LiveMap restLat={60.1575} restLng={24.8855} restName="Restaurant" custLat={o.customer_lat} custLng={o.customer_lng} courLat={myLat} courLng={myLng} height={120} zoom={13}/></div>}
                <button onClick={()=>acceptJob(o.id)} disabled={updating===o.id} style={{width:"100%",background:T.gr,color:"#fff",border:"none",borderRadius:10,padding:"12px 0",fontSize:13,fontWeight:900,cursor:"pointer",fontFamily:"inherit"}}>
                  {updating===o.id?"Accepting...":"Accept & head to restaurant →"}
                </button>
              </div>
            ))}
          </>
        )}
        {scr==="active"&&(
          <>
            {myActive.length===0&&<div style={{background:T.sf,borderRadius:12,padding:24,textAlign:"center",color:T.mu}}><div style={{fontSize:36,marginBottom:8}}>🛵</div><div style={{fontWeight:700,fontSize:14}}>No active deliveries</div><div style={{fontSize:12,marginTop:4}}>Accept a job from Jobs tab</div><button onClick={fetchOrders} style={{marginTop:14,background:T.hi,border:"none",borderRadius:8,padding:"7px 16px",fontSize:12,fontWeight:700,cursor:"pointer",color:T.mu,fontFamily:"inherit"}}>↻ Refresh</button></div>}
            {myActive.map(o=>(
              <div key={o.id} style={{background:T.sf,borderRadius:14,padding:"14px 16px",marginBottom:12,border:`1px solid ${T.gr}44`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontWeight:900,fontSize:14}}>Order #{o.id?.slice(0,6)}</div>
                  <SBadge status={o.status} large/>
                </div>
                {myLat&&myLng&&<div style={{borderRadius:10,overflow:"hidden",marginBottom:10,height:160}}><LiveMap restLat={60.1575} restLng={24.8855} restName="Restaurant" custLat={o.customer_lat} custLng={o.customer_lng} courLat={myLat} courLng={myLng} height={160} zoom={14}/></div>}
                {[{i:"📦",l:"Pick up from",v:"Test Restaurant"},{i:"📍",l:"Deliver to",v:o.customer_address}].map(row=>(
                  <div key={row.l} style={{display:"flex",gap:8,alignItems:"center",background:T.hi,borderRadius:8,padding:"7px 10px",marginBottom:6}}>
                    <span style={{fontSize:16}}>{row.i}</span><span style={{fontSize:10,color:T.mu,minWidth:70}}>{row.l}</span><span style={{fontSize:12,fontWeight:700}}>{row.v}</span>
                  </div>
                ))}
                <div style={{marginTop:10}}>
                  {o.status==="ready"&&<button onClick={()=>confirmPickup(o.id)} disabled={updating===o.id} style={{width:"100%",background:T.yw,color:"#000",border:"none",borderRadius:10,padding:"12px 0",fontSize:13,fontWeight:900,cursor:"pointer",fontFamily:"inherit",marginBottom:8}}>{updating===o.id?"...":"📦 Confirm pickup"}</button>}
                  {o.status==="picked_up"&&<button onClick={()=>confirmDelivery(o.id)} disabled={updating===o.id} style={{width:"100%",background:T.gr,color:"#fff",border:"none",borderRadius:10,padding:"12px 0",fontSize:13,fontWeight:900,cursor:"pointer",fontFamily:"inherit"}}>{updating===o.id?"...":"✓ Confirm delivery"}</button>}
                  {["heading_to_restaurant","preparing"].includes(o.status)&&<div style={{textAlign:"center",fontSize:11,color:T.mu,padding:"8px 0"}}>🛵 Navigate to restaurant — wait for food to be ready</div>}
                </div>
              </div>
            ))}
          </>
        )}
        {scr==="earnings"&&(
          <div>
            <div style={{background:T.sf,borderRadius:14,padding:"18px 16px",border:`1px solid ${T.br}`,marginBottom:12}}>
              <div style={{fontSize:11,color:T.mu,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:800}}>Today's earnings</div>
              <div style={{fontSize:34,fontWeight:900,color:T.gr}}>€{earnings.toFixed(2)}</div>
              <div style={{fontSize:11,color:T.mu,marginTop:4}}>{myDone.length} deliveries · €{myDone.length?(earnings/myDone.length).toFixed(2):"0.00"} avg</div>
            </div>
            {myDone.length===0&&<div style={{textAlign:"center",padding:24,color:T.mu,fontSize:12}}>Complete deliveries to see earnings</div>}
            {myDone.map(o=>(
              <div key={o.id} style={{background:T.sf,borderRadius:10,padding:"10px 14px",marginBottom:8,border:`1px solid ${T.br}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><div style={{fontSize:12,fontWeight:700}}>#{o.id?.slice(0,6)}</div><div style={{fontSize:10,color:T.mu,marginTop:2}}>→ {o.customer_address?.split(",")[0]}</div></div>
                <div style={{color:T.gr,fontWeight:800,fontSize:14}}>+€{((o.delivery_fee||1.9)*0.75).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ADMIN APP
═══════════════════════════════════════════════════════════════════ */
function AdminApp({ orders, fetchOrders }) {
  const [tab,setTab]=useState("live");
  const T=NAVY;
  const revenue=orders.reduce((s,o)=>s+(o.total||0),0);
  const commission=orders.filter(o=>o.status==="delivered").reduce((s,o)=>s+(o.total||0)*0.15,0);

  async function forceStatus(id,status){ await db("orders","PATCH",{status},`?id=eq.${id}`); fetchOrders(); }
  async function refundOrder(id){ await db("orders","PATCH",{status:"delivered",refunded:true},`?id=eq.${id}`); fetchOrders(); }

  return(
    <div style={{background:T.bg,minHeight:"100vh",display:"flex",flexDirection:"column",color:T.tx,fontFamily:"inherit"}}>
      <div style={{padding:"12px 16px",background:T.sf,borderBottom:`1px solid ${T.br}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:9,background:`linear-gradient(135deg,${T.ac},#FF6535)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>⚡</div>
          <div><div style={{fontWeight:900,fontSize:15}}>NoRush Admin</div><div style={{fontSize:10,color:T.mu}}>Full platform overview</div></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <button onClick={fetchOrders} style={{background:T.hi,border:"none",borderRadius:7,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer",color:T.mu,fontFamily:"inherit"}}>↻</button>
          <div style={{display:"flex",alignItems:"center",gap:4,background:T.gr+"18",color:T.gr,padding:"4px 10px",borderRadius:20,fontSize:10,fontWeight:800}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:T.gr,animation:"blink 2s infinite"}}/>Live
          </div>
        </div>
      </div>
      <div style={{display:"flex",background:T.sf,borderBottom:`1px solid ${T.br}`}}>
        {[{k:"live",l:"Orders"},{k:"map",l:"🗺 Map"},{k:"finance",l:"Finance"}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{flex:1,padding:"10px 0",border:"none",background:"none",borderBottom:`2px solid ${tab===t.k?T.ac:"transparent"}`,color:tab===t.k?T.ac:T.mu,fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{t.l}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
          {[{l:"GMV",v:`€${revenue.toFixed(0)}`,c:T.gr,bg:T.gr+"18"},{l:"Commission",v:`€${commission.toFixed(0)}`,c:T.pu,bg:T.pu+"18"},{l:"Active",v:orders.filter(o=>o.status!=="delivered").length,c:T.bl,bg:T.bl+"18"},{l:"Delivered",v:orders.filter(o=>o.status==="delivered").length,c:"#22C55E",bg:"#22C55E18"}].map(k=>(
            <div key={k.l} style={{background:k.bg,border:`1px solid ${k.c}22`,borderRadius:12,padding:"12px 14px"}}>
              <div style={{fontSize:22,fontWeight:900,color:k.c}}>{k.v}</div>
              <div style={{fontSize:10,fontWeight:800,color:k.c,textTransform:"uppercase",letterSpacing:"0.05em",marginTop:2}}>{k.l}</div>
            </div>
          ))}
        </div>

        {tab==="live"&&(
          <>
            <div style={{fontSize:11,fontWeight:800,color:T.mu,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>All orders</div>
            {orders.length===0&&<div style={{background:T.sf,borderRadius:12,padding:24,textAlign:"center",color:T.mu,fontSize:12}}>No orders yet.</div>}
            {orders.map(o=>(
              <div key={o.id} style={{background:T.sf,borderRadius:12,padding:"12px 14px",marginBottom:10,border:`1px solid ${T.br}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontWeight:900,fontSize:13}}>#{o.id?.slice(0,8)}</span>
                    <SBadge status={o.status}/>
                    {o.refunded&&<span style={{background:"#EF444415",color:"#EF4444",fontSize:9,fontWeight:800,padding:"1px 6px",borderRadius:10}}>REFUNDED</span>}
                  </div>
                  <span style={{fontWeight:800,fontSize:13,color:T.gr}}>€{o.total?.toFixed(2)}</span>
                </div>
                <div style={{fontSize:11,color:T.mu,marginBottom:8}}>
                  {o.customer_name} · {o.customer_address?.split(",")[0]}
                  {o.courier_name&&<span style={{color:T.gr}}> · 🛵 {o.courier_name}</span>}
                </div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {STATUS_KEYS.filter(s=>s!==o.status).map(s=>(
                    <button key={s} onClick={()=>forceStatus(o.id,s)} style={{background:T.hi,color:T.mu,border:`1px solid ${T.br}`,borderRadius:6,padding:"3px 8px",fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>→{STATUS_META[s].short}</button>
                  ))}
                  {!o.refunded&&<button onClick={()=>refundOrder(o.id)} style={{background:"#EF444415",color:"#EF4444",border:`1px solid #EF444422`,borderRadius:6,padding:"3px 8px",fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Refund</button>}
                </div>
              </div>
            ))}
          </>
        )}

        {tab==="map"&&(
          <>
            <div style={{fontSize:11,fontWeight:800,color:T.mu,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Live courier positions</div>
            {orders.filter(o=>o.courier_lat&&o.courier_lng&&o.status!=="delivered").length===0&&(
              <div style={{background:T.sf,borderRadius:12,padding:24,textAlign:"center",color:T.mu,fontSize:12}}>No active couriers on the map.<br/>Accept a job first.</div>
            )}
            {orders.filter(o=>o.courier_lat&&o.courier_lng&&o.status!=="delivered").map(o=>(
              <div key={o.id} style={{background:T.sf,borderRadius:12,marginBottom:12,overflow:"hidden",border:`1px solid ${T.br}`}}>
                <LiveMap restLat={60.1575} restLng={24.8855} restName="Restaurant" custLat={o.customer_lat} custLng={o.customer_lng} courLat={o.courier_lat} courLng={o.courier_lng} height={200} zoom={14}/>
                <div style={{padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:12,fontWeight:700}}>🛵 {o.courier_name||"Courier"} · #{o.id?.slice(0,6)}</div>
                  <SBadge status={o.status}/>
                </div>
              </div>
            ))}
          </>
        )}

        {tab==="finance"&&(
          <div>
            <div style={{background:T.sf,borderRadius:12,padding:"14px 16px",marginBottom:12,border:`1px solid ${T.br}`}}>
              <div style={{fontSize:11,fontWeight:800,color:T.mu,textTransform:"uppercase",marginBottom:12}}>Platform P&L</div>
              {[
                {l:"Gross order value",v:`€${revenue.toFixed(2)}`,c:T.tx},
                {l:"Commission (15%)",v:`+€${commission.toFixed(2)}`,c:T.gr},
                {l:"Courier payouts (75% of fees)",v:`-€${orders.filter(o=>o.status==="delivered").reduce((s,o)=>s+(o.delivery_fee||1.9)*0.75,0).toFixed(2)}`,c:"#EF4444"},
                {l:"Restaurant payouts (85%)",v:`-€${orders.filter(o=>o.status==="delivered").reduce((s,o)=>s+(o.subtotal||0)*0.85,0).toFixed(2)}`,c:"#EF4444"},
              ].map(k=>(
                <div key={k.l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.br}`}}>
                  <span style={{fontSize:12,color:T.mu}}>{k.l}</span>
                  <span style={{fontSize:13,fontWeight:800,color:k.c}}>{k.v}</span>
                </div>
              ))}
            </div>
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
  const [role,setRole]=useState(null);
  const [orders,setOrders]=useState([]);

  const fetchOrders=async()=>{
    const data=await db("orders","GET",null,"?select=*&order=created_at.desc&limit=100");
    if(data) setOrders(data);
  };

  useEffect(()=>{ fetchOrders(); const iv=setInterval(fetchOrders,5000); return()=>clearInterval(iv); },[]);

  return(
    <div style={{fontFamily:"'DM Sans',sans-serif",minHeight:"100vh"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar{width:3px;} ::-webkit-scrollbar-thumb{background:#444;border-radius:3px;}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
      `}</style>
      {!role ? (
        <RoleSelector onSelect={setRole}/>
      ):(
        <>
          <div style={{padding:"6px 14px",background:"#070707",borderBottom:"1px solid #1a1a1a",display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:18,height:18,borderRadius:4,background:"#FF3B2F",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>🛵</div>
            <span style={{fontSize:10,fontWeight:900,color:"#fff"}}>NoRush</span>
            <span style={{fontSize:9,color:"#00C896",fontWeight:700}}>● Live · Supabase</span>
            <div style={{flex:1}}/>
            <button onClick={()=>setRole(null)} style={{background:"#1a1a1a",border:"none",color:"#666",padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Switch role</button>
          </div>
          {role==="customer"    && <CustomerApp    orders={orders} fetchOrders={fetchOrders}/>}
          {role==="restaurant"  && <RestaurantApp  orders={orders} fetchOrders={fetchOrders}/>}
          {role==="courier"     && <CourierApp     orders={orders} fetchOrders={fetchOrders}/>}
          {role==="admin"       && <AdminApp       orders={orders} fetchOrders={fetchOrders}/>}
        </>
      )}
    </div>
  );
}

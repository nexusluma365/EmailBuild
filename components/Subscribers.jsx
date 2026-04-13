"use client";
import { useState, useEffect } from "react";

const STORAGE_KEY = "email_studio_subscribers";
function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
function save(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

export default function Subscribers() {
  const [subs, setSubs]       = useState([]);
  const [form, setForm]       = useState({ name:"", email:"" });
  const [error, setError]     = useState("");
  const [search, setSearch]   = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { setSubs(load()); }, []);

  const update = newList => { setSubs(newList); save(newList); };

  const add = () => {
    setError(""); setSuccess("");
    const email = form.email.trim().toLowerCase();
    const name  = form.name.trim();
    if (!email) return setError("Email address is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Please enter a valid email address.");
    if (subs.some(s => s.email === email)) return setError("This email already exists in the list.");
    const newSub = { id: Date.now(), name, email, addedAt: new Date().toISOString() };
    update([newSub, ...subs]);
    setForm({ name:"", email:"" });
    setSuccess("Subscriber added successfully.");
    setTimeout(() => setSuccess(""), 3000);
  };

  const remove = id => {
    if (!window.confirm("Remove this subscriber?")) return;
    update(subs.filter(s => s.id !== id));
  };

  const exportCsv = () => {
    const rows = ["Name,Email,Added", ...subs.map(s => `"${s.name}","${s.email}","${new Date(s.addedAt).toLocaleDateString()}"`)] ;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.join("\n")], { type:"text/csv" }));
    a.download = "subscribers.csv"; a.click();
  };

  const importCsv = e => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const lines = ev.target.result.split("\n").slice(1);
      const imported = [];
      for (const line of lines) {
        const cols = line.split(",").map(c => c.replace(/^"|"$/g,"").trim());
        const [name, email] = cols;
        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !subs.some(s=>s.email===email) && !imported.some(s=>s.email===email)) {
          imported.push({ id: Date.now()+Math.random(), name:name||"", email, addedAt:new Date().toISOString() });
        }
      }
      if (imported.length > 0) { update([...imported,...subs]); setSuccess(`Imported ${imported.length} subscriber(s).`); setTimeout(()=>setSuccess(""),3000); }
      else alert("No new valid subscribers found.");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const filtered = subs.filter(s => s.email.includes(search.toLowerCase()) || s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
      {/* Left panel */}
      <div style={{ width:272, background:"#fff", borderRight:"1px solid #E5E0DA", display:"flex", flexDirection:"column", overflow:"hidden", flexShrink:0 }}>
        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:"1px solid #E5E0DA" }}>
          <div style={{ flex:1, padding:"12px 0", textAlign:"center", fontSize:12.5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.04em", color:"#D05A2C", borderBottom:"2px solid #D05A2C", marginBottom:-1 }}>
            List
          </div>
          <div style={{ flex:1, padding:"12px 0", textAlign:"center", fontSize:12.5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.04em", color:"#9CA3AF", borderBottom:"2px solid transparent" }}>
            Import
          </div>
        </div>

        {/* Add form */}
        <div style={{ padding:"14px 12px", borderBottom:"1px solid #EDE9E4", flexShrink:0 }}>
          <div style={{ fontSize:10.5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em", color:"#9CA3AF", marginBottom:10 }}>Add Subscriber</div>
          <input type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
            placeholder="Full name (optional)" className="field-input" style={{ marginBottom:6 }}
            onKeyDown={e=>e.key==="Enter"&&add()}/>
          <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
            placeholder="email@example.com *" className="field-input" style={{ marginBottom:8 }}
            onKeyDown={e=>e.key==="Enter"&&add()}/>
          <button onClick={add}
            style={{ width:"100%", padding:"7px 0", background:"#D05A2C", color:"#fff", border:"none", borderRadius:6, fontSize:12.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}
            onMouseEnter={e=>e.currentTarget.style.background="#B84E25"}
            onMouseLeave={e=>e.currentTarget.style.background="#D05A2C"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Subscriber
          </button>
          {error   && <div style={{ marginTop:8, padding:"6px 10px", background:"#FEF2F2", border:"1px solid #FCA5A5", borderRadius:6, fontSize:12, color:"#DC2626" }}>{error}</div>}
          {success && <div style={{ marginTop:8, padding:"6px 10px", background:"#F0FDF4", border:"1px solid #86EFAC", borderRadius:6, fontSize:12, color:"#16A34A" }}>{success}</div>}
        </div>

        {/* CSV actions */}
        <div style={{ padding:"10px 12px", borderBottom:"1px solid #EDE9E4", display:"flex", gap:6, flexShrink:0 }}>
          <label style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"6px 0", border:"1px solid #E5E0DA", borderRadius:6, fontSize:12, color:"#6B7280", cursor:"pointer", fontWeight:500, background:"#FAFAF9" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#C5B8AC";e.currentTarget.style.background="#F4EFE9";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#E5E0DA";e.currentTarget.style.background="#FAFAF9";}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16,16 12,12 8,16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>
            Import CSV
            <input type="file" accept=".csv" onChange={importCsv} style={{ display:"none" }}/>
          </label>
          {subs.length > 0 && (
            <button onClick={exportCsv}
              style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"6px 0", border:"1px solid #E5E0DA", borderRadius:6, fontSize:12, color:"#6B7280", cursor:"pointer", fontWeight:500, background:"#FAFAF9", fontFamily:"inherit" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#C5B8AC";e.currentTarget.style.background="#F4EFE9";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#E5E0DA";e.currentTarget.style.background="#FAFAF9";}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="8,17 12,21 16,17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.11"/></svg>
              Export
            </button>
          )}
        </div>

        {/* Stats */}
        <div style={{ padding:"10px 14px", flexShrink:0 }}>
          <div style={{ display:"flex", gap:8 }}>
            <StatPill label="Total" value={subs.length} color="#D05A2C"/>
          </div>
        </div>
      </div>

      {/* Right: subscriber table */}
      <div className="canvas-bg" style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Search sub-toolbar */}
        <div style={{ height:44, background:"#fff", borderBottom:"1px solid #E5E0DA", display:"flex", alignItems:"center", padding:"0 16px", gap:8, flexShrink:0 }}>
          <div style={{ position:"relative", flex:1, maxWidth:360 }}>
            <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search subscribers…" className="field-input" style={{ paddingRight:30 }}/>
            <svg style={{ position:"absolute", right:9, top:"50%", transform:"translateY(-50%)", color:"#9CA3AF" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <span style={{ fontSize:12, color:"#9CA3AF" }}>
            {filtered.length} of {subs.length} subscriber{subs.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div style={{ flex:1, overflow:"auto", padding:"20px" }}>
          <div style={{ background:"#fff", borderRadius:10, border:"1px solid #E5E0DA", overflow:"hidden" }}>
            {filtered.length === 0 ? (
              <div style={{ padding:"60px 20px", textAlign:"center", color:"#9CA3AF" }}>
                <div style={{ fontSize:32, marginBottom:10 }}>👥</div>
                <p style={{ fontSize:13, fontWeight:500, color:"#C5B8AC", marginBottom:4 }}>
                  {subs.length === 0 ? "No subscribers yet" : "No results found"}
                </p>
                <p style={{ fontSize:12 }}>
                  {subs.length === 0 ? "Add subscribers using the panel on the left" : "Try a different search term"}
                </p>
              </div>
            ) : (
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#FAFAF9", borderBottom:"1px solid #EDE9E4" }}>
                    {["Name","Email","Added",""].map((h,i) => (
                      <th key={i} style={{ textAlign: i===3 ? "right" : "left", padding:"10px 16px", fontSize:10.5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em", color:"#9CA3AF" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sub, idx) => (
                    <tr key={sub.id}
                      style={{ borderBottom: idx < filtered.length-1 ? "1px solid #F5F2EF" : "none" }}
                      onMouseEnter={e=>e.currentTarget.style.background="#FAFAF9"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    >
                      <td style={{ padding:"11px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:28, height:28, borderRadius:"50%", background:"#FDF3EE", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#D05A2C", flexShrink:0 }}>
                            {sub.name ? sub.name.charAt(0).toUpperCase() : "?"}
                          </div>
                          <span style={{ fontSize:13, fontWeight:500, color:"#1A1D2E" }}>
                            {sub.name || <em style={{ color:"#9CA3AF", fontStyle:"italic", fontWeight:400 }}>—</em>}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding:"11px 16px", fontSize:12.5, color:"#4B5563", fontFamily:"monospace" }}>{sub.email}</td>
                      <td style={{ padding:"11px 16px", fontSize:12, color:"#9CA3AF" }}>{new Date(sub.addedAt).toLocaleDateString()}</td>
                      <td style={{ padding:"11px 16px", textAlign:"right" }}>
                        <button onClick={() => remove(sub.id)}
                          style={{ width:26, height:26, borderRadius:6, border:"1px solid #E5E0DA", background:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", marginLeft:"auto", color:"#9CA3AF", transition:"all 0.1s" }}
                          onMouseEnter={e=>{e.currentTarget.style.borderColor="#FCA5A5";e.currentTarget.style.color="#EF4444";e.currentTarget.style.background="#FEF2F2";}}
                          onMouseLeave={e=>{e.currentTarget.style.borderColor="#E5E0DA";e.currentTarget.style.color="#9CA3AF";e.currentTarget.style.background="#fff";}}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/><path d="M9,6V4h6v2"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <p style={{ textAlign:"center", fontSize:11.5, color:"#C5B8AC", marginTop:12 }}>
            Subscribers stored locally in your browser · Export CSV to back up
          </p>
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", background: color+"18", borderRadius:20 }}>
      <div style={{ width:7, height:7, borderRadius:"50%", background:color }}/>
      <span style={{ fontSize:11, fontWeight:600, color }}>{value}</span>
      <span style={{ fontSize:11, color:"#9CA3AF" }}>{label}</span>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import { buildEmailHtml } from "@/lib/emailTemplate";

const STORAGE_KEY = "email_studio_subscribers";
function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"); } catch { return []; } }

export default function SendPanel({ emailData, session }) {
  const [subs, setSubs]       = useState([]);
  const [mode, setMode]       = useState("test");
  const [testEmail, setTestEmail] = useState(session?.user?.email || "");
  const [results, setResults] = useState([]);
  const [sending, setSending] = useState(false);
  const [done, setDone]       = useState(false);

  useEffect(() => { setSubs(load()); }, []);

  const isReady = emailData.subject && (emailData.headline || emailData.bodyText || emailData.ctaText);

  async function sendOne(to) {
    const html = buildEmailHtml(emailData);
    const res  = await fetch("/api/send-email", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ to, subject: emailData.subject, html }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Unknown error");
    return data;
  }

  async function handleSend() {
    if (!isReady) return;
    setDone(false);

    if (mode === "test") {
      if (!testEmail) return;
      setSending(true);
      setResults([{ email: testEmail, status: "sending" }]);
      try {
        await sendOne(testEmail);
        setResults([{ email: testEmail, status: "sent" }]);
      } catch(err) {
        setResults([{ email: testEmail, status: "error", message: err.message }]);
      }
      setSending(false); setDone(true);
      return;
    }

    if (subs.length === 0) return;
    setSending(true); setDone(false);
    setResults(subs.map(s => ({ email:s.email, name:s.name, status:"pending" })));

    for (let i = 0; i < subs.length; i++) {
      const sub = subs[i];
      setResults(p => p.map(r => r.email===sub.email ? {...r, status:"sending"} : r));
      try {
        await sendOne(sub.email);
        setResults(p => p.map(r => r.email===sub.email ? {...r, status:"sent"} : r));
      } catch(err) {
        setResults(p => p.map(r => r.email===sub.email ? {...r, status:"error", message:err.message} : r));
      }
      if (i < subs.length-1) await new Promise(r => setTimeout(r, 400));
    }
    setSending(false); setDone(true);
  }

  const sentCount  = results.filter(r => r.status==="sent").length;
  const errorCount = results.filter(r => r.status==="error").length;

  return (
    <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
      {/* Left panel */}
      <div style={{ width:272, background:"#fff", borderRight:"1px solid #E5E0DA", display:"flex", flexDirection:"column", overflow:"hidden", flexShrink:0 }}>
        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:"1px solid #E5E0DA" }}>
          {["test","campaign"].map(t => (
            <button key={t} onClick={() => { setMode(t); setResults([]); setDone(false); }}
              style={{ flex:1, padding:"12px 0", border:"none", background:"none", fontFamily:"inherit", fontSize:12.5, fontWeight:600, letterSpacing:"0.04em", textTransform:"uppercase", cursor:"pointer", color: mode===t ? "#D05A2C" : "#9CA3AF", borderBottom: mode===t ? "2px solid #D05A2C" : "2px solid transparent", marginBottom:-1 }}>
              {t === "test" ? "Test" : "Campaign"}
            </button>
          ))}
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"14px 12px" }}>
          {/* Email summary */}
          <div style={{ fontSize:10.5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em", color:"#9CA3AF", marginBottom:10 }}>Email Summary</div>
          <div style={{ background:"#FAFAF9", borderRadius:8, border:"1px solid #EDE9E4", padding:"10px 12px", marginBottom:16 }}>
            {[
              { label:"Subject", val: emailData.subject || "—" },
              { label:"Headline", val: emailData.headline || "—" },
              { label:"Has Image", val: emailData.imageUrl ? "Yes" : "No" },
              { label:"Has CTA", val: emailData.ctaText ? `"${emailData.ctaText}"` : "No" },
            ].map(({ label, val }) => (
              <div key={label} style={{ display:"flex", gap:8, marginBottom:6, fontSize:12 }}>
                <span style={{ color:"#9CA3AF", width:58, flexShrink:0 }}>{label}</span>
                <span style={{ color:"#1A1D2E", fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Readiness */}
          {!isReady && (
            <div style={{ padding:"10px 12px", background:"#FFF7ED", border:"1px solid #FED7AA", borderRadius:8, marginBottom:14, fontSize:12, color:"#C2410C" }}>
              <div style={{ fontWeight:600, marginBottom:3 }}>⚠ Email not ready</div>
              Go to Builder and add a subject + content first.
            </div>
          )}

          {/* Mode-specific */}
          {mode === "test" ? (
            <>
              <div style={{ fontSize:10.5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em", color:"#9CA3AF", marginBottom:8 }}>Send To</div>
              <input type="email" value={testEmail} onChange={e=>setTestEmail(e.target.value)}
                placeholder="test@example.com" className="field-input" style={{ marginBottom:10 }} disabled={sending}/>
              <button onClick={handleSend} disabled={!isReady || !testEmail || sending}
                style={{ width:"100%", padding:"8px 0", background: (!isReady||!testEmail||sending) ? "#EDE9E4" : "#D05A2C", color: (!isReady||!testEmail||sending) ? "#9CA3AF" : "#fff", border:"none", borderRadius:6, fontSize:12.5, fontWeight:600, cursor: (!isReady||!testEmail||sending) ? "not-allowed" : "pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
                {sending ? (
                  <><div style={{ width:12,height:12,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/> Sending…</>
                ) : (
                  <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg> Send Test Email</>
                )}
              </button>
            </>
          ) : (
            <>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <div style={{ fontSize:10.5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em", color:"#9CA3AF" }}>Recipients</div>
                <span style={{ fontSize:11, background:"#FDF3EE", color:"#D05A2C", borderRadius:20, padding:"2px 8px", fontWeight:600 }}>{subs.length}</span>
              </div>
              {subs.length === 0 ? (
                <div style={{ padding:"14px 12px", background:"#FFF7ED", border:"1px solid #FED7AA", borderRadius:8, fontSize:12, color:"#C2410C", marginBottom:10 }}>
                  No subscribers yet. Add some in the Subscribers section.
                </div>
              ) : (
                <div style={{ maxHeight:160, overflowY:"auto", border:"1px solid #EDE9E4", borderRadius:8, marginBottom:12, background:"#FAFAF9" }}>
                  {subs.slice(0,20).map(s => (
                    <div key={s.id} style={{ padding:"7px 12px", borderBottom:"1px solid #F0EDE8", display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
                      <div style={{ width:22,height:22,borderRadius:"50%",background:"#FDF3EE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#D05A2C",flexShrink:0 }}>
                        {s.name ? s.name.charAt(0).toUpperCase() : "?"}
                      </div>
                      <span style={{ color:"#4B5563", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.email}</span>
                    </div>
                  ))}
                  {subs.length > 20 && <div style={{ padding:"7px 12px", fontSize:11, color:"#9CA3AF", textAlign:"center" }}>+{subs.length-20} more…</div>}
                </div>
              )}
              <button onClick={handleSend} disabled={!isReady || subs.length===0 || sending}
                style={{ width:"100%", padding:"8px 0", background: (!isReady||subs.length===0||sending) ? "#EDE9E4" : "#D05A2C", color: (!isReady||subs.length===0||sending) ? "#9CA3AF" : "#fff", border:"none", borderRadius:6, fontSize:12.5, fontWeight:600, cursor: (!isReady||subs.length===0||sending) ? "not-allowed" : "pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
                {sending ? (
                  <><div style={{ width:12,height:12,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/> Sending…</>
                ) : (
                  <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg> Send to {subs.length} Subscriber{subs.length!==1?"s":""}</>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Right: results */}
      <div className="canvas-bg" style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ height:44, background:"#fff", borderBottom:"1px solid #E5E0DA", display:"flex", alignItems:"center", padding:"0 16px", gap:12, flexShrink:0 }}>
          <span style={{ fontSize:12, fontWeight:600, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.07em" }}>Send Results</span>
          {done && results.length > 0 && (
            <div style={{ display:"flex", gap:10 }}>
              {sentCount  > 0 && <span style={{ fontSize:12, color:"#16A34A", fontWeight:600 }}>✓ {sentCount} sent</span>}
              {errorCount > 0 && <span style={{ fontSize:12, color:"#DC2626", fontWeight:600 }}>✗ {errorCount} failed</span>}
            </div>
          )}
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:20 }}>
          {results.length === 0 ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", color:"#9CA3AF", textAlign:"center", gap:12 }}>
              <div style={{ width:56, height:56, borderRadius:"50%", background:"#fff", border:"1.5px solid #E5E0DA", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C5B8AC" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>
                </svg>
              </div>
              <p style={{ fontSize:13, color:"#C5B8AC", fontWeight:500 }}>No emails sent yet</p>
              <p style={{ fontSize:12 }}>Configure your email in the Builder, then send from the left panel.</p>
            </div>
          ) : (
            <div style={{ background:"#fff", borderRadius:10, border:"1px solid #E5E0DA", overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#FAFAF9", borderBottom:"1px solid #EDE9E4" }}>
                    {["Recipient","Status",""].map((h,i) => (
                      <th key={i} style={{ textAlign:"left", padding:"9px 16px", fontSize:10.5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em", color:"#9CA3AF" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, idx) => (
                    <tr key={r.email} style={{ borderBottom: idx<results.length-1 ? "1px solid #F5F2EF" : "none" }}>
                      <td style={{ padding:"10px 16px" }}>
                        {r.name && <div style={{ fontSize:12, fontWeight:500, color:"#1A1D2E" }}>{r.name}</div>}
                        <div style={{ fontSize:11.5, color:"#6B7280", fontFamily:"monospace" }}>{r.email}</div>
                        {r.message && <div style={{ fontSize:11, color:"#DC2626", marginTop:2 }}>{r.message}</div>}
                      </td>
                      <td style={{ padding:"10px 16px" }}>
                        <StatusBadge status={r.status}/>
                      </td>
                      <td style={{ padding:"10px 16px" }}>
                        <StatusIcon status={r.status}/>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    sent:    { bg:"#F0FDF4", color:"#16A34A", border:"#86EFAC", label:"Sent" },
    error:   { bg:"#FEF2F2", color:"#DC2626", border:"#FCA5A5", label:"Failed" },
    sending: { bg:"#FDF3EE", color:"#D05A2C", border:"#F0C4A8", label:"Sending…" },
    pending: { bg:"#F9FAFB", color:"#6B7280", border:"#E5E0DA", label:"Queued" },
  };
  const c = cfg[status] || cfg.pending;
  return (
    <span style={{ display:"inline-block", padding:"3px 10px", background:c.bg, color:c.color, border:`1px solid ${c.border}`, borderRadius:20, fontSize:11.5, fontWeight:600 }}>
      {c.label}
    </span>
  );
}

function StatusIcon({ status }) {
  if (status === "sent")    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>;
  if (status === "error")   return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
  if (status === "sending") return <div style={{ width:14,height:14,border:"2px solid #D05A2C",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>;
  return <div style={{ width:14,height:14,borderRadius:"50%",border:"2px solid #E5E0DA"}}/>;
}

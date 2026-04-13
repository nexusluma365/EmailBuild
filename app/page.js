"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";
import EmailBuilder from "@/components/EmailBuilder";
import Subscribers from "@/components/Subscribers";
import SendPanel from "@/components/SendPanel";
import { buildEmailHtmlFromBlocks } from "@/lib/emailTemplate";

const DEFAULT_STYLES = {
  bgColor: "#f4f4f7",
  fontFamily: "'Helvetica Neue',Arial,sans-serif",
  accentColor: "#D05A2C",
};

export default function HomePage() {
  const { data: session, status } = useSession();
  const [activeSection, setActiveSection] = useState("builder");

  // null = show template picker; populated = email blocks array
  const [blocks, setBlocks] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("email_studio_blocks_v2");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  });

  const [globalStyles, setGlobalStyles] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("email_studio_styles_v2");
        if (saved) return { ...DEFAULT_STYLES, ...JSON.parse(saved) };
      } catch {}
    }
    return DEFAULT_STYLES;
  });

  if (status === "loading") {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#F4EFE9" }}>
        <div style={{ width:28, height:28, border:"2.5px solid #D05A2C", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>
      </div>
    );
  }

  if (!session) return <LandingPage onSignIn={() => signIn("google")}/>;

  const subject = blocks?.find(b => b.type === "subject")?.data?.text || "";

  const handleSave = () => {
    try {
      if (blocks) localStorage.setItem("email_studio_blocks_v2", JSON.stringify(blocks));
      localStorage.setItem("email_studio_styles_v2", JSON.stringify(globalStyles));
      // Show brief toast instead of alert
      const toast = document.createElement("div");
      toast.textContent = "✓ Draft saved";
      Object.assign(toast.style, { position:"fixed", bottom:"20px", left:"50%", transform:"translateX(-50%)", background:"#1A1D2E", color:"#fff", padding:"9px 20px", borderRadius:"8px", fontSize:"13px", fontWeight:"600", zIndex:"9999", boxShadow:"0 4px 20px rgba(0,0,0,0.2)", transition:"opacity 0.3s" });
      document.body.appendChild(toast);
      setTimeout(() => { toast.style.opacity="0"; setTimeout(() => toast.remove(), 300); }, 2000);
    } catch(e) {
      alert("Could not save draft.");
    }
  };

  const handlePreview = () => {
    const html = buildEmailHtmlFromBlocks(blocks || [], globalStyles);
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden" }}>
      <TopBar
        session={session}
        activeSection={activeSection}
        subject={subject}
        onPublish={() => setActiveSection("send")}
        onPreview={handlePreview}
        onSave={handleSave}
      />
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
        <IconRail activeSection={activeSection} setActiveSection={setActiveSection} onSignOut={() => signOut()}/>
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
          {activeSection === "builder" && (
            <EmailBuilder
              blocks={blocks}
              setBlocks={setBlocks}
              globalStyles={globalStyles}
              setGlobalStyles={setGlobalStyles}
            />
          )}
          {activeSection === "subscribers" && <Subscribers/>}
          {activeSection === "send" && (
            <SendPanel blocks={blocks} globalStyles={globalStyles} session={session}/>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── TOP BAR ─────────────────────────────────────────── */
function TopBar({ session, activeSection, subject, onPublish, onPreview, onSave }) {
  const sectionLabel = { builder:"Email Builder", subscribers:"Subscribers", send:"Send Campaign" };
  const ACC = "#D05A2C";

  const iconBtns = [
    { id:"save",    label:"Save Draft",         onClick:onSave,    d:<><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></> },
    { id:"preview", label:"Preview in Browser", onClick:onPreview, d:<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></> },
    { id:"send",    label:"Go to Send",         onClick:onPublish, d:<><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></> },
  ];

  return (
    <header style={{ height:52, background:"#fff", borderBottom:"1px solid #E5E0DA", display:"flex", alignItems:"center", padding:"0 14px", gap:8, flexShrink:0, zIndex:50 }}>
      {/* Logo */}
      <div style={{ width:32, height:32, borderRadius:"50%", background:"#1A1D2E", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
        </svg>
      </div>

      {/* Title */}
      <div style={{ marginRight:6 }}>
        <div style={{ fontWeight:700, fontSize:13, color:"#1A1D2E", lineHeight:1.2 }}>{sectionLabel[activeSection] || "Email Studio"}</div>
        <div style={{ fontSize:11, color:"#9CA3AF", lineHeight:1.2, maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {subject ? `Subject: ${subject}` : "No subject yet"}
        </div>
      </div>

      <div style={{ flex:1 }}/>

      {/* Action buttons */}
      <div style={{ display:"flex", gap:4 }}>
        {iconBtns.map(({ id, label, d, onClick }) => (
          <button key={id} title={label} onClick={onClick}
            style={{ height:34, padding:"0 12px", borderRadius:7, border:"1px solid #E5E0DA", background:"#fff", cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:500, color:"#374151", fontFamily:"inherit" }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor=ACC; e.currentTarget.style.color=ACC; e.currentTarget.style.background="#FDF3EE"; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor="#E5E0DA"; e.currentTarget.style.color="#374151"; e.currentTarget.style.background="#fff"; }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
            <span style={{ display:"none" }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Publish */}
      <button onClick={onPublish}
        style={{ background:ACC, color:"#fff", border:"none", borderRadius:7, padding:"8px 18px", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.01em" }}
        onMouseEnter={e=>e.currentTarget.style.background="#B84E25"}
        onMouseLeave={e=>e.currentTarget.style.background=ACC}>
        Send →
      </button>

      {/* Avatar pill */}
      <div style={{ display:"flex", alignItems:"center", gap:7, padding:"4px 10px 4px 4px", background:"linear-gradient(135deg,#3730A3,#D05A2C)", borderRadius:99, cursor:"pointer" }}>
        <div style={{ width:26, height:26, borderRadius:"50%", background:"rgba(255,255,255,0.22)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff" }}>
          {(session.user?.name||"U").charAt(0).toUpperCase()}
        </div>
        <span style={{ fontSize:12, fontWeight:500, color:"#fff", maxWidth:80, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {(session.user?.name||"User").split(" ")[0]}
        </span>
      </div>
    </header>
  );
}

/* ─── ICON RAIL ───────────────────────────────────────── */
function IconRail({ activeSection, setActiveSection, onSignOut }) {
  const items = [
    { id:"builder",     label:"Builder",     d:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></> },
    { id:"subscribers", label:"Subscribers", d:<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></> },
    { id:"send",        label:"Send",        d:<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></> },
  ];

  return (
    <div style={{ width:56, background:"#fff", borderRight:"1px solid #E5E0DA", display:"flex", flexDirection:"column", alignItems:"center", padding:"10px 0", flexShrink:0 }}>
      {items.map(({ id, label, d }) => {
        const isActive = activeSection === id;
        return (
          <button key={id} onClick={() => setActiveSection(id)} title={label}
            style={{ width:40, height:40, borderRadius:10, border:"none", background:isActive?"#D05A2C":"none", color:isActive?"#fff":"#6B7280", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:4, transition:"all 0.15s" }}
            onMouseEnter={e=>{ if(!isActive) e.currentTarget.style.background="#F4EFE9"; }}
            onMouseLeave={e=>{ if(!isActive) e.currentTarget.style.background="none"; }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
          </button>
        );
      })}
      <div style={{ flex:1 }}/>
      <button onClick={onSignOut} title="Sign out"
        style={{ width:40, height:40, borderRadius:10, border:"none", background:"none", color:"#C5BEB8", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
        onMouseEnter={e=>{ e.currentTarget.style.background="#F4EFE9"; e.currentTarget.style.color="#6B7280"; }}
        onMouseLeave={e=>{ e.currentTarget.style.background="none"; e.currentTarget.style.color="#C5BEB8"; }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    </div>
  );
}

/* ─── LANDING PAGE ────────────────────────────────────── */
function LandingPage({ onSignIn }) {
  return (
    <div style={{ minHeight:"100vh", background:"#F4EFE9", backgroundImage:"radial-gradient(circle, #C5B8AC 1.2px, transparent 1.2px)", backgroundSize:"22px 22px", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:420 }}>
        <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 8px 40px rgba(0,0,0,0.12)", overflow:"hidden" }}>
          <div style={{ height:4, background:"#D05A2C" }}/>
          <div style={{ padding:"40px 40px 36px" }}>
            <div style={{ width:52, height:52, borderRadius:"50%", background:"#1A1D2E", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <h1 style={{ fontSize:22, fontWeight:700, color:"#1A1D2E", marginBottom:8, letterSpacing:"-0.4px" }}>Email Studio</h1>
            <p style={{ fontSize:13.5, color:"#6B7280", lineHeight:1.6, marginBottom:28 }}>Build and send beautiful HTML emails through your Gmail account — no third-party services needed.</p>
            {["Visual block-based email builder","Upload images & add real CTA links","Live desktop + mobile preview","Send via your own Gmail account"].map(f=>(
              <div key={f} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:20, height:20, borderRadius:"50%", background:"#FDF3EE", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#D05A2C" strokeWidth="3" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>
                </div>
                <span style={{ fontSize:13, color:"#4B5563" }}>{f}</span>
              </div>
            ))}
            <button onClick={onSignIn}
              style={{ marginTop:22, width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:10, padding:"11px 20px", background:"#fff", border:"1.5px solid #E5E0DA", borderRadius:6, cursor:"pointer", fontFamily:"inherit", fontSize:13.5, fontWeight:600, color:"#1A1D2E" }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor="#D05A2C"; e.currentTarget.style.background="#FDF3EE"; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor="#E5E0DA"; e.currentTarget.style.background="#fff"; }}>
              <GoogleIcon/>
              Continue with Google
            </button>
            <p style={{ fontSize:11.5, color:"#9CA3AF", marginTop:14, textAlign:"center", lineHeight:1.6 }}>Gmail send permissions only · Credentials never stored</p>
          </div>
        </div>
        <p style={{ textAlign:"center", fontSize:11.5, color:"#9CA3AF", marginTop:14 }}>Email Studio · Next.js + Gmail API</p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

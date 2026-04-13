"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";
import EmailBuilder from "@/components/EmailBuilder";
import Subscribers from "@/components/Subscribers";
import SendPanel from "@/components/SendPanel";
import { buildEmailHtml } from "@/lib/emailTemplate";

const defaultEmail = {
  subject: "",
  headline: "",
  bodyText: "",
  imageUrl: "",
  ctaText: "",
  ctaLink: "",
  accentColor: "#D05A2C",
};

export default function HomePage() {
  const { data: session, status } = useSession();
  const [activeSection, setActiveSection] = useState("builder");
  const [emailData, setEmailData] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("email_studio_draft");
        if (saved) return { ...defaultEmail, ...JSON.parse(saved) };
      } catch {}
    }
    return defaultEmail;
  });

  if (status === "loading") {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#F4EFE9" }}>
        <div style={{ width:28, height:28, border:"2.5px solid #D05A2C", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
      </div>
    );
  }

  if (!session) return <LandingPage onSignIn={() => signIn("google")} />;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden" }}>
      <TopBar session={session} activeSection={activeSection} emailData={emailData} onPublish={() => setActiveSection("send")} onPreview={() => { const w = window.open("","_blank"); w.document.write(buildEmailHtml(emailData)); w.document.close(); }} onSave={() => { try { localStorage.setItem("email_studio_draft", JSON.stringify(emailData)); alert("Draft saved!"); } catch(e) { alert("Could not save draft."); } }} />
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
        <IconRail activeSection={activeSection} setActiveSection={setActiveSection} onSignOut={() => signOut()} />
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
          {activeSection === "builder"     && <EmailBuilder emailData={emailData} setEmailData={setEmailData} />}
          {activeSection === "subscribers" && <Subscribers />}
          {activeSection === "send"        && <SendPanel emailData={emailData} session={session} />}
        </div>
      </div>
    </div>
  );
}

/* ─── TOP BAR ─────────────────────────────────────────────────────────── */
function TopBar({ session, activeSection, emailData, onPublish, onPreview, onSave }) {
  const sectionLabel = { builder:"Email Builder", subscribers:"Subscribers", send:"Send Campaign" };

  const iconBtns = [
    { id:"save",     label:"Save draft",         onClick: onSave,    d:<path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/> },
    { id:"copy",     label:"Duplicate",           onClick: null,      d:<><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></> },
    { id:"edit",     label:"Edit mode",  active:true, onClick: null,  d:<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></> },
    { id:"add",      label:"Add block",           onClick: null,      d:<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></> },
    { id:"layers",   label:"Layers",              onClick: null,      d:<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></> },
    { id:"settings", label:"Settings",            onClick: null,      d:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></> },
    { id:"globe",    label:"Preview in browser",  onClick: onPreview, d:<><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></> },
  ];

  return (
    <header style={{ height:52, background:"#fff", borderBottom:"1px solid #E5E0DA", display:"flex", alignItems:"center", padding:"0 14px", gap:6, flexShrink:0, zIndex:50 }}>
      {/* Logo */}
      <div style={{ width:32, height:32, borderRadius:"50%", background:"#1A1D2E", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      </div>

      {/* Back */}
      <button style={{ background:"none", border:"none", cursor:"pointer", color:"#9CA3AF", padding:"4px 6px", borderRadius:6, display:"flex", alignItems:"center" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
      </button>

      {/* Title + URL */}
      <div style={{ marginRight:8 }}>
        <div style={{ fontWeight:600, fontSize:13, color:"#1A1D2E", lineHeight:1.25 }}>{sectionLabel[activeSection]}</div>
        <div style={{ fontSize:11, color:"#9CA3AF", lineHeight:1.25 }}>{emailData.subject ? "Subject: " + emailData.subject : "email-studio.app"}</div>
      </div>

      {/* Dots */}
      <button style={{ background:"none", border:"none", cursor:"pointer", color:"#9CA3AF", padding:4, borderRadius:6, marginRight:10, display:"flex" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
      </button>

      {/* Center icon strip */}
      <div style={{ display:"flex", alignItems:"center", gap:1, flex:1 }}>
        {iconBtns.map(({ id, label, d, active, onClick }) => (
          <button key={id} title={label}
            onClick={onClick || undefined}
            style={{ width:32, height:32, borderRadius:6, border:"none", background:"none", cursor: onClick ? "pointer" : "default", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color: active ? "#D05A2C" : "#6B7280", position:"relative", opacity: onClick || active ? 1 : 0.45 }}
            onMouseEnter={e => { if (onClick || active) e.currentTarget.style.background = "#F4EFE9"; }}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
            {active && <div style={{ position:"absolute", bottom:1, left:"50%", transform:"translateX(-50%)", width:14, height:2, background:"#D05A2C", borderRadius:2 }}/>}
          </button>
        ))}
      </div>

      {/* Person icon */}
      <button style={{ background:"none", border:"none", cursor:"pointer", color:"#6B7280", width:32, height:32, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </button>

      {/* Publish */}
      <button
        onClick={onPublish}
        style={{ background:"#D05A2C", color:"#fff", border:"none", borderRadius:6, padding:"7px 16px", fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"inherit", marginLeft:4 }}
        onMouseEnter={e => e.currentTarget.style.background = "#B84E25"}
        onMouseLeave={e => e.currentTarget.style.background = "#D05A2C"}
      >
        Publish
      </button>

      {/* Avatar pill */}
      <div style={{ display:"flex", alignItems:"center", gap:7, padding:"4px 10px 4px 4px", background:"linear-gradient(135deg,#3730A3,#D05A2C)", borderRadius:99, cursor:"pointer", marginLeft:6 }}>
        <div style={{ width:26, height:26, borderRadius:"50%", background:"rgba(255,255,255,0.22)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff" }}>
          {(session.user?.name || "U").charAt(0).toUpperCase()}
        </div>
        <span style={{ fontSize:12, fontWeight:500, color:"#fff", maxWidth:80, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {(session.user?.name || "User").split(" ")[0]}
        </span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round"><polyline points="6,9 12,15 18,9"/></svg>
      </div>
    </header>
  );
}

/* ─── ICON RAIL ────────────────────────────────────────────────────────── */
function IconRail({ activeSection, setActiveSection, onSignOut }) {
  const items = [
    { id:"builder",     label:"Builder",     d:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></> },
    { id:"_filter",     label:"Filter",      disabled:true, d:<polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/> },
    { id:"subscribers", label:"Subscribers", d:<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></> },
    { id:"send",        label:"Send",        d:<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></> },
  ];

  return (
    <div style={{ width:56, background:"#fff", borderRight:"1px solid #E5E0DA", display:"flex", flexDirection:"column", alignItems:"center", padding:"10px 0", flexShrink:0, zIndex:40 }}>
      {items.map(({ id, label, d, disabled }) => {
        const isActive = activeSection === id;
        return (
          <button key={id}
            onClick={() => !disabled && setActiveSection(id)}
            title={label}
            style={{ width:40, height:40, borderRadius:10, border:"none", background: isActive ? "#D05A2C" : "none", color: isActive ? "#fff" : disabled ? "#D5CEC7" : "#6B7280", cursor: disabled ? "default" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:4, transition:"all 0.15s" }}
            onMouseEnter={e => { if (!isActive && !disabled) e.currentTarget.style.background = "#F4EFE9"; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "none"; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
          </button>
        );
      })}
      <div style={{ flex:1 }}/>
      <button onClick={onSignOut} title="Sign out"
        style={{ width:40, height:40, borderRadius:10, border:"none", background:"none", color:"#C5BEB8", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
        onMouseEnter={e => { e.currentTarget.style.background="#F4EFE9"; e.currentTarget.style.color="#6B7280"; }}
        onMouseLeave={e => { e.currentTarget.style.background="none"; e.currentTarget.style.color="#C5BEB8"; }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    </div>
  );
}

/* ─── LANDING PAGE ─────────────────────────────────────────────────────── */
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
            {["Visual block-based email builder","Live desktop + mobile preview","Send via your own Gmail account","Manage subscriber lists"].map(f => (
              <div key={f} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:20, height:20, borderRadius:"50%", background:"#FDF3EE", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#D05A2C" strokeWidth="3" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>
                </div>
                <span style={{ fontSize:13, color:"#4B5563" }}>{f}</span>
              </div>
            ))}
            <button onClick={onSignIn}
              style={{ marginTop:22, width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:10, padding:"11px 20px", background:"#fff", border:"1.5px solid #E5E0DA", borderRadius:6, cursor:"pointer", fontFamily:"inherit", fontSize:13.5, fontWeight:600, color:"#1A1D2E" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor="#D05A2C"; e.currentTarget.style.background="#FDF3EE"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="#E5E0DA"; e.currentTarget.style.background="#fff"; }}
            >
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

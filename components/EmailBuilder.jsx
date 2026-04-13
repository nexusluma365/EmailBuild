"use client";
import { useState, useRef } from "react";
import { buildEmailHtml } from "@/lib/emailTemplate";

/* ─── Block definitions ─────────────────────────────────────── */
const BLOCK_TYPES = [
  {
    id: "subject", label: "Subject",
    icon: <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="10" x2="16" y2="10"/><line x1="3" y1="14" x2="21" y2="14"/></>,
    defaultContent: { subject: "Your subject line here" },
  },
  {
    id: "headline", label: "Headline",
    icon: <><line x1="3" y1="5" x2="21" y2="5" strokeWidth="3"/><line x1="3" y1="11" x2="18" y2="11"/><line x1="3" y1="17" x2="15" y2="17"/></>,
    defaultContent: { headline: "Big bold headline" },
  },
  {
    id: "body", label: "Body Text",
    icon: <><line x1="3" y1="5" x2="21" y2="5"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="13" x2="21" y2="13"/><line x1="3" y1="17" x2="14" y2="17"/></>,
    defaultContent: { bodyText: "Write your message here..." },
  },
  {
    id: "image", label: "Image",
    icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></>,
    defaultContent: { imageUrl: "" },
  },
  {
    id: "cta", label: "Call to Action",
    icon: <><rect x="2" y="7" width="20" height="10" rx="5"/><line x1="7" y1="12" x2="17" y2="12"/></>,
    defaultContent: { ctaText: "Click Here", ctaLink: "https://" },
  },
  {
    id: "divider", label: "Divider",
    icon: <><line x1="3" y1="12" x2="21" y2="12" strokeDasharray="2 2"/></>,
    defaultContent: {},
  },
  {
    id: "footer", label: "Signature",
    icon: <><rect x="3" y="15" width="18" height="6" rx="1"/><line x1="3" y1="9" x2="14" y2="9"/><line x1="3" y1="6" x2="10" y2="6"/></>,
    defaultContent: {},
  },
  {
    id: "multicolumn", label: "Multi Column",
    icon: <><rect x="2" y="3" width="9" height="18" rx="1"/><rect x="13" y="3" width="9" height="18" rx="1"/></>,
    defaultContent: {},
  },
];

const defaultBlocks = [
  { instanceId: "b1", typeId: "headline" },
  { instanceId: "b2", typeId: "body" },
  { instanceId: "b3", typeId: "cta" },
];

/* ─── Main EmailBuilder ──────────────────────────────────────── */
export default function EmailBuilder({ emailData, setEmailData }) {
  const [panelTab, setPanelTab]         = useState("design");   // "design" | "edit"
  const [selectedBlock, setSelectedBlock] = useState(null);      // instanceId
  const [emailBlocks, setEmailBlocks]   = useState(defaultBlocks);
  const [previewDevice, setPreviewDevice] = useState("desktop"); // "desktop" | "tablet" | "mobile"
  const [search, setSearch]             = useState("");
  const [zoom, setZoom]                 = useState(100);

  const update = (key, val) => setEmailData(p => ({ ...p, [key]: val }));
  const htmlPreview = buildEmailHtml(emailData);

  const selectBlock = (id) => {
    setSelectedBlock(id);
    setPanelTab("edit");
  };

  const addBlock = (typeId) => {
    const newId = "b" + Date.now();
    setEmailBlocks(p => [...p, { instanceId: newId, typeId }]);
    const bt = BLOCK_TYPES.find(b => b.id === typeId);
    if (bt?.defaultContent) {
      setEmailData(p => ({ ...p, ...bt.defaultContent }));
    }
    setSelectedBlock(newId);
    setPanelTab("edit");
  };

  const removeBlock = (instanceId) => {
    setEmailBlocks(p => p.filter(b => b.instanceId !== instanceId));
    if (selectedBlock === instanceId) { setSelectedBlock(null); setPanelTab("design"); }
  };

  const moveBlock = (instanceId, dir) => {
    setEmailBlocks(p => {
      const idx = p.findIndex(b => b.instanceId === instanceId);
      if ((dir === -1 && idx === 0) || (dir === 1 && idx === p.length - 1)) return p;
      const next = [...p];
      [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
      return next;
    });
  };

  const filteredBlocks = BLOCK_TYPES.filter(b =>
    b.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedBlockType = selectedBlock
    ? BLOCK_TYPES.find(bt => bt.id === emailBlocks.find(b => b.instanceId === selectedBlock)?.typeId)
    : null;

  return (
    <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

      {/* ── LEFT PANEL ── */}
      <div style={{ width:272, flexShrink:0, background:"#fff", borderRight:"1px solid #E5E0DA", display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* DESIGN / EDIT tabs */}
        <div style={{ display:"flex", borderBottom:"1px solid #E5E0DA", flexShrink:0 }}>
          {["design","edit"].map(t => (
            <button key={t}
              onClick={() => setPanelTab(t)}
              style={{ flex:1, padding:"12px 0", border:"none", background:"none", fontFamily:"inherit", fontSize:12.5, fontWeight:600, letterSpacing:"0.04em", textTransform:"uppercase", cursor:"pointer", color: panelTab===t ? "#D05A2C" : "#9CA3AF", borderBottom: panelTab===t ? "2px solid #D05A2C" : "2px solid transparent", marginBottom:-1, transition:"all 0.15s" }}>
              {t}
            </button>
          ))}
        </div>

        {panelTab === "design" ? (
          <DesignPanel
            filteredBlocks={filteredBlocks}
            search={search} setSearch={setSearch}
            selectedBlock={selectedBlock}
            emailBlocks={emailBlocks}
            onAddBlock={addBlock}
          />
        ) : (
          <EditPanel
            emailData={emailData} update={update}
            selectedBlock={selectedBlock}
            selectedBlockType={selectedBlockType}
            emailBlocks={emailBlocks}
            onRemove={removeBlock}
            onMove={moveBlock}
            onSelectBlock={selectBlock}
            onSwitchToDesign={() => setPanelTab("design")}
          />
        )}
      </div>

      {/* ── CENTER: PREVIEW ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"#F4EFE9" }}>

        {/* Sub-toolbar */}
        <div style={{ height:44, background:"#fff", borderBottom:"1px solid #E5E0DA", display:"flex", alignItems:"center", padding:"0 14px", gap:8, flexShrink:0 }}>
          {/* Block / Page tabs */}
          <div style={{ display:"flex", gap:0, marginRight:8 }}>
            {["Block","Page"].map((t,i) => (
              <button key={t} style={{ padding:"5px 14px", border:"1px solid #E5E0DA", borderRight: i===0 ? "none" : "1px solid #E5E0DA", borderRadius: i===0 ? "6px 0 0 6px" : "0 6px 6px 0", background: i===0 ? "#F4EFE9" : "#fff", fontSize:12, fontWeight:500, color: i===0 ? "#D05A2C" : "#6B7280", cursor:"pointer", fontFamily:"inherit" }}>
                {t}
              </button>
            ))}
          </div>

          {/* Undo / Redo */}
          <div style={{ display:"flex", gap:2 }}>
            {[
              { title:"Undo", d:<><polyline points="9,14 4,9 9,4"/><path d="M20 20v-7a4 4 0 00-4-4H4"/></> },
              { title:"Redo", d:<><polyline points="15,14 20,9 15,4"/><path d="M4 20v-7a4 4 0 014-4h12"/></> },
            ].map(({ title, d }) => (
              <button key={title} title={title}
                style={{ width:28, height:28, borderRadius:6, border:"none", background:"none", color:"#9CA3AF", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F4EFE9"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">{d}</svg>
              </button>
            ))}
          </div>

          {/* Zoom */}
          <div style={{ display:"flex", alignItems:"center", gap:6, marginLeft:4 }}>
            <button onClick={() => setZoom(z => Math.max(50, z-10))}
              style={{ width:22, height:22, borderRadius:4, border:"1px solid #E5E0DA", background:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:"#6B7280" }}>−</button>
            <span style={{ fontSize:12, color:"#6B7280", minWidth:38, textAlign:"center" }}>{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(150, z+10))}
              style={{ width:22, height:22, borderRadius:4, border:"1px solid #E5E0DA", background:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:"#6B7280" }}>+</button>
          </div>

          {/* Expand */}
          <button title="Fullscreen"
            style={{ width:28, height:28, borderRadius:6, border:"none", background:"none", color:"#9CA3AF", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", marginLeft:2 }}
            onMouseEnter={e => e.currentTarget.style.background = "#F4EFE9"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15,3 21,3 21,9"/><polyline points="9,21 3,21 3,15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
          </button>

          <div style={{ flex:1 }}/>

          {/* Device toggles */}
          <div style={{ display:"flex", gap:2 }}>
            {[
              { id:"desktop", title:"Desktop",
                d:<><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></> },
              { id:"tablet",  title:"Tablet",
                d:<><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></> },
              { id:"mobile",  title:"Mobile",
                d:<><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></> },
            ].map(({ id, title, d }) => (
              <button key={id} title={title}
                onClick={() => setPreviewDevice(id)}
                style={{ width:28, height:28, borderRadius:6, border:"none", background: previewDevice===id ? "#FDF3EE" : "none", color: previewDevice===id ? "#D05A2C" : "#9CA3AF", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">{d}</svg>
              </button>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="canvas-bg" style={{ flex:1, overflow:"auto", padding:"28px 20px", display:"flex", justifyContent:"center" }}>
          <div style={{
            width: previewDevice === "mobile" ? 375 : previewDevice === "tablet" ? 600 : "100%",
            maxWidth: 680,
            transform: `scale(${zoom/100})`,
            transformOrigin: "top center",
            transition: "all 0.2s",
          }}>
            {/* Browser chrome */}
            <div style={{ background:"#DDD8D2", borderRadius:"10px 10px 0 0", padding:"8px 12px", display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ display:"flex", gap:5 }}>
                {["#C5BFBA","#C5BFBA","#C5BFBA"].map((c,i) => <div key={i} style={{ width:9, height:9, borderRadius:"50%", background:c }}/>)}
              </div>
              <div style={{ flex:1, background:"rgba(255,255,255,0.5)", borderRadius:4, padding:"2px 10px", fontSize:10.5, color:"#8B8580", textAlign:"center" }}>
                📧 Email Preview
              </div>
            </div>

            {/* Email blocks preview */}
            <div style={{ border:"1px solid #DDD8D2", borderTop:"none", borderRadius:"0 0 10px 10px", background:"#f4f4f7", overflow:"hidden", minHeight:400 }}>

              {/* Subject bar */}
              {emailData.subject && (
                <div style={{ background:"#fff", borderBottom:"1px solid #E5E0DA", padding:"10px 16px", fontSize:12, color:"#6B7280" }}>
                  <span style={{ fontWeight:600, color:"#1A1D2E" }}>Subject: </span>{emailData.subject}
                </div>
              )}

              {/* Email card */}
              <div style={{ padding:"20px 16px" }}>
                <div style={{ maxWidth:520, margin:"0 auto", background:"#fff", borderRadius:12, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>

                  {/* Accent bar */}
                  <div style={{ height:5, background: emailData.accentColor || "#D05A2C" }}/>

                  <div style={{ padding:"0 0 4px" }}>
                    {emailBlocks.map((block, idx) => {
                      const bt = BLOCK_TYPES.find(t => t.id === block.typeId);
                      const isSelected = selectedBlock === block.instanceId;
                      return (
                        <PreviewBlock
                          key={block.instanceId}
                          block={block} bt={bt}
                          isSelected={isSelected}
                          emailData={emailData}
                          onClick={() => selectBlock(block.instanceId)}
                          onRemove={() => removeBlock(block.instanceId)}
                          onMoveUp={() => moveBlock(block.instanceId, -1)}
                          onMoveDown={() => moveBlock(block.instanceId, 1)}
                          isFirst={idx === 0}
                          isLast={idx === emailBlocks.length - 1}
                        />
                      );
                    })}

                    {emailBlocks.length === 0 && (
                      <div style={{ padding:"48px 24px", textAlign:"center", color:"#9CA3AF" }}>
                        <div style={{ fontSize:28, marginBottom:8 }}>📧</div>
                        <p style={{ fontSize:13, fontWeight:500 }}>No blocks yet</p>
                        <p style={{ fontSize:12 }}>Add blocks from the Design panel</p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div style={{ padding:"14px 24px", borderTop:"1px solid #F0F0F4", background:"#FAFAFA" }}>
                    <p style={{ fontSize:11, color:"#9CA3AF", textAlign:"center", lineHeight:1.6 }}>
                      You received this email because you subscribed.<br/>© {new Date().getFullYear()} Email Studio
                    </p>
                  </div>
                </div>
              </div>

              {/* Add block button */}
              <div style={{ textAlign:"center", padding:"0 16px 20px" }}>
                <button
                  onClick={() => setPanelTab("design")}
                  style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 18px", background:"#fff", border:"1.5px dashed #C5B8AC", borderRadius:8, color:"#9CA3AF", fontSize:12.5, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor="#D05A2C"; e.currentTarget.style.color="#D05A2C"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor="#C5B8AC"; e.currentTarget.style.color="#9CA3AF"; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Block
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Preview Block ──────────────────────────────────────────── */
function PreviewBlock({ block, bt, isSelected, emailData, onClick, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [hovered, setHovered] = useState(false);

  const borderStyle = isSelected
    ? "2px dashed #D05A2C"
    : hovered ? "2px dashed #E8C4B0" : "2px dashed transparent";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position:"relative", cursor:"pointer", outline:"none", transition:"all 0.1s", border: borderStyle, borderRadius:4, margin:"4px 8px" }}
    >
      {/* Badge label (top-right when selected) */}
      {isSelected && (
        <div style={{ position:"absolute", top:-1, right:-1, zIndex:10, display:"flex", alignItems:"center", gap:0 }}>
          <div style={{ background:"#D05A2C", color:"#fff", fontSize:10.5, fontWeight:600, padding:"2px 8px", borderRadius:"0 3px 0 6px", letterSpacing:"0.03em", whiteSpace:"nowrap" }}>
            {bt?.label || block.typeId}
          </div>
        </div>
      )}

      {/* Move / delete controls */}
      {(isSelected || hovered) && (
        <div style={{ position:"absolute", top:"50%", right:-36, transform:"translateY(-50%)", display:"flex", flexDirection:"column", gap:2, zIndex:20 }}>
          {!isFirst && (
            <button onClick={e => { e.stopPropagation(); onMoveUp(); }}
              style={{ width:26, height:26, borderRadius:5, border:"1px solid #E5E0DA", background:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#6B7280" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18,15 12,9 6,15"/></svg>
            </button>
          )}
          {!isLast && (
            <button onClick={e => { e.stopPropagation(); onMoveDown(); }}
              style={{ width:26, height:26, borderRadius:5, border:"1px solid #E5E0DA", background:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#6B7280" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6,9 12,15 18,9"/></svg>
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); onRemove(); }}
            style={{ width:26, height:26, borderRadius:5, border:"1px solid #FCC", background:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#EF4444" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      {/* Block content rendering */}
      <BlockContent typeId={block.typeId} emailData={emailData} />
    </div>
  );
}

function BlockContent({ typeId, emailData }) {
  switch (typeId) {
    case "headline":
      return (
        <div style={{ padding:"24px 28px 8px" }}>
          <h1 style={{ fontSize:26, fontWeight:800, color:"#0f0f1a", lineHeight:1.25, letterSpacing:"-0.5px", margin:0 }}>
            {emailData.headline || <span style={{ color:"#C5B8AC", fontStyle:"italic", fontWeight:400, fontSize:18 }}>Click to add headline…</span>}
          </h1>
        </div>
      );
    case "body":
      return (
        <div style={{ padding:"8px 28px" }}>
          <p style={{ fontSize:15, lineHeight:1.75, color:"#444455", margin:0, whiteSpace:"pre-wrap" }}>
            {emailData.bodyText || <span style={{ color:"#C5B8AC", fontStyle:"italic", fontSize:13 }}>Click to add body text…</span>}
          </p>
        </div>
      );
    case "image":
      return (
        <div style={{ padding:"12px 28px" }}>
          {emailData.imageUrl ? (
            <img src={emailData.imageUrl} alt="" style={{ width:"100%", borderRadius:8, display:"block", maxHeight:240, objectFit:"cover" }}
              onError={e => e.target.style.display="none"} />
          ) : (
            <div style={{ height:120, border:"2px dashed #DDD8D2", borderRadius:8, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6, color:"#C5B8AC" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/>
              </svg>
              <span style={{ fontSize:12 }}>Paste image URL in edit panel</span>
            </div>
          )}
        </div>
      );
    case "cta":
      return (
        <div style={{ padding:"14px 28px 20px" }}>
          <a
            href={emailData.ctaLink && emailData.ctaLink !== "https://" ? emailData.ctaLink : "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => { if (emailData.ctaLink && emailData.ctaLink !== "https://") e.stopPropagation(); }}
            style={{ display:"inline-block", background: emailData.accentColor || "#D05A2C", borderRadius:8, padding:"13px 28px", fontSize:15, fontWeight:700, color:"#fff", letterSpacing:"0.01em", textDecoration:"none", cursor:"pointer" }}>
            {emailData.ctaText || "Click Here"} →
          </a>
        </div>
      );
    case "divider":
      return (
        <div style={{ padding:"8px 28px" }}>
          <hr style={{ border:"none", borderTop:"1.5px solid #F0EDE8", margin:0 }}/>
        </div>
      );
    case "subject":
      return (
        <div style={{ padding:"10px 28px", background:"#FAFAF8", borderBottom:"1px solid #F0EDE8" }}>
          <span style={{ fontSize:12, color:"#6B7280" }}>
            <strong>Subject:</strong> {emailData.subject || <em style={{ color:"#C5B8AC" }}>Add a subject…</em>}
          </span>
        </div>
      );
    case "multicolumn":
      return (
        <div style={{ padding:"14px 28px", display:"flex", gap:12 }}>
          {[1,2].map(i => (
            <div key={i} style={{ flex:1, border:"1.5px dashed #DDD8D2", borderRadius:8, padding:"16px 12px", color:"#C5B8AC", fontSize:12, textAlign:"center" }}>
              Column {i}
            </div>
          ))}
        </div>
      );
    case "footer":
      return (
        <div style={{ padding:"14px 28px", textAlign:"center" }}>
          <p style={{ fontSize:11, color:"#9CA3AF", lineHeight:1.7, margin:0 }}>
            Your Name · Company · Address<br/>
            <a href="#" style={{ color:"#D05A2C", textDecoration:"underline" }}>Unsubscribe</a>
          </p>
        </div>
      );
    default:
      return <div style={{ padding:"12px 28px", fontSize:12, color:"#9CA3AF", fontStyle:"italic" }}>Unknown block</div>;
  }
}

/* ─── DESIGN PANEL ──────────────────────────────────────────── */
function DesignPanel({ filteredBlocks, search, setSearch, selectedBlock, emailBlocks, onAddBlock }) {
  return (
    <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
      {/* Search */}
      <div style={{ padding:"12px 12px 8px", flexShrink:0 }}>
        <div style={{ position:"relative" }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Blocks"
            className="field-input"
            style={{ paddingRight:32 }}
          />
          <svg style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", color:"#9CA3AF" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex:1, overflowY:"auto", padding:"4px 12px 16px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {filteredBlocks.map(bt => {
            const isInEmail = emailBlocks.some(b => b.typeId === bt.id);
            return (
              <BlockCard
                key={bt.id}
                bt={bt}
                isActive={isInEmail}
                onClick={() => onAddBlock(bt.id)}
              />
            );
          })}
        </div>
        {filteredBlocks.length === 0 && (
          <div style={{ textAlign:"center", padding:"32px 0", color:"#9CA3AF", fontSize:12 }}>
            No blocks found
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Block Card (matches screenshot style exactly) ─────────── */
function BlockCard({ bt, isActive, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`Add ${bt.label}`}
      style={{
        position:"relative",
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        padding:"18px 8px 12px",
        background:"#fff", border: isActive ? "2px dashed #D05A2C" : hovered ? "1.5px solid #C5B8AC" : "1.5px solid #E5E0DA",
        borderRadius:10, cursor:"pointer", gap:10,
        transition:"all 0.15s",
        minHeight:90,
        fontFamily:"inherit",
      }}
    >
      {/* Icon */}
      <svg width="36" height="28" viewBox="0 0 36 28" fill="none" stroke={isActive ? "#D05A2C" : "#9CA3AF"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <g transform="translate(6,4)">{bt.icon}</g>
      </svg>

      {/* Label */}
      <span style={{ fontSize:11.5, fontWeight:500, color: isActive ? "#D05A2C" : "#6B7280", textAlign:"center", lineHeight:1.3 }}>
        {bt.label}
      </span>

      {/* "+" drag handle when active (matches screenshot) */}
      {isActive && (
        <div style={{ position:"absolute", bottom:-8, right:-8, width:18, height:18, borderRadius:"50%", background:"#D05A2C", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 6px rgba(208,90,44,0.4)" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
      )}
    </button>
  );
}

/* ─── EDIT PANEL ────────────────────────────────────────────── */
function EditPanel({ emailData, update, selectedBlock, selectedBlockType, emailBlocks, onRemove, onMove, onSelectBlock, onSwitchToDesign }) {
  if (!selectedBlock) {
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, textAlign:"center", color:"#9CA3AF" }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#DDD8D2" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom:12 }}>
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        <p style={{ fontSize:13, fontWeight:500, marginBottom:6, color:"#C5B8AC" }}>No block selected</p>
        <p style={{ fontSize:12, lineHeight:1.5 }}>Click any block in the preview to edit it, or switch to Design to add blocks.</p>
        <button onClick={onSwitchToDesign}
          style={{ marginTop:16, display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:"#D05A2C", color:"#fff", border:"none", borderRadius:6, fontSize:12.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Blocks
        </button>
      </div>
    );
  }

  const typeId = emailBlocks.find(b => b.instanceId === selectedBlock)?.typeId;

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"14px" }}>
      {/* Block label + actions */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, padding:"8px 10px", background:"#FDF3EE", borderRadius:8, border:"1px solid #F0C4A8" }}>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:"#D05A2C" }}/>
          <span style={{ fontSize:12, fontWeight:600, color:"#D05A2C" }}>{selectedBlockType?.label || typeId}</span>
        </div>
        <button onClick={() => onRemove(selectedBlock)}
          style={{ width:24, height:24, borderRadius:5, border:"none", background:"rgba(208,90,44,0.12)", color:"#D05A2C", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/><path d="M10,11v6"/><path d="M14,11v6"/><path d="M9,6V4h6v2"/></svg>
        </button>
      </div>

      {/* Block-specific fields */}
      <BlockEditFields typeId={typeId} emailData={emailData} update={update} />

      {/* Shared: accent color on cta */}
      {(typeId === "cta" || typeId === "headline") && (
        <div style={{ marginTop:16 }}>
          <Divider label="Design" />
          <Field label="Accent Color">
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input type="color" value={emailData.accentColor || "#D05A2C"} onChange={e => update("accentColor", e.target.value)}
                style={{ width:36, height:36, borderRadius:6, border:"1px solid #E5E0DA", cursor:"pointer", padding:2, background:"#fff" }}/>
              <input type="text" value={emailData.accentColor || "#D05A2C"} onChange={e => update("accentColor", e.target.value)}
                className="field-input" style={{ flex:1, fontFamily:"monospace", fontSize:12 }}/>
            </div>
            <ColorSwatches value={emailData.accentColor} onChange={v => update("accentColor", v)} />
          </Field>
        </div>
      )}

      {/* Block list / reorder */}
      <div style={{ marginTop:20 }}>
        <Divider label="All Blocks" />
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          {emailBlocks.map((b, idx) => {
            const btype = BLOCK_TYPES.find(t => t.id === b.typeId);
            const isThis = b.instanceId === selectedBlock;
            return (
              <button key={b.instanceId}
                onClick={() => onSelectBlock(b.instanceId)}
                style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", borderRadius:7, border: isThis ? "1px solid #D05A2C" : "1px solid #E5E0DA", background: isThis ? "#FDF3EE" : "#fff", cursor:"pointer", textAlign:"left", fontFamily:"inherit", transition:"all 0.1s" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isThis ? "#D05A2C" : "#9CA3AF"} strokeWidth="1.8" strokeLinecap="round">{btype?.icon}</svg>
                <span style={{ fontSize:12, color: isThis ? "#D05A2C" : "#4B5563", fontWeight: isThis ? 600 : 400, flex:1 }}>{btype?.label}</span>
                <span style={{ fontSize:10, color:"#C5B8AC" }}>#{idx+1}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BlockEditFields({ typeId, emailData, update }) {
  switch (typeId) {
    case "subject":
      return (
        <>
          <Field label="Subject Line">
            <input type="text" value={emailData.subject} onChange={e => update("subject", e.target.value)} placeholder="Your email subject…" className="field-input"/>
          </Field>
        </>
      );
    case "headline":
      return (
        <Field label="Headline Text">
          <input type="text" value={emailData.headline} onChange={e => update("headline", e.target.value)} placeholder="Big bold headline…" className="field-input"/>
        </Field>
      );
    case "body":
      return (
        <Field label="Body Text">
          <textarea value={emailData.bodyText} onChange={e => update("bodyText", e.target.value)} placeholder="Write your message here…" className="field-input" rows={6}/>
        </Field>
      );
    case "image":
      return (
        <>
          <Field label="Upload from Computer">
            <label style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"9px 0", border:"1.5px dashed #C5B8AC", borderRadius:8, cursor:"pointer", fontSize:12.5, color:"#6B7280", fontWeight:500, background:"#FAFAF9", transition:"all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor="#D05A2C"; e.currentTarget.style.color="#D05A2C"; e.currentTarget.style.background="#FDF3EE"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="#C5B8AC"; e.currentTarget.style.color="#6B7280"; e.currentTarget.style.background="#FAFAF9"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16,16 12,12 8,16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>
              Choose Image File
              <input type="file" accept="image/*" style={{ display:"none" }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => update("imageUrl", ev.target.result);
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </Field>
          <Field label="Or Paste Image URL">
            <input type="url" value={emailData.imageUrl} onChange={e => update("imageUrl", e.target.value)} placeholder="https://example.com/image.jpg" className="field-input"/>
          </Field>
          {emailData.imageUrl && (
            <div style={{ marginTop:8, borderRadius:8, overflow:"hidden", border:"1px solid #E5E0DA" }}>
              <img src={emailData.imageUrl} alt="" style={{ width:"100%", maxHeight:120, objectFit:"cover", display:"block" }} onError={e => e.target.style.display="none"}/>
            </div>
          )}
          <button onClick={() => update("imageUrl", "")}
            style={{ marginTop:8, width:"100%", padding:"5px 0", border:"1px solid #E5E0DA", borderRadius:6, background:"none", color:"#9CA3AF", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}
            onMouseEnter={e => { e.currentTarget.style.color="#EF4444"; e.currentTarget.style.borderColor="#FCA5A5"; }}
            onMouseLeave={e => { e.currentTarget.style.color="#9CA3AF"; e.currentTarget.style.borderColor="#E5E0DA"; }}
          >
            Remove Image
          </button>
        </>
      );
    case "cta":
      return (
        <>
          <Field label="Button Text">
            <input type="text" value={emailData.ctaText} onChange={e => update("ctaText", e.target.value)} placeholder="Click Here" className="field-input"/>
          </Field>
          <Field label="Button URL">
            <input type="url" value={emailData.ctaLink} onChange={e => update("ctaLink", e.target.value)} placeholder="https://yoursite.com" className="field-input"/>
          </Field>
        </>
      );
    default:
      return (
        <p style={{ fontSize:12, color:"#9CA3AF", fontStyle:"italic" }}>No editable properties for this block.</p>
      );
  }
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ display:"block", fontSize:10.5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em", color:"#9CA3AF", marginBottom:5 }}>{label}</label>
      {children}
    </div>
  );
}

function Divider({ label }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
      <span style={{ fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", color:"#C5B8AC", whiteSpace:"nowrap" }}>{label}</span>
      <div style={{ flex:1, height:1, background:"#EDE9E4" }}/>
    </div>
  );
}

function ColorSwatches({ value, onChange }) {
  const presets = ["#D05A2C","#4f6ef7","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#1A1D2E"];
  return (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
      {presets.map(c => (
        <button key={c} onClick={() => onChange(c)}
          style={{ width:22, height:22, borderRadius:"50%", background:c, border: value===c ? "2.5px solid #1A1D2E" : "2px solid transparent", cursor:"pointer", transition:"all 0.1s", transform: value===c ? "scale(1.1)" : "scale(1)" }}/>
      ))}
    </div>
  );
}

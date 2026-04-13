"use client";
import { useState, useRef, useEffect } from "react";

/* ─── CONSTANTS ──────────────────────────────────────── */
const ACC = "#D05A2C";
const BRD = "#E5E0DA";
const MUT = "#9CA3AF";
const mkId = () => Math.random().toString(36).slice(2,8);
const PRESETS = ["#D05A2C","#3730A3","#059669","#0284C7","#7C3AED","#DB2777","#D97706","#1A1D2E","#374151"];
const FONTS = [
  {l:"Helvetica / Arial", v:"'Helvetica Neue',Arial,sans-serif"},
  {l:"Georgia (Serif)",   v:"Georgia,'Times New Roman',serif"},
  {l:"Trebuchet MS",      v:"'Trebuchet MS',Helvetica,sans-serif"},
  {l:"Courier New",       v:"'Courier New',monospace"},
];

/* ─── BLOCK CATALOGUE ─────────────────────────────────── */
const BTYPES = [
  {id:"subject",  label:"Subject Line",  icon:<><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="10" x2="14" y2="10"/></>},
  {id:"header",   label:"Header / Brand",icon:<><rect x="2" y="3" width="20" height="7" rx="1"/><line x1="2" y1="14" x2="22" y2="14"/></>},
  {id:"headline", label:"Headline",      icon:<><line x1="3" y1="5" x2="21" y2="5" strokeWidth="3"/><line x1="3" y1="11" x2="16" y2="11"/><line x1="3" y1="17" x2="12" y2="17"/></>},
  {id:"text",     label:"Body Text",     icon:<><line x1="3" y1="5" x2="21" y2="5"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="13" x2="21" y2="13"/><line x1="3" y1="17" x2="14" y2="17"/></>},
  {id:"image",    label:"Image",         icon:<><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></>},
  {id:"button",   label:"Button / CTA",  icon:<><rect x="2" y="7" width="20" height="10" rx="5"/><line x1="7" y1="12" x2="17" y2="12"/></>},
  {id:"columns",  label:"Two Columns",   icon:<><rect x="2" y="3" width="9" height="18" rx="1"/><rect x="13" y="3" width="9" height="18" rx="1"/></>},
  {id:"divider",  label:"Divider",       icon:<><line x1="3" y1="12" x2="21" y2="12" strokeDasharray="3 2"/></>},
  {id:"spacer",   label:"Spacer",        icon:<><line x1="12" y1="4" x2="12" y2="20"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="16" x2="16" y2="16"/></>},
  {id:"footer",   label:"Footer",        icon:<><rect x="3" y="15" width="18" height="6" rx="1"/><line x1="3" y1="9" x2="14" y2="9"/><line x1="3" y1="6" x2="10" y2="6"/></>},
];

const BD = {
  subject:  {text:"Your Subject Line Here"},
  header:   {logoText:"Your Brand",logoUrl:"",bgColor:"#1A1D2E",textColor:"#ffffff",align:"center"},
  headline: {text:"Your Headline Here",fontSize:28,color:"#0f0f1a",align:"left",fontWeight:"800",url:""},
  text:     {html:"<p>Write your message here. Engage your readers with compelling, clear content that drives them to take action.</p>",fontSize:15,color:"#444455"},
  image:    {src:"",alt:"",link:"",caption:"",borderRadius:8},
  button:   {text:"Get Started →",url:"",bgColor:ACC,textColor:"#ffffff",align:"center",size:"large",fullWidth:false,radius:8},
  divider:  {color:"#E5E0DA",style:"solid",thickness:1,margin:20},
  spacer:   {height:32},
  columns:  {leftHtml:"<p><strong>Column 1</strong><br/>Add your content here.</p>",rightHtml:"<p><strong>Column 2</strong><br/>Add your content here.</p>",gap:20,color:"#444455",fontSize:14},
  footer:   {text:"Your Company · 123 Main Street, City, State",unsubText:"Unsubscribe",unsubUrl:"#",bgColor:"#FAFAF9",textColor:"#9CA3AF"},
};

/* ─── TEMPLATES ──────────────────────────────────────── */
const mkBlocks = (arr) => arr.map(b => ({...b, id:mkId(), data:{...b.data}}));

const TEMPLATES = {
  blank: {
    name:"Blank", emoji:"⬜", desc:"Start from scratch",
    blocks: mkBlocks([
      {type:"header",  data:{...BD.header}},
      {type:"spacer",  data:{height:48}},
      {type:"footer",  data:{...BD.footer}},
    ]),
    global:{bgColor:"#f4f4f7",fontFamily:"'Helvetica Neue',Arial,sans-serif",accentColor:ACC},
  },
  newsletter: {
    name:"Newsletter", emoji:"📧", desc:"Monthly updates & stories",
    blocks: mkBlocks([
      {type:"subject",  data:{text:"📧 Our Monthly Newsletter — Issue #1"}},
      {type:"header",   data:{logoText:"Newsletter Co",logoUrl:"",bgColor:"#1A1D2E",textColor:"#fff",align:"center"}},
      {type:"image",    data:{...BD.image}},
      {type:"headline", data:{text:"What's New This Month",fontSize:26,color:"#0f0f1a",align:"left",fontWeight:"800"}},
      {type:"text",     data:{html:"<p>We're excited to share the latest updates, stories, and highlights from our team. There's so much to cover — let's dive right in!</p>",fontSize:15,color:"#444455"}},
      {type:"button",   data:{text:"Read Full Story →",url:"",bgColor:ACC,textColor:"#fff",align:"left",size:"medium",fullWidth:false,radius:8}},
      {type:"divider",  data:{...BD.divider}},
      {type:"headline", data:{text:"More Highlights",fontSize:20,color:"#0f0f1a",align:"left",fontWeight:"700"}},
      {type:"columns",  data:{leftHtml:"<p><strong>Story One</strong><br/>A short description of your first story or highlight.</p>",rightHtml:"<p><strong>Story Two</strong><br/>A short description of your second story or highlight.</p>",gap:20,color:"#444455",fontSize:14}},
      {type:"footer",   data:{...BD.footer}},
    ]),
    global:{bgColor:"#f4f4f7",fontFamily:"'Helvetica Neue',Arial,sans-serif",accentColor:ACC},
  },
  promo: {
    name:"Promotional", emoji:"🔥", desc:"Sales, offers & launches",
    blocks: mkBlocks([
      {type:"subject",  data:{text:"🔥 Limited Time — Don't Miss This!"}},
      {type:"header",   data:{logoText:"YourBrand",logoUrl:"",bgColor:ACC,textColor:"#fff",align:"center"}},
      {type:"image",    data:{...BD.image}},
      {type:"headline", data:{text:"50% Off — This Weekend Only",fontSize:30,color:ACC,align:"center",fontWeight:"900"}},
      {type:"text",     data:{html:"<p style='text-align:center'>Don't miss our biggest sale of the year. This offer expires Sunday at midnight — act fast!</p>",fontSize:16,color:"#444455"}},
      {type:"button",   data:{text:"Shop Now — Save 50%",url:"",bgColor:ACC,textColor:"#fff",align:"center",size:"large",fullWidth:true,radius:8}},
      {type:"text",     data:{html:"<p style='text-align:center;font-size:12px;color:#9CA3AF'>Use code <strong>SAVE50</strong> at checkout &bull; Ends Sunday midnight</p>",fontSize:12,color:"#9CA3AF"}},
      {type:"footer",   data:{...BD.footer}},
    ]),
    global:{bgColor:"#fff5f0",fontFamily:"'Helvetica Neue',Arial,sans-serif",accentColor:ACC},
  },
  welcome: {
    name:"Welcome Email", emoji:"👋", desc:"Onboard new subscribers",
    blocks: mkBlocks([
      {type:"subject",  data:{text:"Welcome to the family! 🎉"}},
      {type:"header",   data:{logoText:"YourApp",logoUrl:"",bgColor:"#3730A3",textColor:"#fff",align:"center"}},
      {type:"headline", data:{text:"You're officially in! 🎉",fontSize:30,color:"#0f0f1a",align:"center",fontWeight:"800"}},
      {type:"text",     data:{html:"<p style='text-align:center'>We're thrilled to have you on board. Everything is ready for you. Let's get you started!</p>",fontSize:16,color:"#444455"}},
      {type:"button",   data:{text:"Go to Your Dashboard →",url:"",bgColor:"#3730A3",textColor:"#fff",align:"center",size:"large",fullWidth:false,radius:8}},
      {type:"divider",  data:{...BD.divider,margin:28}},
      {type:"columns",  data:{leftHtml:"<p><strong>📚 Step 1: Set up</strong><br/>Customize your profile and preferences in just a few clicks.</p>",rightHtml:"<p><strong>🚀 Step 2: Explore</strong><br/>Discover features built to make your life easier.</p>",gap:20,color:"#444455",fontSize:14}},
      {type:"footer",   data:{...BD.footer}},
    ]),
    global:{bgColor:"#f0f4ff",fontFamily:"'Helvetica Neue',Arial,sans-serif",accentColor:"#3730A3"},
  },
};

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function EmailBuilder({ blocks, setBlocks, globalStyles, setGlobalStyles }) {
  const [selectedId, setSelectedId] = useState(null);
  const [panelTab, setPanelTab]     = useState("design");
  const [zoom, setZoom]             = useState(100);
  const [device, setDevice]         = useState("desktop");
  const [showPicker, setShowPicker] = useState(!blocks);

  const sel = blocks?.find(b => b.id === selectedId) ?? null;

  const updBlock = (id, patch) =>
    setBlocks(p => p.map(b => b.id === id ? {...b, data:{...b.data,...patch}} : b));

  const addBlock = (typeId) => {
    const nb = {id:mkId(), type:typeId, data:{...BD[typeId]}};
    setBlocks(p => {
      if (!p) return [nb];
      const idx = selectedId ? p.findIndex(b=>b.id===selectedId) : p.length-1;
      const n=[...p]; n.splice(idx+1,0,nb); return n;
    });
    setSelectedId(nb.id); setPanelTab("edit");
  };

  const removeBlock = (id) => {
    setBlocks(p => p.filter(b=>b.id!==id));
    if (selectedId===id) { setSelectedId(null); setPanelTab("design"); }
  };

  const moveBlock = (id, dir) => setBlocks(p => {
    const i=p.findIndex(b=>b.id===id);
    if ((dir<0&&i===0)||(dir>0&&i===p.length-1)) return p;
    const n=[...p]; [n[i],n[i+dir]]=[n[i+dir],n[i]]; return n;
  });

  const dupBlock = (id) => setBlocks(p => {
    const i=p.findIndex(b=>b.id===id);
    const clone={...p[i],id:mkId(),data:{...p[i].data}};
    const n=[...p]; n.splice(i+1,0,clone); return n;
  });

  const pickTpl = (tpl) => {
    setBlocks(tpl.blocks.map(b=>({...b,id:mkId(),data:{...b.data}})));
    setGlobalStyles({...tpl.global});
    setShowPicker(false); setSelectedId(null);
  };

  if (showPicker) return <TemplatePicker onSelect={pickTpl}/>;

  const ff = globalStyles?.fontFamily || "'Helvetica Neue',Arial,sans-serif";

  return (
    <div style={{display:"flex",flex:1,overflow:"hidden"}}>

      {/* ── LEFT PANEL ──────────────────────── */}
      <div style={{width:284,flexShrink:0,background:"#fff",borderRight:`1px solid ${BRD}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Tab bar */}
        <div style={{display:"flex",borderBottom:`1px solid ${BRD}`,flexShrink:0}}>
          {["design","edit"].map(t=>(
            <button key={t} onClick={()=>setPanelTab(t)}
              style={{flex:1,padding:"11px 0",border:"none",background:"none",fontFamily:"inherit",fontSize:11.5,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",cursor:"pointer",color:panelTab===t?ACC:MUT,borderBottom:`2px solid ${panelTab===t?ACC:"transparent"}`,marginBottom:-1,transition:"color 0.15s"}}>
              {t}
            </button>
          ))}
        </div>

        {panelTab==="design"
          ? <DesignPanel blocks={blocks} onAdd={addBlock} globalStyles={globalStyles} setGlobalStyles={setGlobalStyles} onPickTemplate={()=>setShowPicker(true)}/>
          : <EditPanel block={sel} onUpdate={p=>sel&&updBlock(sel.id,p)} onRemove={()=>sel&&removeBlock(sel.id)} onSwitch={()=>setPanelTab("design")}/>
        }
      </div>

      {/* ── CANVAS AREA ──────────────────────── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#F4EFE9"}}>
        {/* Sub-toolbar */}
        <div style={{height:44,background:"#fff",borderBottom:`1px solid ${BRD}`,display:"flex",alignItems:"center",padding:"0 14px",gap:6,flexShrink:0}}>
          <div style={{display:"flex",gap:0,marginRight:6}}>
            {["Block","Page"].map((t,i)=>(
              <button key={t} style={{padding:"5px 13px",border:`1px solid ${BRD}`,borderRight:i===0?"none":undefined,borderRadius:i===0?"6px 0 0 6px":"0 6px 6px 0",background:i===0?"#F4EFE9":"#fff",fontSize:11.5,fontWeight:500,color:i===0?ACC:"#6B7280",cursor:"pointer",fontFamily:"inherit"}}>{t}</button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <Zb onClick={()=>setZoom(z=>Math.max(50,z-10))}>−</Zb>
            <span style={{fontSize:11.5,color:"#6B7280",minWidth:40,textAlign:"center"}}>{zoom}%</span>
            <Zb onClick={()=>setZoom(z=>Math.min(150,z+10))}>+</Zb>
          </div>
          <div style={{flex:1}}/>
          <div style={{display:"flex",gap:2}}>
            {[
              {id:"desktop",d:<><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>},
              {id:"mobile", d:<><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></>},
            ].map(({id,d})=>(
              <button key={id} onClick={()=>setDevice(id)}
                style={{width:28,height:28,borderRadius:6,border:"none",background:device===id?"#FDF3EE":"none",color:device===id?ACC:MUT,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">{d}</svg>
              </button>
            ))}
          </div>
        </div>

        {/* Canvas scroll area */}
        <div style={{flex:1,overflow:"auto",padding:"28px 24px 40px",display:"flex",justifyContent:"center"}}
          onClick={()=>{setSelectedId(null);setPanelTab("design");}}>
          <div style={{width:device==="mobile"?375:"100%",maxWidth:660,transform:`scale(${zoom/100})`,transformOrigin:"top center",transition:"all 0.2s"}}>
            {/* Browser chrome */}
            <div style={{background:"#DDD8D2",borderRadius:"10px 10px 0 0",padding:"8px 12px",display:"flex",alignItems:"center",gap:8}}>
              <div style={{display:"flex",gap:5}}>
                {["#FF5F57","#FFBD2E","#28CA41"].map((c,i)=><div key={i} style={{width:9,height:9,borderRadius:"50%",background:c}}/>)}
              </div>
              <div style={{flex:1,background:"rgba(255,255,255,0.55)",borderRadius:4,padding:"2px 10px",fontSize:10.5,color:"#8B8580",textAlign:"center"}}>📧 Email Preview</div>
            </div>

            {/* Email shell */}
            <div style={{background:globalStyles?.bgColor||"#f4f4f7",padding:"0 0 20px",borderRadius:"0 0 10px 10px",minHeight:500}}
              onClick={e=>e.stopPropagation()}>
              <div style={{maxWidth:600,margin:"0 auto",background:"#fff",boxShadow:"0 4px 24px rgba(0,0,0,0.07)",fontFamily:ff}}>
                {(blocks||[]).map((block,idx)=>(
                  <BlockRow key={block.id} block={block} idx={idx} total={(blocks||[]).length}
                    isSelected={selectedId===block.id} ff={ff}
                    onSelect={()=>{setSelectedId(block.id);setPanelTab("edit");}}
                    onUpdate={p=>updBlock(block.id,p)}
                    onRemove={()=>removeBlock(block.id)}
                    onDuplicate={()=>dupBlock(block.id)}
                    onMoveUp={()=>moveBlock(block.id,-1)}
                    onMoveDown={()=>moveBlock(block.id,1)}
                  />
                ))}
                {(!blocks||blocks.length===0)&&(
                  <div style={{padding:"60px 40px",textAlign:"center",color:MUT}}>
                    <div style={{fontSize:36,marginBottom:10}}>📧</div>
                    <p style={{fontSize:13,fontWeight:500}}>No blocks yet</p>
                    <p style={{fontSize:12}}>Add blocks from the Design tab</p>
                  </div>
                )}
              </div>
            </div>

            <div style={{textAlign:"center",paddingTop:14}}>
              <button onClick={()=>setPanelTab("design")}
                style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 18px",background:"#fff",border:`1.5px dashed ${BRD}`,borderRadius:8,color:MUT,fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=ACC;e.currentTarget.style.color=ACC;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=BRD;e.currentTarget.style.color=MUT;}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Block
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
const Zb = ({onClick,children}) => (
  <button onClick={onClick} style={{width:22,height:22,borderRadius:4,border:`1px solid ${BRD}`,background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#6B7280"}}>{children}</button>
);

/* ─── TEMPLATE PICKER ────────────────────────────────── */
function TemplatePicker({onSelect}) {
  return (
    <div style={{position:"fixed",inset:0,background:"#F4EFE9",backgroundImage:"radial-gradient(circle, #C5B8AC 1px, transparent 1px)",backgroundSize:"22px 22px",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:24}}>
      <div style={{width:"100%",maxWidth:780}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:52,height:52,borderRadius:"50%",background:"#1A1D2E",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:14}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <h1 style={{fontSize:26,fontWeight:800,color:"#1A1D2E",marginBottom:8,letterSpacing:"-0.5px"}}>Choose a Starting Template</h1>
          <p style={{fontSize:14,color:"#6B7280"}}>Pick a layout and customise every detail — text, images, colors and more.</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
          {Object.entries(TEMPLATES).map(([k,tpl])=>(
            <button key={k} onClick={()=>onSelect(tpl)}
              style={{background:"#fff",border:"2px solid #E5E0DA",borderRadius:14,padding:"28px 18px 22px",cursor:"pointer",fontFamily:"inherit",textAlign:"center",transition:"all 0.2s",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=ACC;e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 30px rgba(208,90,44,0.15)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#E5E0DA";e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
              <span style={{fontSize:34}}>{tpl.emoji}</span>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:"#1A1D2E",marginBottom:4}}>{tpl.name}</div>
                <div style={{fontSize:11.5,color:"#9CA3AF",lineHeight:1.4}}>{tpl.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── LEFT: DESIGN TAB ───────────────────────────────── */
function DesignPanel({blocks,onAdd,globalStyles,setGlobalStyles,onPickTemplate}) {
  const [search,setSearch]=useState("");
  const filtered=BTYPES.filter(b=>b.label.toLowerCase().includes(search.toLowerCase()));
  const upd=(k,v)=>setGlobalStyles(g=>({...g,[k]:v}));

  return (
    <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"12px 12px 8px",flexShrink:0}}>
        <div style={{position:"relative"}}>
          <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search blocks…" className="field-input" style={{paddingRight:32}}/>
          <svg style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",color:MUT}} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
      </div>

      <div style={{padding:"0 12px 14px"}}>
        <DLabel>Add Block</DLabel>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
          {filtered.map(bt=>{
            const active=blocks?.some(b=>b.type===bt.id);
            return (
              <button key={bt.id} onClick={()=>onAdd(bt.id)}
                style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"15px 8px 11px",background:"#fff",border:`1.5px solid ${active?ACC:BRD}`,borderRadius:10,cursor:"pointer",gap:7,transition:"all 0.15s",fontFamily:"inherit",minHeight:78,position:"relative"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=ACC;e.currentTarget.style.background="#FDF3EE";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=active?ACC:BRD;e.currentTarget.style.background="#fff";}}>
                <svg width="32" height="24" viewBox="0 0 32 24" fill="none" stroke={active?ACC:"#9CA3AF"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><g transform="translate(4,2)">{bt.icon}</g></svg>
                <span style={{fontSize:11,fontWeight:600,color:active?ACC:"#6B7280",textAlign:"center",lineHeight:1.3}}>{bt.label}</span>
                {active&&<div style={{position:"absolute",top:-1,right:-1,width:8,height:8,borderRadius:"50%",background:ACC}}/>}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{padding:"0 12px 16px",borderTop:`1px solid ${BRD}`,paddingTop:14}}>
        <DLabel>Email Styles</DLabel>
        <Fld label="Background Color">
          <ColorRow value={globalStyles?.bgColor||"#f4f4f7"} onChange={v=>upd("bgColor",v)} swatches={["#f4f4f7","#fff5f0","#f0f4ff","#f0fdf4","#fafafa","#1a1d2e"]}/>
        </Fld>
        <Fld label="Font Family">
          <select value={globalStyles?.fontFamily} onChange={e=>upd("fontFamily",e.target.value)} className="field-input" style={{fontSize:11.5}}>
            {FONTS.map(f=><option key={f.v} value={f.v}>{f.l}</option>)}
          </select>
        </Fld>
        <Fld label="Accent Color">
          <ColorRow value={globalStyles?.accentColor||ACC} onChange={v=>upd("accentColor",v)} swatches={PRESETS}/>
        </Fld>
      </div>

      <div style={{padding:"0 12px 16px"}}>
        <button onClick={onPickTemplate} style={{width:"100%",padding:"8px 0",border:`1px solid ${BRD}`,borderRadius:7,background:"none",color:"#6B7280",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=ACC;e.currentTarget.style.color=ACC;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=BRD;e.currentTarget.style.color="#6B7280";}}>
          ↩ Switch Template
        </button>
      </div>
    </div>
  );
}

/* ─── LEFT: EDIT TAB ─────────────────────────────────── */
function EditPanel({block,onUpdate,onRemove,onSwitch}) {
  if (!block) return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,textAlign:"center",color:MUT}}>
      <div style={{fontSize:36,marginBottom:12}}>✏️</div>
      <p style={{fontSize:13,fontWeight:500,color:"#C5B8AC",marginBottom:6}}>No block selected</p>
      <p style={{fontSize:12,lineHeight:1.5}}>Click any block in the preview to edit its content and style.</p>
      <button onClick={onSwitch} style={{marginTop:16,padding:"7px 16px",background:ACC,color:"#fff",border:"none",borderRadius:6,fontSize:12.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Browse Blocks</button>
    </div>
  );

  const meta=BTYPES.find(b=>b.id===block.type);
  return (
    <div style={{flex:1,overflow:"auto"}}>
      <div style={{padding:"11px 14px",borderBottom:`1px solid ${BRD}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,background:"#FEFCFA"}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:ACC}}/>
          <span style={{fontSize:11.5,fontWeight:700,color:ACC,textTransform:"uppercase",letterSpacing:"0.05em"}}>{meta?.label||block.type}</span>
        </div>
        <button onClick={onRemove} title="Delete block"
          style={{width:26,height:26,borderRadius:5,border:"none",background:"rgba(208,90,44,0.1)",color:ACC,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/><path d="M9,6V4h6v2"/></svg>
        </button>
      </div>
      <div style={{padding:"14px 14px"}}>
        <BlockFields block={block} onUpdate={onUpdate}/>
      </div>
    </div>
  );
}

/* ─── PER-BLOCK EDIT FIELDS ──────────────────────────── */
function BlockFields({block,onUpdate}) {
  const {type,data}=block;
  const u=(k,v)=>onUpdate({[k]:v});

  switch(type) {
    case "subject": return (<>
      <Fld label="Subject Line">
        <input type="text" value={data.text} onChange={e=>u("text",e.target.value)} placeholder="Your subject…" className="field-input"/>
      </Fld>
      <p style={{fontSize:11,color:MUT,marginTop:-4}}>Shown in the recipient's inbox preview.</p>
    </>);

    case "header": return (<>
      <Fld label="Brand / Logo Name">
        <input type="text" value={data.logoText} onChange={e=>u("logoText",e.target.value)} placeholder="Your Brand" className="field-input"/>
      </Fld>
      <Fld label="Logo Image (optional)">
        <ImgUpload src={data.logoUrl} onSrc={v=>u("logoUrl",v)} small/>
      </Fld>
      <Fld label="Background Color">
        <ColorRow value={data.bgColor} onChange={v=>u("bgColor",v)} swatches={["#1A1D2E","#D05A2C","#3730A3","#059669","#fff","#000"]}/>
      </Fld>
      <Fld label="Text / Logo Color">
        <ColorRow value={data.textColor} onChange={v=>u("textColor",v)} swatches={["#ffffff","#1A1D2E","#F4EFE9"]}/>
      </Fld>
      <Fld label="Alignment">
        <Align value={data.align||"center"} onChange={v=>u("align",v)}/>
      </Fld>
    </>);

    case "headline": return (<>
      <Fld label="Headline Text">
        <textarea value={data.text} onChange={e=>u("text",e.target.value)} placeholder="Your headline…" className="field-input" rows={3}/>
      </Fld>
      <Fld label="Headline Link (optional)">
        <input
          type="url"
          value={data.url||""}
          onChange={e=>u("url",e.target.value)}
          placeholder="https://yoursite.com"
          className="field-input"
          style={{borderColor:data.url&&data.url!=="https://"?"#86EFAC":undefined}}
        />
        {data.url&&data.url!=="https://"&&data.url!==""&&<p style={{marginTop:4,fontSize:11,color:"#16A34A"}}>✓ Headline link set — headline is clickable</p>}
      </Fld>
      <DLabel>Typography</DLabel>
      <Fld label="Font Size">
        <Slider min={14} max={60} value={data.fontSize||28} onChange={v=>u("fontSize",v)} unit="px"/>
      </Fld>
      <Fld label="Font Weight">
        <div style={{display:"flex",gap:5}}>
          {[["400","Regular"],["600","Semi"],["700","Bold"],["800","XBold"],["900","Black"]].map(([w,l])=>(
            <Tb key={w} active={data.fontWeight===w} onClick={()=>u("fontWeight",w)} style={{fontWeight:w}}>{l}</Tb>
          ))}
        </div>
      </Fld>
      <Fld label="Alignment">
        <Align value={data.align||"left"} onChange={v=>u("align",v)}/>
      </Fld>
      <Fld label="Color">
        <ColorRow value={data.color||"#0f0f1a"} onChange={v=>u("color",v)} swatches={["#0f0f1a","#1A1D2E","#D05A2C","#3730A3","#6B7280",...PRESETS]}/>
      </Fld>
    </>);

    case "text": return (<>
      <Fld label="Body Text">
        <RTE html={data.html} onChange={v=>u("html",v)}/>
      </Fld>
      <Fld label="Font Size">
        <Slider min={11} max={24} value={data.fontSize||15} onChange={v=>u("fontSize",v)} unit="px"/>
      </Fld>
      <Fld label="Text Color">
        <ColorRow value={data.color||"#444455"} onChange={v=>u("color",v)} swatches={["#0f0f1a","#444455","#6B7280","#9CA3AF"]}/>
      </Fld>
    </>);

    case "image": return (<>
      <Fld label="Image">
        <ImgUpload src={data.src} onSrc={v=>u("src",v)}/>
      </Fld>
      <Fld label="Alt Text (accessibility)">
        <input type="text" value={data.alt} onChange={e=>u("alt",e.target.value)} placeholder="Describe the image…" className="field-input"/>
      </Fld>
      <Fld label="Link URL (makes image clickable)">
        <input type="url" value={data.link} onChange={e=>u("link",e.target.value)} placeholder="https://yoursite.com" className="field-input"/>
      </Fld>
      <Fld label="Caption (optional)">
        <input type="text" value={data.caption} onChange={e=>u("caption",e.target.value)} placeholder="Image caption…" className="field-input"/>
      </Fld>
      <Fld label="Corner Radius">
        <Slider min={0} max={24} value={data.borderRadius||0} onChange={v=>u("borderRadius",v)} unit="px"/>
      </Fld>
    </>);

    case "button": return (<>
      <Fld label="Button Label">
        <input type="text" value={data.text} onChange={e=>u("text",e.target.value)} placeholder="Click Here →" className="field-input"/>
      </Fld>
      <Fld label="Button URL ⚡">
        <input type="url" value={data.url} onChange={e=>u("url",e.target.value)} placeholder="https://yoursite.com" className="field-input"
          style={{borderColor:data.url&&data.url!=="https://"?"#86EFAC":undefined}}/>
        {(!data.url||data.url==="https://"||data.url==="")&&<p style={{marginTop:4,fontSize:11,color:"#D97706"}}>⚠ Add a URL to make this button work</p>}
        {data.url&&data.url!=="https://"&&data.url!==""&&<p style={{marginTop:4,fontSize:11,color:"#16A34A"}}>✓ Link set — button is clickable</p>}
      </Fld>
      <DLabel>Style</DLabel>
      <Fld label="Button Color">
        <ColorRow value={data.bgColor||ACC} onChange={v=>u("bgColor",v)} swatches={PRESETS}/>
      </Fld>
      <Fld label="Text Color">
        <ColorRow value={data.textColor||"#fff"} onChange={v=>u("textColor",v)} swatches={["#ffffff","#1A1D2E","#F4EFE9"]}/>
      </Fld>
      <Fld label="Alignment">
        <Align value={data.align||"center"} onChange={v=>u("align",v)}/>
      </Fld>
      <Fld label="Size">
        <div style={{display:"flex",gap:6}}>
          {["small","medium","large"].map(s=>(
            <Tb key={s} active={data.size===s} onClick={()=>u("size",s)}>{s.charAt(0).toUpperCase()+s.slice(1)}</Tb>
          ))}
        </div>
      </Fld>
      <Fld label="Corner Radius">
        <Slider min={0} max={50} value={data.radius||8} onChange={v=>u("radius",v)} unit="px"/>
      </Fld>
      <Fld label="">
        <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
          <input type="checkbox" checked={!!data.fullWidth} onChange={e=>u("fullWidth",e.target.checked)}/>
          <span style={{fontSize:12.5,color:"#4B5563"}}>Full-width button</span>
        </label>
      </Fld>
    </>);

    case "divider": return (<>
      <Fld label="Line Style">
        <div style={{display:"flex",gap:6}}>
          {["solid","dashed","dotted"].map(s=>(
            <Tb key={s} active={data.style===s} onClick={()=>u("style",s)}>{s.charAt(0).toUpperCase()+s.slice(1)}</Tb>
          ))}
        </div>
      </Fld>
      <Fld label="Color">
        <ColorRow value={data.color||"#E5E0DA"} onChange={v=>u("color",v)} swatches={["#E5E0DA","#D05A2C","#3730A3","#E5E7EB","#9CA3AF"]}/>
      </Fld>
      <Fld label="Thickness">
        <Slider min={1} max={6} value={data.thickness||1} onChange={v=>u("thickness",v)} unit="px"/>
      </Fld>
      <Fld label="Vertical Margin">
        <Slider min={4} max={60} value={data.margin||20} onChange={v=>u("margin",v)} unit="px"/>
      </Fld>
    </>);

    case "spacer": return (
      <Fld label="Height">
        <Slider min={8} max={120} value={data.height||32} onChange={v=>u("height",v)} unit="px"/>
      </Fld>
    );

    case "columns": return (<>
      <Fld label="Left Column">
        <RTE html={data.leftHtml} onChange={v=>u("leftHtml",v)}/>
      </Fld>
      <Fld label="Right Column">
        <RTE html={data.rightHtml} onChange={v=>u("rightHtml",v)}/>
      </Fld>
      <Fld label="Text Color">
        <ColorRow value={data.color||"#444455"} onChange={v=>u("color",v)} swatches={["#0f0f1a","#444455","#6B7280","#9CA3AF"]}/>
      </Fld>
      <Fld label="Font Size">
        <Slider min={11} max={20} value={data.fontSize||14} onChange={v=>u("fontSize",v)} unit="px"/>
      </Fld>
    </>);

    case "footer": return (<>
      <Fld label="Company / Address">
        <textarea value={data.text} onChange={e=>u("text",e.target.value)} placeholder="Company · Address" className="field-input" rows={2}/>
      </Fld>
      <Fld label="Unsubscribe Text">
        <input type="text" value={data.unsubText} onChange={e=>u("unsubText",e.target.value)} placeholder="Unsubscribe" className="field-input"/>
      </Fld>
      <Fld label="Unsubscribe URL">
        <input type="url" value={data.unsubUrl} onChange={e=>u("unsubUrl",e.target.value)} placeholder="https://…" className="field-input"/>
      </Fld>
      <Fld label="Background Color">
        <ColorRow value={data.bgColor||"#FAFAF9"} onChange={v=>u("bgColor",v)} swatches={["#FAFAF9","#f4f4f7","#1A1D2E","#fff"]}/>
      </Fld>
      <Fld label="Text Color">
        <ColorRow value={data.textColor||"#9CA3AF"} onChange={v=>u("textColor",v)} swatches={["#9CA3AF","#6B7280","#fff"]}/>
      </Fld>
    </>);

    default: return <p style={{fontSize:12,color:MUT,fontStyle:"italic"}}>No settings available.</p>;
  }
}

/* ─── IMAGE UPLOAD FIELD ─────────────────────────────── */
function ImgUpload({src,onSrc,small}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:7}}>
      <label style={{display:"flex",alignItems:"center",justifyContent:"center",gap:7,padding:"9px 12px",border:`1.5px dashed ${BRD}`,borderRadius:8,cursor:"pointer",fontSize:12,color:"#6B7280",fontWeight:500,background:"#FAFAF9",transition:"all 0.15s"}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=ACC;e.currentTarget.style.color=ACC;e.currentTarget.style.background="#FDF3EE";}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=BRD;e.currentTarget.style.color="#6B7280";e.currentTarget.style.background="#FAFAF9";}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16,16 12,12 8,16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>
        Upload from Computer
        <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
          const f=e.target.files?.[0]; if(!f) return;
          const r=new FileReader(); r.onload=ev=>onSrc(ev.target.result); r.readAsDataURL(f); e.target.value="";
        }}/>
      </label>
      <input type="url" value={src||""} onChange={e=>onSrc(e.target.value)} placeholder="Or paste image URL…" className="field-input" style={{fontSize:11.5}}/>
      {src&&<>
        <img src={src} alt="" style={{width:"100%",maxHeight:small?54:100,objectFit:"cover",borderRadius:6,border:`1px solid ${BRD}`,display:"block"}} onError={e=>e.target.style.display="none"}/>
        <button onClick={()=>onSrc("")} style={{padding:"4px 0",border:`1px solid ${BRD}`,borderRadius:5,background:"none",color:MUT,fontSize:11.5,cursor:"pointer",fontFamily:"inherit"}}
          onMouseEnter={e=>{e.currentTarget.style.color="#EF4444";e.currentTarget.style.borderColor="#FCA5A5";}}
          onMouseLeave={e=>{e.currentTarget.style.color=MUT;e.currentTarget.style.borderColor=BRD;}}>Remove</button>
      </>}
    </div>
  );
}

/* ─── RICH TEXT EDITOR ───────────────────────────────── */
function RTE({html,onChange}) {
  const ref=useRef(null);
  const focused=useRef(false);

  useEffect(()=>{
    if(ref.current&&!focused.current) {
      if(ref.current.innerHTML!==(html||"")) ref.current.innerHTML=html||"";
    }
  },[html]);

  const exec=(cmd,val)=>{
    ref.current?.focus();
    document.execCommand(cmd,false,val??null);
    setTimeout(()=>onChange(ref.current?.innerHTML||""),0);
  };

  const TB=[
    {t:"Bold",      c:"bold",              d:<><line x1="5" y1="5" x2="5" y2="19"/><line x1="5" y1="12" x2="15" y2="12"/><path d="M5 5h7a4 4 0 010 8H5"/><path d="M5 12h8a4 4 0 010 8H5"/></>},
    {t:"Italic",    c:"italic",            d:<><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></>},
    {t:"Underline", c:"underline",         d:<><path d="M6 3v7a6 6 0 0012 0V3"/><line x1="4" y1="21" x2="20" y2="21"/></>},
    {t:"Align L",   c:"justifyLeft",       d:<><line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/></>},
    {t:"Align C",   c:"justifyCenter",     d:<><line x1="21" y1="6" x2="3" y2="6"/><line x1="17" y1="12" x2="7" y2="12"/><line x1="19" y1="18" x2="5" y2="18"/></>},
    {t:"Align R",   c:"justifyRight",      d:<><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/></>},
    {t:"Bullets",   c:"insertUnorderedList",d:<><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></>},
  ];

  return (
    <div style={{border:`1px solid ${BRD}`,borderRadius:8,overflow:"hidden"}}>
      <div style={{display:"flex",gap:2,padding:"5px 6px",borderBottom:`1px solid ${BRD}`,background:"#FAFAF9",flexWrap:"wrap"}}>
        {TB.map(({t,c,d})=>(
          <button key={c} title={t} onMouseDown={e=>{e.preventDefault();exec(c);}}
            style={{width:25,height:25,borderRadius:4,border:"none",background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#6B7280"}}
            onMouseEnter={e=>e.currentTarget.style.background="#E5E0DA"}
            onMouseLeave={e=>e.currentTarget.style.background="none"}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">{d}</svg>
          </button>
        ))}
        <button title="Add Link" onMouseDown={e=>{e.preventDefault();const u=prompt("Enter link URL:","https://");if(u)exec("createLink",u);}}
          style={{width:25,height:25,borderRadius:4,border:"none",background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#6B7280"}}
          onMouseEnter={e=>e.currentTarget.style.background="#E5E0DA"}
          onMouseLeave={e=>e.currentTarget.style.background="none"}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
        </button>
        <button title="Remove Link" onMouseDown={e=>{e.preventDefault();exec("unlink");}}
          style={{width:25,height:25,borderRadius:4,border:"none",background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#6B7280"}}
          onMouseEnter={e=>e.currentTarget.style.background="#E5E0DA"}
          onMouseLeave={e=>e.currentTarget.style.background="none"}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18.84 12.25l1.72-1.71a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M5.17 11.75l-1.72 1.71a5 5 0 007.07 7.07l1.71-1.71"/><line x1="8" y1="16" x2="16" y2="8"/></svg>
        </button>
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning
        onFocus={()=>{focused.current=true;}}
        onBlur={e=>{focused.current=false;onChange(e.currentTarget.innerHTML);}}
        onInput={e=>onChange(e.currentTarget.innerHTML)}
        style={{padding:"10px 12px",minHeight:80,fontSize:13,lineHeight:1.7,color:"#444455",outline:"none",fontFamily:"inherit"}}/>
    </div>
  );
}

/* ─── BLOCK ROW (canvas wrapper) ─────────────────────── */
function BlockRow({block,idx,total,isSelected,ff,onSelect,onUpdate,onRemove,onDuplicate,onMoveUp,onMoveDown}) {
  const [hov,setHov]=useState(false);
  const show=isSelected||hov;

  return (
    <div style={{position:"relative"}} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <div onClick={onSelect} style={{position:"relative",cursor:"pointer",
        boxShadow:isSelected?`inset 0 0 0 2px ${ACC}`:hov?"inset 0 0 0 1px #E8C4B0":"none",
        transition:"box-shadow 0.1s"}}>
        {isSelected&&(
          <div style={{position:"absolute",top:0,left:0,zIndex:10,background:ACC,color:"#fff",fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:"0 0 6px 0",letterSpacing:"0.04em",pointerEvents:"none"}}>
            {BTYPES.find(b=>b.id===block.type)?.label||block.type}
          </div>
        )}
        <BPrev block={block} ff={ff} isSelected={isSelected} onUpdate={onUpdate}/>
      </div>

      {show&&(
        <div style={{position:"absolute",top:"50%",right:-38,transform:"translateY(-50%)",display:"flex",flexDirection:"column",gap:3,zIndex:20}}>
          {idx>0&&<CB title="Move Up" onClick={e=>{e.stopPropagation();onMoveUp();}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18,15 12,9 6,15"/></svg></CB>}
          {idx<total-1&&<CB title="Move Down" onClick={e=>{e.stopPropagation();onMoveDown();}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6,9 12,15 18,9"/></svg></CB>}
          <CB title="Duplicate" onClick={e=>{e.stopPropagation();onDuplicate();}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></CB>
          <CB title="Delete" danger onClick={e=>{e.stopPropagation();onRemove();}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></CB>
        </div>
      )}
    </div>
  );
}

const CB=({title,onClick,children,danger})=>(
  <button title={title} onClick={onClick}
    style={{width:28,height:28,borderRadius:6,border:`1px solid ${danger?"#FCA5A5":BRD}`,background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:danger?"#EF4444":"#6B7280",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}
    onMouseEnter={e=>{e.currentTarget.style.background=danger?"#FEF2F2":"#F4EFE9";}}
    onMouseLeave={e=>{e.currentTarget.style.background="#fff";}}>
    {children}
  </button>
);

/* ─── BLOCK PREVIEW RENDERERS ────────────────────────── */
function BPrev({block,ff,isSelected,onUpdate}) {
  const {type,data}=block;
  const u=(k,v)=>onUpdate({[k]:v});

  switch(type) {
    case "subject": return (
      <div style={{background:"#fff",borderBottom:`1px solid #E5E0DA`,padding:"10px 20px",fontFamily:ff}}>
        <span style={{fontSize:12,color:"#6B7280"}}><strong style={{color:"#1A1D2E"}}>Subject: </strong>{data.text||<em style={{color:"#C5B8AC"}}>Add subject…</em>}</span>
      </div>
    );

    case "header": return (
      <div style={{background:data.bgColor||"#1A1D2E",padding:"20px 32px",textAlign:data.align||"center",fontFamily:ff}}>
        {data.logoUrl
          ? <img src={data.logoUrl} alt={data.logoText||"Logo"} style={{maxHeight:48,maxWidth:220,objectFit:"contain",display:"inline-block"}} onError={e=>e.target.style.display="none"}/>
          : <div style={{fontSize:20,fontWeight:800,color:data.textColor||"#fff",letterSpacing:"-0.3px"}}>{data.logoText||"Your Brand"}</div>
        }
      </div>
    );

    case "headline": return (
      <div style={{padding:"24px 32px 10px",fontFamily:ff}}>
        {isSelected ? (
          <CE html={data.text} onChange={v=>u("text",v)} style={{fontSize:data.fontSize||28,fontWeight:data.fontWeight||"800",color:data.color||"#0f0f1a",textAlign:data.align||"left",lineHeight:1.25,margin:0}} tag="h1" plain/>
        ) : (() => {
          const hasUrl = data.url && data.url !== "" && data.url !== "https://";
          const headline = <h1 style={{fontSize:data.fontSize||28,fontWeight:data.fontWeight||"800",color:data.color||"#0f0f1a",textAlign:data.align||"left",lineHeight:1.25,margin:0,fontFamily:"inherit"}}>{data.text||<span style={{color:"#C5B8AC",fontStyle:"italic",fontWeight:400,fontSize:18}}>Click to add headline…</span>}</h1>;
          return hasUrl
            ? <a href={data.url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{display:"block",textDecoration:"none"}}>{headline}</a>
            : headline;
        })()}
      </div>
    );

    case "text": return (
      <div style={{padding:"8px 32px 14px",fontFamily:ff}}>
        {isSelected
          ? <CE html={data.html} onChange={v=>u("html",v)} style={{fontSize:data.fontSize||15,lineHeight:1.75,color:data.color||"#444455",margin:0}}/>
          : <div style={{fontSize:data.fontSize||15,lineHeight:1.75,color:data.color||"#444455",margin:0}} dangerouslySetInnerHTML={{__html:data.html||`<p style='color:#C5B8AC;font-style:italic'>Click to add text…</p>`}}/>
        }
      </div>
    );

    case "image": {
      const img=data.src
        ? <img src={data.src} alt={data.alt||""} style={{width:"100%",borderRadius:data.borderRadius||0,display:"block",maxWidth:"100%"}} onError={e=>e.target.style.display="none"}/>
        : <div style={{height:150,border:`2px dashed ${BRD}`,borderRadius:8,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,color:"#C5B8AC"}}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
            <span style={{fontSize:12}}>Upload an image or paste a URL in the Edit panel</span>
          </div>;
      return (
        <div style={{padding:"12px 32px",fontFamily:ff}}>
          {data.link
            ? <a href={data.link} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{display:"block"}}>{img}</a>
            : img}
          {data.caption&&<p style={{fontSize:12,color:"#9CA3AF",marginTop:6,textAlign:"center"}}>{data.caption}</p>}
        </div>
      );
    }

    case "button": {
      const pad=data.size==="small"?"10px 20px":data.size==="large"?"16px 36px":"13px 28px";
      const fs=data.size==="small"?13:data.size==="large"?16:14.5;
      const hasUrl=data.url&&data.url!==""&&data.url!=="https://";
      return (
        <div style={{padding:"12px 32px 20px",textAlign:data.align||"center",fontFamily:ff}}>
          <a href={hasUrl?data.url:"#"} target={hasUrl?"_blank":undefined} rel="noopener noreferrer"
            onClick={e=>{if(!hasUrl)e.preventDefault();e.stopPropagation();}}
            style={{display:data.fullWidth?"block":"inline-block",background:data.bgColor||ACC,color:data.textColor||"#fff",padding:pad,borderRadius:data.radius||8,fontSize:fs,fontWeight:700,textDecoration:"none",textAlign:"center",letterSpacing:"0.01em"}}>
            {data.text||"Click Here →"}
          </a>
          {!hasUrl&&<div style={{marginTop:6,fontSize:10.5,color:"#D97706"}}>⚠ Add a URL in the Edit panel to activate this button</div>}
        </div>
      );
    }

    case "divider": return (
      <div style={{padding:`${data.margin||20}px 32px`}}>
        <hr style={{border:"none",borderTop:`${data.thickness||1}px ${data.style||"solid"} ${data.color||"#E5E0DA"}`,margin:0}}/>
      </div>
    );

    case "spacer": return (
      <div style={{height:data.height||32,position:"relative",background:isSelected?"rgba(208,90,44,0.04)":"transparent"}}>
        {isSelected&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:10,color:ACC,fontWeight:700,letterSpacing:"0.1em"}}>SPACER · {data.height||32}px</span></div>}
      </div>
    );

    case "columns": return (
      <div style={{padding:"12px 32px 16px",display:"flex",gap:data.gap||20,fontFamily:ff}}>
        {[{h:data.leftHtml,k:"leftHtml"},{h:data.rightHtml,k:"rightHtml"}].map(({h,k},i)=>(
          <div key={i} style={{flex:1}}>
            {isSelected
              ? <CE html={h} onChange={v=>u(k,v)} style={{fontSize:data.fontSize||14,color:data.color||"#444455",lineHeight:1.65}}/>
              : <div style={{fontSize:data.fontSize||14,color:data.color||"#444455",lineHeight:1.65}} dangerouslySetInnerHTML={{__html:h||`<p style='color:#C5B8AC'>Column ${i+1}</p>`}}/>
            }
          </div>
        ))}
      </div>
    );

    case "footer": return (
      <div style={{padding:"16px 32px",background:data.bgColor||"#FAFAF9",borderTop:`1px solid ${BRD}`,textAlign:"center",fontFamily:ff}}>
        <p style={{fontSize:11.5,color:data.textColor||"#9CA3AF",margin:0,lineHeight:1.8}}>
          {data.text||"Your Company · Address"}<br/>
          <a href={data.unsubUrl||"#"} onClick={e=>e.stopPropagation()} style={{color:data.textColor||"#9CA3AF",textDecoration:"underline"}}>{data.unsubText||"Unsubscribe"}</a>
        </p>
      </div>
    );

    default: return <div style={{padding:16,fontSize:12,color:MUT}}>Unknown: {type}</div>;
  }
}

/* ─── CONTENT EDITABLE HELPER ────────────────────────── */
function CE({html,onChange,style,tag="div",plain}) {
  const ref=useRef(null);
  const foc=useRef(false);

  useEffect(()=>{
    if(ref.current&&!foc.current) {
      if(plain){if(ref.current.textContent!==html)ref.current.textContent=html||"";}
      else{if(ref.current.innerHTML!==(html||""))ref.current.innerHTML=html||"";}
    }
  },[html,plain]);

  const props={
    ref,contentEditable:true,suppressContentEditableWarning:true,
    onFocus:()=>{foc.current=true;},
    onBlur:e=>{foc.current=false;onChange(plain?e.currentTarget.textContent:e.currentTarget.innerHTML);},
    onInput:e=>onChange(plain?e.currentTarget.textContent:e.currentTarget.innerHTML),
    onClick:e=>e.stopPropagation(),
    style:{...style,outline:"none",cursor:"text"},
  };
  if(tag==="h1") return <h1 {...props}/>;
  return <div {...props}/>;
}

/* ─── UI ATOMS ───────────────────────────────────────── */
function Fld({label,children}) {
  return <div style={{marginBottom:12}}>{label&&<label style={{display:"block",fontSize:10.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:MUT,marginBottom:5}}>{label}</label>}{children}</div>;
}
function DLabel({children}) {
  return <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,marginTop:4}}><span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.09em",color:"#C5B8AC",whiteSpace:"nowrap"}}>{children}</span><div style={{flex:1,height:1,background:"#EDE9E4"}}/></div>;
}
function Slider({min,max,value,onChange,unit}) {
  return <div style={{display:"flex",alignItems:"center",gap:8}}><input type="range" min={min} max={max} value={value} onChange={e=>onChange(+e.target.value)} style={{flex:1}}/><span style={{fontSize:12,color:MUT,minWidth:34}}>{value}{unit}</span></div>;
}
function Tb({active,onClick,children,style:sx={}}) {
  return <button onClick={onClick} style={{flex:1,padding:"5px 0",border:`1px solid ${active?ACC:BRD}`,borderRadius:5,background:active?"#FDF3EE":"#fff",color:active?ACC:"#6B7280",fontSize:11.5,fontWeight:500,cursor:"pointer",fontFamily:"inherit",...sx}}>{children}</button>;
}
function ColorRow({value,onChange,swatches}) {
  return <div style={{display:"flex",alignItems:"center",gap:7}}><input type="color" value={value||"#000000"} onChange={e=>onChange(e.target.value)} style={{width:32,height:32,borderRadius:6,border:`1px solid ${BRD}`,cursor:"pointer",padding:2,background:"#fff",flexShrink:0}}/><input type="text" value={value||""} onChange={e=>onChange(e.target.value)} className="field-input" style={{flex:1,fontFamily:"monospace",fontSize:11.5}}/><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{(swatches||PRESETS).slice(0,6).map(c=><button key={c} onClick={()=>onChange(c)} style={{width:18,height:18,borderRadius:"50%",background:c,border:value===c?"2.5px solid #1A1D2E":"1.5px solid rgba(0,0,0,0.12)",cursor:"pointer",flexShrink:0}}/>)}</div></div>;
}
function Align({value,onChange}) {
  return <div style={{display:"flex",gap:6}}>{[["left","≡"],["center","≡"],["right","≡"]].map(([v,_],i)=>{
    const icons=[<><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="11" x2="15" y2="11"/><line x1="3" y1="16" x2="18" y2="16"/></>,<><line x1="3" y1="6" x2="21" y2="6"/><line x1="7" y1="11" x2="17" y2="11"/><line x1="5" y1="16" x2="19" y2="16"/></>,<><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="11" x2="21" y2="11"/><line x1="6" y1="16" x2="21" y2="16"/></>];
    return <button key={v} onClick={()=>onChange(v)} style={{flex:1,padding:"6px 0",border:`1px solid ${value===v?ACC:BRD}`,borderRadius:5,background:value===v?"#FDF3EE":"#fff",color:value===v?ACC:"#6B7280",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">{icons[i]}</svg></button>;
  })}</div>;
}

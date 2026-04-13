/**
 * Generates email-safe, table-based HTML for maximum client compatibility.
 * Works with the new block-based data model from EmailBuilder.
 */

export function buildEmailHtmlFromBlocks(blocks = [], global = {}) {
  const {
    bgColor = "#f4f4f7",
    contentBgColor = "#ffffff",
    fontFamily = "'Helvetica Neue',Arial,sans-serif",
    accentColor = "#D05A2C",
    containerRadius = 0,
    containerBorderWidth = 0,
    containerBorderColor = "#E5E0DA",
    containerShadow = "medium",
    canvasPadding = 20,
  } = global;

  const nonSubjectBlocks = blocks.filter(b => b.type !== "subject");

  const rows = nonSubjectBlocks.map(b => renderBlock(b, fontFamily, global)).filter(Boolean);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<title>Email</title>
<style>
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
  img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none;}
  body{margin:0;padding:0;background-color:${bgColor};}
  a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important;}
</style>
</head>
<body style="margin:0;padding:0;background-color:${bgColor};font-family:${fontFamily};">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:${bgColor};">
<tr><td align="center" style="padding:${canvasPadding}px 0 30px;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color:${contentBgColor};max-width:600px;width:100%;box-shadow:${getContainerShadow(containerShadow)};border-radius:${containerRadius}px;border:${containerBorderWidth}px solid ${containerBorderColor};">
    ${rows.join("\n")}
  </table>
</td></tr>
</table>
</body>
</html>`;
}

function renderBlock(block, ff, global = {}) {
  const { type, data } = block;
  if (!data) return "";

  switch (type) {
    case "header": {
      const align = data.align || "center";
      const content = data.logoUrl
        ? `<img src="${esc(data.logoUrl)}" alt="${esc(data.logoText||'Logo')}" style="max-height:48px;max-width:220px;display:inline-block;"/>`
        : `<span style="font-size:20px;font-weight:800;color:${esc(data.textColor||'#ffffff')};font-family:${ff};">${esc(data.logoText||'Your Brand')}</span>`;
      return tr(`<td align="${align}" style="background-color:${esc(data.bgColor||'#1A1D2E')};padding:20px 32px;">
        ${content}
      </td>`);
    }

    case "headline": {
      const align = data.align || "left";
      const content = `<h1 style="margin:0;font-size:${data.fontSize||28}px;font-weight:${data.fontWeight||'800'};color:${esc(data.color||'#0f0f1a')};text-align:${align};line-height:1.25;font-family:${ff};">
          ${esc(data.text||'')}
        </h1>`;
      const hasUrl = data.url && data.url !== "" && data.url !== "https://";
      return tr(`<td style="padding:24px 32px 10px;font-family:${ff};">
        ${hasUrl ? `<a href="${esc(data.url)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:block;">${content}</a>` : content}
      </td>`);
    }

    case "text": {
      // Strip dangerous tags but keep formatting
      const safeHtml = sanitizeHtml(data.html || "");
      return tr(`<td style="padding:8px 32px 14px;font-family:${ff};font-size:${data.fontSize||15}px;line-height:1.75;color:${esc(data.color||'#444455')};">
        ${safeHtml}
      </td>`);
    }

    case "image": {
      if (!data.src) return "";
      const img = `<img src="${esc(data.src)}" alt="${esc(data.alt||'')}" width="100%" style="display:block;max-width:100%;border-radius:${data.borderRadius||0}px;"/>`;
      const linked = data.link
        ? `<a href="${esc(data.link)}" target="_blank" rel="noopener noreferrer" style="display:block;">${img}</a>`
        : img;
      const caption = data.caption
        ? `<p style="margin:6px 0 0;font-size:12px;color:#9CA3AF;text-align:center;font-family:${ff};">${esc(data.caption)}</p>`
        : "";
      return tr(`<td style="padding:12px 32px;">${linked}${caption}</td>`);
    }

    case "button": {
      const hasUrl = data.url && data.url !== "" && data.url !== "https://";
      const href = hasUrl ? esc(data.url) : "#";
      const pad = data.size === "small" ? "10px 20px" : data.size === "large" ? "16px 36px" : "13px 28px";
      const fs = data.size === "small" ? 13 : data.size === "large" ? 16 : 14;
      const align = data.align || "center";
      const bg = data.useAccentColor ? (global.accentColor || "#D05A2C") : (data.bgColor || "#D05A2C");
      const borderColor = data.useAccentColor ? (global.accentColor || "#D05A2C") : (data.borderColor || data.bgColor || "#D05A2C");
      const btn = `<a href="${href}" target="_blank" rel="noopener noreferrer" style="display:${data.fullWidth?'block':'inline-block'};background-color:${esc(bg)};color:${esc(data.textColor||'#ffffff')};font-family:${ff};font-size:${fs}px;font-weight:700;text-decoration:none;padding:${pad};border-radius:${data.radius||8}px;text-align:center;mso-padding-alt:0;cursor:pointer;border:${data.borderWidth||0}px solid ${esc(borderColor)};">${esc(data.text||'Click Here')}</a>`;
      return tr(`<td align="${align}" style="padding:12px 32px 20px;">${btn}</td>`);
    }

    case "divider": {
      const m = data.margin || 20;
      return tr(`<td style="padding:${m}px 32px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr><td style="border-top:${data.thickness||1}px ${data.style||'solid'} ${esc(data.color||'#E5E0DA')};font-size:0px;line-height:0px;">&nbsp;</td></tr>
        </table>
      </td>`);
    }

    case "spacer": {
      return tr(`<td style="height:${data.height||32}px;line-height:${data.height||32}px;font-size:0;">&nbsp;</td>`);
    }

    case "columns": {
      const leftHtml = sanitizeHtml(data.leftHtml || "");
      const rightHtml = sanitizeHtml(data.rightHtml || "");
      const fs = data.fontSize || 14;
      const color = data.color || "#444455";
      return tr(`<td style="padding:12px 32px 16px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td width="48%" valign="top" style="font-family:${ff};font-size:${fs}px;color:${esc(color)};line-height:1.65;">${leftHtml}</td>
            <td width="4%" style="font-size:0;">&nbsp;</td>
            <td width="48%" valign="top" style="font-family:${ff};font-size:${fs}px;color:${esc(color)};line-height:1.65;">${rightHtml}</td>
          </tr>
        </table>
      </td>`);
    }

    case "footer": {
      const text = esc(data.text || "Your Company");
      const unsubText = esc(data.unsubText || "Unsubscribe");
      const unsubUrl = esc(data.unsubUrl || "#");
      return tr(`<td align="center" style="padding:16px 32px;background-color:${esc(data.bgColor||'#FAFAF9')};border-top:1px solid #E5E0DA;">
        <p style="margin:0;font-family:${ff};font-size:11.5px;color:${esc(data.textColor||'#9CA3AF')};line-height:1.8;">
          ${text}<br/>
          <a href="${unsubUrl}" style="color:${esc(data.textColor||'#9CA3AF')};text-decoration:underline;">${unsubText}</a>
        </p>
      </td>`);
    }

    default:
      return "";
  }
}

function tr(inner) {
  return `<tr>${inner}</tr>`;
}

function esc(str) {
  return String(str || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function sanitizeHtml(html) {
  // Allow safe formatting tags only
  return (html || "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/javascript:/gi, "");
}

function getContainerShadow(level) {
  if (level === "none") return "none";
  if (level === "soft") return "0 2px 10px rgba(0,0,0,0.05)";
  if (level === "strong") return "0 12px 36px rgba(0,0,0,0.16)";
  return "0 4px 24px rgba(0,0,0,0.07)";
}

// ── Legacy support (old flat emailData format still used by older code) ──
export function buildEmailHtml({ headline, bodyText, imageUrl, ctaText, ctaLink, accentColor = "#D05A2C" }) {
  const blocks = [
    ...(imageUrl ? [{ id:"i", type:"image", data:{ src:imageUrl, alt:"", link:"", caption:"", borderRadius:8 } }] : []),
    ...(headline ? [{ id:"h", type:"headline", data:{ text:headline, fontSize:26, color:"#0f0f1a", align:"left", fontWeight:"800" } }] : []),
    ...(bodyText ? [{ id:"t", type:"text",     data:{ html:`<p>${bodyText}</p>`, fontSize:15, color:"#444455" } }] : []),
    ...(ctaText  ? [{ id:"b", type:"button",   data:{ text:ctaText, url:ctaLink||"#", bgColor:accentColor, textColor:"#fff", align:"center", size:"large", fullWidth:false, radius:8 } }] : []),
    { id:"f", type:"footer", data:{ text:"Email Studio · Unsubscribe below", unsubText:"Unsubscribe", unsubUrl:"#", bgColor:"#FAFAF9", textColor:"#9CA3AF" } },
  ];
  return buildEmailHtmlFromBlocks(blocks, { bgColor:"#f4f4f7", fontFamily:"'Helvetica Neue',Arial,sans-serif", accentColor });
}

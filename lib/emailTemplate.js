/**
 * Generates email-safe, table-based HTML for maximum client compatibility.
 * Works with the new block-based data model from EmailBuilder.
 */

export function buildEmailHtmlFromBlocks(blocks = [], global = {}, contact = {}) {
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

  const mergeContext = buildMergeContext(contact);
  const nonSubjectBlocks = blocks.filter(b => b.type !== "subject");

  const rows = nonSubjectBlocks
    .map((b) => renderBlock(b, fontFamily, global, mergeContext))
    .filter(Boolean);

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

export function personalizeText(value, contact = {}, options = {}) {
  return applyMergeTags(value, buildMergeContext(contact), options);
}

function renderBlock(block, ff, global = {}, mergeContext = {}) {
  const { type, data } = block;
  if (!data) return "";

  switch (type) {
    case "header": {
      const align = data.align || "center";
      const content = data.logoUrl
        ? `<img src="${esc(data.logoUrl)}" alt="${esc(data.logoText||'Logo')}" style="max-height:48px;max-width:220px;display:inline-block;"/>`
        : `<span style="font-size:20px;font-weight:800;color:${esc(data.textColor||'#ffffff')};font-family:${ff};">${esc(applyMergeTags(data.logoText || "Your Brand", mergeContext))}</span>`;
      return tr(`<td align="${align}" style="background-color:${esc(data.bgColor||'#1A1D2E')};padding:20px 32px;">
        ${content}
      </td>`);
    }

    case "headline": {
      const align = data.align || "left";
      const content = `<h1 style="margin:0;font-size:${data.fontSize||28}px;font-weight:${data.fontWeight||'800'};color:${esc(data.color||'#0f0f1a')};text-align:${align};line-height:1.25;font-family:${ff};">
          ${esc(applyMergeTags(data.text || "", mergeContext))}
        </h1>`;
      const href = normalizeLink(applyMergeTags(data.url, mergeContext));
      const hasUrl = !!href;
      return tr(`<td style="padding:24px 32px 10px;font-family:${ff};">
        ${hasUrl ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:block;">${content}</a>` : content}
      </td>`);
    }

    case "text": {
      // Strip dangerous tags but keep formatting
      const safeHtml = sanitizeHtml(
        applyMergeTags(data.html || "", mergeContext, { escapeHtml: true })
      );
      return tr(`<td style="padding:8px 32px 14px;font-family:${ff};font-size:${data.fontSize||15}px;line-height:1.75;color:${esc(data.color||'#444455')};">
        ${safeHtml}
      </td>`);
    }

    case "image": {
      if (!data.src) return "";
      const img = `<img src="${esc(data.src)}" alt="${esc(applyMergeTags(data.alt || "", mergeContext))}" width="100%" style="display:block;max-width:100%;border-radius:${data.borderRadius||0}px;"/>`;
      const imageHref = normalizeLink(applyMergeTags(data.link, mergeContext));
      const linked = imageHref
        ? `<a href="${esc(imageHref)}" target="_blank" rel="noopener noreferrer" style="display:block;">${img}</a>`
        : img;
      const captionText = applyMergeTags(data.caption || "", mergeContext);
      const caption = captionText
        ? `<p style="margin:6px 0 0;font-size:12px;color:#9CA3AF;text-align:center;font-family:${ff};">${esc(captionText)}</p>`
        : "";
      return tr(`<td style="padding:12px 32px;">${linked}${caption}</td>`);
    }

    case "button": {
      const normalizedHref = normalizeLink(applyMergeTags(data.url, mergeContext));
      const hasUrl = !!normalizedHref;
      const href = hasUrl ? esc(normalizedHref) : "#";
      const pad = data.size === "small" ? "10px 20px" : data.size === "large" ? "16px 36px" : "13px 28px";
      const fs = data.size === "small" ? 13 : data.size === "large" ? 16 : 14;
      const align = data.align || "center";
      const bg = data.useAccentColor ? (global.accentColor || "#D05A2C") : (data.bgColor || "#D05A2C");
      const borderColor = data.useAccentColor ? (global.accentColor || "#D05A2C") : (data.borderColor || data.bgColor || "#D05A2C");
      const btn = `<a href="${href}" target="_blank" rel="noopener noreferrer" style="display:${data.fullWidth?'block':'inline-block'};background-color:${esc(bg)};color:${esc(data.textColor||'#ffffff')};font-family:${ff};font-size:${fs}px;font-weight:700;text-decoration:none;padding:${pad};border-radius:${data.radius||8}px;text-align:center;mso-padding-alt:0;cursor:pointer;border:${data.borderWidth||0}px solid ${esc(borderColor)};">${esc(applyMergeTags(data.text || "Click Here", mergeContext))}</a>`;
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
      const leftHtml = sanitizeHtml(
        applyMergeTags(data.leftHtml || "", mergeContext, { escapeHtml: true })
      );
      const rightHtml = sanitizeHtml(
        applyMergeTags(data.rightHtml || "", mergeContext, { escapeHtml: true })
      );
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
      const text = esc(applyMergeTags(data.text || "Your Company", mergeContext));
      const unsubText = esc(applyMergeTags(data.unsubText || "Unsubscribe", mergeContext));
      const unsubUrl = esc(normalizeLink(applyMergeTags(data.unsubUrl, mergeContext)) || "#");
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
    .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[^>]*>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function getContainerShadow(level) {
  if (level === "none") return "none";
  if (level === "soft") return "0 2px 10px rgba(0,0,0,0.05)";
  if (level === "strong") return "0 12px 36px rgba(0,0,0,0.16)";
  return "0 4px 24px rgba(0,0,0,0.07)";
}

function normalizeLink(value) {
  const raw = String(value || "").trim();
  if (!raw || raw === "https://" || raw === "#") return "";
  if (/^(https?:|mailto:|tel:)/i.test(raw)) return raw;
  if (/^(javascript:|data:)/i.test(raw)) return "";
  return `https://${raw.replace(/^\/+/, "")}`;
}

function buildMergeContext(contact = {}) {
  const firstName = String(
    contact.first_name ||
      contact.firstName ||
      contact.referralFirstName ||
      ""
  ).trim();
  const lastName = String(
    contact.last_name ||
      contact.lastName ||
      contact.referralLastName ||
      ""
  ).trim();
  const fullName = String(
    contact.full_name ||
      contact.fullName ||
      contact.name ||
      [firstName, lastName].filter(Boolean).join(" ").trim()
  ).trim();
  const businessName = String(
    contact.business_name || contact.businessName || contact.company || ""
  ).trim();
  const email = String(
    contact.email || contact.referralEmail || contact.referral_email || ""
  ).trim();

  const values = {
    first_name: firstName,
    firstname: firstName,
    first: firstName,
    last_name: lastName,
    lastname: lastName,
    last: lastName,
    full_name: fullName,
    fullname: fullName,
    name: fullName,
    email,
    business_name: businessName,
    business: businessName,
    company: businessName,
  };

  return values;
}

function applyMergeTags(value, mergeContext = {}, options = {}) {
  const input = String(value || "");
  const { escapeHtml = false } = options;

  return input.replace(/{{\s*([\w.]+)\s*}}/g, (_, rawKey) => {
    const key = String(rawKey || "").toLowerCase();
    const replacement = mergeContext[key] ?? "";
    return escapeHtml ? esc(replacement) : replacement;
  });
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

/**
 * Generates email-safe, table-based HTML for maximum email client compatibility.
 * All styles are inlined.
 */
export function buildEmailHtml({ headline, bodyText, imageUrl, ctaText, ctaLink, accentColor = "#4f6ef7" }) {
  const safeHeadline = escapeHtml(headline || "");
  const safeBody = escapeHtml(bodyText || "").replace(/\n/g, "<br/>");
  const safeCta = escapeHtml(ctaText || "");
  const safeCtaLink = ctaLink || "#";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>${safeHeadline}</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">

  <!-- Wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#f4f4f7;padding:40px 20px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;
                      overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header accent bar -->
          <tr>
            <td style="height:6px;background:${accentColor};"></td>
          </tr>

          <!-- Content area -->
          <tr>
            <td style="padding:48px 48px 0 48px;">

              ${imageUrl ? `
              <!-- Image -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <img src="${escapeHtml(imageUrl)}" alt="" width="504"
                         style="max-width:100%;border-radius:10px;display:block;"/>
                  </td>
                </tr>
              </table>
              ` : ""}

              ${safeHeadline ? `
              <!-- Headline -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin-bottom:20px;">
                <tr>
                  <td>
                    <h1 style="margin:0;font-size:32px;line-height:1.25;font-weight:700;
                                color:#0f0f1a;letter-spacing:-0.5px;">
                      ${safeHeadline}
                    </h1>
                  </td>
                </tr>
              </table>
              ` : ""}

              ${safeBody ? `
              <!-- Body text -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin-bottom:32px;">
                <tr>
                  <td>
                    <p style="margin:0;font-size:17px;line-height:1.7;color:#444455;">
                      ${safeBody}
                    </p>
                  </td>
                </tr>
              </table>
              ` : ""}

            </td>
          </tr>

          ${safeCta ? `
          <!-- CTA Button -->
          <tr>
            <td style="padding:0 48px 48px 48px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:10px;background:${accentColor};">
                    <a href="${safeCtaLink}"
                       target="_blank"
                       style="display:inline-block;padding:16px 36px;font-size:16px;
                              font-weight:600;color:#ffffff;text-decoration:none;
                              border-radius:10px;letter-spacing:0.2px;">
                      ${safeCta} →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ""}

          <!-- Footer -->
          <tr>
            <td style="padding:24px 48px;border-top:1px solid #f0f0f4;background:#fafafa;">
              <p style="margin:0;font-size:13px;color:#9999aa;text-align:center;line-height:1.6;">
                You received this email because you subscribed to our list.<br/>
                © ${new Date().getFullYear()} Email Studio
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

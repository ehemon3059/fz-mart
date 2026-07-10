import { formatTaka } from "@/lib/money";

export interface OrderConfirmationData {
  orderNo: string;
  customerName: string;
  items: Array<{ productName: string; quantity: number; unitPrice: number }>;
  total: number;
}

export function orderConfirmationHtml(data: OrderConfirmationData): string {
  const rows = data.items
    .map(
      (item) =>
        `<tr><td>${item.productName} × ${item.quantity}</td><td>${formatTaka(
          item.unitPrice * item.quantity,
        )}</td></tr>`,
    )
    .join("");

  return `
    <h2>Thank you for your order, ${data.customerName}!</h2>
    <p>Order No. <strong>${data.orderNo}</strong></p>
    <table cellpadding="6">${rows}</table>
    <p><strong>Total (Cash on Delivery): ${formatTaka(data.total)}</strong></p>
    <p>We'll call you to confirm before shipping.</p>
  `;
}

// Email clients (especially Gmail/Outlook) strip <style> blocks and ignore most
// modern CSS, so professional emails are built with nested tables and inline styles.
function emailLayout(opts: { preview: string; body: string; brandName?: string }): string {
  const brand = opts.brandName?.trim() || "fz-mart";
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>fz-mart</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preview}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#111827;padding:24px 32px;" align="center">
              <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">${brand}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${opts.body}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background-color:#f9fafb;border-top:1px solid #eef0f3;" align="center">
              <p style="margin:0;font-size:12px;line-height:18px;color:#9aa0ab;">
                &copy; ${new Date().getFullYear()} ${brand}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function magicLinkHtml(loginUrl: string): string {
  const body = `
    <h1 style="margin:0 0 16px;font-size:20px;line-height:28px;color:#111827;font-weight:700;">Sign in to fz-mart</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#4b5563;">
      Tap the button below to securely sign in to your account. For your protection, this link expires in <strong>15 minutes</strong> and can only be used once.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td align="center" style="border-radius:8px;background-color:#111827;">
          <a href="${loginUrl}" target="_blank" style="display:inline-block;padding:13px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
            Sign in to fz-mart
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:#6b7280;">
      Or copy and paste this link into your browser:
    </p>
    <p style="margin:0 0 24px;font-size:13px;line-height:20px;word-break:break-all;">
      <a href="${loginUrl}" target="_blank" style="color:#2563eb;text-decoration:underline;">${loginUrl}</a>
    </p>
    <hr style="border:none;border-top:1px solid #eef0f3;margin:0 0 16px;" />
    <p style="margin:0;font-size:13px;line-height:20px;color:#9aa0ab;">
      If you didn't request this email, you can safely ignore it &mdash; no action is needed and your account stays secure.
    </p>
  `;
  return emailLayout({
    preview: "Your secure sign-in link for fz-mart (expires in 15 minutes).",
    body,
  });
}

export interface PasswordResetMailData {
  resetUrl: string;
  username: string;
  ttlMinutes: number;
}

export function passwordResetHtml(data: PasswordResetMailData): string {
  const body = `
    <h1 style="margin:0 0 8px;font-size:20px;line-height:28px;color:#111827;font-weight:700;">Reset your password</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:24px;color:#4b5563;">
      We received a request to reset the password for your fz-mart admin account. Click the button below to choose a new one.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#f9fafb;border:1px solid #eef0f3;border-radius:8px;">
      <tr>
        <td style="padding:12px 16px;">
          <span style="font-size:12px;line-height:16px;color:#9aa0ab;text-transform:uppercase;letter-spacing:0.5px;">Account</span><br />
          <span style="font-size:14px;line-height:20px;color:#111827;font-weight:600;">${data.username}</span>
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td align="center" style="border-radius:8px;background-color:#111827;">
          <a href="${data.resetUrl}" target="_blank" style="display:inline-block;padding:13px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
            Reset password
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:#6b7280;">
      Or copy and paste this link into your browser:
    </p>
    <p style="margin:0 0 24px;font-size:13px;line-height:20px;word-break:break-all;">
      <a href="${data.resetUrl}" target="_blank" style="color:#2563eb;text-decoration:underline;">${data.resetUrl}</a>
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background-color:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
      <tr>
        <td style="padding:12px 16px;font-size:13px;line-height:20px;color:#92400e;">
          For your security, this link expires in <strong>${data.ttlMinutes} minutes</strong> and can only be used once.
        </td>
      </tr>
    </table>

    <hr style="border:none;border-top:1px solid #eef0f3;margin:0 0 16px;" />
    <p style="margin:0;font-size:13px;line-height:20px;color:#9aa0ab;">
      If you didn&rsquo;t request a password reset, you can safely ignore this email &mdash; your password won&rsquo;t change and your account stays secure.
    </p>
  `;
  return emailLayout({
    preview: `Reset your fz-mart admin password (expires in ${data.ttlMinutes} minutes).`,
    body,
  });
}

export interface AdminInviteMailData {
  setupUrl: string;
  username: string;
  roleLabel: string;
  companyName: string;
  ttlMinutes: number;
}

export function adminInviteHtml(data: AdminInviteMailData): string {
  const brand = data.companyName.trim() || "fz-mart";
  const body = `
    <h1 style="margin:0 0 8px;font-size:20px;line-height:28px;color:#111827;font-weight:700;">You've been invited to ${brand}</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:24px;color:#4b5563;">
      You've been added to the <strong>${brand}</strong> admin panel as a <strong>${data.roleLabel}</strong>.
      Set a password below to activate your account and sign in.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#f9fafb;border:1px solid #eef0f3;border-radius:8px;">
      <tr>
        <td style="padding:12px 16px;">
          <span style="font-size:12px;line-height:16px;color:#9aa0ab;text-transform:uppercase;letter-spacing:0.5px;">Account</span><br />
          <span style="font-size:14px;line-height:20px;color:#111827;font-weight:600;">${data.username}</span>
        </td>
        <td style="padding:12px 16px;" align="right">
          <span style="font-size:12px;line-height:16px;color:#9aa0ab;text-transform:uppercase;letter-spacing:0.5px;">Role</span><br />
          <span style="font-size:14px;line-height:20px;color:#111827;font-weight:600;">${data.roleLabel}</span>
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td align="center" style="border-radius:8px;background-color:#111827;">
          <a href="${data.setupUrl}" target="_blank" style="display:inline-block;padding:13px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
            Set your password
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:#6b7280;">
      Or copy and paste this link into your browser:
    </p>
    <p style="margin:0 0 24px;font-size:13px;line-height:20px;word-break:break-all;">
      <a href="${data.setupUrl}" target="_blank" style="color:#2563eb;text-decoration:underline;">${data.setupUrl}</a>
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background-color:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
      <tr>
        <td style="padding:12px 16px;font-size:13px;line-height:20px;color:#92400e;">
          For your security, this link expires in <strong>${data.ttlMinutes} minutes</strong> and can only be used once.
        </td>
      </tr>
    </table>

    <hr style="border:none;border-top:1px solid #eef0f3;margin:0 0 16px;" />
    <p style="margin:0;font-size:13px;line-height:20px;color:#9aa0ab;">
      If you weren&rsquo;t expecting this invitation, you can safely ignore this email.
    </p>
  `;
  return emailLayout({
    preview: `You've been invited to ${brand} as a ${data.roleLabel}.`,
    body,
    brandName: brand,
  });
}

export function abandonedCartHtml(recoveryUrl: string): string {
  const body = `
    <h1 style="margin:0 0 12px;font-size:20px;line-height:28px;color:#111827;font-weight:700;">You left something behind</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#4b5563;">
      Your cart at fz-mart is still waiting for you. Pick up right where you left off — your items are one tap away.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td align="center" style="border-radius:8px;background-color:#111827;">
          <a href="${recoveryUrl}" target="_blank" style="display:inline-block;padding:13px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
            Return to your cart
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 24px;font-size:13px;line-height:20px;word-break:break-all;">
      <a href="${recoveryUrl}" target="_blank" style="color:#2563eb;text-decoration:underline;">${recoveryUrl}</a>
    </p>
  `;
  return emailLayout({ preview: "Your fz-mart cart is waiting.", body });
}

export function backInStockHtml(data: { productName: string; productUrl: string }): string {
  const body = `
    <h1 style="margin:0 0 12px;font-size:20px;line-height:28px;color:#111827;font-weight:700;">Back in stock</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#4b5563;">
      Good news — <strong>${data.productName}</strong> is available again. Grab it before it sells out.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td align="center" style="border-radius:8px;background-color:#111827;">
          <a href="${data.productUrl}" target="_blank" style="display:inline-block;padding:13px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
            Shop now
          </a>
        </td>
      </tr>
    </table>
  `;
  return emailLayout({ preview: `${data.productName} is back in stock.`, body });
}

export function lowStockDigestHtml(products: Array<{ name: string; stock: number; threshold: number }>): string {
  const rows = products
    .map(
      (p) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eef0f3;font-size:14px;color:#111827;">${p.name}</td><td style="padding:8px 12px;border-bottom:1px solid #eef0f3;font-size:14px;color:#b91c1c;font-weight:600;text-align:right;">${p.stock}</td><td style="padding:8px 12px;border-bottom:1px solid #eef0f3;font-size:14px;color:#6b7280;text-align:right;">${p.threshold}</td></tr>`,
    )
    .join("");
  const body = `
    <h1 style="margin:0 0 12px;font-size:20px;line-height:28px;color:#111827;font-weight:700;">Low stock digest</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:24px;color:#4b5563;">
      ${products.length} product${products.length === 1 ? "" : "s"} at or below the low-stock threshold. Restock soon.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eef0f3;border-radius:8px;overflow:hidden;">
      <tr style="background:#f9fafb;">
        <th style="padding:8px 12px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#9aa0ab;text-align:left;">Product</th>
        <th style="padding:8px 12px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#9aa0ab;text-align:right;">Stock</th>
        <th style="padding:8px 12px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#9aa0ab;text-align:right;">Threshold</th>
      </tr>
      ${rows}
    </table>
  `;
  return emailLayout({ preview: `${products.length} products low on stock.`, body });
}

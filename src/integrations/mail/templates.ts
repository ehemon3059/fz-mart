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

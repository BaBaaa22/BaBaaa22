import React, { useRef } from 'react';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';

export default function ReceiptPrinter({ order }) {
  const printRef = useRef(null);

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=600,height=1000');
    const isDelivery = order.order_type === 'delivery';
    
    const styles = `
      <style>
        * { margin: 0; padding: 0; }
        body {
          font-family: 'Courier New', monospace;
          width: 80mm;
          background: white;
          color: black;
          padding: 10px;
          font-size: 12px;
          line-height: 1.4;
        }
        .receipt {
          width: 100%;
        }
        .header {
          text-align: center;
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 10px;
        }
        .divider {
          border-bottom: 1px dotted #000;
          margin: 8px 0;
        }
        .section {
          margin: 5px 0;
          font-size: 11px;
        }
        .line {
          margin: 2px 0;
        }
        .item {
          margin: 3px 0;
          font-size: 11px;
        }
        .item-name {
          font-weight: bold;
          margin-bottom: 2px;
        }
        .modifier {
          margin-left: 10px;
          font-size: 10px;
        }
        .price-line {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          margin: 3px 0;
        }
        .total-section {
          margin: 8px 0;
          font-size: 11px;
        }
        .total-line {
          display: flex;
          justify-content: space-between;
          margin: 2px 0;
        }
        .total-label {
          font-weight: bold;
        }
        .grand-total {
          font-weight: bold;
          font-size: 13px;
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
          padding: 3px 0;
          margin: 5px 0;
        }
        .payment-status {
          text-align: center;
          font-weight: bold;
          padding: 5px;
          margin: 5px 0;
          border: 2px solid #000;
          font-size: 12px;
          background: #000;
          color: white;
        }
        .footer {
          text-align: center;
          font-size: 10px;
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px dotted #000;
        }
        .order-details {
          font-size: 10px;
          margin: 8px 0;
        }
        @media print {
          body { margin: 0; padding: 5px; }
        }
      </style>
    `;

    const itemsHTML = (order.items || []).map(item => {
      const itemNameFormatted = `${item.quantity}x ${item.item_name}`;
      return `
        <div class="item">
          <div class="price-line">
            <span>${itemNameFormatted}</span>
            <span>£${(item.item_total || 0).toFixed(2)}</span>
          </div>
          ${(item.modifiers || []).map(mod => `
            <div class="modifier">• ${mod.option_name}${mod.price_adjustment ? ` +£${mod.price_adjustment.toFixed(2)}` : ''}</div>
          `).join('')}
        </div>
      `;
    }).join('');

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        ${styles}
      </head>
      <body>
        <div class="receipt">
          <div class="header">${isDelivery ? 'DELIVERY' : 'COLLECTION'}</div>
          
          <div class="section">
            <div class="line"><strong>${order.customer_name}</strong></div>
            ${isDelivery && order.delivery_address ? `<div class="line">${order.delivery_address}</div>` : ''}
            ${isDelivery && order.delivery_postcode ? `<div class="line">${order.delivery_postcode}</div>` : ''}
            ${order.customer_phone ? `<div class="line">+44 ${order.customer_phone.replace(/^0/, '')}</div>` : ''}
          </div>

          <div class="divider"></div>

          <div class="item">
            ${itemsHTML}
          </div>

          <div class="divider"></div>

          <div class="total-section">
            <div class="total-line">
              <span>SUB TOTAL</span>
              <span>£${(order.subtotal || 0).toFixed(2)}</span>
            </div>
            ${order.discount_amount > 0 ? `
              <div class="total-line">
                <span>DISCOUNT</span>
                <span>-£${order.discount_amount.toFixed(2)}</span>
              </div>
            ` : ''}
            ${isDelivery ? `
              <div class="total-line">
                <span>DELIVERY CHARGE</span>
                <span>£${(order.delivery_charge || 0).toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="total-line grand-total">
              <span>TOTAL</span>
              <span>£${(order.total || 0).toFixed(2)}</span>
            </div>
          </div>

          <div class="payment-status">
            ${order.payment_status === 'paid' ? 'PAID' : 'NOT PAID'}
          </div>

          <div class="order-details">
            <div class="line">Placed: ${order.created_date ? format(new Date(order.created_date), 'dd/MM/yy HH:mm') : 'N/A'}</div>
            ${isDelivery ? `<div class="line">Delivery by: TBD</div>` : ''}
            <div class="line">Order through: Online - Mobile</div>
          </div>

          <div class="divider"></div>

          <div class="footer">
            <div><strong>Marco's</strong></div>
            <div>Est. 2020</div>
            <div style="margin-top: 5px; font-size: 9px;">
              <div>For more info visit our website</div>
              <div>or call us directly</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (!order) return null;

  return (
    <button
      onClick={handlePrint}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border bg-white text-blue-600 border-gray-200 hover:border-blue-400 hover:bg-blue-50"
      title="Print receipt"
    >
      <Printer className="w-4 h-4" />
      Print Receipt
    </button>
  );
}
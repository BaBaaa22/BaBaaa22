import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, startOfDay, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'completed', label: 'COMPLETED ORDERS' },
  { key: 'unfulfilled', label: 'UNFULFILLED ORDERS' },
];

export default function AdminReports() {
  const [tab, setTab] = useState('completed');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: allOrders = [] } = useQuery({
    queryKey: ['reports-orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 1000),
    initialData: [],
  });

  const dateStart = startOfDay(selectedDate);
  const dateEnd = new Date(dateStart.getTime() + 86400000);

  const dayOrders = allOrders.filter(o => {
    const d = new Date(o.created_date);
    return d >= dateStart && d < dateEnd;
  });

  const completed = dayOrders.filter(o => o.status === 'completed');
  const unfulfilled = dayOrders.filter(o => o.status === 'cancelled');

  const shown = tab === 'completed' ? completed : unfulfilled;

  // Payment breakdown
  const cash = shown.filter(o => o.payment_method === 'cash');
  const card = shown.filter(o => o.payment_method === 'card');
  const total = shown.length;
  const totalAmt = shown.reduce((s, o) => s + (o.total || 0), 0);
  const cashAmt = cash.reduce((s, o) => s + (o.total || 0), 0);
  const cardAmt = card.reduce((s, o) => s + (o.total || 0), 0);

  // Order type breakdown
  const delivery = shown.filter(o => o.order_type === 'delivery');
  const pickup = shown.filter(o => o.order_type === 'collection');
  const deliveryAmt = delivery.reduce((s, o) => s + (o.total || 0), 0);
  const pickupAmt = pickup.reduce((s, o) => s + (o.total || 0), 0);

  const pct = (n) => total > 0 ? Math.round((n / total) * 100) + '%' : '0%';
  const pctAmt = (a) => totalAmt > 0 ? Math.round((a / totalAmt) * 100) + '%' : '0%';

  const goBack = () => setSelectedDate(d => subDays(d, 1));
  const goForward = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    if (next <= new Date()) setSelectedDate(next);
  };

  const TableRow = ({ label, orders, amount, percent, bold }) => (
    <tr className={cn("border-b border-gray-100 last:border-0", bold && "font-bold")}>
      <td className={cn("py-3 text-sm", bold ? "text-gray-900" : "text-gray-600")}>{label}</td>
      <td className="py-3 text-sm text-right text-gray-700">{orders !== null ? (orders === '-' ? '-' : orders) : '-'}</td>
      <td className="py-3 text-sm text-right text-gray-700">{amount !== null ? (amount === '-' ? '-' : amount) : '-'}</td>
      <td className="py-3 text-sm text-right text-gray-500">{percent || ''}</td>
    </tr>
  );

  return (
    <div className="space-y-0 max-w-2xl -m-4 lg:-m-6">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("flex-1 py-3.5 text-xs font-bold tracking-wide border-b-2 transition-colors",
              tab === t.key ? "border-green-500 text-gray-800" : "border-transparent text-gray-400 hover:text-gray-600"
            )}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 lg:p-6 space-y-6">
        {/* Date nav */}
        <div className="flex items-center justify-between">
          <button onClick={goBack} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">{format(selectedDate, 'dd/MM/yyyy')}</span>
            <Calendar className="w-4 h-4 text-gray-400" />
          </div>
          <button onClick={goForward} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Store name */}
        <div className="bg-gray-50 rounded-xl px-4 py-2">
          <p className="text-sm text-gray-500">Marco's Pizzeria</p>
        </div>

        {/* Summary table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500"></th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Orders</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Price</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Percent</th>
              </tr>
            </thead>
            <tbody className="px-4">
              {[
                { label: 'Cash', orders: cash.length, amount: cashAmt.toFixed(2), percent: pct(cash.length) },
                { label: 'Card', orders: card.length, amount: cardAmt.toFixed(2), percent: pct(card.length) },
                { label: 'Card At Shop', orders: '-', amount: '-', percent: '0%' },
                { label: 'Total', orders: total, amount: totalAmt.toFixed(2), percent: '', bold: true },
              ].map(row => (
                <tr key={row.label} className={cn("border-b border-gray-100", row.bold && "font-bold")}>
                  <td className={cn("px-4 py-3 text-sm", row.bold ? "text-gray-900" : "text-gray-600")}>{row.label}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">{row.orders}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">{row.amount === '-' ? '-' : row.amount !== '' ? row.amount : ''}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-500">{row.percent}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Spacer row */}
          <div className="h-2 bg-gray-50 border-y border-gray-100" />

          <table className="w-full">
            <tbody>
              {[
                { label: 'Online - Web', orders: shown.filter(o => o.order_type !== 'collection').length, amount: shown.filter(o => o.order_type !== 'collection').reduce((s,o)=>s+(o.total||0),0).toFixed(2), percent: pct(shown.filter(o => o.order_type !== 'collection').length) },
                { label: 'Offline (EPOS)', orders: shown.filter(o => o.order_type === 'collection').length, amount: shown.filter(o => o.order_type === 'collection').reduce((s,o)=>s+(o.total||0),0).toFixed(2), percent: pct(shown.filter(o => o.order_type === 'collection').length) },
              ].map(row => (
                <tr key={row.label} className="border-b border-gray-100">
                  <td className="px-4 py-3 text-sm text-gray-600">{row.label}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">{row.orders}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">{row.amount}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-500">{row.percent}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="h-2 bg-gray-50 border-y border-gray-100" />

          <table className="w-full">
            <tbody>
              {[
                { label: 'Delivery', orders: delivery.length, amount: deliveryAmt.toFixed(2), percent: pctAmt(deliveryAmt) },
                { label: 'Pickup', orders: pickup.length, amount: pickupAmt.toFixed(2), percent: pctAmt(pickupAmt) },
                { label: 'Instore', orders: '-', amount: '-', percent: '0%' },
                { label: 'Restaurant', orders: '-', amount: '-', percent: '0%' },
                { label: 'Delivery Partner charges', orders: '-', amount: '-', percent: '' },
              ].map(row => (
                <tr key={row.label} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 text-sm text-gray-600">{row.label}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">{row.orders}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">{row.amount === '-' ? '-' : row.amount}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-500">{row.percent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* View completed orders button */}
        <button className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm transition-colors">
          VIEW COMPLETED ORDERS
        </button>

        {/* Orders list */}
        {shown.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-800">Orders ({shown.length})</p>
            </div>
            <div className="divide-y divide-gray-50">
              {shown.map(order => (
                <div key={order.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{order.order_number}</p>
                    <p className="text-xs text-gray-400">{order.customer_name} · {order.order_type} · {order.payment_method}</p>
                    <p className="text-xs text-gray-400">{order.created_date ? format(new Date(order.created_date), 'HH:mm') : ''}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-900">£{order.total?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {shown.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400 text-sm">
            There are no orders to show here
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import PullToRefresh from '../components/common/PullToRefresh';
import { format, subDays, startOfDay } from 'date-fns';
import { ChevronRight, Monitor, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: orders = [], dataUpdatedAt } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 500),
    initialData: [],
    refetchInterval: 30000,
  });

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const prevDate = subDays(selectedDate, 7);

  const filterDay = (date) => {
    const start = startOfDay(date);
    const end = new Date(start.getTime() + 86400000);
    return orders.filter(o => {
      const d = new Date(o.created_date);
      return d >= start && d < end;
    });
  };

  const todayOrders = filterDay(selectedDate);
  const prevOrders = filterDay(prevDate);

  const completed = todayOrders.filter(o => o.status === 'completed');
  const prevCompleted = prevOrders.filter(o => o.status === 'completed');
  const openOrders = orders.filter(o => ['received', 'in_kitchen', 'ready'].includes(o.status));

  const netSales = completed.reduce((s, o) => s + (o.total || 0), 0);
  const prevNetSales = prevCompleted.reduce((s, o) => s + (o.total || 0), 0);
  const avgOrder = completed.length > 0 ? netSales / completed.length : 0;
  const prevAvgOrder = prevCompleted.length > 0 ? prevNetSales / prevCompleted.length : 0;
  const discounts = completed.reduce((s, o) => s + (o.discount_amount || 0), 0);

  const pctChange = (curr, prev) => {
    if (prev === 0 && curr === 0) return 0;
    if (prev === 0) return 100;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const StatCard = ({ label, value, change, wide }) => {
    const isPositive = change > 0;
    const isZero = change === 0;
    return (
      <div className={cn("bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-sm transition-shadow", wide ? "col-span-2" : "")}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-600">{label}</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </div>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        <div className="flex items-center gap-1 mt-1">
          {isZero ? (
            <Minus className="w-3 h-3 text-gray-400" />
          ) : isPositive ? (
            <TrendingUp className="w-3 h-3 text-green-600" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-500" />
          )}
          <span className={cn("text-xs font-semibold", isZero ? "text-gray-400" : isPositive ? "text-green-600" : "text-red-500")}>
            {isZero ? '0 %' : `${isPositive ? '' : ''}${change} %`}
          </span>
        </div>
      </div>
    );
  };

  return (
    <PullToRefresh onRefresh={() => queryClient.invalidateQueries({ queryKey: ['admin-orders'] })} className="space-y-5 -m-1 p-1">

      {/* Date selector */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2">
          <button onClick={() => setSelectedDate(d => subDays(d, 1))} className="text-gray-400 hover:text-gray-700 text-lg font-bold">‹</button>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">{format(selectedDate, 'dd/MM/yyyy')}</p>
            <p className="text-[11px] text-gray-400">vs {format(prevDate, 'dd/MM/yyyy')}</p>
          </div>
          <button onClick={() => setSelectedDate(d => { const next = new Date(d); next.setDate(next.getDate() + 1); return next > new Date() ? d : next; })} className="text-gray-400 hover:text-gray-700 text-lg font-bold">›</button>
        </div>
        {dataUpdatedAt > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Last updated: {format(new Date(dataUpdatedAt), 'dd/MM/yyyy HH:mm')}</span>
            <button onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-orders'] })} className="text-[#3a8fa0] font-semibold hover:underline flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Net Sales" value={`£ ${netSales.toFixed(2)}`} change={pctChange(netSales, prevNetSales)} wide />
        <StatCard label="Open Orders" value={openOrders.length} change={0} />
        <StatCard label="Discounts" value={`£ ${discounts.toFixed(2)}`} change={0} />
        <StatCard label="Completed Orders" value={completed.length} change={pctChange(completed.length, prevCompleted.length)} />
        <StatCard label="Average Order Value" value={`£ ${avgOrder.toFixed(2)}`} change={pctChange(avgOrder, prevAvgOrder)} />
      </div>

      {/* EPOS launch */}
      <Link
        to={createPageUrl('AdminEPOS')}
        className="block bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-5 hover:from-red-500 hover:to-red-600 transition-all shadow-lg shadow-red-600/20 group"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Monitor className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">Launch EPOS Screen</h3>
            <p className="text-red-200 text-sm">Full-screen point of sale — take & manage orders</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/50 ml-auto group-hover:text-white group-hover:translate-x-1 transition-all" />
        </div>
      </Link>

      {/* Open orders list */}
      {openOrders.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-800 text-sm">Open Orders</h2>
            <Link to={createPageUrl('AdminOrders')} className="text-xs text-[#3a8fa0] font-semibold hover:underline">View All</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {openOrders.slice(0, 8).map(order => (
              <div key={order.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                <div>
                  <p className="text-sm font-semibold text-gray-900">#{order.order_number}</p>
                  <p className="text-xs text-gray-400">{order.customer_name} · {order.order_type}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">£{order.total?.toFixed(2)}</span>
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold",
                    order.status === 'received' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'in_kitchen' ? 'bg-orange-100 text-orange-700' :
                    'bg-green-100 text-green-700'
                  )}>{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PullToRefresh>
  );
}
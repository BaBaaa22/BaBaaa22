import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Tag, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const PROMO_TABS = [
  { key: 'coupons', label: 'Coupons' },
  { key: 'discounts', label: 'Discounts' },
];

// ─── Coupon Form ──────────────────────────────────────────────────────────────
function CouponForm({ coupon, onSave, onCancel }) {
  const [form, setForm] = useState(coupon || {
    code: '', discount_type: 'percent', discount_value: '', min_order_value: 0,
    free_delivery: false, applies_to: 'both', coupon_type: 'basic', expiry_date: '', is_active: true,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
      <h3 className="font-bold text-gray-900">{coupon ? 'Edit Coupon' : 'Create Coupon'}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Coupon Code *</label>
          <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="e.g. SAVE10" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3a8fa0]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Discount Type</label>
          <div className="flex gap-2">
            {['percent', 'amount'].map(t => (
              <button key={t} onClick={() => set('discount_type', t)} className={cn("flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize", form.discount_type === t ? "bg-[#3a8fa0] text-white border-[#3a8fa0]" : "border-gray-200 text-gray-500 hover:bg-gray-50")}>
                {t === 'percent' ? 'Percent' : 'Amount'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Discount Value *</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-400 text-sm">{form.discount_type === 'percent' ? '%' : '£'}</span>
            <input type="number" value={form.discount_value} onChange={e => set('discount_value', parseFloat(e.target.value))} className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm outline-none focus:border-[#3a8fa0]" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Min Order Value</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-400 text-sm">£</span>
            <input type="number" value={form.min_order_value} onChange={e => set('min_order_value', parseFloat(e.target.value))} className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm outline-none focus:border-[#3a8fa0]" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Applies To</label>
          <div className="flex gap-1">
            {['both', 'delivery', 'collection'].map(t => (
              <button key={t} onClick={() => set('applies_to', t)} className={cn("flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize", form.applies_to === t ? "bg-[#3a8fa0] text-white border-[#3a8fa0]" : "border-gray-200 text-gray-500 hover:bg-gray-50")}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Expiry Date</label>
          <input type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3a8fa0]" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={form.free_delivery} onChange={e => set('free_delivery', e.target.checked)} className="rounded" />
          Free Delivery
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="rounded" />
          Active
        </label>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">Cancel</button>
        <button onClick={() => onSave(form)} className="px-6 py-2 text-sm bg-[#3a8fa0] text-white rounded-lg hover:bg-[#2e7a8a] font-semibold">Save Coupon</button>
      </div>
    </div>
  );
}

// ─── Discount Form ────────────────────────────────────────────────────────────
function DiscountForm({ discount, onSave, onCancel }) {
  const [form, setForm] = useState(discount || {
    name: '', discount_type: 'percent', discount_value: '', min_order_value: 0,
    applies_to: 'both', days_of_week: [], first_time_only: false, expiry_date: '', is_active: true,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const toggleDay = (d) => set('days_of_week', form.days_of_week?.includes(d) ? form.days_of_week.filter(x => x !== d) : [...(form.days_of_week || []), d]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
      <h3 className="font-bold text-gray-900">{discount ? 'Edit Discount' : 'Add Discount'}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Discount Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Delivery & Collection 10% Off" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3a8fa0]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Discount Type</label>
          <div className="flex gap-2">
            {['percent', 'amount'].map(t => (
              <button key={t} onClick={() => set('discount_type', t)} className={cn("flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize", form.discount_type === t ? "bg-[#3a8fa0] text-white border-[#3a8fa0]" : "border-gray-200 text-gray-500 hover:bg-gray-50")}>
                {t === 'percent' ? 'Percent' : 'Amount'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Value *</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-400 text-sm">{form.discount_type === 'percent' ? '%' : '£'}</span>
            <input type="number" value={form.discount_value} onChange={e => set('discount_value', parseFloat(e.target.value))} className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm outline-none focus:border-[#3a8fa0]" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Min Order Value</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-400 text-sm">£</span>
            <input type="number" value={form.min_order_value} onChange={e => set('min_order_value', parseFloat(e.target.value))} className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm outline-none focus:border-[#3a8fa0]" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Applies To</label>
          <div className="flex gap-1">
            {['both', 'delivery', 'collection'].map(t => (
              <button key={t} onClick={() => set('applies_to', t)} className={cn("flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize", form.applies_to === t ? "bg-[#3a8fa0] text-white border-[#3a8fa0]" : "border-gray-200 text-gray-500 hover:bg-gray-50")}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Days of Week</label>
        <div className="flex gap-2">
          {DAYS.map(d => (
            <button key={d} onClick={() => toggleDay(d)} className={cn("w-9 h-9 rounded-full text-xs font-semibold transition-colors", form.days_of_week?.includes(d) ? "bg-[#3a8fa0] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>
              {d[0]}
            </button>
          ))}
          <button onClick={() => set('days_of_week', DAYS)} className="px-3 text-xs text-[#3a8fa0] hover:underline">All</button>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={form.first_time_only} onChange={e => set('first_time_only', e.target.checked)} className="rounded" />
          First time users only
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="rounded" />
          Active
        </label>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">Cancel</button>
        <button onClick={() => onSave(form)} className="px-6 py-2 text-sm bg-[#3a8fa0] text-white rounded-lg hover:bg-[#2e7a8a] font-semibold">Save Discount</button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminPromotions() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('coupons');
  const [couponTab, setCouponTab] = useState('active'); // active | expired
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: coupons = [] } = useQuery({
    queryKey: ['coupons'],
    queryFn: () => base44.entities.Coupon.list('-created_date'),
    initialData: [],
  });
  const { data: discounts = [] } = useQuery({
    queryKey: ['discounts'],
    queryFn: () => base44.entities.Discount.list('-created_date'),
    initialData: [],
  });

  const couponMutation = useMutation({
    mutationFn: (data) => data.id ? base44.entities.Coupon.update(data.id, data) : base44.entities.Coupon.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['coupons'] }); setShowForm(false); setEditing(null); },
  });
  const deleteCoupon = useMutation({
    mutationFn: (id) => base44.entities.Coupon.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coupons'] }),
  });

  const discountMutation = useMutation({
    mutationFn: (data) => data.id ? base44.entities.Discount.update(data.id, data) : base44.entities.Discount.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['discounts'] }); setShowForm(false); setEditing(null); },
  });
  const deleteDiscount = useMutation({
    mutationFn: (id) => base44.entities.Discount.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discounts'] }),
  });

  const now = new Date();
  const activeCoupons = coupons.filter(c => c.is_active && (!c.expiry_date || new Date(c.expiry_date) >= now));
  const expiredCoupons = coupons.filter(c => !c.is_active || (c.expiry_date && new Date(c.expiry_date) < now));

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Tabs */}
      <div className="flex gap-2">
        {PROMO_TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setShowForm(false); setEditing(null); }}
            className={cn("px-5 py-2 rounded-xl text-sm font-semibold border transition-colors", tab === t.key ? "bg-[#3a8fa0] text-white border-[#3a8fa0]" : "border-gray-200 text-gray-500 hover:bg-gray-50 bg-white")}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'coupons' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {['active', 'expired'].map(t => (
                <button key={t} onClick={() => setCouponTab(t)} className={cn("px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors", couponTab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500")}>
                  {t} ({t === 'active' ? activeCoupons.length : expiredCoupons.length})
                </button>
              ))}
            </div>
            <button onClick={() => { setShowForm(true); setEditing(null); }} className="flex items-center gap-2 px-4 py-2 bg-[#3a8fa0] text-white rounded-xl text-sm font-semibold hover:bg-[#2e7a8a]">
              <Plus className="w-4 h-4" /> Create Coupon
            </button>
          </div>

          {showForm && !editing && (
            <CouponForm onSave={(d) => couponMutation.mutate(d)} onCancel={() => setShowForm(false)} />
          )}
          {editing && tab === 'coupons' && (
            <CouponForm coupon={editing} onSave={(d) => couponMutation.mutate({ ...d, id: editing.id })} onCancel={() => setEditing(null)} />
          )}

          <div className="space-y-2">
            {(couponTab === 'active' ? activeCoupons : expiredCoupons).map(c => (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#e8f4f6] flex items-center justify-center shrink-0">
                  <Tag className="w-5 h-5 text-[#3a8fa0]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">{c.code}</p>
                  <p className="text-xs text-gray-500">
                    {c.discount_type === 'percent' ? `${c.discount_value}% off` : `£${c.discount_value} off`}
                    {c.min_order_value > 0 && ` • Min £${c.min_order_value}`}
                    {c.free_delivery && ' • Free delivery'}
                    {c.expiry_date && ` • Expires ${format(new Date(c.expiry_date), 'dd MMM yyyy')}`}
                  </p>
                </div>
                <span className={cn("px-2 py-1 rounded-full text-xs font-semibold", c.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(c); setShowForm(false); }} className="p-2 text-gray-400 hover:text-[#3a8fa0] hover:bg-gray-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteCoupon.mutate(c.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {(couponTab === 'active' ? activeCoupons : expiredCoupons).length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-gray-400 text-sm">
                No {couponTab} coupons
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'discounts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setShowForm(true); setEditing(null); }} className="flex items-center gap-2 px-4 py-2 bg-[#3a8fa0] text-white rounded-xl text-sm font-semibold hover:bg-[#2e7a8a]">
              <Plus className="w-4 h-4" /> Add Discount
            </button>
          </div>

          {showForm && !editing && (
            <DiscountForm onSave={(d) => discountMutation.mutate(d)} onCancel={() => setShowForm(false)} />
          )}
          {editing && tab === 'discounts' && (
            <DiscountForm discount={editing} onSave={(d) => discountMutation.mutate({ ...d, id: editing.id })} onCancel={() => setEditing(null)} />
          )}

          <div className="space-y-2">
            {discounts.map(d => (
              <div key={d.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                  <Percent className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">{d.name}</p>
                  <p className="text-xs text-gray-500">
                    {d.discount_type === 'percent' ? `${d.discount_value}% off` : `£${d.discount_value} off`}
                    {d.min_order_value > 0 && ` • Min £${d.min_order_value}`}
                    {d.applies_to && ` • ${d.applies_to}`}
                    {d.days_of_week?.length > 0 && ` • ${d.days_of_week.join(', ')}`}
                  </p>
                </div>
                <span className={cn("px-2 py-1 rounded-full text-xs font-semibold", d.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                  {d.is_active ? 'Active' : 'Inactive'}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(d); setShowForm(false); }} className="p-2 text-gray-400 hover:text-[#3a8fa0] hover:bg-gray-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteDiscount.mutate(d.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {discounts.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-gray-400 text-sm">
                No discounts yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
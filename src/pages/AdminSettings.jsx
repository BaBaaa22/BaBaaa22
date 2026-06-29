import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Save, Plus, Trash2, Clock, MapPin, CreditCard, Tag, UserX, AlertTriangle, Navigation } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deleting, setDeleting] = useState(false);

  const { data: settingsArr } = useQuery({
    queryKey: ['store-settings'],
    queryFn: () => base44.entities.StoreSettings.filter({ setting_key: 'main' }),
    initialData: [],
  });

  const settings = settingsArr[0];
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) setForm({ ...settings });
  }, [settings]);

  if (!form) {
    return <div className="flex items-center justify-center p-12"><div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    const { id, created_date, updated_date, created_by, ...data } = form;
    await base44.entities.StoreSettings.update(settings.id, data);
    queryClient.invalidateQueries({ queryKey: ['store-settings'] });
    setSaving(false);
    toast.success('Settings saved!');
  };

  const updateHours = (idx, field, val) => {
    const hours = [...(form.opening_hours || [])];
    hours[idx] = { ...hours[idx], [field]: val };
    update('opening_hours', hours);
  };

  const addZone = () => {
    const zones = [...(form.delivery_zones || []), { postcode_prefix: '', delivery_charge: 2.5, minimum_order: 10 }];
    update('delivery_zones', zones);
  };

  const updateZone = (idx, field, val) => {
    const zones = [...(form.delivery_zones || [])];
    zones[idx] = { ...zones[idx], [field]: val };
    update('delivery_zones', zones);
  };

  const removeZone = (idx) => {
    update('delivery_zones', (form.delivery_zones || []).filter((_, i) => i !== idx));
  };

  const addDistanceZone = () => {
    const zones = [...(form.distance_zones || []), { max_miles: 3, zone_name: '', delivery_charge: 2.5, minimum_order: 10 }];
    update('distance_zones', zones);
  };

  const updateDistanceZone = (idx, field, val) => {
    const zones = [...(form.distance_zones || [])];
    zones[idx] = { ...zones[idx], [field]: val };
    update('distance_zones', zones);
  };

  const removeDistanceZone = (idx) => {
    update('distance_zones', (form.distance_zones || []).filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* General */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 mb-4">General</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-gray-500">Store Name</Label>
            <Input value={form.store_name || ''} onChange={e => update('store_name', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Phone</Label>
            <Input value={form.phone || ''} onChange={e => update('phone', e.target.value)} className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs text-gray-500">Address</Label>
            <Input value={form.address || ''} onChange={e => update('address', e.target.value)} className="mt-1" />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.is_open} onCheckedChange={v => update('is_open', v)} />
            <Label className="text-sm font-medium">Store is {form.is_open ? 'Open' : 'Closed'}</Label>
          </div>
          <div className="sm:col-span-2 flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
            <Switch checked={!!form.allow_preorders} onCheckedChange={v => update('allow_preorders', v)} />
            <div>
              <Label className="text-sm font-medium">Allow Pre-orders when Closed</Label>
              <p className="text-xs text-gray-500 mt-0.5">Customers can place orders outside opening hours and choose a future pickup or delivery time.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Opening Hours */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-red-500" />
          <h2 className="font-bold text-gray-900">Opening Hours</h2>
        </div>
        <div className="space-y-3">
          {(form.opening_hours || []).map((h, idx) => (
            <div key={idx} className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-gray-700 w-24">{h.day}</span>
              <div className="flex items-center gap-2">
                <Switch checked={!h.is_closed} onCheckedChange={v => updateHours(idx, 'is_closed', !v)} />
                <span className="text-xs text-gray-400">{h.is_closed ? 'Closed' : 'Open'}</span>
              </div>
              {!h.is_closed && (
                <>
                  <Input type="time" value={h.open || ''} onChange={e => updateHours(idx, 'open', e.target.value)} className="w-28" />
                  <span className="text-gray-400">to</span>
                  <Input type="time" value={h.close || ''} onChange={e => updateHours(idx, 'close', e.target.value)} className="w-28" />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Delivery Zones */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-red-500" />
          <h2 className="font-bold text-gray-900">Delivery Settings</h2>
        </div>

        {/* Mode toggle */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl mb-5">
          <Switch checked={!!form.use_distance_zones} onCheckedChange={v => update('use_distance_zones', v)} />
          <div>
            <Label className="text-sm font-medium">Use Distance-Based Zones</Label>
            <p className="text-xs text-gray-500 mt-0.5">
              {form.use_distance_zones
                ? 'Delivery fees are calculated from your shop postcode to the customer using real road distances.'
                : 'Delivery fees are matched by postcode prefix (e.g. "TS14", "SW1").'}
            </p>
          </div>
        </div>

        {/* Defaults */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <div>
            <Label className="text-xs text-gray-600 font-semibold">Default Delivery Charge (£)</Label>
            <p className="text-[11px] text-gray-400 mb-1">Used when no zone matches</p>
            <Input type="number" step="0.50" min="0" value={form.default_delivery_charge || 0} onChange={e => update('default_delivery_charge', parseFloat(e.target.value) || 0)} className="mt-1 bg-white" />
          </div>
          <div>
            <Label className="text-xs text-gray-600 font-semibold">Default Min. Order (£)</Label>
            <p className="text-[11px] text-gray-400 mb-1">Minimum basket value for delivery</p>
            <Input type="number" step="0.50" min="0" value={form.minimum_delivery_order || 0} onChange={e => update('minimum_delivery_order', parseFloat(e.target.value) || 0)} className="mt-1 bg-white" />
          </div>
        </div>

        {/* Distance zones */}
        {form.use_distance_zones ? (
          <div>
            <div className="mb-4">
              <Label className="text-xs text-gray-600 font-semibold">Shop Postcode (origin)</Label>
              <p className="text-[11px] text-gray-400 mb-1">Distances are measured from this postcode</p>
              <Input
                placeholder="e.g. TS14 6AA"
                value={form.shop_postcode || ''}
                onChange={e => update('shop_postcode', e.target.value.toUpperCase())}
                className="mt-1 max-w-xs font-mono"
              />
            </div>

            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Navigation className="w-3.5 h-3.5 text-red-500" />
                <span className="text-sm font-semibold text-gray-700">Distance Zones (sorted by radius)</span>
              </div>
              <button onClick={addDistanceZone} className="flex items-center gap-1.5 text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Zone
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-3">Zones are matched from smallest to largest radius. A customer in a 2-mile zone will get the 2-mile fee even if a 5-mile zone also covers them.</p>

            {(form.distance_zones || []).length > 0 && (
              <div className="grid grid-cols-12 gap-2 px-3 mb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <span className="col-span-2">Max Miles</span>
                <span className="col-span-4">Zone Name</span>
                <span className="col-span-2 text-right">Charge (£)</span>
                <span className="col-span-3 text-right">Min Order (£)</span>
                <span className="col-span-1" />
              </div>
            )}

            <div className="space-y-2">
              {(form.distance_zones || []).map((z, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="col-span-2">
                    <Input
                      type="number" step="0.5" min="0.1"
                      value={z.max_miles}
                      onChange={e => updateDistanceZone(idx, 'max_miles', parseFloat(e.target.value) || 0)}
                      className="bg-white text-center font-semibold"
                    />
                  </div>
                  <div className="col-span-4">
                    <Input
                      placeholder="e.g. Local"
                      value={z.zone_name || ''}
                      onChange={e => updateDistanceZone(idx, 'zone_name', e.target.value)}
                      className="bg-white text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number" step="0.50" min="0"
                      value={z.delivery_charge}
                      onChange={e => updateDistanceZone(idx, 'delivery_charge', parseFloat(e.target.value) || 0)}
                      className="bg-white text-right"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number" step="0.50" min="0"
                      value={z.minimum_order}
                      onChange={e => updateDistanceZone(idx, 'minimum_order', parseFloat(e.target.value) || 0)}
                      className="bg-white text-right"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button onClick={() => removeDistanceZone(idx)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {(form.distance_zones || []).length === 0 && (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                  <Navigation className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No distance zones defined</p>
                  <p className="text-xs mt-1">Add zones to charge different fees by distance</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Postcode Prefix Zones</span>
              <button onClick={addZone} className="flex items-center gap-1.5 text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Zone
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-3">Each zone is matched by postcode prefix (e.g. "TS14", "SW1A"). The most specific match wins.</p>

            {(form.delivery_zones || []).length > 0 && (
              <div className="grid grid-cols-12 gap-2 px-3 mb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <span className="col-span-3">Postcode Prefix</span>
                <span className="col-span-4">Zone Name</span>
                <span className="col-span-2 text-right">Charge (£)</span>
                <span className="col-span-2 text-right">Min Order (£)</span>
                <span className="col-span-1" />
              </div>
            )}

            <div className="space-y-2">
              {(form.delivery_zones || []).map((z, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="col-span-3">
                    <Input placeholder="e.g. E1" value={z.postcode_prefix || ''} onChange={e => updateZone(idx, 'postcode_prefix', e.target.value.toUpperCase())} className="bg-white font-mono font-semibold text-center" />
                  </div>
                  <div className="col-span-4">
                    <Input placeholder="Zone name (optional)" value={z.zone_name || ''} onChange={e => updateZone(idx, 'zone_name', e.target.value)} className="bg-white text-sm" />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" step="0.50" min="0" value={z.delivery_charge} onChange={e => updateZone(idx, 'delivery_charge', parseFloat(e.target.value) || 0)} className="bg-white text-right" />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" step="0.50" min="0" value={z.minimum_order} onChange={e => updateZone(idx, 'minimum_order', parseFloat(e.target.value) || 0)} className="bg-white text-right" />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button onClick={() => removeZone(idx)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {(form.delivery_zones || []).length === 0 && (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No delivery zones defined</p>
                  <p className="text-xs mt-1">All deliveries will use the default charge above</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Payment */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 text-red-500" />
          <h2 className="font-bold text-gray-900">Payment Settings</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch checked={form.accept_card} onCheckedChange={v => update('accept_card', v)} />
            <Label className="text-sm">Accept Card Payments</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.accept_cash} onCheckedChange={v => update('accept_cash', v)} />
            <Label className="text-sm">Accept Cash on Delivery/Collection</Label>
          </div>
        </div>
      </div>

      {/* Offers */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-4 h-4 text-red-500" />
          <h2 className="font-bold text-gray-900">Offer Banner</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch checked={form.offer_banner_active} onCheckedChange={v => update('offer_banner_active', v)} />
            <Label className="text-sm">Show Offer Banner</Label>
          </div>
          {form.offer_banner_active && (
            <div>
              <Label className="text-xs text-gray-500">Banner Text</Label>
              <Input value={form.offer_banner_text || ''} onChange={e => update('offer_banner_text', e.target.value)} className="mt-1" />
            </div>
          )}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full sm:w-auto px-8 py-3 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors flex items-center gap-2 shadow-lg shadow-red-600/25 disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Saving...' : 'Save Settings'}
      </button>

      {/* Delete Account */}
      <div className="bg-white rounded-2xl border border-red-100 p-6">
        <div className="flex items-center gap-2 mb-2">
          <UserX className="w-4 h-4 text-red-500" />
          <h2 className="font-bold text-gray-900">Danger Zone</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">Permanently delete your account. This action cannot be undone.</p>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-5 py-2.5 rounded-xl border-2 border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Delete My Account
          </button>
        ) : (
          <div className="space-y-3 bg-red-50 rounded-xl p-4 border border-red-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 font-medium">
                Type <strong>DELETE</strong> to confirm account deletion.
              </p>
            </div>
            <Input
              value={deletePhrase}
              onChange={e => setDeletePhrase(e.target.value)}
              placeholder="Type DELETE"
              className="bg-white"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeletePhrase(''); }}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={deletePhrase !== 'DELETE' || deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await base44.functions.invoke('deleteMyAccount', {});
                  } catch (e) { /* data deletion best-effort */ }
                  await base44.auth.logout('/');
                }}
              >
                {deleting ? 'Processing...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
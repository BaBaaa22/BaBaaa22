import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, CheckCircle, XCircle, Clock, Zap, Mail, Phone, MapPin, FileText, CreditCard, ExternalLink } from 'lucide-react';

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
  approved: { label: 'Approved', color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/20' },
  live:     { label: 'Live',     color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/20' },
  rejected: { label: 'Rejected', color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/20' },
};

export default function AdminShops() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [appUrl, setAppUrl] = useState('');

  const { data: apps = [] } = useQuery({
    queryKey: ['shop-applications'],
    queryFn: () => base44.entities.ShopApplication.list('-created_date', 100),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShopApplication.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shop-applications'] }); setSelected(null); },
  });

  const handleStatus = (app, status) => {
    const data = { status };
    if (status === 'live' && appUrl) data.app_url = appUrl;
    updateMutation.mutate({ id: app.id, data });
  };

  const counts = {
    pending:  apps.filter(a => a.status === 'pending').length,
    approved: apps.filter(a => a.status === 'approved').length,
    live:     apps.filter(a => a.status === 'live').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending', count: counts.pending, color: 'text-yellow-400', icon: Clock },
          { label: 'Approved', count: counts.approved, color: 'text-blue-400', icon: CheckCircle },
          { label: 'Live', count: counts.live, color: 'text-green-400', icon: Zap },
        ].map(({ label, count, color, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <Icon className={`w-5 h-5 ${color}`} />
            <div>
              <p className="text-2xl font-black text-gray-900">{count}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Shop Applications</h2>
          <span className="text-xs text-gray-400">{apps.length} total</span>
        </div>

        {apps.length === 0 ? (
          <div className="py-16 text-center">
            <Store className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No applications yet</p>
            <p className="text-gray-300 text-xs mt-1">Share the signup link to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {apps.map(app => {
              const sc = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
              return (
                <div key={app.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {app.logo_url ? (
                        <img src={app.logo_url} alt="logo" className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center">
                          <Store className="w-5 h-5 text-red-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-900">{app.shop_name}</p>
                        <p className="text-xs text-gray-500">{app.owner_name} · {app.cuisine_type || 'Takeaway'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${sc.bg} ${sc.color}`}>{sc.label}</span>
                      <button onClick={() => { setSelected(app); setAppUrl(app.app_url || ''); }} className="text-xs text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                        Manage
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{app.email}</span>
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{app.phone}</span>
                    {app.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{app.address}</span>}
                    <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" />{app.payment_provider?.replace('_', ' ')}</span>
                    {app.menu_csv_url && <span className="flex items-center gap-1 text-green-500"><FileText className="w-3 h-3" />CSV uploaded</span>}
                    {app.app_url && (
                      <a href={app.app_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
                        <ExternalLink className="w-3 h-3" />Live site
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Signup link helper */}
      <div className="bg-gray-900 rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-white font-semibold text-sm">Shop Signup Link</p>
          <p className="text-gray-400 text-xs mt-0.5">Share this with new shops to start the onboarding process</p>
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(window.location.origin + '/ShopSignup'); alert('Link copied!'); }}
          className="shrink-0 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors"
        >
          Copy Link
        </button>
      </div>

      {/* Manage modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              {selected.logo_url ? <img src={selected.logo_url} className="w-12 h-12 rounded-xl object-cover" /> : <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center"><Store className="w-6 h-6 text-red-400" /></div>}
              <div>
                <h3 className="font-black text-gray-900">{selected.shop_name}</h3>
                <p className="text-xs text-gray-500">{selected.email}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {selected.menu_csv_url && (
                <a href={selected.menu_csv_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-500 hover:text-blue-600">
                  <FileText className="w-4 h-4" /> Download Menu CSV
                </a>
              )}
            </div>

            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1.5">App / Website URL (once live)</label>
              <input
                value={appUrl}
                onChange={e => setAppUrl(e.target.value)}
                placeholder="https://theirshop.base44.app"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => handleStatus(selected, 'approved')} className="py-2.5 rounded-xl bg-blue-50 text-blue-600 text-sm font-semibold border border-blue-200 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
              <button onClick={() => handleStatus(selected, 'live')} className="py-2.5 rounded-xl bg-green-50 text-green-600 text-sm font-semibold border border-green-200 hover:bg-green-100 transition-colors flex items-center justify-center gap-1.5">
                <Zap className="w-4 h-4" /> Mark Live
              </button>
              <button onClick={() => handleStatus(selected, 'rejected')} className="py-2.5 rounded-xl bg-red-50 text-red-500 text-sm font-semibold border border-red-200 hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 col-span-2">
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </div>

            <button onClick={() => setSelected(null)} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
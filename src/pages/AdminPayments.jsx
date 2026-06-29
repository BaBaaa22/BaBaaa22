import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, CheckCircle2, AlertCircle, Eye, EyeOff,
  Save, ToggleLeft, ToggleRight, ExternalLink, Zap, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

const GATEWAYS = [
  {
    key: 'stripe',
    name: 'Stripe',
    logo: '🔷',
    color: 'from-indigo-500 to-purple-600',
    description: 'Popular global payment processor. Supports cards, wallets & more.',
    docsUrl: 'https://dashboard.stripe.com/apikeys',
    fields: [
      { key: 'publishable_key', label: 'Publishable Key', placeholder: 'pk_live_...' },
      { key: 'secret_key', label: 'Secret Key', placeholder: 'sk_live_...', secret: true },
      { key: 'webhook_secret', label: 'Webhook Secret', placeholder: 'whsec_...', secret: true },
    ],
  },
  {
    key: 'paypal',
    name: 'PayPal',
    logo: '🅿️',
    color: 'from-blue-500 to-blue-700',
    description: 'Accept PayPal, Venmo, cards and Pay Later options.',
    docsUrl: 'https://developer.paypal.com/dashboard/applications',
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'AYz...' },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'EL...', secret: true },
    ],
  },
  {
    key: 'square',
    name: 'Square',
    logo: '⬛',
    color: 'from-gray-700 to-gray-900',
    description: 'In-person and online payments with Square hardware support.',
    docsUrl: 'https://developer.squareup.com/apps',
    fields: [
      { key: 'access_token', label: 'Access Token', placeholder: 'EAAAl...', secret: true },
      { key: 'location_id', label: 'Location ID', placeholder: 'LPSA...' },
    ],
  },
  {
    key: 'sumup',
    name: 'SumUp',
    logo: '💳',
    color: 'from-teal-500 to-teal-700',
    description: 'Low-cost card reader & payments popular in the UK & Europe.',
    docsUrl: 'https://developer.sumup.com',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'sup_sk_...', secret: true },
      { key: 'merchant_id', label: 'Merchant Code', placeholder: 'MC...' },
    ],
  },
  {
    key: 'worldpay',
    name: 'Worldpay',
    logo: '🌍',
    color: 'from-red-500 to-red-700',
    description: 'Enterprise card processing trusted by large UK businesses.',
    docsUrl: 'https://developer.worldpay.com',
    fields: [
      { key: 'merchant_id', label: 'Merchant ID', placeholder: 'T87...' },
      { key: 'api_key', label: 'API Key / Service Key', placeholder: 'T_S_...', secret: true },
    ],
  },
  {
    key: 'opayo',
    name: 'Opayo (Sage Pay)',
    logo: '🏦',
    color: 'from-green-600 to-green-800',
    description: 'Formerly Sage Pay — reliable UK-based payment gateway.',
    docsUrl: 'https://developer-eu.elavon.com',
    fields: [
      { key: 'merchant_id', label: 'Vendor Name', placeholder: 'yourvendor' },
      { key: 'api_key', label: 'Integration Key', placeholder: 'oU...', secret: true },
      { key: 'client_secret', label: 'Integration Password', placeholder: 'P...', secret: true },
    ],
  },
  {
    key: 'neropay',
    name: 'NeroPay',
    logo: '⚡',
    color: 'from-orange-500 to-red-600',
    description: 'UK-based payment gateway with hosted checkout. Primary processor for Marco\'s.',
    docsUrl: 'https://eu.neropay.app/dashboard',
    secureNote: 'NeroPay keys are stored as secure environment variables (NEROPAY_PUBLIC_KEY & NEROPAY_SECRET_KEY) and cannot be edited here. Update them in Dashboard → Code → Environment Variables.',
    fields: [
      { key: 'publishable_key', label: 'Public Key', placeholder: 'neropay_public_...', readOnly: true },
      { key: 'merchant_id', label: 'Merchant ID', placeholder: 'NP9C3...' },
    ],
  },
];

function SecretInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-9 text-sm text-gray-800 bg-gray-50 outline-none focus:border-indigo-400 font-mono"
      />
      <button type="button" onClick={() => setShow(s => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function GatewayCard({ gateway, record, onSave }) {
  const isConfigured = !!record;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => record || { provider: gateway.key, mode: 'test', is_enabled: false });
  const [saved, setSaved] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    await onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className={cn("bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all",
      form.is_enabled && isConfigured ? 'ring-2 ring-green-400' : '')}>
      {/* Header */}
      <div className="p-5 flex items-center gap-4">
        <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-2xl shadow", gateway.color)}>
          {gateway.logo}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900">{gateway.name}</h3>
            {isConfigured && (
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                form.is_enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                {form.is_enabled ? '● Active' : '○ Disabled'}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{gateway.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isConfigured && (
            <button
              onClick={() => set('is_enabled', !form.is_enabled)}
              className="text-gray-400 hover:text-gray-700"
              title={form.is_enabled ? 'Disable' : 'Enable'}
            >
              {form.is_enabled
                ? <ToggleRight className="w-7 h-7 text-green-500" />
                : <ToggleLeft className="w-7 h-7" />}
            </button>
          )}
          <button
            onClick={() => setOpen(o => !o)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {open ? 'Close' : isConfigured ? 'Edit' : 'Configure'}
          </button>
        </div>
      </div>

      {/* Expandable Form */}
      {open && (
        <div className="border-t border-gray-100 p-5 space-y-4 bg-gray-50">
          {/* Mode toggle */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 font-medium">Mode:</span>
            {['test', 'live'].map(m => (
              <button key={m} onClick={() => set('mode', m)}
                className={cn("px-3 py-1 rounded-lg text-xs font-bold transition-all border",
                  form.mode === m
                    ? m === 'live' ? 'bg-green-500 text-white border-green-500' : 'bg-amber-400 text-white border-amber-400'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                )}>
                {m.toUpperCase()}
              </button>
            ))}
            {form.mode === 'live' && (
              <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
                <Zap className="w-3 h-3" /> Live payments active
              </span>
            )}
            {form.mode === 'test' && (
              <span className="flex items-center gap-1 text-[10px] text-amber-500 font-medium">
                <Info className="w-3 h-3" /> Test mode — no real charges
              </span>
            )}
          </div>

          {/* Secure note (e.g. NeroPay) */}
          {gateway.secureNote && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">{gateway.secureNote}</p>
            </div>
          )}

          {/* Fields */}
          {gateway.fields.map(field => (
            <div key={field.key}>
              <label className="block text-xs text-gray-600 font-medium mb-1">{field.label}</label>
              {field.secret ? (
                <SecretInput
                  value={form[field.key]}
                  onChange={v => set(field.key, v)}
                  placeholder={field.placeholder}
                />
              ) : (
                <input
                  type="text"
                  value={form[field.key] || ''}
                  onChange={e => !field.readOnly && set(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  readOnly={field.readOnly}
                  className={cn(
                    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none font-mono",
                    field.readOnly ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white focus:border-indigo-400"
                  )}
                />
              )}
            </div>
          ))}

          {/* Notes */}
          <div>
            <label className="block text-xs text-gray-600 font-medium mb-1">Notes (internal)</label>
            <textarea
              value={form.notes || ''}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              placeholder="Any internal notes..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white outline-none focus:border-indigo-400 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <a href={gateway.docsUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700">
              <ExternalLink className="w-3.5 h-3.5" /> Get API keys
            </a>
            <button
              onClick={handleSave}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                saved ? "bg-green-500 text-white" : "bg-gray-900 text-white hover:bg-gray-700"
              )}
            >
              {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPayments() {
  const queryClient = useQueryClient();

  const { data: records = [] } = useQuery({
    queryKey: ['payment-gateways'],
    queryFn: () => base44.entities.PaymentGateway.list(),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: async (form) => {
      const existing = records.find(r => r.provider === form.provider);
      if (existing) {
        return base44.entities.PaymentGateway.update(existing.id, form);
      } else {
        return base44.entities.PaymentGateway.create(form);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payment-gateways'] }),
  });

  const enabledCount = records.filter(r => r.is_enabled).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Payment Gateways</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Configure payment providers for online and in-store orders.
            {enabledCount > 0 && <span className="ml-2 text-green-600 font-medium">{enabledCount} active</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 font-medium">Keep secret keys private. Never share them.</p>
        </div>
      </div>

      {/* Gateway Cards */}
      <div className="space-y-4">
        {GATEWAYS.map(gw => (
          <GatewayCard
            key={gw.key}
            gateway={gw}
            record={records.find(r => r.provider === gw.key) || null}
            onSave={saveMutation.mutateAsync}
          />
        ))}
      </div>
    </div>
  );
}
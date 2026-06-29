import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, Upload, Store, User, Phone, Mail, MapPin, CreditCard, ChevronRight, ChevronLeft, Utensils } from 'lucide-react';

const STEPS = ['Shop Info', 'Menu Upload', 'Payments', 'Review'];

const PAYMENT_PROVIDERS = [
  { value: 'neropay', label: 'NeroPay', desc: 'UK online payments' },
  { value: 'sumup', label: 'SumUp', desc: 'Card reader & online' },
  { value: 'stripe', label: 'Stripe', desc: 'Global payments' },
  { value: 'square', label: 'Square', desc: 'POS & online' },
  { value: 'cash_only', label: 'Cash Only', desc: 'No online payments' },
];

export default function ShopSignup() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);

  const [form, setForm] = useState({
    shop_name: '', owner_name: '', email: '', phone: '', address: '', cuisine_type: '',
    logo_url: '', menu_csv_url: '',
    payment_provider: 'cash_only',
    payment_publishable_key: '', payment_secret_key: '', payment_merchant_id: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('logo_url', file_url);
    setUploadingLogo(false);
  };

  const handleCsvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingCsv(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('menu_csv_url', file_url);
    setUploadingCsv(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    await base44.entities.ShopApplication.create(form);
    setLoading(false);
    setSubmitted(true);
  };

  const canNext = () => {
    if (step === 0) return form.shop_name && form.owner_name && form.email && form.phone;
    if (step === 1) return true; // CSV optional
    if (step === 2) return true; // keys optional
    return true;
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Application Submitted!</h2>
          <p className="text-gray-400 text-sm mb-6">We'll review your application and get your shop set up within 24 hours. You'll receive an email at <span className="text-white font-semibold">{form.email}</span> with your login details.</p>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Shop Name</span><span className="text-white font-semibold">{form.shop_name}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Payment</span><span className="text-white font-semibold capitalize">{form.payment_provider.replace('_', ' ')}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Menu CSV</span><span className="text-white font-semibold">{form.menu_csv_url ? '✅ Uploaded' : '⏳ Manual setup'}</span></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-4 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/40">
          <Store className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-black text-white text-base leading-tight">Open Your Shop</h1>
          <p className="text-xs text-gray-500">Powered by Marco's Platform</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 px-4 py-5">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < step ? 'bg-green-500 text-white' : i === step ? 'bg-red-600 text-white shadow-lg shadow-red-600/40' : 'bg-white/10 text-gray-500'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] font-medium ${i === step ? 'text-white' : 'text-gray-600'}`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px mb-4 ${i < step ? 'bg-green-500' : 'bg-white/10'}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="max-w-lg mx-auto px-4 pb-24">

        {/* Step 0: Shop Info */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black mb-1">Shop Details</h2>
              <p className="text-gray-500 text-sm">Tell us about your business</p>
            </div>

            {/* Logo upload */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                {form.logo_url ? <img src={form.logo_url} alt="logo" className="w-full h-full object-cover" /> : <Store className="w-7 h-7 text-gray-600" />}
              </div>
              <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 text-sm font-medium cursor-pointer transition-colors ${uploadingLogo ? 'opacity-50' : 'hover:bg-white/5'}`}>
                <Upload className="w-4 h-4" />
                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
              </label>
            </div>

            <Field label="Shop Name" icon={<Store className="w-4 h-4" />} value={form.shop_name} onChange={v => set('shop_name', v)} placeholder="e.g. Ahmed's Grill" required />
            <Field label="Owner Name" icon={<User className="w-4 h-4" />} value={form.owner_name} onChange={v => set('owner_name', v)} placeholder="Your full name" required />
            <Field label="Email Address" icon={<Mail className="w-4 h-4" />} value={form.email} onChange={v => set('email', v)} placeholder="you@example.com" type="email" required />
            <Field label="Phone Number" icon={<Phone className="w-4 h-4" />} value={form.phone} onChange={v => set('phone', v)} placeholder="+44 7700 000000" required />
            <Field label="Shop Address" icon={<MapPin className="w-4 h-4" />} value={form.address} onChange={v => set('address', v)} placeholder="Full address" />
            <Field label="Cuisine Type" icon={<Utensils className="w-4 h-4" />} value={form.cuisine_type} onChange={v => set('cuisine_type', v)} placeholder="e.g. Pizza, Kebabs, Indian" />
          </div>
        )}

        {/* Step 1: Menu Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black mb-1">Upload Your Menu</h2>
              <p className="text-gray-500 text-sm">Upload a CSV file with your menu items, or we can set it up manually for you</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-gray-400 space-y-1">
              <p className="text-white font-semibold text-sm mb-2">CSV Format:</p>
              <p>name, description, category, subcategory, base_price, is_vegetarian</p>
              <p className="text-gray-600">e.g. Margherita Pizza, Classic tomato & cheese, PIZZAS, , 8.99, false</p>
            </div>

            <label className={`flex flex-col items-center justify-center gap-3 w-full h-36 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
              form.menu_csv_url ? 'border-green-500/50 bg-green-500/5' : 'border-white/20 hover:border-red-500/50 hover:bg-red-950/20'
            }`}>
              {uploadingCsv ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-sm text-gray-400">Uploading...</span>
                </div>
              ) : form.menu_csv_url ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                  <span className="text-sm text-green-400 font-semibold">CSV Uploaded!</span>
                  <span className="text-xs text-gray-500">Click to replace</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-gray-500" />
                  <span className="text-sm text-gray-300 font-semibold">Click to upload CSV</span>
                  <span className="text-xs text-gray-600">.csv files only</span>
                </div>
              )}
              <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} disabled={uploadingCsv} />
            </label>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-gray-600">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-400">Skip for now — we'll set up your menu manually after approval</p>
            </div>
          </div>
        )}

        {/* Step 2: Payments */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black mb-1">Payment Settings</h2>
              <p className="text-gray-500 text-sm">Choose how you'd like to accept payments</p>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {PAYMENT_PROVIDERS.map(p => (
                <button
                  key={p.value}
                  onClick={() => set('payment_provider', p.value)}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-all ${
                    form.payment_provider === p.value
                      ? 'border-red-500 bg-red-950/30 text-white'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-sm text-white">{p.label}</p>
                    <p className="text-xs text-gray-500">{p.desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${form.payment_provider === p.value ? 'border-red-500 bg-red-500' : 'border-gray-600'}`}>
                    {form.payment_provider === p.value && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              ))}
            </div>

            {form.payment_provider !== 'cash_only' && (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">API Keys (optional — can be added later)</p>
                <Field label="Publishable / Public Key" icon={<CreditCard className="w-4 h-4" />} value={form.payment_publishable_key} onChange={v => set('payment_publishable_key', v)} placeholder="pk_live_..." />
                {['neropay', 'sumup', 'stripe'].includes(form.payment_provider) && (
                  <Field label="Secret Key" icon={<CreditCard className="w-4 h-4" />} value={form.payment_secret_key} onChange={v => set('payment_secret_key', v)} placeholder="sk_live_..." type="password" />
                )}
                {['square', 'sumup'].includes(form.payment_provider) && (
                  <Field label="Merchant / Location ID" icon={<CreditCard className="w-4 h-4" />} value={form.payment_merchant_id} onChange={v => set('payment_merchant_id', v)} placeholder="Merchant ID" />
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black mb-1">Review & Submit</h2>
              <p className="text-gray-500 text-sm">Check your details before submitting</p>
            </div>

            {form.logo_url && (
              <div className="flex justify-center">
                <img src={form.logo_url} alt="logo" className="w-20 h-20 rounded-xl object-cover border border-white/10" />
              </div>
            )}

            <div className="bg-white/5 border border-white/10 rounded-xl divide-y divide-white/5">
              <ReviewRow label="Shop Name" value={form.shop_name} />
              <ReviewRow label="Owner" value={form.owner_name} />
              <ReviewRow label="Email" value={form.email} />
              <ReviewRow label="Phone" value={form.phone} />
              {form.address && <ReviewRow label="Address" value={form.address} />}
              {form.cuisine_type && <ReviewRow label="Cuisine" value={form.cuisine_type} />}
              <ReviewRow label="Menu CSV" value={form.menu_csv_url ? '✅ Uploaded' : '⏳ Manual setup'} />
              <ReviewRow label="Payments" value={PAYMENT_PROVIDERS.find(p => p.value === form.payment_provider)?.label} />
            </div>

            <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-4 text-sm text-gray-400">
              After submitting, our team will review your application and set up your personalised ordering website within <span className="text-white font-semibold">24 hours</span>. You'll receive login credentials by email.
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/20 text-sm font-semibold hover:bg-white/5 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors shadow-lg shadow-red-600/30"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-sm transition-colors shadow-lg shadow-red-600/30"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : '🚀 Submit Application'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, value, onChange, placeholder, type = 'text', required }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">{icon}</div>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:bg-white/8 transition-all"
        />
      </div>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex justify-between items-center px-4 py-3 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-white font-semibold text-right max-w-[60%] truncate">{value || '—'}</span>
    </div>
  );
}
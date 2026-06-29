import React, { useState } from 'react';
import { ChevronRight, ArrowLeft, Printer, Settings2, FileText, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Template Configuration ───────────────────────────────────────────────────
function TemplateConfig({ onBack }) {
  const [config, setConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem('templateConfig') || '{}'); } catch { return {}; }
  });

  const set = (k, v) => setConfig(c => ({ ...c, [k]: v }));
  const getNum = (k, def) => config[k] ?? def;
  const getBool = (k, def) => config[k] ?? def;
  const getPos = (k, def) => config[k] ?? def;

  const save = () => {
    localStorage.setItem('templateConfig', JSON.stringify(config));
    onBack();
  };

  const NumControl = ({ label, field, defaultVal }) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-0">
        <button onClick={() => set(field, Math.max(8, getNum(field, defaultVal) - 1))}
          className="w-9 h-9 border border-green-500 rounded-l-lg flex items-center justify-center text-green-600 hover:bg-green-50 transition-colors">
          <span className="text-lg font-light">−</span>
        </button>
        <div className="w-12 h-9 border-y border-green-500 flex items-center justify-center text-sm font-medium text-gray-800">
          {getNum(field, defaultVal)}
        </div>
        <button onClick={() => set(field, Math.min(32, getNum(field, defaultVal) + 1))}
          className="w-9 h-9 border border-green-500 rounded-r-lg flex items-center justify-center text-green-600 hover:bg-green-50 transition-colors">
          <span className="text-lg font-light">+</span>
        </button>
      </div>
    </div>
  );

  const Toggle = ({ label, field, defaultVal }) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <button onClick={() => set(field, !getBool(field, defaultVal))}
        className={cn("w-12 h-6 rounded-full transition-colors relative", getBool(field, defaultVal) ? "bg-green-500" : "bg-gray-200")}>
        <span className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", getBool(field, defaultVal) ? "translate-x-6" : "translate-x-0.5")} />
      </button>
    </div>
  );

  const PositionPicker = ({ label, field, defaultVal }) => {
    const cur = getPos(field, defaultVal);
    return (
      <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
        <span className="text-sm text-gray-700">{label}</span>
        <div className="flex rounded-xl overflow-hidden border border-gray-200">
          {['TOP', 'BOTTOM', 'DISABLE'].map(opt => (
            <button key={opt} onClick={() => set(field, opt)}
              className={cn("px-3 py-1.5 text-xs font-semibold transition-colors",
                cur === opt ? "bg-green-500 text-white" : "bg-white text-gray-500 hover:bg-gray-50")}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-600 hover:text-gray-900"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="font-bold text-gray-900">Template Configuration</h1>
        </div>
        <button onClick={save} className="text-sm font-semibold text-green-600 hover:text-green-700">Save</button>
      </div>

      <div className="p-4 space-y-0">
        {/* Receipt name */}
        <div className="bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Receipt</div>
        <div className="bg-white px-4 border-b border-gray-100">
          <div className="py-4">
            <p className="text-xs text-green-600 mb-1">Name</p>
            <input
              value={config.templateName || 'Template 1'}
              onChange={e => set('templateName', e.target.value)}
              className="w-full text-sm text-gray-800 outline-none border-b border-gray-200 pb-1"
            />
          </div>
        </div>

        {/* Readability */}
        <div className="bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2">Readability</div>
        <div className="bg-white px-4">
          <Toggle label="Bold Items" field="boldItems" defaultVal={true} />
          <Toggle label="Print each modifiers in a new line" field="modifiersNewLine" defaultVal={true} />
          <Toggle label="Add dotted line divider for each item" field="dottedDivider" defaultVal={true} />
        </div>

        {/* Font Sizes */}
        <div className="bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2">Font Sizes</div>
        <div className="bg-white px-4">
          <NumControl label="Item" field="fontItem" defaultVal={15} />
          <NumControl label="Second language item size" field="fontItem2" defaultVal={12} />
          <NumControl label="Modifier" field="fontModifier" defaultVal={13} />
          <NumControl label="Comment" field="fontComment" defaultVal={15} />
          <NumControl label="Address" field="fontAddress" defaultVal={15} />
          <NumControl label="Business Name" field="fontBusiness" defaultVal={11} />
          <NumControl label="Receipt Font" field="fontReceipt" defaultVal={12} />
          <NumControl label="Payment Status" field="fontPayment" defaultVal={17} />
          <NumControl label="Order Number" field="fontOrderNum" defaultVal={20} />
          <NumControl label="Pre Order" field="fontPreOrder" defaultVal={15} />
          <NumControl label="Table Name" field="fontTable" defaultVal={14} />
          <NumControl label="Order Type" field="fontOrderType" defaultVal={15} />
          <NumControl label="Items printed on other sections" field="fontOtherSections" defaultVal={12} />
        </div>

        {/* Additional Items */}
        <div className="bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2">Additional Items</div>
        <div className="bg-white px-4">
          <PositionPicker label="Driver Assign QR" field="driverQRPos" defaultVal="BOTTOM" />
          <Toggle label="Phone No" field="showPhone" defaultVal={true} />
          <Toggle label="Show Delivery Completion Time" field="showDeliveryTime" defaultVal={true} />
          <Toggle label="Order Mode On Receipt" field="showOrderMode" defaultVal={true} />
          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <div>
              <p className="text-sm text-gray-700">Paper Cut</p>
              <p className="text-xs text-gray-400">Partial</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
          <Toggle label="Print Store Address" field="printStoreAddress" defaultVal={true} />
          <PositionPicker label="Comment Position" field="commentPos" defaultVal="BOTTOM" />
        </div>
      </div>
    </div>
  );
}

// ─── Printer Utility ──────────────────────────────────────────────────────────
function PrinterUtility({ onBack }) {
  const [config, setConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem('printerUtility') || '{}'); } catch { return {}; }
  });

  const set = (k, v) => setConfig(c => ({ ...c, [k]: v }));
  const getBool = (k, def) => config[k] ?? def;
  const getPos = (k, def) => config[k] ?? def;

  const save = () => {
    localStorage.setItem('printerUtility', JSON.stringify(config));
    onBack();
  };

  const Toggle = ({ label, field, defaultVal }) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <button onClick={() => set(field, !getBool(field, defaultVal))}
        className={cn("w-12 h-6 rounded-full transition-colors relative", getBool(field, defaultVal) ? "bg-green-500" : "bg-gray-200")}>
        <span className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", getBool(field, defaultVal) ? "translate-x-6" : "translate-x-0.5")} />
      </button>
    </div>
  );

  const PositionPicker = ({ label, field, defaultVal }) => {
    const cur = getPos(field, defaultVal);
    return (
      <div className="flex items-center justify-between py-4 border-b border-gray-100">
        <span className="text-sm text-gray-700">{label}</span>
        <div className="flex rounded-xl overflow-hidden border border-gray-200">
          {['TOP', 'BOTTOM', 'DISABLE'].map(opt => (
            <button key={opt} onClick={() => set(field, opt)}
              className={cn("px-3 py-1.5 text-xs font-semibold transition-colors",
                cur === opt ? "bg-green-500 text-white" : "bg-white text-gray-500 hover:bg-gray-50")}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-600 hover:text-gray-900"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="font-bold text-gray-900">Printer Utility</h1>
        </div>
        <button onClick={save} className="text-sm font-semibold text-green-600">Save</button>
      </div>

      <div className="p-4 space-y-0">
        {/* Configuration section */}
        <div className="bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Configuration</div>
        <div className="bg-white px-4">
          <PositionPicker label="Order Number" field="orderNumPos" defaultVal="BOTTOM" />
          <Toggle label="Calculate Change" field="calcChange" defaultVal={true} />
          <Toggle label="Not Paid Status" field="notPaidStatus" defaultVal={true} />
          <Toggle label="Print Receipt once the Driver is assigned" field="printOnDriverAssign" defaultVal={true} />
          <Toggle label="Item Count" field="itemCount" defaultVal={true} />
          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <span className="text-sm text-gray-700">Print Copies</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">{config.printCopies || 1}</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </div>
          <Toggle label="VAT Receipt" field="vatReceipt" defaultVal={true} />
          <Toggle label="Show Customer Duration and Order Count" field="showCustomerDuration" defaultVal={true} />
          <Toggle label="Order taken by details as part of the receipt" field="showTakenBy" defaultVal={true} />
          <Toggle label="Show only first name for taken by" field="firstNameOnly" defaultVal={true} />
        </div>

        {/* Receipt Message */}
        <div className="bg-white px-4 mt-4 py-4">
          <p className="text-xs text-green-600 mb-1">Receipt Message</p>
          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <input
              value={config.receiptMessage || 'Powered by Marco\'s'}
              onChange={e => set('receiptMessage', e.target.value)}
              className="text-sm text-gray-800 outline-none flex-1"
            />
            <button onClick={() => set('receiptMessage', '')} className="text-gray-300 hover:text-gray-500">✕</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Printer Settings ────────────────────────────────────────────────────
export default function AdminPrinterSettings() {
  const [screen, setScreen] = useState('main'); // main | utility | template | printer

  if (screen === 'template') return <TemplateConfig onBack={() => setScreen('main')} />;
  if (screen === 'utility') return <PrinterUtility onBack={() => setScreen('main')} />;

  const items = [
    { key: 'printer', label: 'Printer', icon: Printer },
    { key: 'utility', label: 'Printer Utility', icon: Settings2 },
    { key: 'template', label: 'Template Configuration', icon: FileText },
    { key: 'section', label: 'Section', icon: Layers },
  ];

  return (
    <div className="min-h-screen bg-gray-50 -m-4 lg:-m-6">
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <h1 className="font-bold text-gray-900">Printer Settings</h1>
      </div>
      <div className="divide-y divide-gray-100 bg-white mt-4">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <button key={item.key} onClick={() => setScreen(item.key)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
              <Icon className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-800 flex-1 text-left">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
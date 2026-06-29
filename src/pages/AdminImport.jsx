import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const FILE_SLOTS = [
  { key: 'main', label: 'Menu Export CSV', hint: 'menu-export-MYMR...csv', required: true },
];

export default function AdminImport() {
  const [uploadedUrls, setUploadedUrls] = useState({});
  const [fileNames, setFileNames]       = useState({});
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState(null);
  const [uploadingKey, setUploadingKey] = useState(null);

  const handleFileUpload = async (e, key) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingKey(key);
    setResult(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedUrls(prev => ({ ...prev, [key]: file_url }));
      setFileNames(prev => ({ ...prev, [key]: file.name }));
    } catch (err) {
      setResult({ type: 'error', message: `Upload failed: ${err.message}` });
    } finally {
      setUploadingKey(null);
    }
  };

  const allRequired = FILE_SLOTS.filter(s => s.required).every(s => uploadedUrls[s.key]);

  const handleImport = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('importFromNewCsv', {
        csv_url: uploadedUrls.main,
      });

      const d = res.data;
      if (d?.status === 'success') {
        setResult({
          type: 'success',
          message: `✓ Imported ${d.created} items — ${d.items_with_modifiers} with modifiers (${d.modifier_groups_found} modifier groups found)`,
        });
      } else {
        setResult({ type: 'error', message: d?.error || 'Import failed' });
      }
    } catch (err) {
      setResult({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Import Menu</h1>
        <p className="text-sm text-gray-500 mb-8">
          Upload your single menu export CSV to rebuild the menu with all items, categories, and modifier groups.
        </p>

        <div className="space-y-4 mb-8">
          {FILE_SLOTS.map(({ key, label, hint, required }) => (
            <div key={key} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                  </p>
                  <p className="text-xs text-gray-400">{hint}</p>
                </div>
                {uploadedUrls[key] && (
                  <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Uploaded
                  </span>
                )}
              </div>
              <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg hover:border-red-300 cursor-pointer transition-colors group">
                {uploadingKey === key
                  ? <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                  : <Upload className="w-4 h-4 text-gray-400 group-hover:text-red-400" />}
                <span className="text-sm text-gray-500 truncate">
                  {fileNames[key] || 'Click to choose file...'}
                </span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileUpload(e, key)}
                  className="hidden"
                  disabled={!!uploadingKey}
                />
              </label>
            </div>
          ))}
        </div>

        {result && (
          <div className={`flex items-start gap-3 p-4 rounded-xl mb-6 ${
            result.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            {result.type === 'success'
              ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              : <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
            <p className={`text-sm font-medium ${result.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {result.message}
            </p>
          </div>
        )}

        <Button
          onClick={handleImport}
          disabled={loading || !allRequired || !!uploadingKey}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-3"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {loading ? 'Importing… (this takes ~30s)' : 'Import Menu'}
        </Button>

        {!allRequired && (
          <p className="text-xs text-gray-400 text-center mt-3">Upload the CSV file to continue</p>
        )}
      </div>
    </div>
  );
}
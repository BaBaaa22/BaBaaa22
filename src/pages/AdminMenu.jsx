import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Eye, EyeOff, Search, Leaf, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import MobileSelect from '../components/common/MobileSelect';
import PullToRefresh from '../components/common/PullToRefresh';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const CATEGORIES = ['Deals', 'Pizzas', 'Burgers', 'Kebabs', 'Fried Chicken', 'Indian', 'Sides', 'Drinks', 'Desserts'];

export default function AdminMenu() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [editItem, setEditItem] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: items, isLoading, refetch } = useQuery({
    queryKey: ['admin-menu'],
    queryFn: () => base44.entities.MenuItem.list('sort_order', 200),
    initialData: [],
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_available }) => base44.entities.MenuItem.update(id, { is_available }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-menu'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MenuItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-menu'] }),
  });

  const filtered = items.filter(i => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || i.category === filterCat;
    return matchSearch && matchCat;
  });

  const grouped = {};
  filtered.forEach(i => {
    if (!grouped[i.category]) grouped[i.category] = [];
    grouped[i.category].push(i);
  });

  return (
    <div className="space-y-6">
      {/* Actions bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 items-center flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <MobileSelect
            value={filterCat}
            onChange={setFilterCat}
            label="Filter by Category"
            options={[{value:'all',label:'All Categories'}, ...CATEGORIES.map(c=>({value:c,label:c}))]}
          />
        </div>
        <button
          onClick={() => { setEditItem({ name: '', description: '', category: 'Pizzas', base_price: 0, is_vegetarian: false, is_spicy: false, is_available: true, allergens: [], modifier_groups: [] }); setIsCreating(true); }}
          className="px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Items table */}
      <PullToRefresh onRefresh={refetch}>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Item</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Price</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Available</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{item.name}</span>
                      {item.is_vegetarian && <Leaf className="w-3.5 h-3.5 text-green-500" />}
                      {item.is_spicy && <Flame className="w-3.5 h-3.5 text-orange-500" />}
                    </div>
                    {item.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{item.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.category}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">£{item.base_price?.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={item.is_available}
                      onCheckedChange={(val) => toggleMutation.mutate({ id: item.id, is_available: val })}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setEditItem({ ...item }); setIsCreating(false); }}
                        className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      <button
                        onClick={() => { if (confirm('Delete this item?')) deleteMutation.mutate(item.id); }}
                        className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-12 text-center text-gray-400 text-sm">No items found</div>
        )}
      </div>
      </PullToRefresh>

      {/* Edit Dialog */}
      {editItem && (
        <EditItemDialog
          item={editItem}
          isCreating={isCreating}
          onClose={() => { setEditItem(null); setIsCreating(false); }}
          onSaved={() => { setEditItem(null); setIsCreating(false); queryClient.invalidateQueries({ queryKey: ['admin-menu'] }); }}
        />
      )}
    </div>
  );
}

function EditItemDialog({ item, isCreating, onClose, onSaved }) {
  const [form, setForm] = useState(item);
  const [saving, setSaving] = useState(false);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    const { id, created_date, updated_date, created_by, ...data } = form;
    if (isCreating) {
      await base44.entities.MenuItem.create(data);
    } else {
      await base44.entities.MenuItem.update(item.id, data);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCreating ? 'Add Item' : 'Edit Item'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label className="text-xs text-gray-500">Name *</Label>
            <Input value={form.name} onChange={e => update('name', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Description</Label>
            <Textarea value={form.description || ''} onChange={e => update('description', e.target.value)} className="mt-1" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-gray-500">Category *</Label>
              <MobileSelect
                value={form.category}
                onChange={v => update('category', v)}
                label="Select Category"
                options={CATEGORIES.map(c => ({value:c, label:c}))}
                className="w-full mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Price (£) *</Label>
              <Input type="number" step="0.01" min="0" value={form.base_price} onChange={e => update('base_price', parseFloat(e.target.value) || 0)} className="mt-1" />
            </div>
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={form.is_vegetarian} onCheckedChange={v => update('is_vegetarian', v)} />
              <Label className="text-sm flex items-center gap-1"><Leaf className="w-3.5 h-3.5 text-green-500" /> Vegetarian</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_spicy} onCheckedChange={v => update('is_spicy', v)} />
              <Label className="text-sm flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-orange-500" /> Spicy</Label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_available} onCheckedChange={v => update('is_available', v)} />
            <Label className="text-sm">Available for ordering</Label>
          </div>
        </div>
        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name || !form.category}
            className="px-6 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
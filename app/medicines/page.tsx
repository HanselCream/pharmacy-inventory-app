'use client';

import { useEffect, useState } from 'react';
import { fetchMedicines, fetchCategories, createMedicine, updateMedicine, recordPurchase } from '@/lib/api';
import { Medicine } from '@/lib/types';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { createClient } from '@/lib/supabase/client';
import { Search, Plus, Edit2, Trash2, AlertTriangle, Calendar, Package, X } from 'lucide-react';
import { toast } from 'sonner';

export default function MedicinesPage() {
  const { user } = useCurrentUser();
  const isAdmin = user?.role === 'admin';
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [total, setTotal] = useState(0);
const generateNextMedicineCode = (medicines: Medicine[]) => {
  const maxNumber = medicines
    .map((m) => {
      const match = m.code?.match(/^MED(\d+)$/i);
      return match ? Number(match[1]) : 0;
    })
    .reduce((max, current) => Math.max(max, current), 0);

  return `MED${String(maxNumber + 1).padStart(3, "0")}`;
};

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
const [page, setPage] = useState(1);
const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
const [sortBy, setSortBy] = useState<'expiry_asc' | 'expiry_desc' | 'name_asc' | 'name_desc' | 'status_asc' | 'status_desc' | 'code_asc' | 'code_desc'>('code_asc');  
  // Add/Edit Form states
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Medicine>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Stock Arrival states
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [categoryError, setCategoryError] = useState('');
const [showStockArrival, setShowStockArrival] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [restockQuantities, setRestockQuantities] = useState<Record<string, number>>({});
  const [restockingId, setRestockingId] = useState<string | null>(null);

useEffect(() => {
  loadMedicines();
  loadCategories();
}, [search, category, page, sortBy, limit]);

const loadMedicines = async () => {
  try {
    setLoading(true);
    const { medicines: data, total: count } = await fetchMedicines({
      search,
      category,
      page,
      limit, // ← Changed from limit: 10 to limit
      sortBy,
    });
      setMedicines(data);
      setTotal(count);
    } catch (error) {
      console.error('Error loading medicines:', error);
      toast.error('Failed to load medicines');
    } finally {
      setLoading(false);
    }
  };

const loadCategories = async () => {
  try {
    const cats = await fetchCategories();
    setCategories(cats);
  } catch (error) {
    console.error('Error loading categories:', error);
  }
};

const handleAddCategory = () => {
  const trimmed = newCategory.trim();
  if (!trimmed) {
    setCategoryError('Category name cannot be empty');
    return;
  }
  const isDuplicate = categories.some(
    c => c.toLowerCase() === trimmed.toLowerCase()
  );
  if (isDuplicate) {
    setCategoryError(`"${trimmed}" already exists`);
    return;
  }
  setCategories([...categories, trimmed].sort());
  setNewCategory('');
  setCategoryError('');
  toast.success(`Category "${trimmed}" added`);
};

// After
const handleDeleteCategory = async (cat: string) => {
  const supabase = createClient();
  const { count, error } = await supabase
    .from('medicines')
    .select('id', { count: 'exact', head: true })
    .eq('category', cat);

  if (error) {
    console.error(error);
    toast.error('Error checking category usage');
    return;
  }

  if ((count ?? 0) > 0) {
    toast.error(`Cannot delete "${cat}" — used by ${count} medicine(s)`);
    return;
  }

  setCategories(categories.filter(c => c !== cat));
  toast.success(`Category "${cat}" deleted`);
};

  // ====== Medicine CRUD ======
const handleSave = async () => {
  if (!formData.code) {
    toast.error('Batch/Lot No. is required');
    return;
  }
  if (!formData.generic_name) {
    toast.error('Generic Name is required');
    return;
  }
  if (!formData.brand_name) {
    toast.error('Brand Name is required');
    return;
  }
if (!formData.category) {
    toast.error('Category is required');
    return;
  }
  if (!formData.unit_price) {
    toast.error('Unit Price is required');
    return;
  }
  if (formData.cost_price === undefined || formData.cost_price === null) {
    toast.error('Purchase Price is required');
    return;
  }
  if (!formData.quantity_on_hand) {
    toast.error('Quantity is required');
    return;
  }
  if (!formData.expiry_date) {
    toast.error('Expiry Date is required');
    return;
  }
  try {
      if (editingId) {
        await updateMedicine(editingId, formData);
        toast.success('Medicine updated successfully');
} else {
        const initialQty = formData.quantity_on_hand || 0;
        const newMedicine = await createMedicine(formData as Omit<Medicine, 'id' | 'created_at' | 'updated_at'>);
        if (initialQty > 0) {
          await recordPurchase({
            medicine_id: newMedicine.id,
            quantity_purchased: initialQty,
            unit_cost: formData.cost_price || formData.unit_price || 0,
            total_cost: (formData.cost_price || formData.unit_price || 0) * initialQty,
            supplier_name: formData.supplier || 'Initial Stock',
            purchase_date: new Date().toISOString(),
            received_date: new Date().toISOString(),
          });
        }
        toast.success('Medicine added successfully');
      }
      setShowForm(false);
      setFormData({});
      setEditingId(null);
      loadMedicines();
    } catch (error: any) {
  console.error(error);
  console.error(error?.message);
  console.error(error?.details);
  console.error(error?.hint);
  console.error(error?.code);

  toast.error(error?.message || 'Error saving medicine');
}
  };

  const handleEdit = (medicine: Medicine) => {
    setFormData(medicine);
    setEditingId(medicine.id);
    setShowForm(true);
    setShowStockArrival(false);
  };

const handleDelete = async (id: string, name: string) => {
  if (confirm(`Are you sure you want to delete "${name}"?`)) {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('medicines')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success(`"${name}" deleted successfully`);
      loadMedicines();
    } catch (error) {
      console.error('Error deleting medicine:', error);
      toast.error('Error deleting medicine');
    }
  }
};

  // ====== Stock Arrival ======
const handleRestock = async (medicine: Medicine) => {
    const qty = restockQuantities[medicine.id] || 0;
    if (qty <= 0) {
      toast.error('Enter quantity to add');
      return;
    }

    setRestockingId(medicine.id);
    try {
await recordPurchase({
        medicine_id: medicine.id,
        quantity_purchased: qty,
        unit_cost: medicine.cost_price || 0,
        total_cost: (medicine.cost_price || 0) * qty,
        supplier_name: 'Stock Arrival',
        purchase_date: new Date().toISOString(),
        received_date: new Date().toISOString(),
      });

      toast.success(`Added ${qty} units to ${medicine.brand_name}`);
      setRestockQuantities((prev) => ({ ...prev, [medicine.id]: 0 }));
      loadMedicines();
    } catch (error) {
      console.error('Error recording purchase:', error);
      toast.error('Error recording stock arrival');
    } finally {
      setRestockingId(null);
    }
  };

const isLowStock = (med: Medicine) => med.quantity_on_hand <= med.reorder_level;
  const isExpired = (med: Medicine) => med.expiry_date && new Date(med.expiry_date) < new Date();

  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Medicines</h1>
          <p className="text-muted-foreground">Manage your pharmacy inventory</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => {
              setShowStockArrival(!showStockArrival);
              setShowForm(false);
            }}
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition flex items-center gap-2"
          >
            <Package size={20} /> Stock Arrival
          </button>
          <button
onClick={async () => {
    setShowStockArrival(false);
    setEditingId(null);

    // Load ALL medicines
    const { medicines: allMedicines } = await fetchMedicines({
        page: 1,
        limit: 10000,
    });

    setFormData({
        code: generateNextMedicineCode(allMedicines),
    });

    setShowForm(true);
}}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition flex items-center gap-2"
          >
            <Plus size={20} /> Add Medicine
          </button>
        </div>
      </div>

      {/* ====== Search, Filter & Sort ====== */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={20} />
          <input
            type="text"
            placeholder="Search by name, code, or brand..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Categories</option>
          {categories.map((cat, index) => (
            <option key={`${cat}-${index}`} value={cat}>
              {cat}
            </option>
          ))}
 </select>
      </div>

      {/* ====== Category Manager Modal ====== */}
      {showCategoryManager && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
    <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-foreground">Manage Categories</h2>
        <button
          onClick={() => {
            setShowCategoryManager(false);
            setNewCategory('');
            setCategoryError('');
          }}
          className="text-muted-foreground hover:text-foreground transition"
        >
          <X size={20} />
        </button>
      </div>

      {/* Add new category */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-foreground mb-1">Add New Category</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. Vitamins"
            value={newCategory}
            onChange={(e) => {
              setNewCategory(e.target.value);
              setCategoryError('');
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
            className="flex-1 px-3 py-2 bg-background border border-border rounded text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleAddCategory}
            className="bg-primary text-primary-foreground px-3 py-2 rounded hover:opacity-90 transition text-sm"
          >
            Add
          </button>
        </div>
        {categoryError && (
          <p className="text-destructive text-xs mt-1">{categoryError}</p>
        )}
      </div>

      {/* Category list */}
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No categories yet</p>
        ) : (
          categories.map((cat) => (
            <div key={cat} className="flex justify-between items-center px-3 py-2 bg-background border border-border rounded">
              <span className="text-sm text-foreground">{cat}</span>
              <button
                onClick={() => handleDeleteCategory(cat)}
                className="text-destructive hover:opacity-70 transition"
                title="Delete category"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  </div>
)}

      {/* ====== Stock Arrival Form ====== */}
{showStockArrival && (
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-foreground">📦 Stock Arrival</h2>
            <button
              onClick={() => { setShowStockArrival(false); setStockSearch(''); }}
              className="text-muted-foreground hover:text-foreground transition"
            >
              <X size={24} />
            </button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 text-muted-foreground" size={20} />
            <input
              type="text"
              placeholder="Search medicine by name or code..."
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
            {medicines
              .filter((m) =>
                !stockSearch ||
                m.brand_name.toLowerCase().includes(stockSearch.toLowerCase()) ||
                m.generic_name.toLowerCase().includes(stockSearch.toLowerCase()) ||
                m.code.toLowerCase().includes(stockSearch.toLowerCase())
              )
              .map((med) => (
                <div key={med.id} className="border border-border rounded-lg p-3 bg-background">
                  <p className="text-sm font-semibold text-foreground truncate">{med.brand_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{med.generic_name} • {med.code}</p>
                  <p className="text-xs text-muted-foreground">{med.category || '—'}</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Current Stock: <span className="font-semibold text-foreground">{med.quantity_on_hand}</span>
                  </p>
                  <label className="block text-xs font-medium text-primary mb-1">Qty Added</label>
                  <input
                    type="number"
                    min="1"
                    value={restockQuantities[med.id] || ''}
                    onChange={(e) =>
                      setRestockQuantities((prev) => ({ ...prev, [med.id]: parseInt(e.target.value) || 0 }))
                    }
                    className="w-full px-2 py-1.5 mb-2 bg-card border-2 border-primary rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={() => handleRestock(med)}
                    disabled={restockingId === med.id}
                    className="w-full bg-primary text-primary-foreground py-1.5 rounded text-xs font-medium hover:opacity-90 transition disabled:opacity-50"
                  >
                    {restockingId === med.id ? 'Adding...' : 'Add Stock'}
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ====== Add/Edit Form ====== */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-foreground">
              {editingId ? '✏️ Edit Medicine' : '➕ Add New Medicine'}
            </h2>
            <button
              onClick={() => {
                setShowForm(false);
                setFormData({});
                setEditingId(null);
              }}
              className="text-muted-foreground hover:text-foreground transition"
            >
              <X size={24} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Code */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Batch/Lot No. *</label>
<input
  type="text"
  value={formData.code || ''}
  readOnly
  className="w-full px-3 py-2 bg-muted border border-border rounded text-foreground cursor-not-allowed"
/>
            </div>

            {/* Generic Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Generic Name *</label>
              <input
                type="text"
                placeholder="e.g. Paracetamol"
                value={formData.generic_name || ''}
                onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Brand Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Brand Name *</label>
              <input
                type="text"
                placeholder="e.g. Biogesic"
                value={formData.brand_name || ''}
                onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

{/* Category */}
<div>
  <div className="flex items-center justify-between mb-1">
    <label className="block text-sm font-medium text-foreground">Category</label>
    <button
      type="button"
      onClick={() => setShowCategoryManager(true)}
      className="text-xs text-primary hover:underline"
    >
      Manage
    </button>
  </div>
  <select
    value={formData.category || ''}
    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
    className="w-full px-3 py-2 bg-background border border-border rounded text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
  >
    <option value="">Select category</option>
    {categories.map((cat) => (
      <option key={cat} value={cat}>{cat}</option>
    ))}
  </select>
</div>

{/* Unit Price */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Unit Price (₱) *</label>
              <input
                type="number"
                placeholder="e.g. 5.50"
                step="0.01"
                value={formData.unit_price || ''}
                onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 bg-background border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

           {/* Purchase Price (Cost) */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Purchase Price (₱) *</label>
              <input
                type="number"
                placeholder="e.g. 4.20"
                step="0.01"
                value={formData.cost_price ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cost_price: e.target.value === '' ? null : parseFloat(e.target.value),
                  })
                }
                className="w-full px-3 py-2 bg-background border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Quantity *</label>
              <input
                type="number"
                placeholder="e.g. 100"
                value={formData.quantity_on_hand || ''}
                onChange={(e) => setFormData({ ...formData, quantity_on_hand: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-background border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Reorder Level */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Reorder Level</label>
              <input
                type="number"
                placeholder="e.g. 10"
                value={formData.reorder_level || ''}
                onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-background border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Expiry Date *</label>
              <input
                type="date"
                value={formData.expiry_date || ''}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Supplier */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Supplier</label>
              <input
                type="text"
                placeholder="e.g. PharmaCorp"
                value={formData.supplier || ''}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {editingId && (
            <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-muted-foreground">Editing: <span className="font-medium text-foreground">{formData.brand_name}</span></p>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:opacity-90 transition"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setFormData({});
                setEditingId(null);
              }}
              className="bg-muted text-muted-foreground px-6 py-2 rounded-lg hover:opacity-90 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ====== Medicines Table ====== */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-background">
                    <th
                      onClick={() => { setSortBy(sortBy === 'code_asc' ? 'code_desc' : 'code_asc'); setPage(1); }}
                      className="px-4 py-3 text-left text-sm font-semibold text-foreground cursor-pointer hover:text-primary transition select-none whitespace-nowrap"
                    >
                      Batch/Lot No. {sortBy === 'code_asc' ? '↑' : sortBy === 'code_desc' ? '↓' : ''}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Price</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Stock</th>
                    <th
                      onClick={() => { setSortBy(sortBy === 'expiry_asc' ? 'expiry_desc' : 'expiry_asc'); setPage(1); }}
                      className="px-4 py-3 text-left text-sm font-semibold text-foreground cursor-pointer hover:text-primary transition select-none whitespace-nowrap"
                    >
                      Expiry {sortBy === 'expiry_asc' ? '↑' : sortBy === 'expiry_desc' ? '↓' : ''}
                    </th>
                    <th onClick={() => {
                          const newSort = sortBy === 'status_asc' ? 'status_desc' : 'status_asc';
                          setSortBy(newSort);
                          setPage(1);
                        }}
                        className="px-4 py-3 text-left text-sm font-semibold text-foreground cursor-pointer hover:text-primary transition select-none whitespace-nowrap"
                      >
                        Status {sortBy === 'status_asc' && '↑'}
                        {sortBy === 'status_desc' && '↓'}
                      </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.map((med) => (
                    <tr key={med.id} className="border-b border-border hover:bg-background transition">
                      <td className="px-4 py-3 text-sm text-foreground font-mono">{med.code}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-foreground">{med.brand_name}</div>
                        <div className="text-xs text-muted-foreground">{med.generic_name}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{med.category || '—'}</td>
                      <td className="px-4 py-3 text-sm text-foreground">₱{med.unit_price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={isLowStock(med) ? 'text-accent font-bold' : 'text-foreground'}>
                          {med.quantity_on_hand}
                        </span>
                        {isLowStock(med) && (
                          <span className="ml-1 text-xs text-accent">⚠️</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {med.expiry_date 
                          ? new Date(med.expiry_date).toLocaleDateString('en-PH', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })
                          : <span className="text-muted-foreground">—</span>
                        }
                      </td>
                     <td className="px-4 py-3 text-sm">
  {isExpired(med) ? (
    <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
      Expired
    </span>
  ) : isLowStock(med) ? (
    <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
      Low Stock
    </span>
  ) : (
    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
      Active
    </span>
  )}
</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(med)}
                            className="text-primary hover:opacity-70 transition p-1"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(med.id, med.brand_name)}
                            className="text-destructive hover:opacity-70 transition p-1"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

              {/* Pagination */}
<div className="px-4 py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
  {/* Left side - Showing info */}
  <span className="text-sm text-muted-foreground">
    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
  </span>

  {/* Right side - Pagination controls */}
  <div className="flex items-center gap-3 flex-wrap justify-center">
    {/* Page Size Selector */}
    <div className="flex items-center gap-2">
      <label className="text-sm text-muted-foreground">Show:</label>
      <select
        value={limit}
        onChange={(e) => {
          setLimit(Number(e.target.value));
          setPage(1);
        }}
        className="px-2 py-1 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="10">10</option>
        <option value="25">25</option>
        <option value="50">50</option>
        <option value="100">100</option>
      </select>
    </div>

    {/* Page Numbers */}
    <div className="flex items-center gap-1">
      {/* Previous Button */}
      <button
        onClick={() => setPage(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-3 py-1 bg-card border border-border rounded text-foreground disabled:opacity-50 hover:bg-background transition text-sm"
      >
        Prev
      </button>

      {/* First Page */}
      {page > 3 && (
        <>
          <button
            onClick={() => setPage(1)}
            className="px-3 py-1 bg-card border border-border rounded text-foreground hover:bg-background transition text-sm"
          >
            1
          </button>
          {page > 4 && <span className="text-muted-foreground text-sm">...</span>}
        </>
      )}

      {/* Page Numbers */}
      {Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1)
        .filter(p => p >= page - 2 && p <= page + 2)
        .map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            className={`px-3 py-1 rounded text-sm transition ${
              p === page
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-foreground hover:bg-background'
            }`}
          >
            {p}
          </button>
        ))}

      {/* Last Page */}
      {page < Math.ceil(total / limit) - 2 && (
        <>
          {page < Math.ceil(total / limit) - 3 && <span className="text-muted-foreground text-sm">...</span>}
          <button
            onClick={() => setPage(Math.ceil(total / limit))}
            className="px-3 py-1 bg-card border border-border rounded text-foreground hover:bg-background transition text-sm"
          >
            {Math.ceil(total / limit)}
          </button>
        </>
      )}

      {/* Next Button */}
      <button
        onClick={() => setPage(Math.min(Math.ceil(total / limit), page + 1))}
        disabled={page >= Math.ceil(total / limit)}
        className="px-3 py-1 bg-card border border-border rounded text-foreground disabled:opacity-50 hover:bg-background transition text-sm"
      >
        Next
      </button>
    </div>
  </div>
</div>
          </>
        )}
      </div>
    </div>
  );
}
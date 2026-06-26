'use client';

import { useEffect, useState } from 'react';
import { fetchMedicines, fetchCategories, createMedicine, updateMedicine, recordPurchase } from '@/lib/api';
import { Medicine } from '@/lib/types';
import { Search, Plus, Edit2, Trash2, AlertTriangle, Calendar, Package, X } from 'lucide-react';
import { toast } from 'sonner';

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
const [page, setPage] = useState(1);
const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
const [sortBy, setSortBy] = useState<'expiry_asc' | 'expiry_desc' | 'name_asc' | 'name_desc' | 'status_asc' | 'status_desc'>('expiry_asc');
  
  // Add/Edit Form states
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Medicine>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Stock Arrival states
  const [showStockArrival, setShowStockArrival] = useState(false);
  const [stockArrivalData, setStockArrivalData] = useState({
    medicine_id: '',
    quantity_purchased: 0,
    unit_cost: 0,
    supplier_name: '',
  });

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

  // ====== Medicine CRUD ======
  const handleSave = async () => {
    try {
      if (editingId) {
        await updateMedicine(editingId, formData);
        toast.success('Medicine updated successfully');
      } else {
        await createMedicine(formData as Omit<Medicine, 'id' | 'created_at' | 'updated_at'>);
        toast.success('Medicine added successfully');
      }
      setShowForm(false);
      setFormData({});
      setEditingId(null);
      loadMedicines();
    } catch (error) {
      console.error('Error saving medicine:', error);
      toast.error('Error saving medicine');
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
        toast.success(`"${name}" deleted successfully`);
        loadMedicines();
      } catch (error) {
        console.error('Error deleting medicine:', error);
        toast.error('Error deleting medicine');
      }
    }
  };

  // ====== Stock Arrival ======
  const handleStockArrival = async () => {
    if (!stockArrivalData.medicine_id || stockArrivalData.quantity_purchased <= 0 || stockArrivalData.unit_cost <= 0) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      await recordPurchase({
        medicine_id: stockArrivalData.medicine_id,
        quantity_purchased: stockArrivalData.quantity_purchased,
        unit_cost: stockArrivalData.unit_cost,
        total_cost: stockArrivalData.quantity_purchased * stockArrivalData.unit_cost,
        supplier_name: stockArrivalData.supplier_name || 'Unknown',
        purchase_date: new Date().toISOString(),
        received_date: new Date().toISOString(),
      });

      toast.success(`Added ${stockArrivalData.quantity_purchased} units to stock`);
      setShowStockArrival(false);
      setStockArrivalData({
        medicine_id: '',
        quantity_purchased: 0,
        unit_cost: 0,
        supplier_name: '',
      });
      loadMedicines();
    } catch (error) {
      console.error('Error recording purchase:', error);
      toast.error('Error recording stock arrival');
    }
  };

  const isLowStock = (med: Medicine) => med.quantity_on_hand <= 10;
  const isExpired = (med: Medicine) => med.expiry_date && new Date(med.expiry_date) < new Date();

  const selectedMedicine = medicines.find(m => m.id === stockArrivalData.medicine_id);

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
            onClick={() => {
              setShowForm(!showForm);
              setShowStockArrival(false);
              setFormData({});
              setEditingId(null);
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

      {/* ====== Stock Arrival Form ====== */}
      {showStockArrival && (
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-foreground">📦 Stock Arrival</h2>
            <button
              onClick={() => setShowStockArrival(false)}
              className="text-muted-foreground hover:text-foreground transition"
            >
              <X size={24} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-foreground mb-2">Medicine</label>
              <select
                value={stockArrivalData.medicine_id}
                onChange={(e) => setStockArrivalData({ ...stockArrivalData, medicine_id: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Medicine</option>
                {medicines.map((med) => (
                  <option key={med.id} value={med.id}>
                    {med.brand_name} ({med.code}) - Current: {med.quantity_on_hand}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-foreground mb-2">Quantity Added</label>
              <input
                type="number"
                min="1"
                value={stockArrivalData.quantity_purchased || ''}
                onChange={(e) =>
                  setStockArrivalData({ ...stockArrivalData, quantity_purchased: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-background border border-border rounded text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm text-foreground mb-2">Unit Cost (₱)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={stockArrivalData.unit_cost || ''}
                onChange={(e) => setStockArrivalData({ ...stockArrivalData, unit_cost: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-background border border-border rounded text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm text-foreground mb-2">Supplier</label>
              <input
                type="text"
                placeholder="Supplier Name"
                value={stockArrivalData.supplier_name}
                onChange={(e) => setStockArrivalData({ ...stockArrivalData, supplier_name: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {selectedMedicine && stockArrivalData.quantity_purchased > 0 && stockArrivalData.unit_cost > 0 && (
            <div className="mt-4 bg-primary/10 border border-primary/20 rounded p-3">
              <p className="text-sm text-muted-foreground">Total Cost</p>
              <p className="text-2xl font-bold text-primary">
                ₱{(stockArrivalData.quantity_purchased * stockArrivalData.unit_cost).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                New stock will be: {selectedMedicine.quantity_on_hand + stockArrivalData.quantity_purchased}
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleStockArrival}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:opacity-90 transition"
            >
              Add to Stock
            </button>
            <button
              onClick={() => {
                setShowStockArrival(false);
                setStockArrivalData({
                  medicine_id: '',
                  quantity_purchased: 0,
                  unit_cost: 0,
                  supplier_name: '',
                });
              }}
              className="bg-muted text-muted-foreground px-6 py-2 rounded-lg hover:opacity-90 transition"
            >
              Cancel
            </button>
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
              <label className="block text-sm font-medium text-foreground mb-1">Code *</label>
              <input
                type="text"
                placeholder="e.g. MED001"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
              <label className="block text-sm font-medium text-foreground mb-1">Category</label>
              <input
                type="text"
                placeholder="e.g. Antibiotics"
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
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
              <label className="block text-sm font-medium text-foreground mb-1">Expiry Date</label>
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
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Code</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Price</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Stock</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Expiry</th>
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
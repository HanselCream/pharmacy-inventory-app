'use client';

import { useEffect, useState } from 'react';
import { fetchMedicines, fetchCategories, createMedicine, updateMedicine } from '@/lib/api';
import { Medicine } from '@/lib/types';
import { Search, Plus, Edit2, Trash2, AlertTriangle, Calendar } from 'lucide-react';

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Medicine>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadMedicines();
    loadCategories();
  }, [search, category, page]);

  const loadMedicines = async () => {
    try {
      setLoading(true);
      const { medicines: data, total: count } = await fetchMedicines({
        search,
        category,
        page,
        limit: 10,
      });
      setMedicines(data);
      setTotal(count);
    } catch (error) {
      console.error('Error loading medicines:', error);
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

  const handleSave = async () => {
    try {
      if (editingId) {
        await updateMedicine(editingId, formData);
      } else {
        await createMedicine(formData as Omit<Medicine, 'id' | 'created_at' | 'updated_at'>);
      }
      setShowForm(false);
      setFormData({});
      setEditingId(null);
      loadMedicines();
    } catch (error) {
      console.error('Error saving medicine:', error);
    }
  };

  const handleEdit = (medicine: Medicine) => {
    setFormData(medicine);
    setEditingId(medicine.id);
    setShowForm(true);
  };

  const isLowStock = (med: Medicine) => med.quantity_on_hand <= med.reorder_level;
  const isExpired = (med: Medicine) => med.expiry_date && new Date(med.expiry_date) < new Date();

  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Medicines Inventory</h1>
          <p className="text-muted-foreground">Manage your pharmacy stock</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setFormData({});
            setEditingId(null);
          }}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition flex items-center gap-2"
        >
          <Plus size={20} /> Add Medicine
        </button>
      </div>

      {/* Search & Filter */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
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

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4">
            {editingId ? 'Edit Medicine' : 'Add New Medicine'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Code"
              value={formData.code || ''}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="px-3 py-2 bg-background border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Generic Name"
              value={formData.generic_name || ''}
              onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
              className="px-3 py-2 bg-background border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Brand Name"
              value={formData.brand_name || ''}
              onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
              className="px-3 py-2 bg-background border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Category"
              value={formData.category || ''}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="px-3 py-2 bg-background border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="number"
              placeholder="Unit Price"
              step="0.01"
              value={formData.unit_price || ''}
              onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) })}
              className="px-3 py-2 bg-background border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="number"
              placeholder="Quantity"
              value={formData.quantity_on_hand || ''}
              onChange={(e) => setFormData({ ...formData, quantity_on_hand: parseInt(e.target.value) })}
              className="px-3 py-2 bg-background border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="number"
              placeholder="Reorder Level"
              value={formData.reorder_level || ''}
              onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) })}
              className="px-3 py-2 bg-background border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="date"
              value={formData.expiry_date || ''}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              className="px-3 py-2 bg-background border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Supplier"
              value={formData.supplier || ''}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              className="px-3 py-2 bg-background border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
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

      {/* Medicines Table */}
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
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Code</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Category</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Price</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Stock</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.map((med) => (
                    <tr key={med.id} className="border-b border-border hover:bg-background transition">
                      <td className="px-6 py-4 text-sm text-foreground">{med.code}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-foreground">{med.brand_name}</div>
                        <div className="text-xs text-muted-foreground">{med.generic_name}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{med.category}</td>
                      <td className="px-6 py-4 text-sm text-foreground">₱{med.unit_price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{med.quantity_on_hand}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2 flex-wrap">
{isLowStock(med) && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
                              <AlertTriangle size={14} /> Low Stock
                            </span>
                          )}
                          {isExpired(med) && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                              <Calendar size={14} /> Expired
                            </span>
                          )}
                          {!isLowStock(med) && !isExpired(med) && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}>
                              Active
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(med)}
                            className="text-primary hover:opacity-70 transition"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button className="text-destructive hover:opacity-70 transition">
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
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 bg-card border border-border rounded text-foreground disabled:opacity-50 hover:bg-background transition"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page * 10 >= total}
                  className="px-3 py-1 bg-card border border-border rounded text-foreground disabled:opacity-50 hover:bg-background transition"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

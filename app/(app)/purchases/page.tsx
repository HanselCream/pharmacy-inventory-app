'use client';

import { useEffect, useState } from 'react';
import { fetchMedicines, recordPurchase } from '@/lib/api';
import { Medicine, Purchase } from '@/lib/types';
import { Plus, Search } from 'lucide-react';

export default function PurchasesPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    medicine_id: '',
    quantity_purchased: 0,
    unit_cost: 0,
    supplier_name: '',
  });

  useEffect(() => {
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    try {
      setLoading(true);
      const { medicines: data } = await fetchMedicines({ limit: 100, search });
      setMedicines(data);
    } catch (error) {
      console.error('Error loading medicines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPurchase = async () => {
    if (!formData.medicine_id || formData.quantity_purchased <= 0 || formData.unit_cost <= 0) {
      alert('Please fill all fields');
      return;
    }

    try {
      await recordPurchase({
        medicine_id: formData.medicine_id,
        quantity_purchased: formData.quantity_purchased,
        unit_cost: formData.unit_cost,
        total_cost: formData.quantity_purchased * formData.unit_cost,
        supplier_name: formData.supplier_name || 'Unknown',
        purchase_date: new Date().toISOString(),
        received_date: new Date().toISOString(),
      });

      setShowForm(false);
      setFormData({
        medicine_id: '',
        quantity_purchased: 0,
        unit_cost: 0,
        supplier_name: '',
      });
      loadMedicines();
      alert('Purchase recorded successfully!');
    } catch (error) {
      console.error('Error recording purchase:', error);
      alert('Error recording purchase');
    }
  };

  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Purchase Orders</h1>
          <p className="text-muted-foreground">Record new medicine purchases</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition flex items-center gap-2"
        >
          <Plus size={20} /> New Purchase
        </button>
      </div>

      {/* Add Purchase Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Record New Purchase</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-foreground mb-2">Medicine</label>
              <select
                value={formData.medicine_id}
                onChange={(e) => setFormData({ ...formData, medicine_id: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Medicine</option>
                {medicines.map((med) => (
                  <option key={med.id} value={med.id}>
                    {med.brand_name} ({med.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-foreground mb-2">Quantity</label>
              <input
                type="number"
                value={formData.quantity_purchased}
                onChange={(e) =>
                  setFormData({ ...formData, quantity_purchased: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-background border border-border rounded text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm text-foreground mb-2">Unit Cost</label>
              <input
                type="number"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-background border border-border rounded text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm text-foreground mb-2">Supplier</label>
              <input
                type="text"
                placeholder="Supplier Name"
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {formData.quantity_purchased > 0 && formData.unit_cost > 0 && (
            <div className="mt-4 bg-primary/10 border border-primary/20 rounded p-3">
              <p className="text-sm text-muted-foreground">Total Cost</p>
              <p className="text-2xl font-bold text-primary">
                ₱{(formData.quantity_purchased * formData.unit_cost).toFixed(2)}
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleAddPurchase}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:opacity-90 transition"
            >
              Record Purchase
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setFormData({
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

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={20} />
          <input
            type="text"
            placeholder="Search medicines..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              loadMedicines();
            }}
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Medicines List for Quick Purchase */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : medicines.length > 0 ? (
          medicines.map((med) => (
            <div key={med.id} className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-1">{med.brand_name}</h3>
              <p className="text-xs text-muted-foreground mb-3">{med.generic_name}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Stock:</span>
                  <span className="font-medium text-foreground">{med.quantity_on_hand}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unit Price:</span>
                  <span className="font-medium text-foreground">₱{med.unit_price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Supplier:</span>
                  <span className="font-medium text-foreground">{med.supplier || 'N/A'}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No medicines found
          </div>
        )}
      </div>
    </div>
  );
}

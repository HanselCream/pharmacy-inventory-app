'use client';

import { useEffect, useState } from 'react';
import { fetchMedicines } from '@/lib/api';
import { Medicine } from '@/lib/types';
import { AlertCircle, Package, Calendar, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

export default function Dashboard() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllLowStock, setShowAllLowStock] = useState(false);
  const [showAllExpiring, setShowAllExpiring] = useState(false);

  useEffect(() => {
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    try {
      setLoading(true);
      const { medicines: data } = await fetchMedicines({ limit: 1000 });
      setMedicines(data);
    } catch (error) {
      console.error('Error loading medicines:', error);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const threeMonthsLater = new Date();
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

  const expiringSoon = medicines
    .filter(med => {
      if (!med.expiry_date) return false;
      const expiryDate = new Date(med.expiry_date);
      return expiryDate >= now && expiryDate <= threeMonthsLater;
    })
    .sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime());

  const lowStockItems = medicines
    .filter(med => med.quantity_on_hand <= 10)
    .sort((a, b) => a.quantity_on_hand - b.quantity_on_hand);

  const displayedLowStock = showAllLowStock ? lowStockItems : lowStockItems.slice(0, 5);
  const displayedExpiring = showAllExpiring ? expiringSoon : expiringSoon.slice(0, 5);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Quick view of critical inventory alerts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Low Stock Card */}
        <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">⚠️ Low Stock Items</p>
              <p className="text-4xl font-bold text-foreground">{lowStockItems.length}</p>
              <p className="text-sm text-muted-foreground mt-1">10 or fewer units left</p>
            </div>
            <AlertTriangle className="w-12 h-12 text-accent opacity-20" />
          </div>
          
          {lowStockItems.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {displayedLowStock.map((med) => (
                <div key={med.id} className="flex justify-between items-center p-3 bg-background rounded border border-border">
                  <div>
                    <span className="text-sm font-medium text-foreground">{med.brand_name}</span>
                    <span className="text-xs text-muted-foreground ml-2">({med.code})</span>
                  </div>
                  <span className="text-sm font-bold text-accent">{med.quantity_on_hand} left</span>
                </div>
              ))}
              {lowStockItems.length > 5 && (
                <button
                  onClick={() => setShowAllLowStock(!showAllLowStock)}
                  className="w-full text-center text-sm text-primary hover:underline py-2 flex items-center justify-center gap-1"
                >
                  {showAllLowStock ? (
                    <>Show Less <ChevronUp size={16} /></>
                  ) : (
                    <>Show All {lowStockItems.length} items <ChevronDown size={16} /></>
                  )}
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">✅ All items are well stocked</p>
          )}
        </div>

        {/* Expiring Soon Card */}
        <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">📅 Expiring Soon</p>
              <p className="text-4xl font-bold text-foreground">{expiringSoon.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Within 3 months</p>
            </div>
            <Calendar className="w-12 h-12 text-secondary opacity-20" />
          </div>
          
          {expiringSoon.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {displayedExpiring.map((med) => (
                <div key={med.id} className="flex justify-between items-center p-3 bg-background rounded border border-border">
                  <div>
                    <span className="text-sm font-medium text-foreground">{med.brand_name}</span>
                    <span className="text-xs text-muted-foreground ml-2">({med.code})</span>
                  </div>
                  <span className="text-sm font-bold text-secondary">
                    {med.expiry_date 
                      ? new Date(med.expiry_date).toLocaleDateString('en-PH', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })
                      : 'No expiry'
                    }
                  </span>
                </div>
              ))}
              {expiringSoon.length > 5 && (
                <button
                  onClick={() => setShowAllExpiring(!showAllExpiring)}
                  className="w-full text-center text-sm text-primary hover:underline py-2 flex items-center justify-center gap-1"
                >
                  {showAllExpiring ? (
                    <>Show Less <ChevronUp size={16} /></>
                  ) : (
                    <>Show All {expiringSoon.length} items <ChevronDown size={16} /></>
                  )}
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">✅ No items expiring soon</p>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Medicines</p>
          <p className="text-2xl font-bold text-foreground">{medicines.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Categories</p>
          <p className="text-2xl font-bold text-foreground">
            {new Set(medicines.map(m => m.category)).size}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Average Stock</p>
          <p className="text-2xl font-bold text-foreground">
            {medicines.length > 0 
              ? Math.round(medicines.reduce((sum, m) => sum + m.quantity_on_hand, 0) / medicines.length)
              : 0}
          </p>
        </div>
      </div>
    </div>
  );
}
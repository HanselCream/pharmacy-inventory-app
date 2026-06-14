'use client';

import { useEffect, useState } from 'react';
import { fetchSales } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { Sale } from '@/lib/types';
import { Search, Calendar } from 'lucide-react';

interface SaleWithMedicineName extends Sale {
  medicineName?: string;
}

export default function SalesPage() {
  const [sales, setSales] = useState<SaleWithMedicineName[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      const filters: any = {};

      if (startDate) {
        filters.startDate = new Date(startDate);
      }
      if (endDate) {
        filters.endDate = new Date(endDate);
      }

      const data = await fetchSales(filters);
      
      // Fetch medicine names for each sale
      const supabase = createClient();
      const medicineIds = [...new Set(data.map(s => s.medicine_id))];
      
      const { data: medicines } = await supabase
        .from('medicines')
        .select('id, brand_name, generic_name')
        .in('id', medicineIds);
      
      const medicineMap = new Map(medicines?.map(m => [m.id, `${m.brand_name} (${m.generic_name})`]) || []);
      
      const enrichedSales = data.map(sale => ({
        ...sale,
        medicineName: medicineMap.get(sale.medicine_id) || 'Unknown Medicine'
      }));
      
      setSales(enrichedSales);
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    loadSales();
  };

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalTransactions = sales.length;

  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Sales Records</h1>
        <p className="text-muted-foreground">View all sales transactions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-foreground">₱{totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-1">Total Transactions</p>
          <p className="text-3xl font-bold text-foreground">{totalTransactions}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-1">Average Transaction</p>
          <p className="text-3xl font-bold text-foreground">
            ₱{totalTransactions > 0 ? (totalRevenue / totalTransactions).toFixed(2) : '0.00'}
          </p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Calendar size={20} /> Filter Sales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-foreground mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-foreground mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleFilter}
              className="w-full bg-primary text-primary-foreground py-2 rounded-lg hover:opacity-90 transition"
            >
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Sales Table */}
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
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Date & Time</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Medicine</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Quantity</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Unit Price</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.length > 0 ? (
                    sales.map((sale) => (
                      <tr key={sale.id} className="border-b border-border hover:bg-background transition">
                        <td className="px-6 py-4 text-sm text-foreground">
                          {new Date(sale.sale_date).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="font-medium text-foreground">{sale.medicineName || 'Unknown Medicine'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">{sale.quantity_sold}</td>
                        <td className="px-6 py-4 text-sm text-foreground">₱{sale.unit_price.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-foreground">
                          ₱{sale.total_amount.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                        No sales found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

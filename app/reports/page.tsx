'use client';

import { useEffect, useState } from 'react';
import { fetchMedicines, fetchSales } from '@/lib/api';
import { Medicine, Sale } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, TrendingUp } from 'lucide-react';

export default function ReportsPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const { medicines: medsData } = await fetchMedicines({ limit: 100 });
      const salesData = await fetchSales();

      setMedicines(medsData);
      setSales(salesData);

      // Prepare top-selling medicines chart
      const medicinesSalesMap: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
      medsData.forEach((med) => {
        medicinesSalesMap[med.id] = { name: med.brand_name, quantity: 0, revenue: 0 };
      });

      salesData.forEach((sale) => {
        if (medicinesSalesMap[sale.medicine_id]) {
          medicinesSalesMap[sale.medicine_id].quantity += sale.quantity_sold;
          medicinesSalesMap[sale.medicine_id].revenue += sale.total_amount;
        }
      });

      const chart = Object.values(medicinesSalesMap)
        .filter((m) => m.quantity > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      setChartData(chart);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const lowStockMedicines = medicines.filter((m) => m.quantity_on_hand <= m.reorder_level);
  const expiredMedicines = medicines.filter((m) => m.expiry_date && new Date(m.expiry_date) < new Date());
  const totalRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalInventoryValue = medicines.reduce((sum, m) => sum + m.quantity_on_hand * m.unit_price, 0);

  const handleExport = () => {
    const csv = [
      ['PharmaTrack Inventory Report', new Date().toLocaleDateString()],
      [],
      ['SUMMARY STATISTICS'],
      ['Total Medicines', medicines.length],
      ['Total Revenue', totalRevenue.toFixed(2)],
      ['Total Inventory Value', totalInventoryValue.toFixed(2)],
      ['Low Stock Items', lowStockMedicines.length],
      ['Expired Items', expiredMedicines.length],
      [],
      ['TOP SELLING MEDICINES'],
      ['Medicine Name', 'Quantity Sold', 'Revenue'],
      ...chartData.map((item) => [item.name, item.quantity, item.revenue.toFixed(2)]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmatrack_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Reports</h1>
          <p className="text-muted-foreground">Comprehensive pharmacy analytics and insights</p>
        </div>
        <button
          onClick={handleExport}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition flex items-center gap-2"
        >
          <Download size={20} /> Export CSV
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-1">Total Medicines</p>
          <p className="text-3xl font-bold text-foreground">{medicines.length}</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-foreground">₱{totalRevenue.toFixed(2)}</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-1">Inventory Value</p>
          <p className="text-3xl font-bold text-foreground">₱{totalInventoryValue.toFixed(2)}</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-1">Sales Transactions</p>
          <p className="text-3xl font-bold text-foreground">{sales.length}</p>
        </div>
      </div>

      {/* Top Selling Medicines Chart */}
      {chartData.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp size={20} /> Top 10 Selling Medicines
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: `1px solid var(--border)`,
                  borderRadius: '0.625rem',
                }}
              />
              <Legend />
              <Bar dataKey="quantity" fill="var(--primary)" name="Quantity Sold" />
              <Bar dataKey="revenue" fill="var(--accent)" name="Revenue (₱)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Items */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Low Stock Items</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : lowStockMedicines.length > 0 ? (
              lowStockMedicines.slice(0, 10).map((med) => (
                <div key={med.id} className="bg-background border border-border rounded p-3">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium text-foreground">{med.brand_name}</p>
                    <span className="text-sm font-semibold text-accent">
                      {med.quantity_on_hand} / {med.reorder_level}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{med.code}</p>
                </div>
              ))
            ) : (
              <p className="text-center py-4 text-muted-foreground">All items are well stocked</p>
            )}
          </div>
        </div>

        {/* Expired Items */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Expired Items</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : expiredMedicines.length > 0 ? (
              expiredMedicines.slice(0, 10).map((med) => (
                <div key={med.id} className="bg-background border border-destructive/30 rounded p-3">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium text-foreground">{med.brand_name}</p>
                    <span className="text-sm font-semibold text-destructive">
                      {new Date(med.expiry_date!).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{med.code}</p>
                </div>
              ))
            ) : (
              <p className="text-center py-4 text-muted-foreground">No expired items</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

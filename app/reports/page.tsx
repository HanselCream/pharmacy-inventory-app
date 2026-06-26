'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchMedicines, fetchSales } from '@/lib/api';
import { Medicine, Sale } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, Package, AlertCircle, Wallet } from 'lucide-react';

export default function ReportsPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'online'>('all');
  
  // Stats for payment breakdown
  const [cashRevenue, setCashRevenue] = useState(0);
  const [qrRevenue, setQrRevenue] = useState(0);
  const [cashTransactions, setCashTransactions] = useState(0);
  const [qrTransactions, setQrTransactions] = useState(0);

  const loadReportData = useCallback(async () => {
    try {
      setLoading(true);
      const { medicines: medsData } = await fetchMedicines({ limit: 1000 });
      const salesData = await fetchSales();

      setMedicines(medsData);
      setSales(salesData);

      // Calculate payment breakdown from ALL sales (before filtering)
      const allCashSales = salesData.filter(s => s.payment_method === 'cash' || !s.payment_method);
      const allQRSales = salesData.filter(s => s.payment_method === 'online');
      
      setCashRevenue(allCashSales.reduce((sum, s) => sum + s.total_amount, 0));
      setQrRevenue(allQRSales.reduce((sum, s) => sum + s.total_amount, 0));
      setCashTransactions(allCashSales.length);
      setQrTransactions(allQRSales.length);

      // Filter sales by time range
      let filteredSales = salesData;
      const now = new Date();
      
      if (timeRange === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filteredSales = filteredSales.filter(s => new Date(s.sale_date) >= weekAgo);
      } else if (timeRange === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filteredSales = filteredSales.filter(s => new Date(s.sale_date) >= monthAgo);
      }

      // Filter by payment method
      if (paymentFilter !== 'all') {
        filteredSales = filteredSales.filter(s => s.payment_method === paymentFilter);
      }

      // Top selling medicines
      const salesMap: { [key: string]: { name: string; quantity: number; revenue: number; profit: number } } = {};
      medsData.forEach((med) => {
        salesMap[med.id] = { name: med.brand_name, quantity: 0, revenue: 0, profit: 0 };
      });

      filteredSales.forEach((sale) => {
        if (salesMap[sale.medicine_id]) {
          salesMap[sale.medicine_id].quantity += sale.quantity_sold;
          salesMap[sale.medicine_id].revenue += sale.total_amount;
          salesMap[sale.medicine_id].profit += sale.total_amount * 0.3;
        }
      });

      const chart = Object.values(salesMap)
        .filter((m) => m.quantity > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      setChartData(chart);

      // Category breakdown - only include categories with sales
      const catMap: { [key: string]: number } = {};
      medsData.forEach((med) => {
        const cat = med.category || 'Uncategorized';
        const salesForMed = filteredSales.filter(s => s.medicine_id === med.id);
        const revenue = salesForMed.reduce((sum, s) => sum + s.total_amount, 0);
        if (revenue > 0) {
          catMap[cat] = (catMap[cat] || 0) + revenue;
        }
      });
      
      // Sort categories by revenue (largest first) and limit to top 6
      const sortedCategories = Object.entries(catMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6);
      
      setCategoryData(
        sortedCategories.map(([name, value]) => ({ name, value }))
      );

    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange, paymentFilter]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Calculate totals based on filtered sales
  const totalRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalProfit = totalRevenue * 0.3;
  const totalItemsSold = sales.reduce((sum, s) => sum + s.quantity_sold, 0);
  const avgTransaction = sales.length > 0 ? totalRevenue / sales.length : 0;

  // Get payment breakdown for the current filter
  const getPaymentBreakdown = () => {
    if (paymentFilter === 'all') {
      return {
        cash: cashRevenue,
        qr: qrRevenue,
        cashCount: cashTransactions,
        qrCount: qrTransactions,
        total: cashRevenue + qrRevenue
      };
    } else if (paymentFilter === 'cash') {
      return {
        cash: totalRevenue,
        qr: 0,
        cashCount: sales.length,
        qrCount: 0,
        total: totalRevenue
      };
    } else {
      return {
        cash: 0,
        qr: totalRevenue,
        cashCount: 0,
        qrCount: sales.length,
        total: totalRevenue
      };
    }
  };

  const breakdown = getPaymentBreakdown();
  const cashPercentage = breakdown.total > 0 ? (breakdown.cash / breakdown.total) * 100 : 0;
  const qrPercentage = breakdown.total > 0 ? (breakdown.qr / breakdown.total) * 100 : 0;

  const COLORS = ['#5B4FED', '#06B6D4', '#D97706', '#10B981', '#EC4899', '#8B5CF6', '#F59E0B', '#14B8A6', '#F472B6', '#6366F1'];
  const PAYMENT_COLORS = ['#10B981', '#06B6D4']; // Green for Cash, Blue for QR

  const handleExport = () => {
    const csv = [
      ['PharmaTrack Sales Report', new Date().toLocaleDateString()],
      [],
      ['SUMMARY STATISTICS'],
      ['Time Range', timeRange],
      ['Payment Filter', paymentFilter],
      ['Total Revenue', totalRevenue.toFixed(2)],
      ['Estimated Profit (30%)', totalProfit.toFixed(2)],
      ['Total Items Sold', totalItemsSold],
      ['Average Transaction', avgTransaction.toFixed(2)],
      ['Total Transactions', sales.length],
      [],
      ['PAYMENT BREAKDOWN'],
      ['Payment Type', 'Revenue', 'Transactions'],
      ['Cash', breakdown.cash.toFixed(2), breakdown.cashCount],
      ['QR', breakdown.qr.toFixed(2), breakdown.qrCount],
      ['Total', breakdown.total.toFixed(2), breakdown.cashCount + breakdown.qrCount],
      [],
      ['TOP SELLING MEDICINES'],
      ['Medicine Name', 'Quantity Sold', 'Revenue', 'Estimated Profit'],
      ...chartData.map((item) => [item.name, item.quantity, item.revenue.toFixed(2), item.profit.toFixed(2)]),
      [],
      ['CATEGORY BREAKDOWN'],
      ['Category', 'Revenue'],
      ...categoryData.map((item) => [item.name, item.value.toFixed(2)]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmatrack_sales_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Sales Report</h1>
          <p className="text-muted-foreground">Track pharmacy sales and profitability</p>
        </div>
        <button
          onClick={handleExport}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition flex items-center gap-2"
        >
          <Download size={20} /> Export CSV
        </button>
      </div>

      {/* Time Range Filter */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setTimeRange('week')}
          className={`px-4 py-2 rounded-lg transition ${
            timeRange === 'week' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-card border border-border text-foreground hover:bg-background'
          }`}
        >
          This Week
        </button>
        <button
          onClick={() => setTimeRange('month')}
          className={`px-4 py-2 rounded-lg transition ${
            timeRange === 'month' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-card border border-border text-foreground hover:bg-background'
          }`}
        >
          This Month
        </button>
        <button
          onClick={() => setTimeRange('all')}
          className={`px-4 py-2 rounded-lg transition ${
            timeRange === 'all' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-card border border-border text-foreground hover:bg-background'
          }`}
        >
          All Time
        </button>
      </div>

      {/* Payment Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={18} className="text-primary" />
            <p className="text-sm text-muted-foreground">Total Revenue</p>
          </div>
          <p className="text-2xl font-bold text-foreground">₱{breakdown.total.toFixed(2)}</p>
          <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-green-500 rounded-l-full"
              style={{ width: `${cashPercentage}%` }}
            />
            <div 
              className="h-full bg-blue-400 rounded-r-full"
              style={{ width: `${qrPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>💵 Cash: ₱{breakdown.cash.toFixed(2)}</span>
            <span>📱 QR: ₱{breakdown.qr.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Cash Transactions</p>
          <p className="text-2xl font-bold text-green-600">₱{breakdown.cash.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{breakdown.cashCount} transactions</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">QR Transactions</p>
          <p className="text-2xl font-bold text-blue-500">₱{breakdown.qr.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{breakdown.qrCount} transactions</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600">₱{totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Est. Profit</p>
          <p className="text-2xl font-bold text-primary">₱{totalProfit.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">~30% margin</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Items Sold</p>
          <p className="text-2xl font-bold text-foreground">{totalItemsSold}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Avg. Transaction</p>
          <p className="text-2xl font-bold text-foreground">₱{avgTransaction.toFixed(2)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Medicines Bar Chart */}
        {chartData.length > 0 ? (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp size={20} /> Top Selling Medicines
            </h2>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart 
                data={chartData}
                layout="horizontal"
                margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="var(--muted-foreground)" 
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  type="number" 
                  stroke="var(--muted-foreground)" 
                  tickFormatter={(value) => `₱${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.625rem',
                  }}
                  formatter={(value) => `₱${Number(value).toFixed(2)}`}
                />
                <Legend />
                <Bar dataKey="revenue" fill="var(--primary)" name="Revenue (₱)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" fill="var(--accent)" name="Est. Profit (₱)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-6 flex flex-col items-center justify-center h-[400px]">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No sales data available</p>
            <p className="text-sm text-muted-foreground">Start making sales to see reports</p>
          </div>
        )}

        {/* Revenue by Category Pie Chart */}
        {categoryData.length > 0 ? (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Package size={20} /> Revenue by Category
            </h2>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="45%"
                  labelLine={false}
                  label={false}
                  outerRadius={130}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                >
                  {categoryData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.625rem',
                  }}
                  formatter={(value) => `₱${Number(value).toFixed(2)}`}
                />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center"
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-6 flex flex-col items-center justify-center h-[400px]">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No category data available</p>
            <p className="text-sm text-muted-foreground">Sales data will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
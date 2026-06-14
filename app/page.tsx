'use client';

import { useEffect, useState } from 'react';
import { fetchDashboardStats, fetchSales, fetchMedicines } from '@/lib/api';
import { DashboardStats } from '@/lib/types';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertCircle, Package, TrendingUp, DollarSign } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const dashStats = await fetchDashboardStats();
        setStats(dashStats);

        const sales = await fetchSales();
        const medicines = await fetchMedicines({ limit: 100 });

        // Prepare sales chart data (last 7 days)
        const salesByDate: { [key: string]: number } = {};
        sales.forEach((sale) => {
          const date = new Date(sale.sale_date).toLocaleDateString();
          salesByDate[date] = (salesByDate[date] || 0) + sale.total_amount;
        });

        const chartDataArray = Object.entries(salesByDate)
          .slice(-7)
          .map(([date, amount]) => ({
            date,
            amount: parseFloat(amount.toFixed(2)),
          }));
        setChartData(chartDataArray);

        // Prepare category data
        const categoryTotals: { [key: string]: number } = {};
        medicines.medicines.forEach((med) => {
          categoryTotals[med.category] = (categoryTotals[med.category] || 0) + med.quantity_on_hand;
        });

        const categoryArray = Object.entries(categoryTotals).map(([name, value]) => ({
          name,
          value,
        }));
        setCategoryData(categoryArray);
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const COLORS = ['#5B4FED', '#06B6D4', '#D97706', '#10B981', '#EC4899', '#F59E0B', '#8B5CF6'];

  return (
    <div className="p-8 bg-background">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to PharmaTrack Inventory System</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Medicines</p>
              <p className="text-3xl font-bold text-foreground">{stats?.totalMedicines || 0}</p>
            </div>
            <Package className="w-10 h-10 text-primary opacity-20" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Low Stock Items</p>
              <p className="text-3xl font-bold text-foreground">{stats?.lowStockItems || 0}</p>
            </div>
            <AlertCircle className="w-10 h-10 text-accent opacity-20" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Inventory Value</p>
              <p className="text-3xl font-bold text-foreground">₱{(stats?.totalInventoryValue || 0).toFixed(2)}</p>
            </div>
            <DollarSign className="w-10 h-10 text-secondary opacity-20" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Today&apos;s Sales</p>
              <p className="text-3xl font-bold text-foreground">₱{(stats?.todaySalesAmount || 0).toFixed(2)}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-accent opacity-20" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Sales Trend (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--card)', 
                  border: `1px solid var(--border)`,
                  borderRadius: '0.625rem'
                }}
                formatter={(value) => `₱${parseFloat(value).toFixed(2)}`}
              />
              <Legend />
              <Line type="monotone" dataKey="amount" stroke="var(--primary)" strokeWidth={2} dot={{ fill: 'var(--primary)', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Inventory by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => value} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { fetchDashboardStats, fetchSales, fetchMedicines } from '@/lib/api';
import { DashboardStats } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, Package, TrendingUp, DollarSign } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadDashboard = async () => {
    try {
      const [dashStats, sales, medicines] = await Promise.all([
        fetchDashboardStats(),
        fetchSales(),
        fetchMedicines({ limit: 50 }),
      ]);
      console.log('dashStats:', dashStats);
      console.log('sales:', sales);
      console.log('medicines:', medicines);
    } catch (error) {
      console.error('DASHBOARD ERROR:', error); // ← check this
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
                formatter={(value) => `₱${parseFloat(String(value)).toFixed(2)}`}
              />
              <Legend />
              <Line type="monotone" dataKey="amount" stroke="var(--primary)" strokeWidth={2} dot={{ fill: 'var(--primary)', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

{/* Category Inventory List */}
<div className="bg-card border border-border rounded-lg p-6">
  <h2 className="text-lg font-bold text-foreground mb-4">Inventory by Category</h2>
  <div className="space-y-3 max-h-80 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
    {categoryData.length > 0 ? (
      categoryData.map((category, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            ></div>
            <span className="font-medium text-foreground">{category.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-32 bg-secondary rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (category.value / Math.max(...categoryData.map(c => c.value))) * 100)}%`,
                  backgroundColor: COLORS[index % COLORS.length],
                }}
              ></div>
            </div>
            <span className="text-sm font-semibold text-primary min-w-[50px] text-right">{category.value} units</span>
          </div>
        </div>
      ))
    ) : (
      <p className="text-muted-foreground text-center py-4">No category data available</p>
    )}
  </div>
</div>
      </div>
    </div>
  );
}


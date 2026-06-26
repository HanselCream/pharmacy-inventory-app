'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, Package, ShoppingBag } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'sale' | 'stock_add';
  medicine_name: string;
  quantity: number;
  price: number;
  total: number;
  created_at: string;
  details: string;
}

export default function TransactionHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'sale' | 'stock_add'>('all');
  const supabase = createClient();

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);

      // Load medicines for name mapping
      const { data: medicines } = await supabase
        .from('medicines')
        .select('id, brand_name');

      const medicineMap: Record<string, string> = {};
      (medicines || []).forEach((m: any) => {
        medicineMap[m.id] = m.brand_name;
      });

      // Load sales
      const { data: salesData } = await supabase
        .from('sales')
        .select('*')
        .order('sale_date', { ascending: false });

      // Load purchases
      const { data: purchasesData } = await supabase
        .from('purchases')
        .select('*')
        .order('purchase_date', { ascending: false });

      const allTransactions: Transaction[] = [];

      // Add sales
      (salesData || []).forEach((sale: any) => {
        allTransactions.push({
          id: sale.id,
          type: 'sale',
          medicine_name: medicineMap[sale.medicine_id] || 'Unknown',
          quantity: sale.quantity_sold,
          price: sale.unit_price,
          total: sale.total_amount,
          created_at: sale.sale_date,
          details: sale.cashier_name ? `Cashier: ${sale.cashier_name}` : ''
        });
      });

      // Add purchases
      (purchasesData || []).forEach((purchase: any) => {
        allTransactions.push({
          id: purchase.id,
          type: 'stock_add',
          medicine_name: medicineMap[purchase.medicine_id] || 'Unknown',
          quantity: purchase.quantity_purchased,
          price: purchase.unit_cost,
          total: purchase.total_cost,
          created_at: purchase.purchase_date,
          details: purchase.supplier_name ? `Supplier: ${purchase.supplier_name}` : ''
        });
      });

      // Sort by date
      allTransactions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (search && !t.medicine_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalSales = transactions
    .filter(t => t.type === 'sale')
    .reduce((sum, t) => sum + t.total, 0);

  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Transaction History</h1>
        <p className="text-muted-foreground">View all sales and stock arrivals</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Transactions</p>
          <p className="text-2xl font-bold text-foreground">{filteredTransactions.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Sales Revenue</p>
          <p className="text-2xl font-bold text-green-600">₱{totalSales.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Filter</p>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="w-full px-3 py-1 bg-background border border-border rounded text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All</option>
            <option value="sale">💲 Sales</option>
            <option value="stock_add">📦 Stock Arrivals</option>
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={20} />
          <input
            type="text"
            placeholder="Search by medicine name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Medicine</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Qty</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Price</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="border-b border-border hover:bg-background transition">
                    <td className="px-4 py-3 text-sm text-foreground">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {t.type === 'sale' ? (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                          <ShoppingBag size={14} className="inline mr-1" /> Sale
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                          <Package size={14} className="inline mr-1" /> Stock Add
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground font-medium">
                      {t.medicine_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{t.quantity}</td>
                    <td className="px-4 py-3 text-sm text-foreground">₱{t.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-foreground">
                      ₱{t.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            No transactions found
          </div>
        )}
      </div>
    </div>
  );
}
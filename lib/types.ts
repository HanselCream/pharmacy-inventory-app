export interface Medicine {
  id: string;
  code: string;
  generic_name: string;
  brand_name: string;
  category: string;
  unit_price: number;
  quantity_on_hand: number;
  reorder_level: number;
  expiry_date: string | null;
  supplier: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  medicine_id: string;
  quantity_sold: number;
  unit_price: number;
  total_amount: number;
  sale_date: string;
  cashier_name?: string;  // ← Add this
  user_id?: string;       // ← Add this if using users table
  payment_method?: string;  // ← Add this
  created_at: string;
}

export interface Purchase {
  id: string;
  medicine_id: string;
  quantity_purchased: number;
  unit_cost: number;
  total_cost: number;
  supplier_name?: string;
  purchase_date: string;
  received_date?: string;
  user_id?: string;       // ← Add this if using users table
  created_at: string;
}

export interface Disposal {
  id: string;
  medicine_id: string;
  quantity_disposed: number;
  reason: string;
  disposed_date: string;
  authorized_by: string | null;
  created_at: string;
  medicine?: Medicine;
}

export interface DashboardStats {
  totalMedicines: number;
  lowStockItems: number;
  expiredItems: number;
  totalInventoryValue: number;
  todaySalesAmount: number;
  todayTransactions: number;
}

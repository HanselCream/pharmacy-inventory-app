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
  cashier_name?: string;
  created_at: string;
  medicine?: Medicine;
}

export interface Purchase {
  id: string;
  medicine_id: string;
  quantity_purchased: number;
  unit_cost: number;
  total_cost: number;
  supplier_name: string | null;
  purchase_date: string;
  received_date: string | null;
  created_at: string;
  medicine?: Medicine;
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

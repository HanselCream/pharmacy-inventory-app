import { createClient } from '@/lib/supabase/client';
import { Medicine, Sale, Purchase, Disposal, DashboardStats } from './types';

export const fetchMedicines = async (filters?: {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}): Promise<{ medicines: Medicine[]; total: number }> => {
  const supabase = createClient();
  const limit = filters?.limit || 10;
  const page = filters?.page || 1;
  const offset = (page - 1) * limit;

  let query = supabase.from('medicines').select('*', { count: 'exact' });

  if (filters?.search) {
    query = query.or(
      `generic_name.ilike.%${filters.search}%,brand_name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`
    );
  }

  if (filters?.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { medicines: data || [], total: count || 0 };
};

export const fetchMedicineById = async (id: string): Promise<Medicine> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('medicines')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const createMedicine = async (medicine: Omit<Medicine, 'id' | 'created_at' | 'updated_at'>): Promise<Medicine> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('medicines')
    .insert([medicine])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateMedicine = async (
  id: string,
  updates: Partial<Medicine>
): Promise<Medicine> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('medicines')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const recordSale = async (sale: Omit<Sale, 'id' | 'created_at'>): Promise<Sale> => {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('sales')
    .insert([sale])
    .select()
    .single();

  if (error) throw error;

  // Deduct from inventory
  const medicine = await fetchMedicineById(sale.medicine_id);
  await updateMedicine(sale.medicine_id, {
    quantity_on_hand: Math.max(0, medicine.quantity_on_hand - sale.quantity_sold),
  });

  return data;
};

export const recordPurchase = async (
  purchase: Omit<Purchase, 'id' | 'created_at'>
): Promise<Purchase> => {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('purchases')
    .insert([purchase])
    .select()
    .single();

  if (error) throw error;

  // Add to inventory
  const medicine = await fetchMedicineById(purchase.medicine_id);
  await updateMedicine(purchase.medicine_id, {
    quantity_on_hand: medicine.quantity_on_hand + purchase.quantity_purchased,
  });

  return data;
};

export const recordDisposal = async (
  disposal: Omit<Disposal, 'id' | 'created_at'>
): Promise<Disposal> => {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('disposals')
    .insert([disposal])
    .select()
    .single();

  if (error) throw error;

  // Deduct from inventory
  const medicine = await fetchMedicineById(disposal.medicine_id);
  await updateMedicine(disposal.medicine_id, {
    quantity_on_hand: Math.max(0, medicine.quantity_on_hand - disposal.quantity_disposed),
  });

  return data;
};

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const supabase = createClient();

  const { data: medicines } = await supabase.from('medicines').select('*');
  const { data: sales } = await supabase
    .from('sales')
    .select('*')
    .gte('sale_date', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

  const medicinesArray = medicines || [];
  const salesArray = sales || [];

  const lowStockItems = medicinesArray.filter(
    (m) => m.quantity_on_hand <= m.reorder_level
  ).length;

  const expiredItems = medicinesArray.filter(
    (m) => m.expiry_date && new Date(m.expiry_date) < new Date()
  ).length;

  const totalInventoryValue = medicinesArray.reduce(
    (sum, m) => sum + m.quantity_on_hand * m.unit_price,
    0
  );

  const todaySalesAmount = salesArray.reduce((sum, s) => sum + s.total_amount, 0);

  return {
    totalMedicines: medicinesArray.length,
    lowStockItems,
    expiredItems,
    totalInventoryValue,
    todaySalesAmount,
    todayTransactions: salesArray.length,
  };
};

export const fetchSales = async (filters?: {
  startDate?: Date;
  endDate?: Date;
  medicineId?: string;
}): Promise<Sale[]> => {
  const supabase = createClient();

  let query = supabase.from('sales').select('*');

  if (filters?.startDate) {
    query = query.gte('sale_date', filters.startDate.toISOString());
  }

  if (filters?.endDate) {
    query = query.lte('sale_date', filters.endDate.toISOString());
  }

  if (filters?.medicineId) {
    query = query.eq('medicine_id', filters.medicineId);
  }

  const { data, error } = await query.order('sale_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const fetchCategories = async (): Promise<string[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('medicines')
    .select('category')
    .order('category')
    .limit(1);

  if (error) throw error;

  const { data: allCategories } = await supabase
    .from('medicines')
    .select('category', { distinct: true });

  return allCategories?.map((m) => m.category).filter((c) => c) || [];
};

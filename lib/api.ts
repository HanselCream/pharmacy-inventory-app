import { createClient } from '@/lib/supabase/client';
import { Medicine, Sale, Purchase, Disposal, DashboardStats } from './types';

// Helper: Generate order number in format ORD-YYYYMMDD-###
export const generateOrderNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timestamp = Math.floor(Math.random() * 1000);
  const sequence = String(timestamp).padStart(3, '0');
  return `ORD-${year}${month}${day}-${sequence}`;
};

// Helper: Validate stock before checkout
export const validateStockAvailability = async (
  cartItems: Array<{ medicine_id: string; quantity_sold: number }>
): Promise<{ valid: boolean; failedItem?: { medicine_id: string; requiredQty: number; availableQty: number } }> => {
  const supabase = createClient();

  for (const item of cartItems) {
    const { data, error } = await supabase
      .from('medicines')
      .select('quantity_on_hand, brand_name')
      .eq('id', item.medicine_id)
      .single();

    if (error) {
      return {
        valid: false,
        failedItem: {
          medicine_id: item.medicine_id,
          requiredQty: item.quantity_sold,
          availableQty: 0,
        },
      };
    }

    if (data.quantity_on_hand < item.quantity_sold) {
      return {
        valid: false,
        failedItem: {
          medicine_id: item.medicine_id,
          requiredQty: item.quantity_sold,
          availableQty: data.quantity_on_hand,
        },
      };
    }
  }

  return { valid: true };
};

export const fetchMedicines = async (filters?: {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
  sortBy?: 'expiry_asc' | 'expiry_desc' | 'name_asc' | 'name_desc' | 'status_asc' | 'status_desc';
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

  if (filters?.sortBy) {
    switch (filters.sortBy) {
      case 'expiry_asc':
        query = query.order('expiry_date', { ascending: true, nullsFirst: false });
        break;
      case 'expiry_desc':
        query = query.order('expiry_date', { ascending: false, nullsFirst: true });
        break;
      case 'name_asc':
        query = query.order('brand_name', { ascending: true });
        break;
      case 'name_desc':
        query = query.order('brand_name', { ascending: false });
        break;
      case 'status_asc':
        query = query
          .order('expiry_date', { ascending: true, nullsFirst: false })
          .order('quantity_on_hand', { ascending: false });
        break;
      case 'status_desc':
        query = query
          .order('expiry_date', { ascending: false, nullsFirst: true })
          .order('quantity_on_hand', { ascending: true });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);

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

export const recordSale = async (
  sale: Omit<Sale, 'id' | 'created_at'> & { payment_method?: string }
): Promise<Sale> => {
  const supabase = createClient();
  
  const saleData = {
    ...sale,
    payment_method: sale.payment_method || 'cash',
  };
  
  const { data, error } = await supabase
    .from('sales')
    .insert([saleData])
    .select()
    .single();

  if (error) throw error;

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

  const medicine = await fetchMedicineById(disposal.medicine_id);
  await updateMedicine(disposal.medicine_id, {
    quantity_on_hand: Math.max(0, medicine.quantity_on_hand - disposal.quantity_disposed),
  });

  return data;
};

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const supabase = createClient();

  const { data: medicines, error: medError } = await supabase
    .from('medicines')
    .select('*');
  
  if (medError) throw new Error('medicines: ' + medError.message);

  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('*')
    .gte('sale_date', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

  if (salesError) throw new Error('sales: ' + salesError.message);

  const medicinesArray: Medicine[] = medicines || [];
  const salesArray: Sale[] = sales || [];

  const lowStockItems = medicinesArray.filter(
    (m: Medicine) => m.quantity_on_hand <= m.reorder_level
  ).length;

  const expiredItems = medicinesArray.filter(
    (m: Medicine) => m.expiry_date && new Date(m.expiry_date) < new Date()
  ).length;

  const totalInventoryValue = medicinesArray.reduce(
    (sum: number, m: Medicine) => sum + m.quantity_on_hand * m.unit_price,
    0
  );

  const todaySalesAmount = salesArray.reduce(
    (sum: number, s: Sale) => sum + s.total_amount, 
    0
  );

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
    .select('category');

  if (error) throw error;

  const categories: string[] = (data || [])
    .map((item: { category: string }) => item.category)
    .filter((category: string | null): category is string => Boolean(category));

  return [...new Set(categories)].sort();
};
'use client';

import { useEffect, useState } from 'react';
import { fetchMedicines, recordSale } from '@/lib/api';
import { Medicine } from '@/lib/types';
import { Plus, Trash2, ShoppingCart, DollarSign } from 'lucide-react';

interface CartItem {
  medicine: Medicine;
  quantity: number;
}

export default function POSPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cashierName, setCashierName] = useState('');

  useEffect(() => {
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    try {
      setLoading(true);
      const { medicines: data } = await fetchMedicines({ limit: 100, search });
      setMedicines(data);
    } catch (error) {
      console.error('Error loading medicines:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (medicine: Medicine) => {
    const existingItem = cart.find((item) => item.medicine.id === medicine.id);
    if (existingItem) {
      existingItem.quantity += 1;
      setCart([...cart]);
    } else {
      setCart([...cart, { medicine, quantity: 1 }]);
    }
  };

  const updateQuantity = (medicineId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter((item) => item.medicine.id !== medicineId));
    } else {
      const item = cart.find((item) => item.medicine.id === medicineId);
      if (item) {
        item.quantity = quantity;
        setCart([...cart]);
      }
    }
  };

  const removeFromCart = (medicineId: string) => {
    setCart(cart.filter((item) => item.medicine.id !== medicineId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.medicine.unit_price * item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    if (!cashierName.trim()) {
      alert('Please enter cashier name');
      return;
    }

    try {
      setProcessing(true);

      for (const item of cart) {
        await recordSale({
          medicine_id: item.medicine.id,
          quantity_sold: item.quantity,
          unit_price: item.medicine.unit_price,
          total_amount: item.medicine.unit_price * item.quantity,
          sale_date: new Date().toISOString(),
          cashier_name: cashierName,
        });
      }

      setCart([]);
      setCashierName('');
      alert('Sale recorded successfully!');
    } catch (error) {
      console.error('Error recording sale:', error);
      alert('Error recording sale');
    } finally {
      setProcessing(false);
    }
  };

  const total = calculateTotal();

  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Point of Sale</h1>
        <p className="text-muted-foreground">Process customer purchases</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <div className="relative mb-6">
              <input
                type="text"
                placeholder="Search medicines..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onInput={loadMedicines}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loading ? (
                <div className="col-span-full text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : medicines.length > 0 ? (
                medicines.map((medicine) => (
                  <div
                    key={medicine.id}
                    className="bg-background border border-border rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground text-sm">{medicine.brand_name}</p>
                        <p className="text-xs text-muted-foreground">{medicine.generic_name}</p>
                        <p className="text-xs text-muted-foreground mt-1">Stock: {medicine.quantity_on_hand}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">₱{medicine.unit_price.toFixed(2)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => addToCart(medicine)}
                      disabled={medicine.quantity_on_hand <= 0}
                      className="w-full bg-primary text-primary-foreground py-2 rounded hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                    >
                      <Plus size={16} /> Add to Cart
                    </button>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No medicines found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cart Section */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-lg p-6 sticky top-8">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <ShoppingCart size={24} /> Cart
            </h2>

            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Cart is empty</p>
              ) : (
                cart.map((item) => (
                  <div key={item.medicine.id} className="bg-background border border-border rounded p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.medicine.brand_name}</p>
                        <p className="text-xs text-muted-foreground">₱{item.medicine.unit_price.toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.medicine.id)}
                        className="text-destructive hover:opacity-70 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.medicine.id, item.quantity - 1)}
                        className="px-2 py-1 bg-muted text-muted-foreground rounded hover:bg-border transition"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(item.medicine.id, parseInt(e.target.value) || 1)
                        }
                        className="flex-1 px-2 py-1 bg-background border border-border rounded text-foreground text-center"
                      />
                      <button
                        onClick={() => updateQuantity(item.medicine.id, item.quantity + 1)}
                        className="px-2 py-1 bg-muted text-muted-foreground rounded hover:bg-border transition"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-sm text-foreground mt-2">
                      Subtotal: ₱{(item.medicine.unit_price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <>
                <div className="border-t border-border pt-4 mb-4">
                  <input
                    type="text"
                    placeholder="Cashier Name"
                    value={cashierName}
                    onChange={(e) => setCashierName(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded text-foreground placeholder-muted-foreground text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
                  />

                  <div className="bg-primary/10 border border-primary/20 rounded p-4 mb-4">
                    <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                    <p className="text-3xl font-bold text-primary flex items-center gap-2">
                      <DollarSign size={28} />
                      {total.toFixed(2)}
                    </p>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={processing}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
                  >
                    {processing ? 'Processing...' : 'Complete Sale'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

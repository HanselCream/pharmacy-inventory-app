'use client';

import { useEffect, useState, useRef } from 'react';
import { fetchMedicines, recordSale, generateOrderNumber, validateStockAvailability } from '@/lib/api';
import { Medicine } from '@/lib/types';
import { Plus, Trash2, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

interface CartItem {
  medicine: Medicine;
  quantity: number;
}

interface Receipt {
  orderNumber: string;
  timestamp: string;
  cashierName: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'online';
  amountPaid?: number;
  change?: number;
}

export default function POSPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [discount, setDiscount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'online'>('cash');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');

  useEffect(() => {
    loadMedicines(true);
  }, []);

  const loadMedicines = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const { medicines: data } = await fetchMedicines({ limit: 100, search });
      setMedicines(data);
    } catch (error) {
      console.error('Error loading medicines:', error);
      toast.error('Failed to load medicines');
    } finally {
      setLoading(false);
    }
  };

  const reloadMedicines = async () => {
    try {
      const { medicines: data } = await fetchMedicines({ limit: 100 });
      setMedicines(data);
    } catch (error) {
      console.error('Error reloading medicines:', error);
    }
  };

  const addToCart = (medicine: Medicine) => {
    const currentInCart = cart.find((item) => item.medicine.id === medicine.id)?.quantity || 0;
    const availableStock = medicine.quantity_on_hand - currentInCart;

    if (availableStock <= 0) {
      toast.error(`❌ Only ${medicine.quantity_on_hand} left in stock`);
      return;
    }

    const existingItem = cart.find((item) => item.medicine.id === medicine.id);
    if (existingItem) {
      if (existingItem.quantity >= medicine.quantity_on_hand) {
        toast.error(`❌ Only ${medicine.quantity_on_hand} units available`);
        return;
      }
      existingItem.quantity += 1;
      setCart([...cart]);
    } else {
      setCart([...cart, { medicine, quantity: 1 }]);
    }
    toast.success(`✅ ${medicine.brand_name} added to cart`);
  };

  const updateQuantity = (medicineId: string, quantity: number) => {
    const cartItem = cart.find((item) => item.medicine.id === medicineId);
    if (!cartItem) return;

    const maxAvailable = cartItem.medicine.quantity_on_hand;

    if (quantity <= 0) {
      setCart(cart.filter((item) => item.medicine.id !== medicineId));
      return;
    }

    if (quantity > maxAvailable) {
      toast.error(`Only ${maxAvailable} units available in stock`);
      return;
    }

    cartItem.quantity = quantity;
    setCart([...cart]);
  };

  const removeFromCart = (medicineId: string) => {
    setCart(cart.filter((item) => item.medicine.id !== medicineId));
    toast.info('Item removed from cart');
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.medicine.unit_price * item.quantity, 0);
    return Math.max(0, subtotal - (Number(discount) || 0));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.medicine.unit_price * item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setShowConfirmation(true);
  };

  const processCheckout = async () => {
    setShowConfirmation(false);
    setProcessing(true);

    try {
      const cartItemsForValidation = cart.map((item) => ({
        medicine_id: item.medicine.id,
        quantity_sold: item.quantity,
      }));

      const validation = await validateStockAvailability(cartItemsForValidation);

      if (!validation.valid) {
        const failedItem = validation.failedItem;
        const cartItem = cart.find((item) => item.medicine.id === failedItem?.medicine_id);
        toast.error(
          `❌ Insufficient stock for ${cartItem?.medicine.brand_name}. Required: ${failedItem?.requiredQty}, Available: ${failedItem?.availableQty}`
        );
        setProcessing(false);
        return;
      }

      await Promise.all(
        cart.map((item) =>
          recordSale({
            medicine_id: item.medicine.id,
            quantity_sold: item.quantity,
            unit_price: item.medicine.unit_price,
            total_amount: item.medicine.unit_price * item.quantity,
            payment_method: paymentMethod, 
            sale_date: new Date().toISOString(),
          })
        )
      );

      const orderNumber = generateOrderNumber();
      const subtotal = calculateSubtotal();
      const total = calculateTotal();
      const change = paymentMethod === 'cash' ? Math.max(0, (Number(amountPaid) || 0) - total) : 0;
      const receiptData: Receipt = {
        orderNumber,
        timestamp: new Date().toLocaleString(),
        cashierName: 'Cashier',
        items: [...cart],
        subtotal,
        discount: Number(discount) || 0,
        total,
        paymentMethod,
        amountPaid: paymentMethod === 'cash' ? Number(amountPaid) || 0 : undefined,
        change: paymentMethod === 'cash' ? change : undefined,
      };

      setReceipt(receiptData);
      setShowReceipt(true);

      setCart([]);
      setDiscount(0);
      setPaymentMethod('cash');
      setAmountPaid(0);

      await reloadMedicines();
      toast.success('Sale completed successfully!');
    } catch (error) {
      console.error('Error recording sale:', error);
      toast.error('Error processing checkout. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const subtotal = calculateSubtotal();
  const total = calculateTotal();

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border flex-shrink-0">
        <h1 className="text-xl font-bold text-foreground">Point of Sale</h1>
        <p className="text-xs text-muted-foreground">Process customer purchases</p>
      </div>

      {/* Main Content - Side by Side */}
      <div className="flex flex-1 overflow-hidden">
        {/* Products Section - Left */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Search Bar */}
          <div className="p-2 flex-shrink-0">
            <input
              type="text"
              placeholder="Search medicines..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (searchTimeout.current) clearTimeout(searchTimeout.current);
                searchTimeout.current = setTimeout(() => {
                  loadMedicines();
                }, 400);
              }}
              className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {loading ? (
                <div className="col-span-full text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : medicines.length > 0 ? (
                medicines.map((medicine) => {
                  const inCart = cart.find((item) => item.medicine.id === medicine.id)?.quantity || 0;
                  const availableStock = medicine.quantity_on_hand - inCart;
                  const isOutOfStock = availableStock <= 0;

                  return (
                    <div
                      key={medicine.id}
                      className="bg-card border border-border rounded-lg p-2 hover:shadow-md transition"
                    >
                      <div className="mb-1">
                        <p className="font-semibold text-foreground text-xs truncate">{medicine.brand_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{medicine.generic_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Stock: {medicine.quantity_on_hand}
                          {inCart > 0 && <span className="text-accent ml-1">({inCart})</span>}
                        </p>
                        <p className="text-sm font-bold text-primary">₱{medicine.unit_price.toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => addToCart(medicine)}
                        disabled={isOutOfStock}
                        className="w-full bg-primary text-primary-foreground py-1 rounded text-xs hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isOutOfStock ? 'Out of Stock' : 'Add'}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
                  No medicines found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cart Section - Right (Fixed Width) */}
        <div className="w-72 lg:w-80 xl:w-96 border-l border-border flex-shrink-0 flex flex-col bg-card">
          {/* Cart Header */}
          <div className="p-3 border-b border-border flex-shrink-0">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShoppingCart size={18} /> Cart ({cart.length})
            </h2>
          </div>

          {/* Cart Items - Scrollable */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">Cart is empty</p>
            ) : (
              cart.map((item) => (
                <div key={item.medicine.id} className="bg-background border border-border rounded p-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{item.medicine.brand_name}</p>
                      <p className="text-[10px] text-muted-foreground">₱{item.medicine.unit_price.toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.medicine.id)}
                      className="text-destructive hover:opacity-70 transition ml-1 flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <button
                      onClick={() => updateQuantity(item.medicine.id, item.quantity - 1)}
                      className="w-6 h-6 flex items-center justify-center bg-muted text-muted-foreground rounded hover:bg-border transition text-xs"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.medicine.id, parseInt(e.target.value) || 1)}
                      className="w-10 px-1 py-0.5 bg-background border border-border rounded text-foreground text-center text-xs"
                    />
                    <button
                      onClick={() => updateQuantity(item.medicine.id, item.quantity + 1)}
                      className="w-6 h-6 flex items-center justify-center bg-muted text-muted-foreground rounded hover:bg-border transition text-xs"
                    >
                      +
                    </button>
                    <span className="text-xs text-foreground ml-auto">
                      ₱{(item.medicine.unit_price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer - Fixed at Bottom */}
          {cart.length > 0 && (
            <div className="border-t border-border p-3 space-y-2 flex-shrink-0">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground block">Discount (₱)</label>
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-2 py-1 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block">Payment</label>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => setPaymentMethod('cash')}
                      className={`py-1 rounded text-xs font-medium border transition ${
                        paymentMethod === 'cash'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-border hover:border-primary'
                      }`}
                    >
                      Cash
                    </button>
                    <button
                      onClick={() => setPaymentMethod('online')}
                      className={`py-1 rounded text-xs font-medium border transition ${
                        paymentMethod === 'online'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-border hover:border-primary'
                      }`}
                    >
                      QR
                    </button>
                  </div>
                </div>
              </div>

              {paymentMethod === 'cash' && (
                <div>
                  <label className="text-[10px] text-muted-foreground block">Amount Paid (₱)</label>
                  <input
                    type="number"
                    min="0"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full px-2 py-1 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {Number(amountPaid) > 0 && (
                    <p className={`text-[10px] mt-0.5 font-medium ${Number(amountPaid) >= total ? 'text-green-600' : 'text-destructive'}`}>
                      {Number(amountPaid) >= total 
                        ? `Change: ₱${(Number(amountPaid) - total).toFixed(2)}`
                        : `Short: ₱${(total - Number(amountPaid)).toFixed(2)}`
                      }
                    </p>
                  )}
                </div>
              )}

              <div className="bg-primary/10 border border-primary/20 rounded p-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="text-foreground">₱{subtotal.toFixed(2)}</span>
                </div>
                {Number(discount) > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="text-destructive">-₱{Number(discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold pt-1 border-t border-primary/20">
                  <span className="text-foreground">Total:</span>
                  <span className="text-primary">₱{total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={processing}
                className="w-full bg-primary text-primary-foreground py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Generate Order'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-foreground mb-4">Confirm Checkout</h3>
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="text-foreground">₱{subtotal.toFixed(2)}</span>
              </div>
              {Number(discount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount:</span>
                  <span className="text-destructive">-₱{Number(discount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                <span className="text-foreground">Total:</span>
                <span className="text-primary">₱{total.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {cart.length} item{cart.length !== 1 ? 's' : ''} • Payment: {paymentMethod.toUpperCase()}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-border transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={processCheckout}
                disabled={processing || (paymentMethod === 'cash' && (Number(amountPaid) || 0) < total)}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 transition disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && receipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="text-center border-b border-border pb-4">
                <h3 className="text-2xl font-bold text-primary mb-2">PamiPharma</h3>
                <p className="text-xs text-muted-foreground">Receipt</p>
                <p className="text-sm font-mono text-foreground mt-2">{receipt.orderNumber}</p>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>{receipt.timestamp}</p>
              </div>

              <div className="border-b border-border pb-3">
                <table className="w-full text-xs">
                  <tbody>
                    {receipt.items.map((item) => (
                      <tr key={item.medicine.id}>
                        <td className="text-foreground py-1">{item.medicine.brand_name}</td>
                        <td className="text-right text-muted-foreground py-1">x{item.quantity}</td>
                        <td className="text-right text-foreground py-1">₱{(item.medicine.unit_price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="text-foreground">₱{receipt.subtotal.toFixed(2)}</span>
                </div>
                {receipt.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="text-destructive">-₱{receipt.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                  <span className="text-foreground">Total:</span>
                  <span className="text-primary">₱{receipt.total.toFixed(2)}</span>
                </div>
              </div>

<div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-3">
  <p>Payment: {receipt.paymentMethod.toUpperCase()}</p>
  {receipt.paymentMethod === 'cash' && receipt.amountPaid !== undefined ? (
    <>
      <p>Amount Paid: ₱{Number(receipt.amountPaid).toFixed(2)}</p>
      <p className="text-green-600 font-medium">Change: ₱{(receipt.change || 0).toFixed(2)}</p>
    </>
  ) : receipt.paymentMethod === 'online' ? (
    <p className="text-blue-500">Paid via QR</p>
  ) : null}
</div>

              <div className="text-center text-xs text-muted-foreground border-t border-border pt-3">
                <p>Thank you for your purchase!</p>
              </div>
            </div>

            <div className="border-t border-border p-4 bg-background">
              <button
                onClick={() => setShowReceipt(false)}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
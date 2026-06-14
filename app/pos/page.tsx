'use client';

import { useEffect, useState } from 'react';
import { fetchMedicines, recordSale, generateOrderNumber, validateStockAvailability } from '@/lib/api';
import { Medicine } from '@/lib/types';
import { Plus, Trash2, ShoppingCart, DollarSign, X, Printer } from 'lucide-react';
import { toast } from 'sonner';

interface CartItem {
  medicine: Medicine;
  quantity: number;
}

interface Receipt {
  orderNumber: string;
  timestamp: string;
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
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'online'>('cash');
  const [amountPaid, setAmountPaid] = useState(0);

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
    // Validate stock before adding
    const currentInCart = cart.find((item) => item.medicine.id === medicine.id)?.quantity || 0;
    const availableStock = medicine.quantity_on_hand - currentInCart;

    if (availableStock <= 0) {
      toast.error(`Only ${medicine.quantity_on_hand} left in stock`);
      return;
    }

    const existingItem = cart.find((item) => item.medicine.id === medicine.id);
    if (existingItem) {
      if (existingItem.quantity >= medicine.quantity_on_hand) {
        toast.error(`Only ${medicine.quantity_on_hand} units available`);
        return;
      }
      existingItem.quantity += 1;
      setCart([...cart]);
    } else {
      setCart([...cart, { medicine, quantity: 1 }]);
    }
    toast.success(`${medicine.brand_name} added to cart`);
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
    return Math.max(0, subtotal - discount);
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
      // Pre-checkout validation: re-fetch stock for all items
      const cartItemsForValidation = cart.map((item) => ({
        medicine_id: item.medicine.id,
        quantity_sold: item.quantity,
      }));

      const validation = await validateStockAvailability(cartItemsForValidation);

      if (!validation.valid) {
        const failedItem = validation.failedItem;
        const cartItem = cart.find((item) => item.medicine.id === failedItem?.medicine_id);
        toast.error(
          `Insufficient stock for ${cartItem?.medicine.brand_name}. Required: ${failedItem?.requiredQty}, Available: ${failedItem?.availableQty}`
        );
        setProcessing(false);
        return;
      }

      // Process each sale
      for (const item of cart) {
        await recordSale({
          medicine_id: item.medicine.id,
          quantity_sold: item.quantity,
          unit_price: item.medicine.unit_price,
          total_amount: item.medicine.unit_price * item.quantity,
          sale_date: new Date().toISOString(),
        });
      }

      // Generate receipt
      const orderNumber = generateOrderNumber();
      const subtotal = calculateSubtotal();
      const total = calculateTotal();
      const change = paymentMethod === 'cash' ? Math.max(0, amountPaid - total) : 0;

      const receiptData: Receipt = {
        orderNumber,
        timestamp: new Date().toLocaleString(),
        items: [...cart],
        subtotal,
        discount,
        total,
        paymentMethod,
        amountPaid: paymentMethod === 'cash' ? amountPaid : undefined,
        change: paymentMethod === 'cash' ? change : undefined,
      };

      setReceipt(receiptData);
      setShowReceipt(true);

      // Clear cart and form
      setCart([]);
      setDiscount(0);
      setPaymentMethod('cash');
      setAmountPaid(0);

      // Reload medicines to reflect updated stock
      await reloadMedicines();

      toast.success('Sale completed successfully!');
    } catch (error) {
      console.error('Error recording sale:', error);
      toast.error('Error processing checkout. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const subtotal = calculateSubtotal();
  const total = calculateTotal();

  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Point of Sale</h1>
        <p className="text-muted-foreground">Process customer purchases and track inventory</p>
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
                medicines.map((medicine) => {
                  const inCart = cart.find((item) => item.medicine.id === medicine.id)?.quantity || 0;
                  const availableStock = medicine.quantity_on_hand - inCart;
                  const isOutOfStock = availableStock <= 0;

                  return (
                    <div
                      key={medicine.id}
                      className="bg-background border border-border rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-foreground text-sm">{medicine.brand_name}</p>
                          <p className="text-xs text-muted-foreground">{medicine.generic_name}</p>
                          <div className="text-xs text-muted-foreground mt-1">
                            <p>Stock: {medicine.quantity_on_hand}</p>
                            {inCart > 0 && <p className="text-accent">In cart: {inCart}</p>}
                            {availableStock > 0 && (
                              <p className="text-secondary">Available: {availableStock}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">₱{medicine.unit_price.toFixed(2)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => addToCart(medicine)}
                        disabled={isOutOfStock}
                        className="w-full bg-primary text-primary-foreground py-2 rounded hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                      >
                        <Plus size={16} /> {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                    </div>
                  );
                })
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
                <div className="border-t border-border pt-4 mb-4 space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Discount (₱)</label>
                    <input
                      type="number"
                      min="0"
                      max={subtotal}
                      value={discount}
                      onChange={(e) => setDiscount(Math.max(0, Math.min(subtotal, parseFloat(e.target.value) || 0)))}
                      className="w-full px-3 py-2 bg-background border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full px-3 py-2 bg-background border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="online">Online</option>
                    </select>
                  </div>

                  {paymentMethod === 'cash' && (
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Amount Paid (₱)</label>
                      <input
                        type="number"
                        min="0"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-background border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {amountPaid > 0 && amountPaid >= total && (
                        <p className="text-xs text-secondary mt-1">
                          Change: ₱{(amountPaid - total).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="bg-primary/10 border border-primary/20 rounded p-4">
                    <p className="text-xs text-muted-foreground mb-1">Subtotal</p>
                    <p className="text-sm text-foreground mb-2">₱{subtotal.toFixed(2)}</p>
                    {discount > 0 && (
                      <>
                        <p className="text-xs text-muted-foreground">Discount</p>
                        <p className="text-sm text-destructive mb-2">-₱{discount.toFixed(2)}</p>
                      </>
                    )}
                    <div className="border-t border-primary/20 pt-2">
                      <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                      <p className="text-3xl font-bold text-primary flex items-center gap-2">
                        <DollarSign size={28} />
                        {total.toFixed(2)}
                      </p>
                    </div>
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

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 pointer-events-auto">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-foreground mb-4">Confirm Checkout</h3>
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="text-foreground">₱{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount:</span>
                  <span className="text-destructive">-₱{discount.toFixed(2)}</span>
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
                disabled={processing || (paymentMethod === 'cash' && amountPaid < total)}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 pointer-events-auto">
          <div className="bg-card border border-border rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
            {/* Printable Receipt Content */}
            <div className="p-6 space-y-4" id="receipt-content">
              <div className="text-center border-b border-border pb-4">
                <h3 className="text-2xl font-bold text-primary mb-2">PharmaTrack</h3>
                <p className="text-xs text-muted-foreground">Receipt</p>
                <p className="text-sm font-mono text-foreground mt-2">{receipt.orderNumber}</p>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>{receipt.timestamp}</p>
              </div>

              <div className="border-b border-border pb-3">
                <table className="w-full text-xs">
                  <tbody className="space-y-2">
                    {receipt.items.map((item) => (
                      <tr key={item.medicine.id}>
                        <td className="text-foreground">{item.medicine.brand_name}</td>
                        <td className="text-right text-muted-foreground">x{item.quantity}</td>
                        <td className="text-right text-foreground">₱{(item.medicine.unit_price * item.quantity).toFixed(2)}</td>
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
                {receipt.amountPaid !== undefined && (
                  <>
                    <p>Amount Paid: ₱{receipt.amountPaid.toFixed(2)}</p>
                    <p className="text-secondary">Change: ₱{(receipt.change || 0).toFixed(2)}</p>
                  </>
                )}
              </div>

              <div className="text-center text-xs text-muted-foreground border-t border-border pt-3">
                <p>Thank you for your purchase!</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="border-t border-border p-4 flex gap-3 bg-background sticky bottom-0">
              <button
                onClick={handlePrint}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 transition flex items-center justify-center gap-2"
              >
                <Printer size={16} /> Print
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-border transition"
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

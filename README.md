# PharmaTrack - Complete Pharmacy Inventory Management System

PharmaTrack is a full-featured, production-ready pharmacy inventory management system built with Next.js 16, Supabase, and Tailwind CSS. It provides comprehensive tools for managing medicines, processing sales, tracking purchases, and generating business analytics.

## 🎯 Features

### Dashboard
- **Real-time Statistics**: Track total medicines, low stock alerts, inventory value, and daily sales
- **Sales Trends**: Visualize sales performance over the last 7 days
- **Category Distribution**: Pie chart showing inventory breakdown by medicine category
- **Quick Insights**: At-a-glance metrics for pharmacy operations

### Medicines Inventory Management
- **Full CRUD Operations**: Add, view, edit, and manage medicines
- **Advanced Search**: Search by name, code, or brand name
- **Category Filtering**: Filter medicines by therapeutic category
- **Stock Monitoring**: Visual indicators for low stock and expired items
- **Pagination**: Efficient browsing of large inventories
- **Real-time Updates**: Automatic inventory adjustments on sales/purchases

### Point of Sale (POS)
- **Fast Checkout**: Search and add medicines to cart with one click
- **Quantity Management**: Adjust quantities with intuitive controls
- **Real-time Cart**: Live cart with running total calculations
- **Cashier Management**: Track which cashier processed each transaction
- **Instant Inventory Sync**: Automatic stock deduction upon sale completion

### Purchase Management
- **Purchase Orders**: Record supplier purchases with cost tracking
- **Inventory Auto-Increment**: Stock levels automatically updated on purchase
- **Supplier Tracking**: Associate purchases with suppliers
- **Cost Analysis**: Calculate total costs for bulk purchases
- **Quick Reference**: View all medicines with current stock and supplier info

### Sales Tracking
- **Complete Sales History**: View all transactions with timestamps
- **Date Range Filtering**: Filter sales by custom date ranges
- **Revenue Analytics**: Track total revenue and transaction counts
- **Transaction Details**: See cashier info, quantities, and amounts for each sale

### Comprehensive Reports
- **Business Intelligence**: Summary statistics on inventory, revenue, and performance
- **Top Sellers**: Identify best-performing medicines by revenue and quantity
- **Low Stock Alerts**: Monitor medicines requiring reorder
- **Expiry Tracking**: Identify expired items for disposal
- **CSV Export**: Export reports for further analysis or archiving

## 🏗️ Architecture

### Database Schema (Supabase PostgreSQL)
- **medicines**: Core inventory data with pricing and stock levels
- **sales**: Point-of-sale transactions with amounts and cashier info
- **purchases**: Supplier purchases with cost tracking
- **disposals**: Track disposed medications
- **audit_logs**: Complete transaction audit trail

### Tech Stack
- **Frontend**: Next.js 16 with React 19.2
- **Styling**: Tailwind CSS v4 with custom design system
- **Database**: Supabase PostgreSQL with RLS policies
- **Data Visualization**: Recharts for charts and analytics
- **Icons**: Lucide React for consistent UI elements
- **Authentication**: Supabase Auth (ready for multi-user support)

## 📊 Sample Data

The system comes pre-loaded with:
- **50 pharmaceutical medicines** across multiple categories
- **Realistic pricing** for Philippine market
- **Varied stock levels** demonstrating low stock and normal scenarios
- **Multiple suppliers**: PharmaCorp, HealthCo, MediSupply
- **Multiple categories**: Antibiotics, Analgesics, Cardiovascular, etc.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (v16 compatible)
- pnpm (or npm/yarn)
- Supabase project with database configured

### Installation

1. **Clone and Install**
```bash
pnpm install
```

2. **Environment Setup**
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. **Database Setup**
The Supabase schema and seed data have already been configured. Tables include:
- medicines (50+ sample records)
- sales, purchases, disposals
- audit_logs for tracking changes

4. **Run Development Server**
```bash
pnpm dev
```
Open http://localhost:3000 to see the application.

## 📱 Pages & Features

| Page | Features |
|------|----------|
| **Dashboard** | Real-time stats, sales trends, category breakdown |
| **Medicines** | Full inventory management with search, filter, CRUD |
| **POS** | Cart-based sales with cashier tracking |
| **Purchases** | Record supplier purchases and auto-update stock |
| **Sales** | View transaction history with date filtering |
| **Reports** | Business analytics, top sellers, low stock, CSV export |

## 🔐 Security

- **Row Level Security (RLS)**: All tables protected with Supabase RLS policies
- **Input Validation**: Form validation on all inputs
- **Parameterized Queries**: Protection against SQL injection
- **Session Management**: Secure authentication via Supabase Auth

## 🎨 Design Features

- **Healthcare Color Scheme**: Professional blue, cyan, and accent colors
- **Responsive Layout**: Mobile-first design, works on all screen sizes
- **Accessible UI**: ARIA labels, semantic HTML, keyboard navigation
- **Interactive Charts**: Recharts for professional data visualization
- **Real-time Feedback**: Loading states, success messages, error handling

## 📈 Performance

- **Server-Side Data Fetching**: Optimized queries with pagination
- **Image Optimization**: Next.js Image component ready
- **Tailwind CSS v4**: Tree-shaking for minimal CSS output
- **Code Splitting**: Route-based code splitting for faster loads

## 🔄 Workflow Example

1. **Add Inventory**: Use Purchases page to add medicines and update stock
2. **Process Sales**: Use POS page to ring up customer transactions
3. **Monitor Stock**: Check Dashboard for low stock items
4. **View Reports**: Generate analytics and export data
5. **Manage Inventory**: Edit medicines, manage categories, track expiry

## 📝 API Structure

### Key Functions (lib/api.ts)
- `fetchMedicines()` - Get paginated medicines with search/filter
- `recordSale()` - Process transaction and deduct inventory
- `recordPurchase()` - Add purchase and increase inventory
- `fetchDashboardStats()` - Get real-time dashboard metrics
- `fetchSales()` - Get sales history with date filtering

## 🛠️ Customization

### Adding Medicine Categories
Edit seed data in database or use Medicines page to add new categories dynamically.

### Modifying Color Scheme
Update design tokens in `app/globals.css`:
```css
--primary: oklch(0.488 0.243 264.376); /* Blue */
--accent: oklch(0.568 0.227 149.237);  /* Cyan */
```

### Adding User Authentication
Supabase auth is already integrated. Add login flow using reference files.

## 📄 License

This project is built with v0 and uses Supabase for backend services.

## 🎓 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [Recharts](https://recharts.org)

## ✨ Ready for Production

PharmaTrack is production-ready and can be deployed immediately to:
- Vercel (recommended)
- AWS, Azure, Google Cloud
- Self-hosted environments

Simply configure your Supabase credentials and deploy!

---

**Built with v0 • Powered by Supabase • Designed for Philippines Pharmacy Market**

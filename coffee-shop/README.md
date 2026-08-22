
                         ☕ COFFEE SHOP
                              │
                              ▼
                    ┌───────────────────┐
                    │     Next.js 16    │
                    │    App Router     │
                    └─────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
       ┌────────────┐  ┌────────────┐  ┌────────────┐
       │   Public   │  │    User    │  │   Admin    │
       │   Pages    │  │   Pages    │  │   Pages    │
       └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
             │               │               │
             ▼               ▼               ▼
       ┌────────────┐  ┌────────────┐  ┌────────────┐
       │ Home       │  │ Profile    │  │ Dashboard  │
       │ Menu       │  │ Cart       │  │ Products   │
       │ Product    │  │ Checkout   │  │ Orders     │
       │ About      │  │ Orders     │  │ Coupons    │
       └────────────┘  │ Settings   │  │ Users      │
                       │ Notifica.  │  └────────────┘
                       └─────┬──────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ Reusable Components │
                  ├─────────────────────┤
                  │ Navbar              │
                  │ Footer              │
                  │ Product Card        │
                  │ Cart Components     │
                  │ Checkout Components │
                  │ Forms               │
                  │ UI Components       │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │    API ROUTES       │
                  ├─────────────────────┤
                  │ /api/auth           │
                  │ /api/products       │
                  │ /api/cart           │
                  │ /api/orders         │
                  │ /api/coupon         │
                  │ /api/payment        │
                  │ /api/profile        │
                  │ /api/settings       │
                  │ /api/notifications  │
                  └──────────┬──────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
       ┌────────────┐ ┌────────────┐ ┌────────────┐
       │ NextAuth   │ │  Prisma    │ │ Razorpay   │
       │ Auth       │ │    ORM     │ │  Payment   │
       └─────┬──────┘ └─────┬──────┘ └────────────┘
             │              │
             │              ▼
             │      ┌─────────────────┐
             │      │   PostgreSQL    │
             │      │    Database     │
             │      ├─────────────────┤
             │      │ User            │
             │      │ Product         │
             │      │ Cart            │
             │      │ CartItem        │
             │      │ Order           │
             │      │ OrderItem       │
             │      │ Coupon          │
             │      │ Notification    │
             │      │ AccountActivity │
             │      └─────────────────┘
             │
             ▼
       ┌──────────────┐
       │ Authentication│
       │ Login         │
       │ Register      │
       │ Session       │
       │ Role          │
       └──────────────┘
```

### 🔄 Main User Flow

```text
Register / Login
       │
       ▼
     Home
       │
       ▼
     Menu
       │
       ▼
   Product Details
       │
       ▼
      Cart
       │
       ▼
    Checkout
       │
       ├───────────────┐
       │               │
       ▼               ▼
      COD           ONLINE
       │               │
       │          Razorpay
       │               │
       │          Verification
       │               │
       └───────┬───────┘
               ▼
          Create Order
               │
               ▼
        Order Details
               │
               ▼
         Notifications
```

### 🛒 Cart Flow

```text
Product
   │
   ▼
Add to Cart
   │
   ▼
Cart
   │
   ├── Increase Quantity
   ├── Decrease Quantity
   ├── Remove Item
   └── Clear Cart
   │
   ▼
Checkout
```

### 💳 Payment Flow

```text
Checkout
   │
   ▼
Select ONLINE
   │
   ▼
POST /api/payment/create-order
   │
   ▼
Razorpay Order
   │
   ▼
Razorpay Checkout UI
   │
   ▼
Payment
   │
   ▼
POST /api/payment/verify
   │
   ▼
Create Order
   │
   ▼
/order/[id]
```

### 🎟️ Coupon Flow

```text
Checkout
   │
   ▼
Enter Coupon
   │
   ▼
POST /api/coupon/validate
   │
   ▼
Check Database
   │
   ├── Invalid
   ├── Expired
   ├── Minimum Amount
   └── Valid
         │
         ▼
     Calculate Discount
         │
         ▼
      Final Total
```

### 👤 User Settings Flow

```text
Settings
   │
   ├── Personal Settings
   │      └── Notifications / Order Updates / Promo / Email
   │
   ├── Account
   │      ├── Edit Profile
   │      ├── Phone
   │      ├── Email
   │      ├── Logout
   │      └── Delete Account
   │
   ├── Privacy
   │
   ├── Terms & Conditions
   │
   └── Notifications
```

### 🔔 Notification Flow

```text
Order / Account Activity
          │
          ▼
Create Notification
          │
          ▼
Notification Table
          │
          ▼
GET /api/notifications
          │
          ▼
Notifications Page
          │
          ├── Mark Read
          └── Delete
```

### 👨‍💼 Admin Flow

```text
Admin Login
     │
     ▼
Admin Dashboard
     │
     ├── Products
     │     ├── Create
     │     ├── Read
     │     ├── Update
     │     └── Delete
     │
     ├── Orders
     │     └── Update Status
     │
     ├── Coupons
     │     ├── Create
     │     └── Manage
     │
     └── Users
```

### 📁 Recommended Project Architecture

```text
coffee-shop/
│
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   │
│   ├── admin/
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── orders/
│   │   ├── coupons/
│   │   └── users/
│   │
│   ├── api/
│   │   ├── auth/
│   │   ├── products/
│   │   ├── cart/
│   │   ├── orders/
│   │   ├── coupon/
│   │   ├── payment/
│   │   ├── profile/
│   │   ├── settings/
│   │   └── notifications/
│   │
│   ├── cart/
│   ├── checkout/
│   ├── menu/
│   ├── order/
│   │   └── [id]/
│   ├── profile/
│   ├── settings/
│   │   ├── account/
│   │   ├── personal/
│   │   ├── privacy/
│   │   └── terms/
│   ├── notifications/
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── ui/
│   ├── cards/
│   ├── forms/
│   ├── layout/
│   ├── cart/
│   ├── checkout/
│   ├── order/
│   └── admin/
│
├── app/lib/
│   ├── prisma.ts
│   ├── auth.ts
│   └── activity.ts
│
├── prisma/
│   └── schema.prisma
│
├── public/
│   └── images/
│
├── types/
├── utils/
├── hooks/
│
├── auth.ts
├── prisma.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

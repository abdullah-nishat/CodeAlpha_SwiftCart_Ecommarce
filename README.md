# SwiftCart — Internship E-commerce Project

SwiftCart is a complete beginner-friendly full-stack e-commerce store built to match the internship task stack:

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express.js
- Database: PostgreSQL
- Authentication: express-session + bcrypt
- Image upload: Multer
- Payment: Cash on Delivery only

It intentionally does **not** use React, Next.js, TypeScript, NestJS, Pusher, Mailer, OTP, Google OAuth, or a payment gateway.

## Main features

### Customer
- Home page with featured products
- Product listing
- Search
- Category filter
- Minimum/maximum price filters
- Sorting
- Pagination
- Product details page
- Registration and login
- Session-based authentication
- Password hashing with bcrypt
- Database-backed shopping cart
- Cart quantity update/remove
- Stock validation
- Wishlist
- COD checkout
- Order processing with a PostgreSQL transaction
- Order history

### Admin
- Admin-only API protection
- Dashboard statistics
- Product list
- Add product
- Update product API
- Delete product
- Product image upload (JPG/PNG/WEBP/GIF, max 5 MB)
- Stock management
- Order list
- Order status update
- Stock restoration when an order is cancelled

## Database tables

- users
- categories
- products
- cart_items
- wishlist_items
- orders
- order_items
- user_sessions (created automatically by connect-pg-simple)

## Project structure

```text
SwiftCart_Ecommerce/
├── database/
│   ├── create_database.sql
│   ├── schema.sql
│   └── seed.sql
├── public/
│   ├── css/style.css
│   ├── js/
│   ├── images/
│   ├── uploads/
│   ├── index.html
│   ├── products.html
│   ├── product.html
│   ├── login.html
│   ├── register.html
│   ├── cart.html
│   ├── wishlist.html
│   ├── checkout.html
│   ├── orders.html
│   └── admin.html
├── src/
│   ├── config/db.js
│   ├── middleware/auth.js
│   ├── routes/
│   ├── scripts/create-admin.js
│   ├── utils/helpers.js
│   └── server.js
├── .env.example
├── package.json
└── README.md
```

# Run in VS Code on Windows

## 1. Prerequisites

You already have Node.js installed. You also need PostgreSQL and pgAdmin.

You do **not** install Express globally. Express will be installed inside this project by `npm install`.

Check Node/npm in VS Code terminal:

```powershell
node -v
npm -v
```

## 2. Open the project

Extract the ZIP, then in VS Code choose **File > Open Folder** and open `SwiftCart_Ecommerce`.

Open **Terminal > New Terminal**. PowerShell is fine.

## 3. Install packages

```powershell
npm install
```

This installs Express.js, PostgreSQL driver, bcrypt, sessions, Multer, and nodemon locally.

## 4. Create PostgreSQL database

Using pgAdmin:

1. Open pgAdmin.
2. Connect to your PostgreSQL server.
3. Right-click **Databases > Create > Database**.
4. Database name: `swiftcart`
5. Save.

Then open the **Query Tool** for `swiftcart`.

Run the full content of:

```text
database/schema.sql
```

Then run:

```text
database/seed.sql
```

## 5. Create `.env`

In the VS Code terminal:

```powershell
Copy-Item .env.example .env
```

Open `.env` and change your PostgreSQL password:

```env
PORT=5000
SESSION_SECRET=my-swiftcart-secret-2026
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=YOUR_REAL_POSTGRES_PASSWORD
DB_NAME=swiftcart
```

## 6. Create admin account

After the database/schema exists:

```powershell
npm run create-admin
```

Default admin login:

```text
Email: admin@swiftcart.com
Password: Admin123
```

You can create a custom admin:

```powershell
node src/scripts/create-admin.js yourmail@example.com YourPassword "Your Name"
```

## 7. Start the server

Development mode (recommended):

```powershell
npm run dev
```

or normal mode:

```powershell
npm start
```

Open:

```text
http://localhost:5000
```

Admin page after logging in as admin:

```text
http://localhost:5000/admin.html
```

## Important

Do not use VS Code Live Server for this project. The Express server already serves the HTML/CSS/JavaScript files and the API from the same port.

If PostgreSQL says authentication failed, your `DB_PASSWORD` in `.env` is wrong.

If port 5000 is busy, change `PORT=5001` and open `http://localhost:5001`.

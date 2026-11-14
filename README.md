# LookBook Swap API

RESTful JSON API for the MVP of LookBook's new **Swap** feature: exchanging used clothes between users, simply and safely.

start2impact exam project · Node.js

![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=white)
![Tests](https://img.shields.io/badge/tests-29%20passing-brightgreen)

---

## Context

LookBook is an Italian app for buying and selling second-hand clothing, founded by three former fast fashion professionals. Users upload photos of their items, get a price estimate, and can propose a **Swap**: an exchange that only happens if both parties accept.

- **Vision:** to normalize second-hand clothing, giving a second life to every garment forgotten in the wardrobe.
- **Mission:** to promote sustainable consumption and a culture of reuse as a conscious choice for the planet.

## Features

- **Products:** create, update, delete (name + number of photos)
- **Users:** create, update, delete (first name, last name, email)
- **Swap orders:** create, update, delete (products + users involved)
- **Querying:** list all orders, with filters by insertion date and by product

No front end: JSON API only.

## Tech stack

| Technology | Why |
| --- | --- |
| **Node.js + Express 5** | Lightweight and widely used. Express 5 automatically forwards errors from `async` routes to the central error handler: no repeated `try/catch` blocks. |
| **MySQL** (not MongoDB) | The data is relational: an order links many products and many users. Foreign keys prevent orders that reference nonexistent products or users. |
| **mysql2** with a connection pool | `execute()` uses the MySQL server's native prepared statements; the pool reuses connections across requests. |
| **dotenv** | Loads the database configuration from a `.env` file. |
| **Mocha · Chai · Sinon · Supertest** | API tests with a stubbed database, plus integration tests on a real MySQL database. |

Only three production dependencies (`express`, `mysql2`, `dotenv`). Validation is hand-written.

## Data model

```
products              order_products             orders
─────────             ──────────────             ──────────
id (PK)        ←──    order_id (FK)       ──→    id (PK)
name                  product_id (FK)            created_at
num_photos

users                 order_users
─────────             ──────────────
id (PK)        ←──    order_id (FK)       ──→    orders.id
name                  user_id (FK)
surname
email
```

- Two **junction tables** model the many-to-many relationships order↔products and order↔users.
- **Composite primary key**: the same product cannot appear twice in the same order.
- **`UNIQUE (product_id)` on `order_products`**: a garment can be part of only one swap at a time.
- **`UNIQUE (email)` on `users`**: two users cannot share the same email.
- **`ON DELETE CASCADE`**: deleting an order also removes its links.
- **Foreign keys without cascade on products and users**: a product or user involved in an order cannot be deleted (`409`).
- **`created_at` set by the database**: the insertion date cannot be forged by the client.

The full schema is in the `migrations.sql` file.

## Getting started

Requirements: Node.js 20+ and MySQL 8.

```bash
npm install
cp .env.example .env              # fill in your database credentials
mysql -u root -p < migrations.sql # creates the swap_db database and its tables
npm start                         # App Express running at port 3000
```

### Environment variables

| Variable | Description |
| --- | --- |
| `PORT` | HTTP port (default `3000`) |
| `DB_HOST` | MySQL host |
| `DB_USER` | MySQL user |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | Database name (`swap_db`) |

`DB_HOST`, `DB_USER`, `DB_PASSWORD` and `DB_NAME` are required: if any of them is missing, the server stops at startup with an explicit error instead of trying to connect with default credentials.

## Endpoints

| Method | Path | Action | Responses |
| --- | --- | --- | --- |
| `POST` | `/api/products` | Create product | 201 · 400 |
| `PUT` | `/api/products/:id` | Update product | 200 · 400 · 404 |
| `DELETE` | `/api/products/:id` | Delete product | 204 · 404 · 409 |
| `POST` | `/api/users` | Create user | 201 · 400 |
| `PUT` | `/api/users/:id` | Update user | 200 · 400 · 404 |
| `DELETE` | `/api/users/:id` | Delete user | 204 · 404 · 409 |
| `GET` | `/api/orders?date=&product_id=` | List and filter orders | 200 · 400 |
| `POST` | `/api/orders` | Create swap order | 201 · 400 · 422 |
| `PUT` | `/api/orders/:id` | Replace products and users | 200 · 400 · 404 · 422 |
| `DELETE` | `/api/orders/:id` | Delete order | 204 · 404 |

### Status codes

| Code | Meaning |
| --- | --- |
| `200` | OK, resource updated or read |
| `201` | Created, with the generated id |
| `204` | No Content, resource deleted |
| `400` | Invalid data or malformed JSON |
| `404` | Resource not found |
| `409` | Duplicate email, product already in another order, or product/user used in an order |
| `422` | Order references a nonexistent product or user |
| `500` | Internal error, with a generic message |

### REST conventions

- **Plural** resource names, never verbs in the URL: `/api/orders`, not `/getOrders`
- The **HTTP method is the action**: `GET` reads, `POST` creates, `PUT` replaces, `DELETE` deletes
- The **id in the path**, **filters in the query string**
- Request and response bodies always in **JSON**

## Querying orders

```bash
# all orders
GET /api/orders

# orders inserted on 9 November 2026
GET /api/orders?date=2026-11-09

# orders containing product 2
GET /api/orders?product_id=2

# filters can be combined
GET /api/orders?date=2026-11-09&product_id=2
```

The date must be in `YYYY-MM-DD` format and be a real date (e.g. `2026-13-01` → `400`).

Example response:

```json
// 200 OK
[
  {
    "id": 1,
    "created_at": "2026-11-09T10:00:00.000Z",
    "products": [1, 2],
    "users": [3, 4]
  }
]
```

Each order includes the ids of the products and users involved.

The orders are filtered first; then the links are read **only for the orders found** (`WHERE order_id IN (...)`) and grouped in memory with a `Map`. The cost of a request depends on the number of matching orders, not on the size of the whole database.

## Transactions

Creating or updating an order takes several writes: the order row, then one row per product and one per user. They must **all succeed or none**. Without a transaction, an order with products `[1, 999]` (where `999` does not exist) would leave an order linked to product 1 only, while the client receives an error; an update would leave an existing order emptied.

`db.js` exposes a `withTransaction` helper:

```js
export const withTransaction = async (work) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};
```

- A **dedicated connection** is taken from the pool, and every query of the transaction runs on it (`connection.execute`, never `pool.execute`, which could use a different connection outside the transaction).
- On any error the transaction is **rolled back**, then the error reaches the central handler (e.g. `422` for a nonexistent product).
- The connection is **always released** in `finally`.
- On update, the order row is locked with `SELECT ... FOR UPDATE` before its links are replaced, so concurrent updates cannot interleave.

```js
export const createOrder = ({ products, users }) =>
  withTransaction(async (connection) => {
    const [result] = await connection.execute("INSERT INTO orders () VALUES ()");
    await insertOrderLinks(connection, result.insertId, products, users);
    return result.insertId;
  });
```

## Validation

Invalid requests are rejected with `400` before reaching the database:

- ids in the path must be positive integers
- products need a non-empty name and a non-negative integer number of photos
- users need a non-empty name and surname and a valid email
- orders need non-empty lists of positive integer ids, **without duplicates** (`"products": [1, 1]` → `400`)
- order filters need a real `YYYY-MM-DD` date and a valid product id

## Security

**SQL Injection protection.** All queries use `pool.execute()`: prepared statements with `?` placeholders. SQL and data travel separately, so an input like `' OR 1=1 --` remains plain text.

```js
// the value never enters the SQL text
await pool.execute(
  "UPDATE users SET name = ?, surname = ?, email = ? WHERE id = ?",
  [name, surname, email, id]
);
```

In the dynamic order filters, the URL only decides *which* fixed SQL fragments to use, never their content:

```js
conditions.push("DATE(created_at) = ?");
params.push(date);
```

Other measures:

- **Input validation:** positive integer ids, valid emails, real dates, non-empty lists
- **Generic 500 errors:** no database details are exposed to the client

## Tests

```bash
npm test         # API tests, database stubbed with Sinon (no MySQL needed)
npm run test:db  # integration tests on the real database configured in .env
```

The stubbed tests cover routes, validation and error translation, but they cannot detect a half-written order. The integration tests run on a real MySQL database and verify that:

- creating an order with a nonexistent product returns `422` and **leaves no order behind**
- updating an order with a nonexistent product returns `422` and **keeps the existing products and users**

## Project structure

```
src/
  server.js           entry point, reads PORT
  app.js              Express app, routers and central error handler
  db.js               MySQL pool and withTransaction helper
  validators.js       request validation
  responses.js        shared 400 / 404 responses
  routes/             one router per resource (products, users, orders)
  repositories/       database queries per resource
test/                 API tests with a stubbed database
test/db/              integration tests on a real database
migrations.sql        database schema
```

## Author

**Andrea Brescia** · start2impact Node.js project
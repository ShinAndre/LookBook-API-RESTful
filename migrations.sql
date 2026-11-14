CREATE DATABASE IF NOT EXISTS swap_db;
USE swap_db;

CREATE TABLE products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  num_photos INT UNSIGNED NOT NULL
);

CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  surname VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE orders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_products (
  order_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (order_id, product_id),
  CONSTRAINT uq_order_products_product UNIQUE (product_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE order_users (
  order_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (order_id, user_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

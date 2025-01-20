
USE warehouse_db;

INSERT INTO products (id, name, quantity) VALUES
('p1', 'Laptop', 50),
('p2', 'Smartphone', 100),
('p3', 'Tablet', 30),
('p4', 'Headphones', 200),
('p5', 'Monitor', 25);

INSERT INTO orders (id, customer_name, order_date) VALUES
('o1', 'John Doe', CURDATE()),
('o2', 'Jane Smith', DATE_ADD(CURDATE(), INTERVAL 1 DAY)),
('o3', 'Bob Johnson', DATE_ADD(CURDATE(), INTERVAL 2 DAY));

INSERT INTO order_items (id, order_id, product_id, quantity) VALUES
('oi1', 'o1', 'p1', 2),
('oi2', 'o1', 'p4', 1),
('oi3', 'o2', 'p2', 3),
('oi4', 'o3', 'p3', 1),
('oi5', 'o3', 'p5', 2);
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import { format, isBefore, startOfDay } from 'date-fns';

const app = express();
const port = 3000;

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'a1a89tg4pZmFy49y',
  database: 'warehouse_db'
};

app.use(cors());
app.use(express.json());

const pool = mysql.createPool(dbConfig);

const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Функция для автоматического удаления просроченных заказов
const cleanupExpiredOrders = async () => {
  try {
    console.log('Starting automatic cleanup of expired orders...');
    const today = startOfDay(new Date());
    
    await pool.query('START TRANSACTION');
    
    const [orders] = await pool.query(
      'SELECT * FROM orders WHERE order_date < ?',
      [format(today, 'yyyy-MM-dd')]
    );
    
    for (const order of orders) {
      const [items] = await pool.query(
        'SELECT * FROM order_items WHERE order_id = ?',
        [order.id]
      );
      
      for (const item of items) {
        await pool.query(
          'UPDATE products SET quantity = quantity + ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }
      
      await pool.query('DELETE FROM order_items WHERE order_id = ?', [order.id]);
      await pool.query('DELETE FROM orders WHERE id = ?', [order.id]);
      
      console.log(`Order with ID ${order.id} has been deleted`);
      
    }
    
    await pool.query('COMMIT');
    console.log('Automatic cleanup of expired orders completed.');
  } catch (error) {
     await pool.query('ROLLBACK');
    console.error('Error during automatic cleanup of expired orders:', error);
  }
};

app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const [orders] = await pool.query(`
      SELECT 
        o.*,
        COALESCE(
          JSON_ARRAYAGG(
            CASE WHEN oi.id IS NOT NULL
              THEN JSON_OBJECT(
                'id', oi.id,
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'product_name', p.name
              )
              ELSE NULL
            END
          ),
          JSON_ARRAY()
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      GROUP BY o.id
    `);
    
     const cleanedOrders = orders.map(order => ({
      ...order,
      items: order.items.filter(item => item !== null)
     }));

    res.json(cleanedOrders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders', async (req, res) => {
  const { customer_name, order_date, items } = req.body;
  
  try {
    await pool.query('START TRANSACTION');
    
    const orderId = generateId();
    await pool.query(
      'INSERT INTO orders (id, customer_name, order_date, status) VALUES (?, ?, ?, "pending")',
      [orderId, customer_name, order_date]
    );
    
    for (const item of items) {
      const [[product]] = await pool.query(
        'SELECT quantity FROM products WHERE id = ? FOR UPDATE',
        [item.product_id]
      );
      
      if (!product || product.quantity < item.quantity) {
        await pool.query('ROLLBACK');
        return res.status(400).json({
          error: `Insufficient quantity for product ${item.product_id}`
        });
      }
      
      await pool.query(
        'INSERT INTO order_items (id, order_id, product_id, quantity) VALUES (?, ?, ?, ?)',
        [generateId(), orderId, item.product_id, item.quantity]
      );
      
      await pool.query(
        'UPDATE products SET quantity = quantity - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }
    
    await pool.query('COMMIT');
    res.status(201).json({ id: orderId });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { customer_name, order_date, items } = req.body;
  
  try {
    await pool.query('START TRANSACTION');
    
    await pool.query(
      'UPDATE orders SET customer_name = ?, order_date = ? WHERE id = ?',
      [customer_name, order_date, id]
    );
    
    const [currentItems] = await pool.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [id]
    );
    
    for (const item of currentItems) {
      await pool.query(
        'UPDATE products SET quantity = quantity + ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }
    
    await pool.query('DELETE FROM order_items WHERE order_id = ?', [id]);
    
    for (const item of items) {
      const [[product]] = await pool.query(
        'SELECT quantity FROM products WHERE id = ? FOR UPDATE',
        [item.product_id]
      );
      
      if (!product || product.quantity < item.quantity) {
        await pool.query('ROLLBACK');
        return res.status(400).json({
          error: `Insufficient quantity for product ${item.product_id}`
        });
      }
      
      await pool.query(
        'INSERT INTO order_items (id, order_id, product_id, quantity) VALUES (?, ?, ?, ?)',
        [generateId(), id, item.product_id, item.quantity]
      );
      
      await pool.query(
        'UPDATE products SET quantity = quantity - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }
    
    await pool.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error updating order:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    await pool.query('START TRANSACTION');
    
    const [items] = await pool.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [id]
    );
    
    for (const item of items) {
      await pool.query(
        'UPDATE products SET quantity = quantity + ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }
    
    await pool.query('DELETE FROM orders WHERE id = ?', [id]);
    
    await pool.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error deleting order:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/advance-date', async (req, res) => {
    const { date } = req.body;
  try {
      
    const parsedDate = date ? startOfDay(new Date(date)) : startOfDay(new Date());
    await pool.query('START TRANSACTION');
    
    const [orders] = await pool.query(
      'SELECT * FROM orders WHERE order_date <= ? AND status = "pending"',
      [format(parsedDate, 'yyyy-MM-dd')]
    );
    
      for (const order of orders) {
          await pool.query('UPDATE orders SET status = "completed" WHERE id = ?', [order.id]);
      }
    
    
    await pool.query(`
      UPDATE products 
      SET quantity = quantity + FLOOR(RAND() * 20)
    `);
    
    await pool.query('COMMIT');
    res.json({ success: true, processed_orders: orders.length });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error advancing date:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/cleanup-orders', async (req, res) => {
  try {
    await pool.query('START TRANSACTION');
    
    const today = startOfDay(new Date());
    const [orders] = await pool.query(
        'SELECT * FROM orders WHERE order_date < ?',
        [format(today, 'yyyy-MM-dd')]
    );
    
    for (const order of orders) {
        const [items] = await pool.query(
            'SELECT * FROM order_items WHERE order_id = ?',
            [order.id]
            );
        
        for (const item of items) {
            await pool.query(
                'UPDATE products SET quantity = quantity + ? WHERE id = ?',
                [item.quantity, item.product_id]
                );
        }
        
        await pool.query('DELETE FROM order_items WHERE order_id = ?', [order.id]);
        await pool.query('DELETE FROM orders WHERE id = ?', [order.id]);
    }
      
    
    await pool.query('COMMIT');
    res.json({ success: true, deleted: orders.length });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error cleaning up orders:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, async () => {
  console.log(`Server running at http://localhost:${port}`);
  await cleanupExpiredOrders(); 
});
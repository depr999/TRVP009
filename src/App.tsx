import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, Package, Plus, Trash2, Edit2, RefreshCw, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  quantity: number;
}

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  product_name: string;
}

interface Order {
  id: string;
  customer_name: string;
  order_date: string;
  status: 'pending' | 'completed' | 'cancelled';
  items: OrderItem[];
}

function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isServerConnected, setIsServerConnected] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    order_date: format(new Date(), 'yyyy-MM-dd'),
    items: [{ product_id: '', quantity: 1 }]
  });

  useEffect(() => {
    checkServerConnection();
  }, []);

  const checkServerConnection = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/products');
      if (response.ok) {
        setIsServerConnected(true);
        await Promise.all([fetchOrders(), fetchProducts()]);
      } else {
        throw new Error('Server responded with an error');
      }
    } catch (error) {
      console.error('Server connection failed:', error);
      toast.error('Failed to connect to server. Please make sure the server is running.');
      setIsServerConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/orders');
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingOrder
        ? `http://localhost:3000/api/orders/${editingOrder.id}`
        : 'http://localhost:3000/api/orders';
      
      const method = editingOrder ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      
      toast.success(editingOrder ? 'Order updated successfully' : 'Order created successfully');
      setIsModalOpen(false);
      setEditingOrder(null);
      resetForm();
      fetchOrders();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`http://localhost:3000/api/orders/${id}`, {
        method: 'DELETE'
      });
      toast.success('Order deleted successfully');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to delete order');
    }
  };

  const handleAdvanceDate = async () => {
    try {
      await fetch('http://localhost:3000/api/advance-date', {
        method: 'POST'
      });
      toast.success('Date advanced successfully');
      fetchOrders();
      fetchProducts();
    } catch (error) {
      toast.error('Failed to advance date');
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: '',
      order_date: format(new Date(), 'yyyy-MM-dd'),
      items: [{ product_id: '', quantity: 1 }]
    });
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { product_id: '', quantity: 1 }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          <span className="text-lg font-medium text-gray-900">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isServerConnected) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Connection Error</h2>
          <p className="text-gray-600 mb-6">
            Unable to connect to the server. Please make sure:
          </p>
          <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
            <li>The server is running (npm run server)</li>
            <li>MySQL database is running</li>
            <li>Server is accessible at http://localhost:3000</li>
          </ul>
          <button
            onClick={checkServerConnection}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Warehouse Management</h1>
            <div className="space-x-4">
              <button
                onClick={handleAdvanceDate}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Advance Date
              </button>
              <button
                onClick={() => {
                  setEditingOrder(null);
                  resetForm();
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Orders list */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flow-root">
              <ul role="list" className="-my-5 divide-y divide-gray-200">
                {orders.length === 0 ? (
                  <li className="py-8">
                    <div className="text-center text-gray-500">
                      <Package className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No orders</h3>
                      <p className="mt-1 text-sm text-gray-500">Get started by creating a new order.</p>
                    </div>
                  </li>
                ) : (
                  orders.map(order => (
                    <li key={order.id} className="py-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{order.customer_name}</h3>
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <Calendar className="h-4 w-4 mr-1" />
                            {format(new Date(order.order_date), 'PP')}
                          </div>
                          <div className="mt-2">
                            {order.items.map(item => (
                              <span
                                key={item.id}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2"
                              >
                                <Package className="h-3 w-3 mr-1" />
                                {item.product_name} ({item.quantity})
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingOrder(order);
                              setFormData({
                                customer_name: order.customer_name,
                                order_date: order.order_date,
                                items: order.items.map(item => ({
                                  product_id: item.product_id,
                                  quantity: item.quantity
                                }))
                              });
                              setIsModalOpen(true);
                            }}
                            className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(order.id)}
                            className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <form onSubmit={handleSubmit}>
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {editingOrder ? 'Edit Order' : 'New Order'}
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700">
                        Customer Name
                      </label>
                      <input
                        type="text"
                        name="customer_name"
                        id="customer_name"
                        value={formData.customer_name}
                        onChange={e => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="order_date" className="block text-sm font-medium text-gray-700">
                        Order Date
                      </label>
                      <input
                        type="date"
                        name="order_date"
                        id="order_date"
                        value={formData.order_date}
                        onChange={e => setFormData(prev => ({ ...prev, order_date: e.target.value }))}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Items</label>
                      {formData.items.map((item, index) => (
                        <div key={index} className="mt-2 flex items-center space-x-2">
                          <select
                            value={item.product_id}
                            onChange={e => {
                              const newItems = [...formData.items];
                              newItems[index].product_id = e.target.value;
                              setFormData(prev => ({ ...prev, items: newItems }));
                            }}
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                          >
                            <option value="">Select product</option>
                            {products.map(product => (
                              <option key={product.id} value={product.id}>
                                {product.name} (Available: {product.quantity})
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={e => {
                              const newItems = [...formData.items];
                              newItems[index].quantity = parseInt(e.target.value);
                              setFormData(prev => ({ ...prev, items: newItems }));
                            }}
                            min="1"
                            className="block w-24 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                          />
                          {formData.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addItem}
                        className="mt-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
                  >
                    {editingOrder ? 'Save Changes' : 'Create Order'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingOrder(null);
                      resetForm();
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
// src/pages/admin/AdminOrderList.jsx
import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

const AdminOrderList = () => {
  const [orders, setOrders] = useState([]);
  const [viewMode, setViewMode] = useState('maker'); // 'maker', 'company', 'summary'

  useEffect(() => {
    const fetchOrders = async () => {
      const snapshot = await getDocs(collection(db, 'orders'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(data);
    };
    fetchOrders();
  }, []);

  const groupBy = (array, key) => {
    return array.reduce((result, item) => {
      const groupKey = item[key];
      if (!result[groupKey]) result[groupKey] = [];
      result[groupKey].push(item);
      return result;
    }, {});
  };

  const renderOrders = (grouped) => {
    return Object.entries(grouped).map(([groupKey, items]) => (
      <div key={groupKey} className="border p-4 mb-4">
        <h3 className="font-bold text-lg mb-2">{viewMode === 'maker' ? 'メーカーID' : '会社ID'}: {groupKey}</h3>
        {items.map(order => (
          <div key={order.id} className="mb-2 border-b pb-2">
            <p className="text-sm text-gray-500">発注日: {order.timestamp?.toDate().toLocaleString()}</p>
            <p className="text-sm text-gray-500">納品方法: {order.deliveryOption || '未入力'}</p>
            <p className="text-sm text-gray-500">納品先住所: {order.customAddress || '未入力'}</p>
            <p className="text-sm text-gray-500">高橋本社担当者: {order.takahashiContact || '未入力'}</p>
            <p className="text-sm text-gray-500">お客様担当者: {order.personName || '未入力'}</p>
            <p className="text-sm text-gray-500">納品希望日: {order.deliveryDate || '未入力'}</p>
            {order.items.map((item, idx) => (
              <div key={idx} className="text-sm ml-4">
                ・{item.itemCode} / {item.name}：{item.quantity}個 × {item.price}円
              </div>
            ))}
          </div>
        ))}
      </div>
    ));
  };

  const renderSummary = () => {
    const summary = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        const key = item.itemCode;
        if (!summary[key]) summary[key] = { ...item, total: 0 };
        summary[key].total += Number(item.quantity);
      });
    });
    return (
      <div className="border p-4">
        <h3 className="font-bold text-lg mb-2">商品別集計</h3>
        {Object.entries(summary).map(([code, item]) => (
          <div key={code} className="text-sm border-b py-1">
            {code} / {item.name}：合計 {item.total}個
          </div>
        ))}
      </div>
    );
  };

  const grouped = groupBy(orders, viewMode === 'maker' ? 'makerId' : 'companyId');

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">管理画面：発注一覧</h2>

      <div className="space-x-2 mb-4">
        <button onClick={() => setViewMode('maker')} className={`px-3 py-1 rounded ${viewMode === 'maker' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>メーカー別</button>
        <button onClick={() => setViewMode('company')} className={`px-3 py-1 rounded ${viewMode === 'company' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>会社別</button>
        <button onClick={() => setViewMode('summary')} className={`px-3 py-1 rounded ${viewMode === 'summary' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>集計</button>
      </div>

      {viewMode === 'summary' ? renderSummary() : renderOrders(grouped)}
    </div>
  );
};

export default AdminOrderList;

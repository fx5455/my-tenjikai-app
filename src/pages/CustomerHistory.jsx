// src/pages/CustomerHistory.jsx
import React, { useState, useEffect } from 'react';
import { getDocs, getDoc, collection, query, where, doc } from 'firebase/firestore';
import { db } from '../firebase';
import QRCodeScanner from '../components/QRCodeScanner';

const CustomerHistory = () => {
  const [scanning, setScanning] = useState(true);
  const [companyId, setCompanyId] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [items, setItems] = useState([]);

  // QRスキャン完了
  const handleScan = async (id) => {
    setCompanyId(id);
    setScanning(false);
    // 会社名取得
    const snap = await getDoc(doc(db, 'companies', id));
    setCompanyName(snap.exists() ? snap.data().name : id);
    // 発注データ取得
    const snapOrders = await getDocs(
      query(collection(db, 'orders'), where('companyId', '==', id))
    );
    // 全アイテムを平坦化して集約
    const all = snapOrders.docs
      .flatMap(d => d.data().items.map(item => ({
        ...item,
        orderDate: d.data().deliveryDate || d.data().timestamp?.toDate().toLocaleString()
      })));
    setItems(all);
  };

  // 再スキャン
  const reset = () => {
    setCompanyId(null);
    setCompanyName('');
    setItems([]);
    setScanning(true);
  };

  if (scanning) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <QRCodeScanner
          mode="company"
          setCompanyId={handleScan}
          onCancel={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 bg-white text-black">
      <h2 className="text-2xl font-bold mb-4">
        購入履歴: {companyName}
      </h2>
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((it, idx) => (
            <li key={idx} className="border-b pb-2">
              <div>日付: {it.orderDate}</div>
              <div>品番: {it.itemCode}</div>
              <div>商品名: {it.name}</div>
              <div>数量: {it.quantity}</div>
              <div>単価: {it.price.toLocaleString()} 円</div>
              {it.remarks && <div>備考: {it.remarks}</div>}
            </li>
          ))}
        </ul>
      ) : (
        <p>発注履歴がありません。</p>
      )}
      <button
        onClick={reset}
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded"
      >
        再読み取り
      </button>
    </div>
  );
};

export default CustomerHistory;

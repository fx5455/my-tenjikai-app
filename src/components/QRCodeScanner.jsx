import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../firebase';
import QRCodeScanner from '../components/QRCodeScanner';

const OrderEntry = () => {
  const [orders, setOrders] = useState([
    { itemCode: '', name: '', quantity: '', price: '', remarks: '' },
  ]);
  const [companyId, setCompanyId] = useState('');
  const [makerId, setMakerId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [makerName, setMakerName] = useState('');
  const [deliveryOption, setDeliveryOption] = useState('会社入れ');
  const [customAddress, setCustomAddress] = useState('納品先住所');
  const [takahashiContact, setTakahashiContact] = useState('');
  const [personName, setPersonName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [scanningFor, setScanningFor] = useState(null); // 'company' | 'maker'
  const [existingOrderId, setExistingOrderId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // 初期化・ロード処理省略...

  // 明細操作
  const addRow = () => setOrders([...orders, { itemCode: '', name: '', quantity: '', price: '', remarks: '' }]);
  const removeRow = idx => setOrders(orders.filter((_, i) => i !== idx));
  const handleInputChange = (i, field, v) => {
    const arr = [...orders]; arr[i][field] = v; setOrders(arr);
  };

  // バリデーション
  const isValid = companyId && makerId && orders.every(o => o.name && o.quantity && o.price);

  // 送信
  const handleSubmit = async () => { /* 省略 */ };

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      <h2 className="text-2xl font-bold">展示会 発注登録</h2>
      {isEditing && <p className="text-blue-600">※ 編集モード</p>}

      {/* QR スキャンオーバーレイ */}
      {scanningFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <QRCodeScanner
            mode={scanningFor}
            setCompanyId={id => { if (scanningFor === 'company') setCompanyId(id); }}
            setMakerId={id => { if (scanningFor === 'maker') setMakerId(id); }}
            onCancel={() => setScanningFor(null)}
          />
        </div>
      )}

      {/* 会社/メーカーID セクション */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-4 rounded shadow">
        <div>
          <label className="block font-semibold mb-1">会社ID</label>
          <div className="flex space-x-2">
            <input
              type="text"
              className="flex-1 border rounded px-2 py-1"
              placeholder="会社ID"
              value={companyId}
              onChange={e => setCompanyId(e.target.value)}
            />
            <button
              onClick={() => setScanningFor('company')}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
            >
              {scanningFor === 'company' ? 'キャンセル' : 'Scan'}
            </button>
          </div>
          {companyName && <p className="mt-1 text-gray-600 text-sm">会社名: {companyName}</p>}
        </div>
        <div>
          <label className="block font-semibold mb-1">メーカーID</label>
          <div className="flex space-x-2">
            <input
              type="text"
              className="flex-1 border rounded px-2 py-1"
              placeholder="メーカーID"
              value={makerId}
              onChange={e => setMakerId(e.target.value)}
            />
            <button
              onClick={() => setScanningFor('maker')}
              className="bg-purple-500 text-white px-3 py-1 rounded text-sm"
            >
              {scanningFor === 'maker' ? 'キャンセル' : 'Scan'}
            </button>
          </div>
          {makerName && <p className="mt-1 text-gray-600 text-sm">メーカー名: {makerName}</p>}
        </div>
      </div>

      {/* 配送 & 明細 & 登録ボタン 省略... */}

    </div>
  );
};

export default OrderEntry;

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
  const [scanningFor, setScanningFor] = useState(null);
  const [existingOrderId, setExistingOrderId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (deliveryOption !== 'その他(備考欄)') setCustomAddress('納品先住所');
    else setCustomAddress('');
  }, [deliveryOption]);

  useEffect(() => {
    const fetchCompany = async () => {
      if (!companyId) return setCompanyName('');
      try {
        const snap = await getDoc(doc(db, 'companies', companyId));
        setCompanyName(snap.exists() ? snap.data().name || '該当なし' : '該当なし');
      } catch {
        setCompanyName('取得失敗');
      }
    };
    fetchCompany();
  }, [companyId]);

  useEffect(() => {
    const fetchMaker = async () => {
      if (!makerId) return setMakerName('');
      try {
        const snap = await getDoc(doc(db, 'makers', makerId));
        setMakerName(snap.exists() ? snap.data().name || '該当なし' : '該当なし');
      } catch {
        setMakerName('取得失敗');
      }
    };
    fetchMaker();
  }, [makerId]);

  useEffect(() => {
    const load = async () => {
      if (!companyId || !makerId) return;
      const snap = await getDocs(
        query(
          collection(db, 'orders'),
          where('companyId', '==', companyId),
          where('makerId', '==', makerId)
        )
      );
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setOrders(data.items || []);
        setDeliveryOption(data.deliveryOption || '会社入れ');
        setCustomAddress(data.customAddress || '納品先住所');
        setTakahashiContact(data.takahashiContact || '');
        setPersonName(data.personName || '');
        setDeliveryDate(data.deliveryDate || '');
        setExistingOrderId(snap.docs[0].id);
        setIsEditing(true);
      }
    };
    load();
  }, [companyId, makerId]);

  const handleInputChange = (i, field, v) => {
    const arr = [...orders];
    arr[i][field] = v;
    setOrders(arr);
  };
  const addRow = () => setOrders([...orders, { itemCode: '', name: '', quantity: '', price: '', remarks: '' }]);
  const removeRow = i => setOrders(orders.filter((_, idx) => idx !== i));
  const isValid = companyId && makerId && orders.every(o => o.name && o.quantity && o.price);

  const handleSubmit = async () => {
    if (!isValid) return alert('必須項目を入力');
    const payload = { companyId, makerId, deliveryOption, customAddress: deliveryOption === 'その他(備考欄)' ? customAddress : '納品先住所', takahashiContact, personName, deliveryDate, timestamp: serverTimestamp(), items: orders };
    try {
      if (existingOrderId) await updateDoc(doc(db, 'orders', existingOrderId), payload);
      else await addDoc(collection(db, 'orders'), payload);
      alert(isEditing ? '更新しました' : '登録しました');
      setOrders([{ itemCode: '', name: '', quantity: '', price: '', remarks: '' }]);
      setCompanyId(''); setMakerId(''); setTakahashiContact(''); setPersonName(''); setDeliveryDate(''); setExistingOrderId(null); setIsEditing(false);
    } catch { alert('失敗'); }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold">展示会 発注登録</h2>
      {isEditing && <p className="text-blue-600">※ 編集モード</p>}

      {/* ID セクション */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded shadow">
        <div>
          <label className="block mb-1 font-semibold">会社ID</label>
          <div className="flex space-x-2">
            <input
              className="flex-1 border rounded px-2 py-1 text-sm"
              value={companyId}
              onChange={e => setCompanyId(e.target.value)}
              placeholder="会社ID"
            />
            <button onClick={() => setScanningFor('company')} className="bg-blue-500 text-white px-3 rounded text-sm">Scan</button>
          </div>
          {companyName && <p className="mt-1 text-gray-600 text-sm">会社名: {companyName}</p>}
        </div>
        <div>
          <label className="block mb-1 font-semibold">メーカーID</label>
          <div className="flex space-x-2">
            <input
              className="flex-1 border rounded px-2 py-1 text-sm"
              value={makerId}
              onChange={e => setMakerId(e.target.value)}
              placeholder="メーカーID"
            />
            <button onClick={() => setScanningFor('maker')} className="bg-purple-500 text-white px-3 rounded text-sm">Scan</button>
          </div>
          {makerName && <p className="mt-1 text-gray-600 text-sm">メーカー名: {makerName}</p>}
        </div>
      </div>

      {scanningFor && <QRCodeScanner onScan={id => { if (scanningFor === 'company') setCompanyId(id); else setMakerId(id); setScanningFor(null); }} />}

      {/* 配送 & 担当者 */}
      <div className="bg-white p-4 rounded shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block mb-1 font-semibold">納品方法</label>
            <select className="w-full border rounded px-2 py-1 text-sm" value={deliveryOption} onChange={e => setDeliveryOption(e.target.value)}>
              {['会社入れ','現場入れ','倉庫入れ','その他(備考欄)'].map(opt => <option key={opt}>{opt}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1 font-semibold">納品先住所</label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              disabled={deliveryOption !== 'その他(備考欄)'}
              value={customAddress}
              onChange={e => setCustomAddress(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold">高橋本社担当者</label>
            <input className="w-full border rounded px-2 py-1 text-sm" value={takahashiContact} onChange={e => setTakahashiContact(e.target.value)} placeholder="山田太郎" />
          </div>
          <div>
            <label className="block mb-1 font-semibold">お客様担当者</label>
            <input className="w-full border rounded px-2 py-1 text-sm" value={personName} onChange={e => setPersonName(e.target.value)} placeholder="担当者名" />
          </div>
          <div className="md:col-span-2">
            <label className="block mb-1 font-semibold">納品希望日</label>
            <input type="date" className="w-full border rounded px-2 py-1 text-sm" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* 明細テーブル */}
      <div className="bg-white p-4 rounded shadow overflow-x-auto">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">明細</h3>
          <button onClick={addRow} className="bg-green-500 text-white px-3 rounded text-sm">+ 行追加</button>
        </div>
        <div className="space-y-2">
          {orders.map((o, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end">
              {['品番','商品名','数量','単価','備考'].map((label, idx) => (
                <div key={label} className="flex flex-col">
                  <label className="text-xs text-gray-500">{label}</label>
                  <input
                    type={idx >=2 && idx <=3 ? 'number' : 'text'}
                    value={[o.itemCode, o.name, o.quantity, o.price, o.remarks][idx]}
                    onChange={e => handleInputChange(i, ['itemCode','name','quantity','price','remarks'][idx], e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  />
                </div>
              ))}
              <button onClick={() => removeRow(i)} className="bg-red-500 text-white px-2 py-1 rounded text-sm">削除</button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`px-6 py-2 rounded ${isValid ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'} text-sm`}
        >
          {isEditing ? '更新' : '登録'}
        </button>
      </div>
    </div>
  );
};

export default OrderEntry;

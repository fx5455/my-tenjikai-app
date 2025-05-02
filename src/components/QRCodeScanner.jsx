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
  const [scanningFor, setScanningFor] = useState(null); // 'company' or 'maker'
  const [existingOrderId, setExistingOrderId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // 初期化・ロード
  useEffect(() => {
    setCustomAddress(deliveryOption === 'その他(備考欄)' ? '' : '納品先住所');
  }, [deliveryOption]);

  useEffect(() => {
    if (!companyId) {
      setCompanyName(''); return;
    }
    getDoc(doc(db, 'companies', companyId))
      .then(snap => setCompanyName(snap.exists() ? snap.data().name || '該当なし' : '該当なし'))
      .catch(() => setCompanyName('取得失敗'));
  }, [companyId]);

  useEffect(() => {
    if (!makerId) {
      setMakerName(''); return;
    }
    getDoc(doc(db, 'makers', makerId))
      .then(snap => setMakerName(snap.exists() ? snap.data().name || '該当なし' : '該当なし'))
      .catch(() => setMakerName('取得失敗'));
  }, [makerId]);

  useEffect(() => {
    if (!companyId || !makerId) return;
    getDocs(
      query(
        collection(db, 'orders'),
        where('companyId', '==', companyId),
        where('makerId', '==', makerId)
      )
    ).then(snap => {
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
    });
  }, [companyId, makerId]);

  const handleInputChange = (i, field, v) => {
    const arr = [...orders]; arr[i][field] = v;
    setOrders(arr);
  };
  const addRow = () => setOrders([...orders, { itemCode: '', name: '', quantity: '', price: '', remarks: '' }]);
  const removeRow = i => setOrders(orders.filter((_, idx) => idx !== i));

  const isValid = companyId && makerId && orders.every(o => o.name && o.quantity && o.price);

  const handleSubmit = async () => {
    if (!isValid) return alert('必須項目を入力してください');
    const payload = { companyId, makerId, deliveryOption,
      customAddress: deliveryOption==='その他(備考欄)'?customAddress:'納品先住所',
      takahashiContact, personName, deliveryDate,
      timestamp: serverTimestamp(), items: orders};
    try {
      if (existingOrderId) await updateDoc(doc(db,'orders',existingOrderId),payload);
      else await addDoc(collection(db,'orders'),payload);
      alert(isEditing?'更新しました':'登録しました');
      // リセット
      setOrders([{ itemCode:'', name:'', quantity:'', price:'', remarks:'' }]);
      setCompanyId(''); setMakerId(''); setTakahashiContact(''); setPersonName(''); setDeliveryDate('');
      setExistingOrderId(null); setIsEditing(false);
    } catch { alert('送信失敗'); }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold">展示会 発注登録</h2>
      {isEditing && <p className="text-blue-600 mb-2">※ 編集モード</p>}

      {/* オーバーレイ スキャナー */}
      {scanningFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-4 rounded">
            <QRCodeScanner
              mode={scanningFor}
              setCompanyId={id=>{if(scanningFor==='company')setCompanyId(id)}}
              setMakerId={id=>{if(scanningFor==='maker')setMakerId(id)}}
              onCancel={()=>setScanningFor(null)}
            />
          </div>
        </div>
      )}

      {/* ID 入力 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-4 rounded shadow mb-6">
        <div>
          <label className="block font-semibold mb-1">会社ID</label>
          <div className="flex space-x-2">
            <input type="text" className="flex-1 border rounded px-2 py-1" placeholder="会社ID" value={companyId} onChange={e=>setCompanyId(e.target.value)} />
            <button onClick={()=>setScanningFor('company')} className="bg-blue-500 text-white px-3 py-1 rounded">Scan</button>
          </div>
          {companyName && <p className="mt-1 text-sm text-gray-600">会社名: {companyName}</p>}
        </div>
        <div>
          <label className="block font-semibold mb-1">メーカーID</label>
          <div className="flex space-x-2">
            <input type="text" className="flex-1 border rounded px-2 py-1" placeholder="メーカーID" value={makerId} onChange={e=>setMakerId(e.target.value)} />
            <button onClick={()=>setScanningFor('maker')} className="bg-purple-500 text-white px-3 py-1 rounded">Scan</button>
          </div>
          {makerName && <p className="mt-1 text-sm text-gray-600">メーカー名: {makerName}</p>}
        </div>
      </div>

      {/* その他フォーム... （省略せずに載せてください） */}

      <div className="flex justify-end">
        <button onClick={handleSubmit} disabled={!isValid} className={`${isValid?'bg-blue-600 text-white':'bg-gray-300 text-gray-500'} px-6 py-2 rounded`}>{isEditing?'更新':'登録'}</button>
      </div>
    </div>
  );
};

export default OrderEntry;

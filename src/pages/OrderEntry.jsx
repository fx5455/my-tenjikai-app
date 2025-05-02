import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';  // ← 追加
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
  // 明細データ
  const [orders, setOrders] = useState([
    { itemCode: '', name: '', quantity: '', price: '', remarks: '' },
  ]);

  // 会社・メーカーID とフォーム
  const [companyId, setCompanyId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [makerId, setMakerId] = useState('');
  const [makerName, setMakerName] = useState('');
  const [makerLocked, setMakerLocked] = useState(false); // メーカー固定フラグ

  const [deliveryOption, setDeliveryOption] = useState('会社入れ');
  const [customAddress, setCustomAddress] = useState('納品先住所');
  const [takahashiContact, setTakahashiContact] = useState('');
  const [personName, setPersonName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');

  // スキャンモード ('company' | 'maker')
  const [scanningFor, setScanningFor] = useState(null);

  // 編集モード
  const [existingOrderId, setExistingOrderId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // 納品先住所切り替え
  useEffect(() => {
    setCustomAddress(deliveryOption === 'その他(備考欄)' ? '' : '納品先住所');
  }, [deliveryOption]);

  // 会社名取得
  useEffect(() => {
    if (!companyId) {
      setCompanyName('');
      return;
    }
    getDoc(doc(db, 'companies', companyId))
      .then(snap => setCompanyName(snap.exists() ? snap.data().name || '該当なし' : '該当なし'))
      .catch(() => setCompanyName('取得失敗'));
  }, [companyId]);

  // メーカー名取得
  useEffect(() => {
    if (!makerId) {
      setMakerName('');
      return;
    }
    getDoc(doc(db, 'makers', makerId))
      .then(snap => setMakerName(snap.exists() ? snap.data().name || '該当なし' : '該当なし'))
      .catch(() => setMakerName('取得失敗'));
  }, [makerId]);

  // 既存オーダー読み込み
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

  // 明細操作
  const handleInputChange = (idx, field, value) => {
    const newOrders = [...orders];
    newOrders[idx][field] = value;
    setOrders(newOrders);
  };
  const addRow = () => setOrders([...orders, { itemCode: '', name: '', quantity: '', price: '', remarks: '' }]);
  const removeRow = idx => setOrders(orders.filter((_, i) => i !== idx));

  // フォーム検証
  const isValid = Boolean(companyId && makerId && orders.every(o => o.name && o.quantity && o.price));

  // 発注送信
  const handleSubmit = async () => {
    if (!isValid) {
      alert('必須項目を入力してください');
      return;
    }
    const payload = {
      companyId,
      makerId,
      deliveryOption,
      customAddress: deliveryOption === 'その他(備考欄)' ? customAddress : '納品先住所',
      takahashiContact,
      personName,
      deliveryDate,
      timestamp: serverTimestamp(),
      items: orders,
    };
    try {
      if (existingOrderId) {
        await updateDoc(doc(db, 'orders', existingOrderId), payload);
        alert('更新しました');
      } else {
        await addDoc(collection(db, 'orders'), payload);
        alert('登録しました');
      }
      // リセット
      setOrders([{ itemCode: '', name: '', quantity: '', price: '', remarks: '' }]);
      setCompanyId('');
      if (!makerLocked) {
        setMakerId('');
        setMakerName('');
      }
      setTakahashiContact('');
      setPersonName('');
      setDeliveryDate('');
      setExistingOrderId(null);
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      alert('送信に失敗しました');
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      <h2 className="text-2xl font-bold">展示会 発注登録</h2>
      {isEditing && <p className="text-blue-600">※ 編集モード</p>}

      {/* 一覧リンク */}
<div className="flex space-x-3 justify-end">
  {/* メーカー別一覧 */}
  <Link
    to={`/maker-orders/${makerId || ''}`}
    className="px-4 py-2 rounded text-white bg-indigo-600"
  >
    メーカー別発注一覧を見る
  </Link>
  {/* 管理画面PDF */}
  <Link
    to="/admin/orders/pdf"
    className="px-4 py-2 bg-green-600 text-white rounded"
  >
    管理画面PDF
  </Link>
</div>

      {/* QRスキャンオーバーレイ */}
      {scanningFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-4 rounded">
            <QRCodeScanner
              mode={scanningFor}
              setCompanyId={id => scanningFor === 'company' && setCompanyId(id)}
              setMakerId={id => scanningFor === 'maker' && setMakerId(id)}
              onCancel={() => setScanningFor(null)}
            />
          </div>
        </div>
      )}

      {/* 会社/メーカーID入力 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-4 rounded shadow">
        {/* 会社ID */}
        <div>
          <label className="block font-semibold mb-1">会社ID</label>
          <div className="flex space-x-2">
            <input
              type="text"
              className="flex-1 border rounded px-2 py-1 text-sm"
              placeholder="会社ID"
              value={companyId}
              onChange={e => setCompanyId(e.target.value)}
            />
            <button
              onClick={() => setScanningFor('company')}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
            >
              Scan
            </button>
          </div>
          {companyName && <p className="mt-1 text-gray-600 text-sm">会社名: {companyName}</p>}
        </div>
        {/* メーカーID */}
        <div>
          <label className="block font-semibold mb-1">メーカーID</label>
          <div className="flex space-x-2 items-center">
            <input
              type="text"
              className="flex-1 border rounded px-2 py-1 text-sm"
              placeholder="メーカーID"
              value={makerId}
              onChange={e => setMakerId(e.target.value)}
              disabled={makerLocked}
            />
            <button
              onClick={() => !makerLocked && setScanningFor('maker')}
              className="bg-purple-500 text-white px-3 py-1 rounded text-sm"
              disabled={makerLocked}
            >
              Scan
            </button>
            <label className="flex items-center space-x-1 ml-2">
              <input
                type="checkbox"
                checked={makerLocked}
                onChange={e => setMakerLocked(e.target.checked)}
              />
              <span className="text-sm">メーカー固定</span>
            </label>
          </div>
          {makerName && <p className="mt-1 text-gray-600 text-sm">メーカー名: {makerName}</p>}
        </div>
      </div>

      {/* 配送 & 担当者 */}
      <div className="bg-white p-4 rounded shadow grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block mb-1 font-semibold">納品方法</label>
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={deliveryOption}
            onChange={e => setDeliveryOption(e.target.value)}
          >
            {['会社入れ','現場入れ','倉庫入れ','その他(備考欄)'].map(opt => (
              <option key={opt}>{opt}</option>
            ))}
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
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            placeholder="山田太郎"
            value={takahashiContact}
            onChange={e => setTakahashiContact(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-1 font-semibold">お客様担当者</label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            placeholder="担当者名"
            value={personName}
            onChange={e => setPersonName(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block mb-1 font-semibold">納品希望日</label>
          <input
            type="date"
            className="w-full border rounded px-2 py-1 text-sm"
            value={deliveryDate}
            onChange={e => setDeliveryDate(e.target.value)}
          />
        </div>
      </div>

      {/* 明細 */}
      <div className="bg-white p-4 rounded shadow overflow-x-auto">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">明細</h3>
          <button
            onClick={addRow}
            className="bg-green-500 text-white px-3 py-1 rounded text-sm"
          >
            + 行追加
          </button>
        </div>
        <div className="space-y-2">
          {orders.map((o, i) => (
            <div
              key={i}
              className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end"
            >
              {['品番','商品名','数量','単価','備考'].map((label, idx) => (
                <div key={label} className="flex flex-col">
                  <label className="text-xs text-gray-500">{label}</label>
                  <input
                    type={idx>=2 && idx<=3 ? 'number' : 'text'}
                    value={[o.itemCode,o.name,o.quantity,o.price,o.remarks][idx]}
                    onChange={e => handleInputChange(i,['itemCode','name','quantity','price','remarks'][idx],e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  />
                </div>
              ))}
              <button
                onClick={() => removeRow(i)}
                className="bg-red-500 text-white px-2 py-1 rounded text-sm"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 登録ボタン */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`px-6 py-2 rounded text-sm ${isValid ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
        >
          {isEditing ? '更新' : '登録'}
        </button>
      </div>
    </div>
  );
};

export default OrderEntry;

// src/pages/OrderEntry.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  // 管理画面パスワードチェック
  const handleAdminClick = (e) => {
    e.preventDefault();
    const pwd = window.prompt('管理画面のパスワードを入力してください');
    if (pwd === '1234') navigate('/admin/orders/pdf');
    else alert('パスワードが違います');
  };

  // ステート初期化
  const [orders, setOrders] = useState([
    { itemCode: '', name: '', quantity: '', price: '', remarks: '' },
  ]);
  const [companyId, setCompanyId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [makerId, setMakerId] = useState('');
  const [makerName, setMakerName] = useState('');
  const [makerLocked, setMakerLocked] = useState(false);
  const [deliveryOption, setDeliveryOption] = useState('会社入れ');
  const [customAddress, setCustomAddress] = useState('納品先住所');
  const [takahashiContact, setTakahashiContact] = useState('');
  const [personName, setPersonName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [scanningFor, setScanningFor] = useState(null);
  const [existingOrderId, setExistingOrderId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // 納品先住所の初期化／切り替え
  useEffect(() => {
    setCustomAddress(
      deliveryOption === 'その他(備考欄)' ? '' : '納品先住所'
    );
  }, [deliveryOption]);

  // お客様名を取得
  useEffect(() => {
    if (!companyId) {
      setCompanyName('');
      return;
    }
    getDoc(doc(db, 'companies', companyId))
      .then((snap) =>
        setCompanyName(snap.exists() ? snap.data().name : '該当なし')
      )
      .catch(() => setCompanyName('取得失敗'));
  }, [companyId]);

  // メーカー名を取得
  useEffect(() => {
    if (!makerId) {
      setMakerName('');
      return;
    }
    getDoc(doc(db, 'makers', makerId))
      .then((snap) =>
        setMakerName(snap.exists() ? snap.data().name : '該当なし')
      )
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
    ).then((snap) => {
      if (snap.empty) return;
      const data = snap.docs[0].data();
      setOrders(data.items || []);
      setDeliveryOption(data.deliveryOption);
      setCustomAddress(data.customAddress);
      setTakahashiContact(data.takahashiContact);
      setPersonName(data.personName);
      setDeliveryDate(data.deliveryDate);
      setExistingOrderId(snap.docs[0].id);
      setIsEditing(true);
    });
  }, [companyId, makerId]);

  // 明細操作
  const handleInputChange = (idx, field, value) => {
    const arr = [...orders];
    arr[idx][field] = value;
    setOrders(arr);
  };
  const addRow = () =>
    setOrders([
      ...orders,
      { itemCode: '', name: '', quantity: '', price: '', remarks: '' },
    ]);
  const removeRow = (idx) =>
    setOrders(orders.filter((_, i) => i !== idx));

  // フォーム有効性チェック
  const isValid =
    Boolean(companyId) &&
    Boolean(makerId) &&
    orders.every((o) => o.name && o.quantity && o.price);

  // フォーム送信
  const handleSubmit = async () => {
    if (!isValid) {
      alert('必須項目を入力してください');
      return;
    }
    const payload = {
      companyId,
      makerId,
      deliveryOption,
      customAddress,
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
      setOrders([
        { itemCode: '', name: '', quantity: '', price: '', remarks: '' },
      ]);
      setCompanyId('');
      if (!makerLocked) setMakerId('');
      setCompanyName('');
      setMakerName('');
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
    <div className="bg-gray-50 min-h-screen py-6 px-4">
      <div className="flex justify-center">
        <div className="w-full sm:w-3/4 lg:w-2/3 space-y-6">
          {/* メインカード */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">
              展示会 発注登録{' '}
              {isEditing && <span className="text-blue-600">(編集中)</span>}
            </h2>
            <div className="flex justify-end mb-4">
              <button
                onClick={handleAdminClick}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                管理画面
              </button>
            </div>

            {/* スキャンモーダル */}
            {scanningFor && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white p-4 rounded">
                  <QRCodeScanner
                    mode={scanningFor}
                    setCompanyId={(id) =>
                      scanningFor === 'company' && setCompanyId(id)
                    }
                    setMakerId={(id) =>
                      scanningFor === 'maker' && setMakerId(id)
                    }
                    onCancel={() => setScanningFor(null)}
                  />
                </div>
              </div>
            )}

            {/* お客様／メーカー */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="font-semibold">お客様ID</label>
                <div className="flex space-x-2">
                  <input
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    placeholder="お客様ID"
                    className="flex-1 border rounded px-2 py-1"
                  />
                  <button
                    onClick={() => setScanningFor('company')}
                    className="px-3 py-1 bg-blue-500 text-white rounded"
                  >
                    Scan
                  </button>
                </div>
                {companyName && (
                  <p className="text-gray-600 mt-1">→ {companyName}</p>
                )}
              </div>
              <div>
                <label className="font-semibold">メーカーID</label>
                <div className="flex space-x-2 items-center">
                  <input
                    value={makerId}
                    onChange={(e) => setMakerId(e.target.value)}
                    disabled={makerLocked}
                    placeholder="メーカーID"
                    className="flex-1 border rounded px-2 py-1"
                  />
                  <button
                    onClick={() =>
                      !makerLocked && setScanningFor('maker')
                    }
                    disabled={makerLocked}
                    className="px-3 py-1 bg-purple-500 text-white rounded"
                  >
                    Scan
                  </button>
                  <label className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={makerLocked}
                      onChange={(e) =>
                        setMakerLocked(e.target.checked)
                      }
                    />
                    <span>固定</span>
                  </label>
                </div>
                {makerName && (
                  <p className="text-gray-600 mt-1">→ {makerName}</p>
                )}
              </div>
            </div>

            {/* 配送・担当者 */}
            <div className="bg-gray-100 rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="font-semibold">納品方法</label>
                <select
                  value={deliveryOption}
                  onChange={(e) => setDeliveryOption(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                >
                  {['会社入れ', '現場入れ', '倉庫入れ', 'その他(備考欄)'].map(
                    (opt) => (
                      <option key={opt}>{opt}</option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label className="font-semibold">納品先住所</label>
                <input
                  value={customAddress}
                  disabled={deliveryOption !== 'その他(備考欄)'}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="font-semibold">社内担当</label>
                <input
                  value={takahashiContact}
                  onChange={(e) =>
                    setTakahashiContact(e.target.value)
                  }
                  placeholder="山田太郎"
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="font-semibold">顧客担当</label>
                <input
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="担当者名"
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div className="md:col-span-2">
                <label className="font-semibold">納品希望日</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                />
              </div>
            </div>

            {/* 明細 */}
            <div className="bg-gray-100 rounded-lg p-4 mb-6">
              <div className="flex justify-between mb-2">
                <h3 className="font-semibold">明細</h3>
                <button
                  onClick={addRow}
                  className="px-3 py-1 bg-green-500 text-white rounded"
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
                    {['品番', '商品名', '数量', '単価', '備考'].map(
                      (lab, idx) => (
                        <div key={lab} className="flex flex-col">
                          <label className="text-xs">{lab}</label>
                          <input
                            type={
                              idx >= 2 && idx <= 3 ? 'number' : 'text'
                            }
                            value={[
                              o.itemCode,
                              o.name,
                              o.quantity,
                              o.price,
                              o.remarks,
                            ][idx]}
                            onChange={(e) =>
                              handleInputChange(
                                i,
                                [
                                  'itemCode',
                                  'name',
                                  'quantity',
                                  'price',
                                  'remarks',
                                ][idx],
                                e.target.value
                              )
                            }
                            className="border rounded px-2 py-1 text-sm"
                          />
                        </div>
                      )
                    )}
                    <button
                      onClick={() => removeRow(i)}
                      className="px-2 py-1 bg-red-500 text-white rounded"
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
                className={`px-6 py-2 rounded ${
                  isValid
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                }`}
              >
                {isEditing ? '更新' : '登録'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderEntry;

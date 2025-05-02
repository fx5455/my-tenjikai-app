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

  /** 管理画面リンク */
  const handleAdminClick = (e) => {
    e.preventDefault();
    const input = window.prompt('管理画面のパスワードを入力してください');
    if (input === '1234') navigate('/admin/orders/pdf');
    else alert('パスワードが違います');
  };

  /** ステート定義 */
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

  /** データ取得エフェクト */
  useEffect(() => {
    setCustomAddress(
      deliveryOption === 'その他(備考欄)' ? '' : '納品先住所'
    );
  }, [deliveryOption]);

  useEffect(() => {
    if (!companyId) return setCompanyName('');
    getDoc(doc(db, 'companies', companyId))
      .then((snap) =>
        setCompanyName(snap.exists() ? snap.data().name : '該当なし')
      )
      .catch(() => setCompanyName('取得失敗'));
  }, [companyId]);

  useEffect(() => {
    if (!makerId) return setMakerName('');
    getDoc(doc(db, 'makers', makerId))
      .then((snap) =>
        setMakerName(snap.exists() ? snap.data().name : '該当なし')
      )
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

  /** 明細操作 */
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

  const isValid =
    Boolean(companyId) &&
    Boolean(makerId) &&
    orders.every((o) => o.name && o.quantity && o.price);

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
      if (existingOrderId)
        await updateDoc(doc(db, 'orders', existingOrderId), payload);
      else await addDoc(collection(db, 'orders'), payload);
      alert(isEditing ? '更新しました' : '登録しました');
      // リセット
      setOrders([
        { itemCode: '', name: '', quantity: '', price: '', remarks: '' },
      ]);
      setCompanyId('');
      if (!makerLocked) setMakerId('');
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
    <div className="bg-gray-50 min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-2">
            展示会 発注登録 {isEditing && <span className="text-blue-600">(編集中)</span>}
          </h2>
          <div className="flex justify-end mb-4">
            <button
              onClick={handleAdminClick}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              管理画面
            </button>
          </div>

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
            {/* 会社ID */}
            <div className="space-y-1">
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
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Scan
                </button>
              </div>
              {companyName && (
                <div className="text-sm text-gray-600">→ {companyName}</div>
              )}
            </div>
            {/* メーカーID */}
            <div className="space-y-1">
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
                  onClick={() => !makerLocked && setScanningFor('maker')}
                  disabled={makerLocked}
                  className="bg-purple-500 text-white px-3 py-1 rounded"
                >
                  Scan
                </button>
                <label className="flex items-center space-x-1 ml-2">
                  <input
                    type="checkbox"
                    checked={makerLocked}
                    onChange={(e) => setMakerLocked(e.target.checked)}
                  />
                  <span>固定</span>
                </label>
              </div>
              {makerName && (
                <div className="text-sm text-gray-600">→ {makerName}</div>
              )}
            </div>
          </div>

          {/* 配送・担当者 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
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
                onChange={(e) => setTakahashiContact(e.target.value)}
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
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between mb-2">
              <h3 className="font-semibold">明細</h3>
              <button onClick={addRow} className="bg-green-500 text-white px-3 py-1 rounded">
                + 行追加
              </button>
            </div>
            <div className="space-y-2">
              {orders.map((o, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end"
                >
                  {['品番', '商品名', '数量', '単価', '備考'].map((lab, idx) => (
                    <div key={lab} className="flex flex-col">
                      <label className="text-xs">{lab}</label>
                      <input
                        type={idx >= 2 && idx <= 3 ? 'number' : 'text'}
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
                            ['itemCode', 'name', 'quantity', 'price', 'remarks'][
                              idx
                            ],
                            e.target.value
                          )
                        }
                        className="border rounded px-2 py-1 text-sm"
                      />
                    </div>
                  ))}
                  <button onClick={() => removeRow(i)} className="bg-red-500 text-white px-2 py-1 rounded">
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
      </div>
    </div>
  );
};

export default OrderEntry;

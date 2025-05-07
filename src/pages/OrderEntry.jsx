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
  limit
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
    { itemCode: '', name: '', quantity: '', price: '', remarks: '' }
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

  // 納品先住所の切り替え
  useEffect(() => {
    setCustomAddress(deliveryOption === 'その他' ? '' : '納品先住所');
  }, [deliveryOption]);

  // お客様名フェッチ
  useEffect(() => {
    if (!companyId) return setCompanyName('');
    getDoc(doc(db, 'companies', companyId))
      .then((snap) => setCompanyName(snap.exists() ? snap.data().name : '該当なし'))
      .catch(() => setCompanyName('取得失敗'));
  }, [companyId]);

  // メーカー名フェッチ
  useEffect(() => {
    if (!makerId) return setMakerName('');
    getDoc(doc(db, 'makers', makerId))
      .then((snap) => setMakerName(snap.exists() ? snap.data().name : '該当なし'))
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
      setOrders(data.items);
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
  const addRow = () => setOrders([...orders, { itemCode: '', name: '', quantity: '', price: '', remarks: '' }]);
  const removeRow = (idx) => setOrders(orders.filter((_, i) => i !== idx));

  // フォーム有効性チェック
  const isValid = Boolean(companyId) && Boolean(makerId) && orders.every(o => o.name && o.quantity && o.price);

  // スキャンハンドラ：お客様
  const handleCompanyScan = async (id) => {
    setCompanyId(id);
    try {
      const sessionSnap = await getDocs(
        query(
          collection(db, 'orders'),
          where('companyId', '==', id),
          where('status', '==', 'open'),
          limit(1)
        )
      );
      if (sessionSnap.empty) {
        alert('先に入場スキャンを行ってください');
        setCompanyId('');
      }
    } catch {
      alert('入場チェックに失敗しました');
    }
    setScanningFor(null);
  };

  // スキャンハンドラ：メーカー
  const handleMakerScan = (id) => {
    setMakerId(id);
    setScanningFor(null);
  };

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
    } catch {
      alert('送信に失敗しました');
    }
  };

  // スタイル定義
  const baseInput = { width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>
        展示会 発注登録 {isEditing && '(編集中)'}
      </h2>
      <div style={{ textAlign: 'right', marginBottom: '12px' }}>
        <button
          onClick={handleAdminClick}
          style={{ padding: '8px 16px', background: '#10B981', color: '#fff', border: 'none', borderRadius: 4 }}
        >
          管理画面
        </button>
      </div>

      {scanningFor && (
        <QRCodeScanner
          mode={scanningFor}
          setCompanyId={handleCompanyScan}
          setMakerId={handleMakerScan}
          onCancel={() => setScanningFor(null)}
        />
      )}

      <section style={{ marginBottom: '16px' }}>
        <label style={{ fontWeight: 600 }}>お客様ID</label>
        <div style={{ display: 'flex', gap: 8 }}> 
          <input
            style={baseInput}
            value={companyId}
            onChange={e => setCompanyId(e.target.value)}
            placeholder="お客様ID"
          />
          <button
            onClick={() => setScanningFor('company')}
            style={{ padding: '8px 16px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 4 }}
          >
            Scan
          </button>
        </div>
        <div style={{ marginTop: '4px', color: '#6B7280' }}>{companyName}</div>
      </section>

      <section style={{ marginBottom: '16px' }}>
        <label style={{ fontWeight: 600 }}>メーカーID</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={baseInput}
            disabled={makerLocked}
            value={makerId}
            onChange={e => setMakerId(e.target.value)}
            placeholder="メーカーID"
          />
          <button
            onClick={() => setScanningFor('maker')}
            disabled={makerLocked}
            style={{ padding: '8px 16px', background: '#A855F7', color: '#fff', border: 'none', borderRadius: 4 }}
          >
            Scan
          </button>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={makerLocked}
              onChange={e => setMakerLocked(e.target.checked)}
              style={{ marginRight: 4 }}
            />
            固定
          </label>
        </div>
        <div style={{ marginTop: '4px', color: '#6B7280' }}>{makerName}</div>
      </section>

        {/* 配送・担当者 */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {/* 納品方法 */}
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontWeight: '600' }}>納品方法</label>
              <select
                value={deliveryOption}
                onChange={(e) => setDeliveryOption(e.target.value)}
                style={inputStyle}
              >
                {['会社入れ', '現場入れ', '倉庫入れ', 'その他'].map((opt) => (
                  <option key={opt} style={{ color: '#000' }}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* 納品先住所 */}
            <div style={{ flex: '2 1 200px' }}>
              <label style={{ fontWeight: '600' }}>納品先住所</label>
              <input
                value={customAddress}
                disabled={deliveryOption !== 'その他'}
                onChange={(e) => setCustomAddress(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* 高橋本社担当 */}
            <div style={{ flex: '1 1 200px' }}>
            <label style={{ fontWeight: '600' }}>高橋本社担当</label>
              <input
                value={takahashiContact}
                onChange={(e) => setTakahashiContact(e.target.value)}
                placeholder="山田太郎"
                style={inputStyle}
              />
            </div>

            {/* 顧客担当 */}
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontWeight: '600' }}>顧客担当</label>
              <input
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="担当者名"
                style={inputStyle}
              />
            </div>

            {/* 納品希望日 */}
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontWeight: '600' }}>納品希望日</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* 明細 */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h3 style={{ fontWeight: '600' }}>明細</h3>
            <button
              onClick={addRow}
              style={{
                ...buttonStyle,
                background: '#10B981',
                color: '#fff',
              }}
            >
              + 行追加
            </button>
          </div>
          {orders.map((o, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-end',
                marginBottom: '8px',
              }}
            >
              {['itemCode', 'name', 'quantity', 'price', 'remarks'].map((field, idx) => (
                <div key={field} style={{ flex: idx < 2 ? '2 1 120px' : '1 1 80px' }}>
                  <label style={{ fontSize: '0.75rem', marginBottom: '2px', display: 'block' }}>
                    {['品番', '商品名', '数量', '単価', '備考'][idx]}
                  </label>
                  <input
                    type={idx === 2 || idx === 3 ? 'number' : 'text'}
                    value={[o.itemCode, o.name, o.quantity, o.price, o.remarks][idx]}
                    onChange={(e) => handleInputChange(i, field, e.target.value)}
                    style={inputStyle}
                  />
                </div>
              ))}
              <button
                onClick={() => removeRow(i)}
                style={{
                  ...buttonStyle,
                  background: '#EF4444',
                  color: '#fff',
                }}
              >
                削除
              </button>
            </div>
          ))}
        </div>

        {/* 登録ボタン */}
        <div style={{ textAlign: 'right' }}>
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          style={{ padding: '10px 20px', background: isValid ? '#3B82F6' : '#D1D5DB', color: isValid ? '#fff' : '#6B7280', border: 'none', borderRadius: 4 }}
        >
          {isEditing ? '更新' : '登録'}
        </button>
      </div>
    </div>
  );
};

export default OrderEntry;

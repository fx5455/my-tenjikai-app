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
    if (pwd === '1234') {
      navigate('/admin/orders/pdf');
    } else {
      alert('パスワードが違います');
    }
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
    if (!companyId) {
      setCompanyName('');
      return;
    }
    getDoc(doc(db, 'companies', companyId))
      .then(snap => setCompanyName(snap.exists() ? snap.data().name : '該当なし'))
      .catch(() => setCompanyName('取得失敗'));
  }, [companyId]);

  // メーカー名フェッチ
  useEffect(() => {
    if (!makerId) {
      setMakerName('');
      return;
    }
    getDoc(doc(db, 'makers', makerId))
      .then(snap => setMakerName(snap.exists() ? snap.data().name : '該当なし'))
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
  const addRow = () => setOrders([...orders, { itemCode: '', name: '', quantity: '', price: '', remarks: '' }]);
  const removeRow = idx => setOrders(orders.filter((_, i) => i !== idx));

  // 入場済みチェックを伴うお客様IDスキャン
  const handleCompanyScan = async (id) => {
    setCompanyId(id);
    // 入場セッションの有無をチェック
    const sessionSnap = await getDocs(
      query(
        collection(db, 'orders'),
        where('companyId', '==', id),
        where('status', '==', 'open'),
        limit(1)
      )
    );
    if (sessionSnap.empty) {
      alert('入場スキャンが完了していません。先に入場スキャンを行ってください。');
      setCompanyId('');
    }
    setScanningFor(null);
  };

  // メーカーIDスキャン
  const handleMakerScan = (id) => {
    setMakerId(id);
    setScanningFor(null);
  };

  // フォーム有効性チェック
  const isValid = Boolean(companyId) && Boolean(makerId) && orders.every(o => o.name && o.quantity && o.price);

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
      // 初期化
      setOrders([{ itemCode: '', name: '', quantity: '', price: '', remarks: '' }]);
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

  // スタイリング
  const containerStyle = {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '16px',
    backgroundColor: '#fff',
  };
  const cardStyle = {
    background: '#fff',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  };
  const sectionStyle = {
    marginBottom: '16px',
    padding: '12px',
    background: '#f7f7f7',
    borderRadius: '4px',
  };
  const inputStyle = {
    width: '100%',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    backgroundColor: '#fff',
  };
  const buttonBase = {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  };
  const buttonStyle = valid => ({
    ...buttonBase,
    background: valid ? '#3B82F6' : '#D1D5DB',
    color: valid ? '#fff' : '#6B7280',
  });
  const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };
  const scannerContainerStyle = {
    background: '#fff',
    padding: '16px',
    borderRadius: '4px',
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{ marginBottom: '12px' }}>
          展示会 発注登録 {isEditing && <span style={{ color: '#2563EB' }}>(編集中)</span>}
        </h2>
        {/* 管理画面ボタン */}
        <div style={{ textAlign: 'right', marginBottom: '12px' }}>
          <button onClick={handleAdminClick} style={{ ...buttonBase, background: '#10B981', color: '#fff' }}>
            管理画面
          </button>
        </div>
        {/* スキャンモーダル */}
        +        {scanningFor && (
          <div style={st.modal}>
           <div style={st.scanBox}>
             <QRCodeScanner
               mode={scanningFor}
               setCompanyId={handleCompanyScan}
              setMakerId={handleMakerScan}
              onCancel={() => setScanningFor(null)}
             />
                        </div>
          </div>
        )}
        {/* お客様／メーカー入力 */}
        <div style={{ ...sectionStyle, display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          {/* お客様ID */}
          <div style={{ flex: '1 1 200px' }}>
            <label>お客様ID</label>
            <div style={{ display: 'flex', gap: '8px' }}>  
              <input value={companyId} onChange={e => setCompanyId(e.target.value)} placeholder="お客様ID" style={inputStyle}/>
              <button onClick={() => setScanningFor('company')} style={{ ...buttonBase, background: '#3B82F6', color: '#fff' }}>Scan</button>
            </div>
            {companyName && <div style={{ marginTop: '4px', color: '#6B7280' }}>→ {companyName}</div>}
          </div>
          {/* メーカーID */}
          <div style={{ flex: '1 1 200px' }}>
            <label>メーカーID</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input value={makerId} onChange={e => setMakerId(e.target.value)} disabled={makerLocked} placeholder="メーカーID" style={inputStyle}/>
              <button onClick={() => !makerLocked && setScanningFor('maker')} disabled={makerLocked} style={{ ...buttonBase, background: '#A855F7', color: '#fff' }}>Scan</button>
              <label style={{ marginLeft: '8px' }}><input type="checkbox" checked={makerLocked} onChange={e => setMakerLocked(e.target.checked)}/> 固定</label>
            </div>
            {makerName && <div style={{ marginTop: '4px', color: '#6B7280' }}>→ {makerName}</div>}
          </div>
        </div>
        {/* 配送・担当者入力 */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {/* 納品方法 */}
            <div style={{ flex: '1 1 200px' }}>
              <label>納品方法</label>
              <select value={deliveryOption} onChange={e => setDeliveryOption(e.target.value)} style={inputStyle}>
                {['会社入れ','現場入れ','倉庫入れ','その他'].map(opt => <option key={opt}>{opt}</option>)}
              </select>
            </div>
            {/* 納品先住所 */}
            <div style={{ flex: '2 1 200px' }}>
              <label>納品先住所</label>
              <input value={customAddress} disabled={deliveryOption!=='その他'} onChange={e => setCustomAddress(e.target.value)} style={inputStyle}/>
            </div>
            {/* 社内担当 */}
            <div style={{ flex: '1 1 200px' }}>
              <label>社内担当</label>
              <input value={takahashiContact} onChange={e => setTakahashiContact(e.target.value)} placeholder="山田太郎" style={inputStyle}/>
            </div>
            {/* 顧客担当 */}
            <div style={{ flex: '1 1 200px' }}>
              <label>顧客担当</label>
              <input value={personName} onChange={e => setPersonName(e.target.value)} placeholder="担当者名" style={inputStyle}/>
            </div>
            {/* 納品希望日 */}
            <div style={{ flex: '1 1 200px' }}>
              <label>納品希望日</label>
              <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} style={inputStyle}/>
            </div>
          </div>
        </div>
        {/* 明細 */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom:'8px' }}>
            <h3>明細</h3>
            <button onClick={addRow} style={{ ...buttonBase, background:'#10B981', color:'#fff' }}>+ 行追加</button>
          </div>
          {orders.map((o,i)=>(
            <div key={i} style={{ display:'flex', gap:'8px', alignItems:'flex-end', marginBottom:'8px' }}>
              {['itemCode','name','quantity','price','remarks'].map((f,idx)=>(
                <div key={f} style={{ flex: idx<2?'2 1 120px':'1 1 80px' }}>
                  <label style={{ fontSize:'0.75rem' }}>{
['品番','商品名','数量','単価','備考'][idx]}</label>
                  <input type={idx===2||idx===3?'number':'text'} value={[o.itemCode,o.name,o.quantity,o.price,o.remarks][idx]} onChange={e=>handleInputChange(i,f,e.target.value)} style={inputStyle}/>
                </div>
              ))}
              <button onClick={()=>removeRow(i)} style={{ ...buttonBase, background:'#EF4444', color:'#fff' }}>削除</button>
            </div>
          ))}
        </div>
        {/* 登録ボタン */}
        <div style={{ textAlign:'right' }}>
          <button onClick={handleSubmit} disabled={!isValid} style={buttonStyle(isValid)}>{isEditing?'更新':'登録'}</button>
        </div>
      </div>
    </div>
  );
};

export default OrderEntry;

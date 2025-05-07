import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import QRCodeScanner from '../../components/QRCodeScanner';
import { FaPrint, FaSearch, FaUndo } from 'react-icons/fa';

const AdminOrderPdf = () => {
  const [orders, setOrders] = useState([]);
  const [mode, setMode] = useState('maker');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [makers, setMakers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [searchCompanyName, setSearchCompanyName] = useState('');
  const [searchMakerName, setSearchMakerName] = useState('');
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [filteredMakers, setFilteredMakers] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const printRef = useRef(null);

  // Styles
  const navStyle = { marginBottom: '16px', display: 'flex', gap: '16px' };
  const linkStyle = { color: '#2563EB', textDecoration: 'none', fontWeight: 'bold' };
  const containerStyle = {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '16px',
    backgroundColor: '#fff',
    color: '#000',
  };
  const cardStyle = {
    background: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    padding: '16px',
    marginBottom: '16px',
    color: '#000',
  };
  const inputStyle = {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    backgroundColor: '#fff',
    color: '#000',
  };
  const buttonBase = {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#fff',
  };

  // 初期データ取得
  useEffect(() => {
    (async () => {
      const [ms, cs, os] = await Promise.all([
        getDocs(collection(db, 'makers')),
        getDocs(collection(db, 'companies')),
        getDocs(collection(db, 'orders')),
      ]);
      setMakers(ms.docs.map(d => ({ id: d.id, name: d.data().name })));
      setCompanies(cs.docs.map(d => ({ id: d.id, name: d.data().name })));
      setOrders(os.docs.map(d => ({ id: d.id, ...d.data() })));
    })();
  }, []);

  // 検索・リセット
  const handleCompanySearch = () => setFilteredCompanies(companies.filter(c => c.name.includes(searchCompanyName)));
  const handleMakerSearch = () => setFilteredMakers(makers.filter(m => m.name.includes(searchMakerName)));
  const handleReset = () => {
    setSearchCompanyName('');
    setSearchMakerName('');
    setFilteredCompanies([]);
    setFilteredMakers([]);
    setSelectedGroup('');
  };

  // 絞り込み
  const filteredOrders = orders.filter(o =>
    selectedGroup ? (mode === 'maker' ? o.makerId === selectedGroup : o.companyId === selectedGroup) : true
  );

  // 集計データ
  const summaryData = (mode === 'maker' ? makers : companies)
    .map(g => {
      const total = orders
        .filter(o => (mode === 'maker' ? o.makerId === g.id : o.companyId === g.id))
        .flatMap(o => o.items)
        .reduce((sum, item) => sum + item.quantity * item.price, 0);
      return { ...g, total };
    })
    .filter(s => s.total > 0);

  // 印刷用合計
  const totalAmount = filteredOrders
    .flatMap(o => o.items)
    .reduce((sum, item) => sum + item.quantity * item.price, 0);

  // 印刷処理
  const handlePrint = () => {
    if (!printRef.current) return;
    const contentHTML = printRef.current.innerHTML;
    const isCompany = mode === 'company';
    const titleText = isCompany ? '発注書（控え）' : '発注書';
    const recipient =
      (isCompany ? companies.find(c => c.id === selectedGroup)?.name : makers.find(m => m.id === selectedGroup)?.name) + ' 御中';

    const w = window.open('', '_blank', 'width=800,height=600');
    w.document.write(`
      <html>
      <head><title>${titleText}</title><style>
        @page { size: A4; margin: 20mm; }
        body { margin:0; padding:0; font-family:Arial,sans-serif; }
        .printContainer { width:170mm; margin:0 auto; padding:10mm; }
      </style></head>
      <body>
        <div class="printContainer">
          <h1 style="text-align:center;">${titleText}</h1>
          <div style="display:flex; justify-content:space-between; margin-bottom:16px; font-size:14px;">
            <div>${recipient}</div>
            <div>
              株式会社高橋本社<br/>
              〒131-0032 東京都墨田区東向島1-3-4<br/>
              TEL 03-3610-1010 FAX 03-3610-2720
            </div>
          </div>
          ${contentHTML}
          <div style="text-align:right; font-weight:bold; margin-top:16px;">
            合計：${totalAmount.toLocaleString()} 円（税込）
          </div>
        </div>
      </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div style={containerStyle}>
      {/* グローバルナビゲーション */}
      <nav style={navStyle}>
        <Link to="/admin/entry" style={linkStyle}>入場スキャン</Link>
        <Link to="/admin/exit" style={linkStyle}>退場スキャン</Link>
        <Link to="/admin/orders" style={linkStyle}>発注一覧</Link>
      </nav>

      {/* 操作パネル */}
      <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/admin/orders" style={linkStyle}>&larr; 発注一覧に戻る</Link>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowSummary(prev => !prev)} style={{ ...buttonBase, background: '#10B981' }}>
            {showSummary ? '集計を隠す' : '集計を表示'}
          </button>
          {filteredOrders.length > 0 && (
            <button onClick={handlePrint} style={{ ...buttonBase, background: '#FBBF24', color: '#000' }}>
              <FaPrint style={{ marginRight: '4px' }} />印刷
            </button>
          )}
        </div>
      </div>

      {/* 集計表示 */}
      {showSummary && (
        <div style={cardStyle}>
          <h3>{mode === 'maker' ? 'メーカー別集計' : 'お客様別集計'}（合計金額）</h3>
          <ul>
            {summaryData.map(s => (
              <li key={s.id}>{s.name}: {s.total.toLocaleString()}円</li>
            ))}
          </ul>
        </div>
      )}

      {/* 検索・絞り込み */}
      <div style={{ ...cardStyle, display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['maker', 'company'].map(m => (
            <button key={m} onClick={() => { setMode(m); handleReset(); }} style={{ ...buttonBase, background: mode === m ? '#3B82F6' : '#9CA3AF' }}>
              {m === 'maker' ? 'メーカー別' : 'お客様別'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input type="text" placeholder={mode === 'maker' ? 'メーカー名検索' : 'お客様名検索'} value={mode === 'maker' ? searchMakerName : searchCompanyName} onChange={e => mode === 'maker' ? setSearchMakerName(e.target.value) : setSearchCompanyName(e.target.value)} style={inputStyle} />
          <button onClick={mode==='maker'?handleMakerSearch:handleCompanySearch} style={{ ...buttonBase, background: '#3B82F6' }}><FaSearch /></button>
          <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} style={inputStyle}>
            <option value="">--{mode==='maker'?'メーカー':'お客様'}を選択--</option>
            {(mode==='maker'?(filteredMakers.length?filteredMakers:makers):(filteredCompanies.length?filteredCompanies:companies)).map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <button onClick={handleReset} style={{ ...buttonBase, background: '#6B7280' }}><FaUndo /></button>
        </div>
      </div>

      {/* 印刷対象リスト */}
      <div ref={printRef} style={cardStyle}>
        {filteredOrders.map(order => (
          <div key={order.id} style={{ borderBottom: '1px solid #ddd', paddingBottom: '8px', marginBottom: '8px' }}>
            <p>発注日: {order.createdAt?.toDate().toLocaleString()}</p>
            <p>納品方法: {order.deliveryOption}</p>
            <p>納品先: {order.customAddress}</p>
            <ul>
              {order.items.map((item, idx) => (
                <li key={idx}>{item.itemCode} / {item.name} x {item.quantity} @ {item.price.toLocaleString()}円 (備考: {item.remarks||'なし'})</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

    </div>
  );
};

export default AdminOrderPdf;

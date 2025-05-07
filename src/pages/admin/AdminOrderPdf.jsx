import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { FaPrint, FaSearch, FaUndo, FaSortAlphaDown, FaSortAlphaUp, FaSync } from 'react-icons/fa';

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
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [personSortAsc, setPersonSortAsc] = useState(true);
  const printRef = useRef(null);

  // データ取得
  const fetchAllData = async () => {
    const [ms, cs, os] = await Promise.all([
      getDocs(collection(db, 'makers')),
      getDocs(collection(db, 'companies')),
      getDocs(collection(db, 'orders')),
    ]);
    setMakers(ms.docs.map(d => ({ id: d.id, name: d.data().name })));
    setCompanies(cs.docs.map(d => ({ id: d.id, name: d.data().name })));
    setOrders(os.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => { fetchAllData(); }, []);

  // お客様別担当者リスト
  useEffect(() => {
    if (mode === 'company' && selectedGroup) {
      const names = orders
        .filter(o => o.companyId === selectedGroup)
        .map(o => o.personName || '')
        .filter(n => n);
      setStaffList(Array.from(new Set(names)));
      setSelectedStaff('');
    } else {
      setStaffList([]);
      setSelectedStaff('');
    }
  }, [mode, selectedGroup, orders]);

  // 検索・リセット
  const handleCompanySearch = () => setFilteredCompanies(
    companies.filter(c => c.name.includes(searchCompanyName))
  );
  const handleMakerSearch = () => setFilteredMakers(
    makers.filter(m => m.name.includes(searchMakerName))
  );
  const handleReset = () => {
    setSearchCompanyName('');
    setSearchMakerName('');
    setFilteredCompanies([]);
    setFilteredMakers([]);
    setSelectedGroup('');
    setSelectedStaff('');
    setStaffList([]);
    setPersonSortAsc(true);
  };

  // フィルタリング・ソート
  const filteredOrders = orders
    .filter(o => selectedGroup ?
      (mode === 'maker' ? o.makerId === selectedGroup : o.companyId === selectedGroup)
      : true
    )
    .filter(o => mode === 'company' && selectedStaff ? o.personName === selectedStaff : true);
  const sortedOrders = [...filteredOrders].sort((a, b) =>
    personSortAsc
      ? (a.personName || '').localeCompare(b.personName || '')
      : (b.personName || '').localeCompare(a.personName || '')
  );

  // 集計
  const summaryData = (mode === 'maker' ? makers : companies)
    .map(g => {
      const total = orders
        .filter(o => mode === 'maker' ? o.makerId === g.id : o.companyId === g.id)
        .flatMap(o => o.items)
        .reduce((sum, item) => sum + item.quantity * item.price, 0);
      return { ...g, total };
    })
    .filter(s => s.total > 0);
  const totalAmount = filteredOrders.flatMap(o => o.items).reduce((sum, i) => sum + i.quantity * i.price, 0);
  const netAmount = Math.floor(totalAmount / 1.1);

  // 印刷
  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const isCompany = mode === 'company';
    const titleText = isCompany ? '発注書（控え）' : '発注書';
    const recipientName = isCompany
      ? companies.find(c => c.id === selectedGroup)?.name
      : makers.find(m => m.id === selectedGroup)?.name || '';
    const recipient = `${recipientName} 御中`;

    const w = window.open('', '_blank', 'width=800,height=600');
    w.document.write(`
      <html>
      <head><title>${titleText}</title><style>
        @page { size: A4; margin: 20mm; }
        body { margin:0; padding:0; font-family:Arial,sans-serif; color:#000; background:#fff; }
        .printContainer { width:170mm; margin:0 auto; padding:10mm; background:#fff; color:#000; }
        .header-main { text-align:center; font-size:24px; font-weight:bold; margin-bottom:6mm; }
        .header-sub { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10mm; }
        .header-sub .recipient { font-size:18px; font-weight:bold; max-width:50%; white-space:normal; word-break:break-word; }
        .header-sub div.address { font-size:12px; text-align:right; }
        .order-item { margin-bottom:8mm; border-bottom:1px solid #000; padding-bottom:4mm; }
        .order-item p, .order-item ul { font-size:12px; margin:2px 0; }
        .summary-box { text-align:right; margin-top:10mm; font-size:20px; background:#000; color:#fff; padding:8px 16px; display:inline-block; float:right; }
      </style></head>
      <body>
        <div class="printContainer">
          <div class="header-main">${titleText}</div>
          <div class="header-sub">
            <div class="recipient" style="colorScheme: light; -webkit-text-fill-color: #000;">${recipient}</div>
            <div class="address">
              株式会社高橋本社<br>
              〒131-0032 東京都墨田区東向島1-3-4<br>
              TEL 03-3610-1010 FAX 03-3610-2720
            </div>
          </div>
          ${content}
          <div class="summary-box">合計 ${netAmount.toLocaleString()} 円（税抜）</div>
        </div>
      </body>
      </html>
    `);
    w.document.close();
    w.print();
  };

  // インラインスタイル定義（ダークモード回避用）
  const navStyle      = { marginBottom:'16px', display:'flex', gap:'16px', background:'#fff', color:'#000', WebkitTextFillColor:'#000' };
  const linkStyle     = { color:'#2563EB', textDecoration:'none' };
  const containerStyle= { maxWidth:'800px', margin:'0 auto', padding:'16px', backgroundColor:'#fff', color:'#000', WebkitTextFillColor:'#000' };
  const cardStyle     = { background:'#fff', borderRadius:'8px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)', padding:'16px', marginBottom:'16px', color:'#000', WebkitTextFillColor:'#000' };
  const sectionStyle  = { marginBottom:'16px', padding:'12px', background:'#f7f7f7', borderRadius:'4px', color:'#000', WebkitTextFillColor:'#000' };
  const inputStyle    = { padding:'8px', borderRadius:'4px', border:'1px solid #ccc', backgroundColor:'#fff', color:'#000', WebkitTextFillColor:'#000' };
  const buttonBase    = { padding:'8px 16px', border:'none', borderRadius:'4px', cursor:'pointer', color:'#fff', WebkitTextFillColor:'#fff' };
  const resetButton   = { ...buttonBase, background:'#6B7280' };
  const primaryButton = bg=>({ ...buttonBase, background:bg });

  return (
    <div style={containerStyle}>
      <nav style={navStyle}>
        <Link to="/admin/entry" style={linkStyle}>入場スキャン</Link>
        <Link to="/admin/exit" style={linkStyle}>退場スキャン</Link>
        <Link to="/" style={linkStyle}>&mdash; 発注登録</Link>
      </nav>
      <div style={containerStyle}>
        <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <button onClick={() => setShowSummary(!showSummary)} style={primaryButton('#10B981')}>
              {showSummary ? '集計を隠す' : '集計を表示'}
            </button>
            {filteredOrders.length > 0 && (
              <button onClick={handlePrint} style={primaryButton('#FBBF24')}><FaPrint /> 印刷</button>
            )}
            <button onClick={fetchAllData} style={primaryButton('#3B82F6')}><FaSync /> 更新</button>
          </div>
        </div>

        {showSummary && (
          <div style={cardStyle}>
            <h3>{mode === 'maker' ? 'メーカー別集計' : 'お客様別集計'}</h3>
            <ul>
              {summaryData.map(s => <li key={s.id}>{s.name}：{s.total.toLocaleString()}円</li>)}
            </ul>
          </div>
        )}

        <div style={sectionStyle}>
          <button onClick={() => { setMode('maker'); handleReset(); }} style={primaryButton(mode === 'maker' ? '#3B82F6' : '#9CA3AF')}>メーカー別</button>
          <button onClick={() => { setMode('company'); handleReset(); }} style={primaryButton(mode === 'company' ? '#3B82F6' : '#9CA3AF')}>お客様別</button>
        </div>

        <div style={sectionStyle}>
          <input
            type="text"
            placeholder={mode === 'maker' ? 'メーカー名検索' : 'お客様名検索'}
            value={mode === 'maker' ? searchMakerName : searchCompanyName}
            onChange={e => mode === 'maker' ? setSearchMakerName(e.target.value) : setSearchCompanyName(e.target.value)}
            style={inputStyle}
          />
          <button onClick={mode === 'maker' ? handleMakerSearch : handleCompanySearch} style={primaryButton('#3B82F6')}><FaSearch /></button>

          <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} style={inputStyle}>
            <option value="">--{mode === 'maker' ? 'メーカー' : 'お客様'}を選択--</option>
            {(mode === 'maker' ? (filteredMakers.length ? filteredMakers : makers) : (filteredCompanies.length ? filteredCompanies : companies))
              .map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>

          <button onClick={handleReset} style={resetButton}><FaUndo /></button>

          {mode === 'company' && staffList.length > 0 && (
            <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)} style={inputStyle}>
              <option value="">--担当者を選択--</option>
              {staffList.map(name => <option key={name} value={name}>{name} 様</option>)}
            </select>
          )}

          <button onClick={() => setPersonSortAsc(!personSortAsc)} style={resetButton}>
            {personSortAsc ? <FaSortAlphaDown /> : <FaSortAlphaUp />} 担当者順
          </button>
        </div>

        <div ref={printRef} style={cardStyle}>
          {sortedOrders.map(order => (
            <div key={order.id} style={{ marginBottom: '16px', borderBottom: '1px solid #000', paddingBottom: '8px' }}>
              <p>発注日: {order.timestamp?.toDate().toLocaleString()}</p>
              <p>納品方法: {order.deliveryOption}</p>
              <p>納品先: {order.customAddress}</p>
              <p>お客様担当者: {order.personName ? `${order.personName} 様` : '未入力'}</p>
              <p>高橋本社担当者: {order.takahashiContact || '未入力'}</p>
              <p>納品希望日: {order.deliveryDate}</p>
              <ul>
                {order.items.map((item, idx) => (
                  <li key={idx}>{mode === 'company' ? makers.find(m => m.id === order.makerId)?.name : ''} / {item.itemCode} / {item.name}：{item.quantity}×{item.price}円 (備考:{item.remarks || 'なし'})</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      </div>
  );
};

export default AdminOrderPdf;

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

  // データ取得関数
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

  // 初期データ取得
  useEffect(() => {
    fetchAllData();
  }, []);

  // お客様別モードで会社選択後、担当者リスト作成
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
  const handleCompanySearch = () =>
    setFilteredCompanies(
      companies.filter(c => c.name.includes(searchCompanyName))
    );
  const handleMakerSearch = () =>
    setFilteredMakers(
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

  // フィルタリング
  const filteredOrders = orders
    .filter(o =>
      selectedGroup
        ? mode === 'maker'
          ? o.makerId === selectedGroup
          : o.companyId === selectedGroup
        : true
    )
    .filter(o =>
      mode === 'company' && selectedStaff
        ? o.personName === selectedStaff
        : true
    );

  // 担当者名ソート
  const sortedOrders = [...filteredOrders].sort((a, b) =>
    personSortAsc
      ? (a.personName || '').localeCompare(b.personName || '')
      : (b.personName || '').localeCompare(a.personName || '')
  );

  // 集計データ
  const summaryData = (mode === 'maker' ? makers : companies)
    .map(g => {
      const total = orders
        .filter(o =>
          mode === 'maker' ? o.makerId === g.id : o.companyId === g.id
        )
        .flatMap(o => o.items)
        .reduce((sum, item) => sum + item.quantity * item.price, 0);
      return { ...g, total };
    })
    .filter(s => s.total > 0);

  // 合計金額
  const totalAmount = filteredOrders
    .flatMap(o => o.items)
    .reduce((sum, item) => sum + item.quantity * item.price, 0);

  // 印刷機能
  const handlePrint = () => {
    if (!printRef.current) return;
    const contentHTML = printRef.current.innerHTML;
    const isCompany = mode === 'company';
    const titleText = isCompany ? '発注書（控え）' : '発注書';
    const recipientName =
      (isCompany
        ? companies.find(c => c.id === selectedGroup)?.name
        : makers.find(m => m.id === selectedGroup)?.name) || '';
    const recipient = `${recipientName} 御中`;

    const w = window.open('', '_blank', 'width=800,height=600');
    w.document.write(`
      <html>
      <head><title>${titleText}</title><style>
        @page { size: A4; margin: 20mm; }
        body { margin:0; padding:0; font-family:Arial,sans-serif; }
        .printContainer { width:170mm; margin:0 auto; padding:10mm; }
        .header-main { text-align:center; font-size:24px; font-weight:bold; margin-bottom:6mm; }
        .header-sub { display:flex; justify-content:space-between; font-size:12px; margin-bottom:10mm; }
        .order-item { margin-bottom:8mm; border-bottom:1px solid #000; padding-bottom:4mm; }
        .order-item p, .order-item ul { font-size:12px; margin:2px 0; }
        .summary-box { text-align:right; margin-top:10mm; font-size:16px; }
      </style></head>
      <body>
        <div class="printContainer">
          <div class="header-main">${titleText}</div>
          <div class="header-sub">
            <div>${recipient}</div>
            <div>
              株式会社高橋本社<br>
              〒131-0032 東京都墨田区東向島1-3-4<br>
              TEL 03-3610-1010 FAX 03-3610-2720
            </div>
          </div>
          ${contentHTML}
          <div class="summary-box">合計 ${totalAmount.toLocaleString()} 円（税込）</div>
        </div>
      </body>
      </html>
    `);
    w.document.close();
    w.print();
  };

  return (
    <>
      {/* ナビゲーション */}
      <nav style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <Link to="/admin/entry" style={{ color: '#2563EB' }}>入場スキャン</Link>
        <Link to="/admin/exit" style={{ color: '#2563EB' }}>退場スキャン</Link>
        <Link to="/" style={{ color: '#2563EB' }}>— 発注登録</Link>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
        {/* 操作バー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <button onClick={() => setShowSummary(!showSummary)} style={{ background: '#10B981', color: '#fff', padding: '8px 16px', marginRight: 8 }}>
              {showSummary ? '集計を隠す' : '集計を表示'}
            </button>
            {filteredOrders.length > 0 && (
              <button onClick={handlePrint} style={{ background: '#FBBF24', color: '#000', padding: '8px 16px', marginRight: 8 }}>
                <FaPrint /> 印刷
              </button>
            )}
            <button onClick={fetchAllData} style={{ background: '#3B82F6', color: '#fff', padding: '8px 16px' }}>
              <FaSync /> 更新
            </button>
          </div>
        </div>

        {/* 集計表示 */}
        {showSummary && (
          <div style={{ border: '1px solid #ddd', padding: 16, marginBottom: 16 }}>
            <h3>{mode === 'maker' ? 'メーカー別集計' : 'お客様別集計'}</h3>
            <ul>
              {summaryData.map(s => (
                <li key={s.id}>{s.name}：{s.total.toLocaleString()} 円</li>
              ))}
            </ul>
          </div>
        )}

        {/* フィルター */}
        <div style={{ border: '1px solid #ddd', padding: 16, marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {/* モード切替 */}
          <div>
            <button onClick={() => { setMode('maker'); handleReset(); }} style={{ marginRight: 8, background: mode==='maker'?'#3B82F6':'#9CA3AF', color:'#fff', padding:'8px 16px' }}>メーカー別</button>
            <button onClick={() => { setMode('company'); handleReset(); }} style={{ background: mode==='company'?'#3B82F6':'#9CA3AF', color:'#fff', padding:'8px 16px' }}>お客様別</button>
          </div>

          {/* メーカー/お客様検索 */}
          <div>
            <input
              type="text"
              placeholder={mode==='maker'?'メーカー名検索':'お客様名検索'}
              value={mode==='maker'?searchMakerName:searchCompanyName}
              onChange={e=>mode==='maker'?setSearchMakerName(e.target.value):setSearchCompanyName(e.target.value)}
              style={{ padding:8, border:'1px solid #ccc' }}
            />
            <button onClick={mode==='maker'?handleMakerSearch:handleCompanySearch} style={{ marginLeft:4, padding:'8px' }}><FaSearch /></button>
          </div>

          {/* グループ選択 */}
          <div>
            <select value={selectedGroup} onChange={e=>setSelectedGroup(e.target.value)} style={{ padding:8, border:'1px solid #ccc' }}>
              <option value="">--{mode==='maker'?'メーカー':'お客様'}を選択--</option>
              {(mode==='maker'? (filteredMakers.length?filteredMakers:makers) : (filteredCompanies.length?filteredCompanies:companies))
                .map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          {/* リセット */}
          <button onClick={handleReset} style={{ background:'#6B7280', color:'#fff', padding:'8px 16px' }}><FaUndo /></button>

          {/* お客様担当者選択 */}
          {mode==='company' && staffList.length>0 && (
            <div>
              <select value={selectedStaff} onChange={e=>setSelectedStaff(e.target.value)} style={{ padding:8, border:'1px solid #ccc' }}>
                <option value="">--担当者を選択--</option>
                {staffList.map(name=><option key={name} value={name}>{name} 様</option>)}
              </select>
            </div>
          )}

          {/* 担当者順ソート */}
          <button onClick={()=>setPersonSortAsc(!personSortAsc)} style={{ background:'#6B7280', color:'#fff', padding:'8px 16px' }}>
            {personSortAsc?<FaSortAlphaDown/>:<FaSortAlphaUp/>} 担当者順
          </button>
        </div>

        {/* 発注一覧 */}
        <div ref={printRef}>
          {sortedOrders.map(order=>(
            <div key={order.id} style={{ borderBottom:'1px solid #000', padding:'8px 0' }}>
              <p>発注日: {order.timestamp?.toDate().toLocaleString()}</p>
              <p>納品方法: {order.deliveryOption}</p>
              <p>納品先: {order.customAddress}</p>
              <p>お客様担当者: {order.personName?`${order.personName} 様`:'未入力'}</p>
              <p>高橋本社担当者: {order.takahashiContact||'未入力'}</p>
              <p>納品希望日: {order.deliveryDate}</p>
              <ul>
                {order.items.map((item,idx)=>(
                  <li key={idx}>{mode==='company'?makers.find(m=>m.id===order.makerId)?.name:' '}/ {item.itemCode} {item.name}：{item.quantity}×{item.price}円 (備考:{item.remarks||'なし'})</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default AdminOrderPdf;

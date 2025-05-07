import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import QRCodeScanner from '../../components/QRCodeScanner';
import { FaPrint, FaSearch, FaUndo, FaSortAlphaDown, FaSortAlphaUp } from 'react-icons/fa';

const AdminOrderPdf = () => {
  const [orders, setOrders] = useState([]);
  const [mode, setMode] = useState('maker');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [makers, setMakers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [searchCompanyName, setSearchCompanyName] = useState('');
  const [searchMakerName, setSearchMakerName] = useState('');
  const [searchPersonName, setSearchPersonName] = useState('');
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [filteredMakers, setFilteredMakers] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [personSortAsc, setPersonSortAsc] = useState(true);
  const printRef = useRef(null);

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
    setSearchPersonName('');
    setFilteredCompanies([]);
    setFilteredMakers([]);
    setSelectedGroup('');
    setPersonSortAsc(true);
  };

  const filteredOrders = orders
    .filter(o =>
      selectedGroup
        ? (mode === 'maker' ? o.makerId === selectedGroup : o.companyId === selectedGroup)
        : true
    )
    .filter(o =>
      searchPersonName
        ? (o.personName || '').includes(searchPersonName)
        : true
    );

  const sortedOrders = [...filteredOrders].sort((a, b) =>
    personSortAsc
      ? (a.personName || '').localeCompare(b.personName || '')
      : (b.personName || '').localeCompare(a.personName || '')
  );

  const summaryData = (mode === 'maker' ? makers : companies)
    .map(g => {
      const total = orders
        .filter(o => (mode === 'maker' ? o.makerId === g.id : o.companyId === g.id))
        .flatMap(o => o.items)
        .reduce((sum, item) => sum + item.quantity * item.price, 0);
      return { ...g, total };
    })
    .filter(s => s.total > 0);

  const totalAmount = filteredOrders
    .flatMap(o => o.items)
    .reduce((sum, item) => sum + item.quantity * item.price, 0);

  const handlePrint = () => {
    if (!printRef.current) return;
    const contentHTML = printRef.current.innerHTML;
    const isCompany = mode === 'company';
    const titleText = isCompany ? '発注書（控え）' : '発注書';
    const recipient =
      (isCompany
        ? companies.find(c => c.id === selectedGroup)?.name
        : makers.find(m => m.id === selectedGroup)?.name) + ' 御中';

    const w = window.open('', '_blank', 'width=800,height=600');
    w.document.write(`
      <html>
      <head><title>${titleText}</title><style>
        @page { size: A4; margin: 20mm; }
        body { margin:0; padding:0; font-family:Arial,sans-serif; color:#000; background:#fff; }
        .printContainer { width:170mm; margin:0 auto; padding:10mm; box-sizing:border-box; }
        .header-main { text-align:center; font-size:24px; font-weight:bold; margin-bottom:6mm; }
        .header-sub { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10mm; font-size:12px; }
        .header-sub .left { font-size:16px; }
        .order-item { margin-bottom:8mm; padding-bottom:4mm; border-bottom:1px solid #000; page-break-inside:avoid; }
        .order-item p, .order-item ul { font-size:12px; margin:2px 0; color:#000; }
        .order-item ul { list-style:disc inside; margin-left:4mm; }
        .summary-box { display:flex; justify-content:flex-end; align-items:center; margin-top:10mm; }
        .summary-box .label { background:#333; color:#fff; padding:4px 12px; font-weight:bold; }
        .summary-box .amount { border:1px solid #333; padding:4px 12px; margin-left:2px; font-size:16px; }
      </style></head>
      <body>
        <div class="printContainer">
          <div class="header-main">${titleText}</div>
          <div class="header-sub">
            <div class="left">${recipient}</div>
            <div class="right">
              株式会社高橋本社<br>
              〒131-0032 東京都墨田区東向島1-3-4<br>
              TEL 03-3610-1010 FAX 03-3610-2720
            </div>
          </div>
          ${contentHTML}
          <div class="summary-box">
            <div class="label">合計</div>
            <div class="amount">${totalAmount.toLocaleString()} 円（税込）</div>
          </div>
        </div>
      </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  // styles...

  return (
    <>
      <nav style={{ marginBottom: '16px', display: 'flex', gap: '16px' }}>
        <Link to="/admin/entry" style={{ color: '#2563EB', textDecoration: 'none' }}>入場スキャン</Link>
        <Link to="/admin/exit" style={{ color: '#2563EB', textDecoration: 'none' }}>退場スキャン</Link>
        <Link to="/" style={{ color: '#2563EB', textDecoration: 'none' }}>&#8212; 発注登録</Link>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px', backgroundColor: '#fff', color: '#000' }}>
        <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowSummary(prev => !prev)} style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#fff', background: '#10B981' }}>
              {showSummary ? '集計を隠す' : '集計を表示'}
            </button>
            {filteredOrders.length > 0 && (
              <button onClick={handlePrint} style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#000', background: '#FBBF24' }}>
                <FaPrint style={{ marginRight: '4px' }} />印刷
              </button>
            )}
          </div>
        </div>

        {showSummary && (
          <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: '16px', marginBottom: '16px' }}>
            <h3 style={{ marginBottom: '8px' }}>{mode === 'maker' ? 'メーカー別集計' : 'お客様別集計'}（合計金額）</h3>
            <ul style={{ paddingLeft: '16px', color: '#000' }}>
              {summaryData.map(s => (
                <li key={s.id}>{s.name}：{s.total.toLocaleString()}円</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: '16px', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['maker', 'company'].map(m => (
              <button key={m} onClick={() => { setMode(m); handleReset(); }} style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#fff', background: mode === m ? '#3B82F6' : '#9CA3AF' }}>
                {m === 'maker' ? 'メーカー別' : 'お客様別'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="text" placeholder={mode === 'maker' ? 'メーカー名検索' : 'お客様名検索'} value={mode === 'maker' ? searchMakerName : searchCompanyName} onChange={e => mode === 'maker' ? setSearchMakerName(e.target.value) : setSearchCompanyName(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff', color: '#000', width: '160px' }} />
            <button onClick={mode === 'maker' ? handleMakerSearch : handleCompanySearch} style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#fff', background: '#3B82F6' }}><FaSearch /></button>

            <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff', color: '#000', width: '180px' }}>
              <option value="">--{mode === 'maker' ? 'メーカー' : 'お客様'}を選択--</option>
              {(mode === 'maker' ? (filteredMakers.length ? filteredMakers : makers) : (filteredCompanies.length ? filteredCompanies : companies))
                .map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}
            </select>

            <button onClick={handleReset} style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#fff', background: '#6B7280' }}><FaUndo /></button>

            <input type="text" placeholder="担当者名検索" value={searchPersonName} onChange={e => setSearchPersonName(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff', color: '#000', width: '160px' }} />
            <button onClick={() => {}} style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#fff', background: '#3B82F6' }}><FaSearch /></button>

            <button onClick={() => setPersonSortAsc(prev => !prev)} style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#fff', background: '#6B7280' }}>
              {personSortAsc ? <FaSortAlphaDown /> : <FaSortAlphaUp />} 担当者順
            </button>
          </div>
        </div>

        <div ref={printRef} style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: '16px' }}>
          {sortedOrders.map(order => (
            <div key={order.id} style={{ marginBottom: '16px', borderBottom: '1px solid #000', paddingBottom: '8px' }}>
              <p>発注日: {order.timestamp?.toDate().toLocaleString()}</p>
              <p>納品方法: {order.deliveryOption}</p>
              <p>納品先住所: {order.customAddress}</p>
              <p>お客様担当者: {order.personName ? `${order.personName} 様` : '未入力'}</p>
              <p>高橋本社担当者: {order.takahashiContact || '未入力'}</p>
              <p>納品希望日: {order.deliveryDate}</p>
              <ul style={{ paddingLeft: '16px' }}>
                {order.items.map((item, idx) => {
                  const cname = companies.find(c => c.id === order.companyId)?.name || '';
                  const mname = makers.find(m => m.id === order.makerId)?.name || '';
                  return (
                    <li key={idx} style={{ margin: '4px 0' }}>
                      {mode === 'company'
                        ? `${mname} / ${item.itemCode} / ${item.name}：${item.quantity}個 × ${item.price}円 (備考: ${item.remarks || 'なし'})`
                        : `${cname} / ${item.itemCode} / ${item.name}：${item.quantity}個 × ${item.price}円 (備考: ${item.remarks || 'なし'})`}\
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default AdminOrderPdf;

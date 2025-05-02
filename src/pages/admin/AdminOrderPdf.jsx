// src/pages/admin/AdminOrderPdf.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import QRCodeScanner from '../../components/QRCodeScanner';
import { FaPrint, FaSearch, FaUndo } from 'react-icons/fa';

const AdminOrderPdf = () => {
  const [orders, setOrders] = useState([]);
  const [mode, setMode] = useState('maker'); // 'maker' or 'company'
  const [selectedGroup, setSelectedGroup] = useState('');
  const [makers, setMakers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [searchCompanyName, setSearchCompanyName] = useState('');
  const [searchMakerName, setSearchMakerName] = useState('');
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [filteredMakers, setFilteredMakers] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const printRef = useRef(null);

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
  };

  // 絞り込み
  const filteredOrders = orders.filter(o =>
    selectedGroup
      ? (mode === 'maker' ? o.makerId === selectedGroup : o.companyId === selectedGroup)
      : true
  );

  // 集計データ
  const summaryData = (mode === 'maker'
    ? makers : companies
  ).map(g => {
    const total = orders.filter(o =>
      mode === 'maker' ? o.makerId === g.id : o.companyId === g.id
    ).flatMap(o => o.items)
     .reduce((sum, item) => sum + item.quantity * item.price, 0);
    return { ...g, total };
  }).filter(s => s.total > 0);

  // 印刷用合計
  const totalAmount = filteredOrders.flatMap(o => o.items)
    .reduce((sum, item) => sum + item.quantity * item.price, 0);

  // 印刷
  const handlePrint = () => {
    if (!printRef.current) return;
    const contentHTML = printRef.current.innerHTML;
    const isCompany = mode === 'company';
    const titleText = isCompany ? '発注書（控え）' : '発注書';

    const recipient = mode === 'company'
       ? companies.find(c => c.id === selectedGroup)?.name + ' 御中'
       : makers.find(m => m.id === selectedGroup)?.name + ' 御中';

    const w = window.open('', '_blank', 'width=800,height=600');
    w.document.write(`
      <html>
      <head><title>${titleText}</title><style>
        @page { size: A4; margin: 20mm; }
        @media print {
          body { counter-reset: page; }
          
         /* ページ番号と総ページ数を表示 */
footer::after {
content: "ページ " counter(page) " / " counter(pages);
display: block;
text-align: center;
margin-top: 4mm;
 }
        }
        body { margin:0; padding:0; font-family:Arial,sans-serif; }
        .printContainer { width:170mm; margin:0 auto; padding:10mm; box-sizing:border-box; }
        .header-main { text-align:center; font-size:24px; font-weight:bold; margin-bottom:6mm; }
        .header-sub { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10mm; font-size:12px; }
        .header-sub .left { font-size:16px; }
        .order-item { margin-bottom:8mm; padding-bottom:4mm; border-bottom:1px solid #000; page-break-inside:avoid; }
        .order-item p, .order-item ul { font-size:12px; margin:2px 0; }
        .order-item ul { list-style:disc inside; margin-left:4mm; }
        .summary-box { display:flex; justify-content:flex-end; align-items:center; margin-top:10mm; }
        .summary-box .label { background:#333; color:#fff; padding:4px 12px; font-weight:bold; }
        .summary-box .amount { border:1px solid #333; padding:4px 12px; margin-left:2px; font-size:16px; }
        footer { position:fixed; bottom:10mm; left:0; right:0; text-align:center; font-size:12px; }
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
        <footer></footer>
      </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="p-6 space-y-6">
      {/* ナビゲーション */}
      <div className="flex items-center justify-between">
        <Link to="/" className="text-blue-600 hover:underline">
          &larr; 発注登録に戻る
        </Link>
        <div className="space-x-2">
          <button
            onClick={() => setShowSummary(prev => !prev)}
            className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700"
          >
            {showSummary ? '集計を隠す' : '集計を表示'}
          </button>
          {filteredOrders.length > 0 && (
            <button
              onClick={handlePrint}
              className="bg-yellow-500 text-white px-4 py-2 rounded shadow hover:bg-yellow-600"
            >
              <FaPrint className="inline-block mr-1" /> 印刷
            </button>
          )}
        </div>
      </div>

      {/* 集計内容 */}
      {showSummary && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-3">
            {mode === 'maker' ? 'メーカー別集計' : 'お客様別集計'}（合計金額）
          </h3>
          <ul className="list-inside list-disc space-y-1">
            {summaryData.map(s => (
              <li key={s.id}>
                {s.name}：{s.total.toLocaleString()}円
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* モード切替＆検索 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex space-x-2">
          <button
            onClick={() => { setMode('maker'); handleReset(); }}
            className={`px-4 py-2 rounded ${mode === 'maker' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            メーカー別
          </button>
          <button
            onClick={() => { setMode('company'); handleReset(); }}
            className={`px-4 py-2 rounded ${mode === 'company' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            お客様別
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder={mode === 'maker' ? 'メーカー名検索' : 'お客様名検索'}
            value={mode === 'maker' ? searchMakerName : searchCompanyName}
            onChange={e => mode === 'maker' ? setSearchMakerName(e.target.value) : setSearchCompanyName(e.target.value)}
            className="border p-2 rounded w-48"
          />
          <button
            onClick={mode === 'maker' ? handleMakerSearch : handleCompanySearch}
            className="bg-blue-600 text-white px-3 py-2 rounded"
          >
            <FaSearch />
          </button>
          <select
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">--{mode === 'maker' ? 'メーカー' : 'お客様'}を選択--</option>
            {(mode === 'maker' ? (filteredMakers.length ? filteredMakers : makers)
                : (filteredCompanies.length ? filteredCompanies : companies))
              .map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
          </select>
          <button
            onClick={handleReset}
            className="bg-gray-500 text-white px-3 py-2 rounded"
          >
            <FaUndo />
          </button>
        </div>
      </div>

      {/* 印刷対象 */}
      <div ref={printRef} className="mt-6 space-y-4">
        {filteredOrders.map(order => (
          <div key={order.id} className="order-item">
            <p>発注日: {order.timestamp?.toDate().toLocaleString()}</p>
            <p>納品方法: {order.deliveryOption}</p>
            <p>納品先住所: {order.customAddress}</p>
            <p>お客様担当者: {order.personName || '未入力'}</p>
            <p>高橋本社担当者: {order.takahashiContact || '未入力'}</p>
            <p>納品希望日: {order.deliveryDate}</p>
            <ul className="list-disc ml-4 mt-2">
              {order.items.map((item, idx) => {
                const cname = companies.find(c => c.id === order.companyId)?.name || '';
                const mname = makers.find(m => m.id === order.makerId)?.name || '';
                return (
                  <li key={idx}>
                    {mode === 'company'
                      ? `${mname} / ${item.itemCode} / ${item.name}：${item.quantity}個 × ${item.price}円 (備考: ${item.remarks || 'なし'})`
                      : `${cname} / ${item.itemCode} / ${item.name}：${item.quantity}個 × ${item.price}円 (備考: ${item.remarks || 'なし'})`}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminOrderPdf;

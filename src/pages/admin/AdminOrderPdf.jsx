// src/pages/admin/AdminOrderPdf.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';  // 追加
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import QRCodeScanner from '../../components/QRCodeScanner';
import { FaPrint, FaSearch, FaUndo } from 'react-icons/fa';

const AdminOrderPdf = () => {
  const [orders, setOrders] = useState([]);
  const [mode, setMode] = useState('maker');           // 'maker' or 'company'
  const [selectedGroup, setSelectedGroup] = useState('');
  const [makers, setMakers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [scanningFor, setScanningFor] = useState(null);
  const [searchCompanyName, setSearchCompanyName] = useState('');
  const [searchMakerName, setSearchMakerName] = useState('');
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [filteredMakers, setFilteredMakers] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const printRef = useRef(null);

  // 一度に makers, companies, orders を取得
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

  // QRコード読み取り結果
  const handleScan = id => {
    setSelectedGroup(id);
    setScanningFor(null);
  };

  // 会社名／メーカー名検索
  const handleCompanySearch = () => {
    setFilteredCompanies(
      companies.filter(c =>
        c.name.toLowerCase().includes(searchCompanyName.toLowerCase())
      )
    );
  };
  const handleMakerSearch = () => {
    setFilteredMakers(
      makers.filter(m =>
        m.name.toLowerCase().includes(searchMakerName.toLowerCase())
      )
    );
  };

  // リセット（検索・選択・スキャン）
  const handleReset = () => {
    setSearchCompanyName('');
    setSearchMakerName('');
    setFilteredCompanies([]);
    setFilteredMakers([]);
    setSelectedGroup('');
    setScanningFor(null);
  };

  // 選択グループで絞り込み
  const filteredOrders = orders.filter(o =>
    selectedGroup
      ? (mode === 'maker' ? o.makerId === selectedGroup : o.companyId === selectedGroup)
      : true
  );

  // 集計データ（画面上部）：金額合計
  const summaryData = (mode === 'maker'
    ? makers.map(m => {
        const total = orders
          .filter(o => o.makerId === m.id)
          .flatMap(o => o.items)
          .reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0);
        return { id: m.id, name: m.name, total };
      }).filter(s => s.total > 0)
    : companies.map(c => {
        const total = orders
          .filter(o => o.companyId === c.id)
          .flatMap(o => o.items)
          .reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0);
        return { id: c.id, name: c.name, total };
      }).filter(s => s.total > 0)
  );

  // 印刷用合計
  const totalAmount = filteredOrders
    .flatMap(o => o.items)
    .reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0);

  // 印刷処理
  const handlePrint = () => {
    if (!printRef.current) return;
    const contentHTML = printRef.current.innerHTML;
    const isCompany = mode === 'company';
    const titleText = isCompany ? '発注書（控え）' : '発注書';

    const recipient = isCompany
      ? companies.find(c => c.id === selectedGroup)?.name + ' 御中'
      : '';

    const w = window.open('', '_blank', 'width=800,height=600');
    w.document.write(`
      <html>
      <head><title>${titleText}</title><style>
        @page { size: A4; margin: 20mm; }
        @media print {
          body { counter-reset: page; }
          footer::after { content: "ページ " counter(page); display: block; }
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
    <div className="p-6">
    {/* ← 発注登録画面に戻るボタン */}
    <div className="mb-4">
      <Link
        to="/"
        className="inline-flex items-center px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
      >
        ← 発注登録に戻る
      </Link>
    </div>

      {/* 集計の表示切替ボタン */}
      <button
        onClick={() => setShowSummary(prev => !prev)}
        className="bg-green-600 text-white px-3 py-1 rounded mb-4"
      >
        集計を{showSummary ? '非表示' : '表示'}
      </button>

      {/* 金額合計集計 */}
      {showSummary && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2">
            {mode === 'maker' ? 'メーカー別集計（合計金額）' : '会社別集計（合計金額）'}
          </h3>
          <ul className="list-disc ml-4">
            {summaryData.map(s => (
              <li key={s.id}>
                {s.name}：合計{s.total.toLocaleString()}円
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="text-xl font-bold mb-4">
        {mode === 'maker' ? 'メーカー別発注一覧' : '会社別発注一覧'}
      </h2>

      {/* モード切替 */}
      <div className="space-x-2 mb-4">
        <button
          onClick={() => { setMode('maker'); handleReset(); }}
          className={`px-3 py-1 rounded ${mode==='maker'?'bg-blue-600 text-white':'bg-gray-200'}`}
        >
          メーカー別
        </button>
        <button
          onClick={() => { setMode('company'); handleReset(); }}
          className={`px-3 py-1 rounded ${mode==='company'?'bg-blue-600 text-white':'bg-gray-200'}`}
        >
          会社別
        </button>
      </div>

      {/* QR/検索/プルダウン */}
      <div className="flex flex-wrap items-center space-x-2 mb-4">
        {mode==='company' ? (
          <>
            <button onClick={() => setScanningFor('company')} className="bg-blue-600 text-white px-3 py-1 rounded">
              会社IDを読み取る
            </button>
            {scanningFor==='company' && <QRCodeScanner onScan={handleScan}/>}

            <input
              type="text"
              placeholder="会社名で検索"
              value={searchCompanyName}
              onChange={e => setSearchCompanyName(e.target.value)}
              className="border p-1"
            />
            <button onClick={handleCompanySearch} className="bg-blue-600 text-white px-3 py-1 rounded">
              <FaSearch /> 検索
            </button>
            <select
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
              className="border p-1"
            >
              <option value="">--会社を選択--</option>
              {filteredCompanies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </>
        ) : (
          <>
            <button onClick={() => setScanningFor('maker')} className="bg-purple-600 text-white px-3 py-1 rounded">
              メーカーIDを読み取る
            </button>
            {scanningFor==='maker' && <QRCodeScanner onScan={handleScan}/>}

            <input
              type="text"
              placeholder="メーカー名で検索"
              value={searchMakerName}
              onChange={e => setSearchMakerName(e.target.value)}
              className="border p-1"
            />
            <button onClick={handleMakerSearch} className="bg-purple-600 text-white px-3 py-1 rounded">
              <FaSearch /> 検索
            </button>
            <select
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
              className="border p-1"
            >
              <option value="">--メーカーを選択--</option>
              {filteredMakers.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </>
        )}
        <button onClick={handleReset} className="bg-gray-500 text-white px-3 py-1 rounded">
          <FaUndo /> リセット
        </button>
      </div>

      {/* 印刷ボタン */}
      {selectedGroup && (
        <button onClick={handlePrint} className="bg-yellow-500 text-white px-3 py-1 rounded no-print mb-4">
          <FaPrint /> 印刷
        </button>
      )}

      {/* 印刷対象エリア */}
      <div ref={printRef}>
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

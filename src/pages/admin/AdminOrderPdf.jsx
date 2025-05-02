// src/pages/admin/AdminOrderPdf.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { FaPrint, FaSearch, FaUndo } from 'react-icons/fa';

const AdminOrderPdf = () => {
  const [orders, setOrders] = useState([]);
  const [mode, setMode] = useState('maker');           // 'maker' or 'company'
  const [selectedGroup, setSelectedGroup] = useState('');
  const [makers, setMakers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const printRef = useRef(null);

  // データ取得
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

  // グループ絞り込み
  const filteredOrders = orders.filter(o =>
    selectedGroup
      ? (mode === 'maker' ? o.makerId === selectedGroup : o.companyId === selectedGroup)
      : true
  );

  // 集計データ
  const summaryData = (mode === 'maker'
    ? makers : companies
  ).map(g => {
    const total = orders
      .filter(o => (mode === 'maker' ? o.makerId : o.companyId) === g.id)
      .flatMap(o => o.items)
      .reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0);
    return { ...g, total };
  }).filter(s => s.total > 0 && s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // 印刷合計
  const totalAmount = filteredOrders
    .flatMap(o => o.items)
    .reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0);

  // 印刷処理
  const handlePrint = () => {
    if (!printRef.current) return;
    const contentHTML = printRef.current.innerHTML;
    const titleText = mode === 'maker' ? 'メーカー発注一覧' : '会社発注一覧';
    const w = window.open('', '_blank', 'width=800,height=600');
    w.document.write(`
      <html><head><title>${titleText}</title><style>
        @page { size:A4; margin:20mm; }
        body{margin:0;padding:0;font-family:Arial,sans-serif;}
        .container{padding:10mm;}
        h1{text-align:center;margin-bottom:10mm;}
        .summary{margin-bottom:8mm;font-size:14px;}
        .order{border-bottom:1px solid #000;padding:4mm 0;}
      </style></head><body>
        <div class="container">
          <h1>${titleText}</h1>
          ${contentHTML}
          <div class="summary">合計: ${totalAmount.toLocaleString()} 円</div>
        </div>
      </body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      {/* 戻るボタン */}
      <Link to="/" className="inline-block mb-4 text-blue-600 hover:underline">
        ← 発注登録に戻る
      </Link>

      {/* モード切替 */}
      <div className="flex space-x-2 mb-4">
        {['maker','company'].map(m => (
          <button key={m}
            onClick={() => { setMode(m); setSelectedGroup(''); setSearchTerm(''); }}
            className={`px-3 py-1 rounded ${mode===m?'bg-blue-600 text-white':'bg-gray-200'}`}
          >{m==='maker'?'メーカー別':'会社別'}</button>
        ))}
      </div>

      {/* 検索 & 選択 */}
      <div className="flex items-center space-x-2 mb-4">
        <input
          type="text"
          placeholder={mode==='maker'?'メーカー名検索':'会社名検索'}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="border rounded px-2 py-1 flex-1"
        />
        <select
          value={selectedGroup}
          onChange={e => setSelectedGroup(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">全て</option>
          {(mode==='maker'?makers:companies)
            .filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <button onClick={() => { setSelectedGroup(''); setSearchTerm(''); }}
          className="px-2 py-1 bg-gray-300 rounded">
          <FaUndo /></button>
      </div>

      {/* 集計表示 */}
      <button onClick={() => setShowSummary(!showSummary)}
        className="px-3 py-1 bg-green-600 text-white rounded mb-4">
        {showSummary?'集計非表示':'集計表示'}
      </button>
      {showSummary && (
        <ul className="list-disc ml-4 mb-6">
          {summaryData.map(s => (
            <li key={s.id}>{s.name}: {s.total.toLocaleString()} 円</li>
          ))}
        </ul>
      )}

      <h2 className="text-xl font-bold mb-4">
        {mode==='maker'?'メーカー別発注一覧':'会社別発注一覧'}
      </h2>

      {/* 印刷ボタン */}
      <button onClick={handlePrint} className="px-4 py-1 bg-yellow-500 text-white rounded">
        <FaPrint /> 印刷
      </button>

      {/* 印刷対象 */}
      <div ref={printRef} className="mt-4 space-y-4">
        {filteredOrders.map(order => (
          <div key={order.id} className="order">
            <div className="text-sm text-gray-600">発注ID: {order.id}</div>
            <ul className="list-disc ml-4">
              {order.items.map((it, i) => (
                <li key={i}>{`${it.itemCode} / ${it.name}：${it.quantity} × ${it.price} 円 (備考: ${it.remarks||'なし'})`}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminOrderPdf;

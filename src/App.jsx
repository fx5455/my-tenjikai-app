// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import OrderEntry from './pages/OrderEntry';
import MakerOrderList from './pages/MakerOrderList';
import AdminOrderList from './pages/admin/AdminOrderList';
import AdminOrderPdf from './pages/admin/AdminOrderPdf';

function App() {
  return (
    <Router>
      <Routes>
        {/* 発注登録ページ */}
        <Route path="/" element={<OrderEntry />} />

        {/* メーカー別発注一覧ページ */}
        <Route path="/maker-orders/:makerId" element={<MakerOrderList />} />

        {/* 管理画面：発注一覧ページ（リスト表示） */}
        <Route path="/admin/orders" element={<AdminOrderList />} />

        {/* 管理画面：発注一覧ページ（PDF/印刷表示） */}
        <Route path="/admin/orders/pdf" element={<AdminOrderPdf />} />
      </Routes>
    </Router>
  );
}

export default App;

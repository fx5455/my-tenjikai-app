// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import OrderEntry from './pages/OrderEntry';
import AdminOrderList from './pages/admin/AdminOrderList';
import AdminOrderPdf from './pages/admin/AdminOrderPdf';
import CustomerHistory from './pages/CustomerHistory';
import EntryPage from "./pages/admin/EntryPage";
import ExitPage from "./pages/admin/ExitPage";

function App() {
  return (
    <Router>
      <Routes>
        {/* 発注登録ページ */}
        <Route path="/" element={<OrderEntry />} />

        {/* 管理画面：発注一覧ページ（リスト表示） */}
        <Route path="/admin/orders" element={<AdminOrderList />} />

        {/* 管理画面：発注一覧ページ（PDF/印刷表示） */}
        <Route path="/admin/orders/pdf" element={<AdminOrderPdf />} />

        <Route path="/admin/entry" element={<EntryPage />} />
        
        <Route path="/admin/exit"  element={<ExitPage />} />

        <Route path="/history" element={<CustomerHistory />} />
      </Routes>
    </Router>
  );
}

export default App;

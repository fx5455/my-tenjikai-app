// src/pages/admin/EntryPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import QRCodeScanner from '../../components/QRCodeScanner';

const EntryPage = () => {
  const [scanning, setScanning] = useState(true);
  const handleCompanyScan = async (id) => {
    try {
      await addDoc(collection(db, 'orders'), {
        sessionId: crypto.randomUUID(),
        companyId: id,
        startedAt: serverTimestamp(),
        status: 'open',
        items: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      alert('入場を記録しました。');
      setScanning(false);
    } catch (error) {
      console.error('EntryPage error:', error);
      alert('入場記録に失敗しました。');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto', background: '#f9f9f9' }}>
      <nav style={{ marginBottom: '16px' }}>
        <Link to="/admin/orders/pdf" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 'bold' }}>&larr; 管理画面に戻る</Link>
      </nav>
      <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginBottom: '12px' }}>入場スキャン</h2>
        {scanning ? (
          <QRCodeScanner
            mode="company"
            setCompanyId={handleCompanyScan}
            onCancel={() => setScanning(false)}
          />
        ) : (
          <button
            onClick={() => setScanning(true)}
            style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#3B82F6', color: '#fff', cursor: 'pointer' }}
          >
            再スキャン
          </button>
        )}
      </div>
    </div>
  );
};

export default EntryPage;
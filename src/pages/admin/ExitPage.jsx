// src/pages/admin/ExitPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import QRCodeScanner from '../../components/QRCodeScanner';

const ExitPage = () => {
  const [scanning, setScanning] = useState(true);
  const handleCompanyScan = async (id) => {
    try {
      const q = query(
        collection(db, 'orders'),
        where('companyId', '==', id),
        where('status', '==', 'open'),
        orderBy('startedAt', 'desc'),
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        alert('未入場のセッションがありません');
        setScanning(false);
        return;
      }
      const docRef = snap.docs[0].ref;
      await updateDoc(docRef, {
        endedAt: serverTimestamp(),
        status: 'closed',
        updatedAt: serverTimestamp(),
      });
      alert('退場を記録しました。');
      setScanning(false);
    } catch (error) {
      console.error('ExitPage error:', error);
      alert('退場記録に失敗しました。');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto', background: '#f9f9f9' }}>
      <nav style={{ marginBottom: '16px' }}>
        <Link to="/admin/orders" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 'bold' }}>&larr; 管理画面に戻る</Link>
      </nav>
      <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginBottom: '12px' }}>退場スキャン</h2>
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

export default ExitPage;

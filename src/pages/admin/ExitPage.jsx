// src/pages/admin/ExitPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import QRCodeScanner from '../../components/QRCodeScanner';

const ExitPage = () => {
  const [scanning, setScanning] = useState(true);

  const handleScan = async (qrData) => {
    try {
      const companyId = qrData.text || qrData;
      const q = query(
        collection(db, 'orders'),
        where('companyId', '==', companyId),
        where('status', '==', 'open'),
        orderBy('startedAt', 'desc'),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        alert('未終了のセッションが見つかりません。');
        return;
      }
      const docRef = snapshot.docs[0].ref;
      await updateDoc(docRef, {
        endedAt: serverTimestamp(),
        status: 'closed',
        updatedAt: serverTimestamp(),
      });
      alert('退場を記録しました。発注書を確定できます。');
      setScanning(false);
    } catch (error) {
      console.error('ExitPage error:', error);
      alert('退場記録中にエラーが発生しました。');
    }
  };

  const handleCancel = () => {
    setScanning(false);
  };

  // Styling
  const containerStyle = { padding: '24px', maxWidth: '600px', margin: '0 auto', background: '#f9f9f9' };
  const navStyle = { marginBottom: '16px' };
  const linkStyle = { color: '#2563EB', textDecoration: 'none', fontWeight: 'bold' };
  const cardStyle = { background: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' };
  const buttonStyle = { padding: '8px 16px', fontSize: '16px', borderRadius: '4px', border: 'none', background: '#3B82F6', color: '#fff', cursor: 'pointer' };

  return (
    <div style={containerStyle}>
      <nav style={navStyle}>
        <Link to="/admin/orders/pdf" style={linkStyle}>&larr; 管理画面に戻る</Link>
      </nav>
      <div style={cardStyle}>
        <h2 style={{ marginBottom: '12px' }}>退場スキャン</h2>
        {scanning ? (
          <QRCodeScanner onScan={handleScan} onCancel={handleCancel} />
        ) : (
          <button style={buttonStyle} onClick={() => setScanning(true)}>再スキャン</button>
        )}
      </div>
    </div>
  );
};

export default ExitPage;

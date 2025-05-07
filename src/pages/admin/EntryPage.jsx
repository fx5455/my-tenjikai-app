// src/pages/admin/EntryPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import QRCodeScanner from '../../components/QRCodeScanner';

const EntryPage = () => {
  const [scanning, setScanning] = useState(true);

  const handleScan = async (qrData) => {
    try {
      const companyId = qrData.text || qrData;
      const newSession = {
        sessionId: crypto.randomUUID(),
        companyId,
        startedAt: serverTimestamp(),
        status: 'open',
        items: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'orders'), newSession);
      alert('入場を記録しました。発注を開始できます。');
      // Optionally stop scanning after success
      setScanning(false);
    } catch (error) {
      console.error('EntryPage error:', error);
      alert('入場記録中にエラーが発生しました。');
    }
  };

  const handleCancel = () => {
    // Stop camera and show rescan
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
        <Link to="/admin/orders" style={linkStyle}>&larr; 管理画面に戻る</Link>
      </nav>
      <div style={cardStyle}>
        <h2 style={{ marginBottom: '12px' }}>入場スキャン</h2>
        {scanning ? (
          <QRCodeScanner onScan={handleScan} onCancel={handleCancel} />
        ) : (
          <button style={buttonStyle} onClick={() => setScanning(true)}>再スキャン</button>
        )}
      </div>
    </div>
  );
};

export default EntryPage;
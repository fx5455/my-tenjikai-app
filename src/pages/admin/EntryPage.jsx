// src/pages/admin/EntryPage.jsx
import React from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import QRCodeScanner from '../../components/QRCodeScanner';

const EntryPage = () => {
  const handleScan = async (qrData) => {
    try {
      // QRCodeScanner の出力形式に合わせて取得
      const companyId = qrData.text || qrData;
      // 新規セッションとして orders コレクションに追加
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
    } catch (error) {
      console.error('EntryPage scan error:', error);
      alert('入場記録中にエラーが発生しました。');
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      <h2>入場スキャン</h2>
      <QRCodeScanner onScan={handleScan} />
    </div>
  );
};

export default EntryPage;
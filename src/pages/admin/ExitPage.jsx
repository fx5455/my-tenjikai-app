// src/pages/admin/ExitPage.jsx
import React from 'react';
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
  const handleScan = async (qrData) => {
    try {
      const companyId = qrData.text || qrData;
      // 最新の open セッションを１件取得
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
      const orderDoc = snapshot.docs[0];
      // endedAt, status を更新してクローズ
      await updateDoc(orderDoc.ref, {
        endedAt: serverTimestamp(),
        status: 'closed',
        updatedAt: serverTimestamp(),
      });
      alert('退場を記録しました。発注書を確定できます。');
    } catch (error) {
      console.error('ExitPage scan error:', error);
      alert('退場記録中にエラーが発生しました。');
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      <h2>退場スキャン</h2>
      <QRCodeScanner onScan={handleScan} />
    </div>
  );
};

export default ExitPage;

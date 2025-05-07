// src/pages/admin/ExitPage.jsx
import React from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import QRCodeScanner from "../../components/QRCodeScanner";

const ExitPage = () => {
  const handleScan = async (qrData) => {
    const companyId = qrData;
    const q = query(
      collection(db, "orders"),
      where("companyId", "==", companyId),
      where("status", "==", "open"),
      orderBy("startedAt", "desc"),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      alert("未終了のセッションが見つかりません。");
      return;
    }
    const docRef = snap.docs[0].ref;
    await updateDoc(docRef, {
      endedAt: serverTimestamp(),
      status: "closed",
      updatedAt: serverTimestamp(),
    });
    alert("退場を記録しました。発注書を確定できます。");
  };

  return (
    <div className="p-4">
      <h2 className="text-xl mb-2">退場スキャン</h2>
      <QRCodeScanner onScan={handleScan} />
    </div>
  );
};

export default ExitPage;

// src/pages/admin/EntryPage.jsx
import React from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { v4 as uuidv4 } from "uuid";
import QRCodeScanner from "../../components/QRCodeScanner";

const EntryPage = () => {
  const handleScan = async (qrData) => {
    const companyId = qrData; // 必要に応じてパース
    await addDoc(collection(db, "orders"), {
      sessionId: uuidv4(),
      companyId,
      startedAt: serverTimestamp(),
      status: "open",
      lineItems: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    alert("入場を記録しました。発注を開始できます。");
  };

  return (
    <div className="p-4">
      <h2 className="text-xl mb-2">入場スキャン</h2>
      <QRCodeScanner onScan={handleScan} />
    </div>
  );
};

export default EntryPage;
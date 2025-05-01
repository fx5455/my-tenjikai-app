import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * QRCodeScanner コンポーネント
 * @param {{ mode: 'company' | 'maker', setCompanyId: Function, setMakerId: Function, onCancel: Function }} props
 * - mode が 'company' の場合: companies コレクション存在チェック
 * - mode が 'maker' の場合: makers コレクション存在チェックと固定機能
 * - onCancel: キャンセル時に呼び出される
 */
const QRCodeScanner = ({ mode, setCompanyId, setMakerId, onCancel }) => {
  const qrRegionId = 'reader';
  const scannerRef = useRef(null);
  const [makerLocked, setMakerLocked] = useState(false);
  const [active, setActive] = useState(true);

  // スキャナ起動
  const startScanner = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices || !devices.length) {
        alert('カメラが見つかりませんでした');
        return;
      }
      const scanner = new Html5Qrcode(qrRegionId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        async decodedText => {
          console.log('✅ QRコード検出:', decodedText);
          const idValue = decodedText.trim();
          // Firestore チェック
          if (mode === 'company') {
            const snap = await getDoc(doc(db, 'companies', idValue));
            if (!snap.exists()) alert('該当する会社がありません');
            else {
              setCompanyId(idValue);
              await scanner.stop();
              setActive(false);
            }
          } else {
            // 免费読み取り: JSON や任意文字列をそのまま扱う
            if (makerLocked) return;
            const snap = await getDoc(doc(db, 'makers', idValue));
            if (!snap.exists()) alert('該当するメーカーがありません');
            else {
              setMakerId(idValue);
            }
          }
        },
        errorMessage => console.log('読み取り中...', errorMessage)
      );
    } catch (err) {
      console.error('カメラ起動エラー:', err);
      alert('カメラが使用できませんでした');
    }
  };

  // スキャナ停止
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {}
    }
  };

  // mount / active 変化時にスキャナ制御
  useEffect(() => {
    if (active) startScanner();
    return () => {
      stopScanner();
    };
  }, [active, mode, makerLocked]);

  // キャンセルハンドラ
  const handleCancel = () => {
    stopScanner();
    setActive(false);
    onCancel();
  };

  // 再スキャンハンドラ
  const handleRescan = () => {
    if (!active) setActive(true);
  };

  return (
    <div className="my-4">
      <div id={qrRegionId} className="w-full max-w-xs mx-auto border p-2" />
      <div className="flex justify-center mt-2 space-x-4">
        {mode === 'maker' && (
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={makerLocked}
              onChange={e => setMakerLocked(e.target.checked)}
            />
            <span className="text-sm">メーカー固定</span>
          </label>
        )}
        <button
          onClick={handleCancel}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm"
        >キャンセル</button>
        {!active && (
          <button
            onClick={handleRescan}
            className="bg-green-500 text-white px-3 py-1 rounded text-sm"
          >再スキャン</button>
        )}
      </div>
    </div>
  );
};

export default QRCodeScanner;

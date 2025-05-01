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
  const html5QrRef = useRef(null);
  const [makerLocked, setMakerLocked] = useState(false);

  useEffect(() => {
    let scanner;
    const startScanner = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!devices || !devices.length) {
          alert('カメラが見つかりませんでした');
          return;
        }
        scanner = new Html5Qrcode(qrRegionId);
        html5QrRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' }, // 背面カメラ推奨
          { fps: 10, qrbox: 250 },
          async decodedText => {
            console.log('✅ QRコード検出:', decodedText);
            const idValue = decodedText.trim();
            if (mode === 'company') {
              const ref = doc(db, 'companies', idValue);
              const snap = await getDoc(ref);
              if (!snap.exists()) {
                alert('該当する会社がありません');
                return;
              }
              setCompanyId(idValue);
              await scanner.stop();
            } else {
              // mode === 'maker'
              if (makerLocked) return;
              const ref = doc(db, 'makers', idValue);
              const snap = await getDoc(ref);
              if (!snap.exists()) {
                alert('該当するメーカーがありません');
                return;
              }
              setMakerId(idValue);
            }
          },
          errorMessage => console.log('読み取り中...', errorMessage)
        );
      } catch (err) {
        console.error('カメラ起動エラー:', err);
        alert('カメラが使用できませんでした');
      }
    };

    startScanner();
    return () => {
      if (scanner) {
        scanner.stop().catch(() => {}).then(() => scanner.clear());
      }
    };
  }, [mode, makerLocked, setCompanyId, setMakerId]);

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
          onClick={() => {
            const scanner = html5QrRef.current;
            if (scanner) {
              scanner.stop().catch(() => {}).then(() => scanner.clear());
            }
            onCancel();
          }}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
};

export default QRCodeScanner;

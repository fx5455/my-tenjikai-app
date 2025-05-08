// src/components/QRCodeScanner.jsx
import React, { useRef, useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

/**
 * Props:
 *  - mode: 'company' | 'maker'
 *  - onScan: (id: string) => void
 *  - onCancel: () => void
 */
export default function QRCodeScanner({ mode, onScan, onCancel }) {
  // モードごとにユニークな DOM ID
  const qrRegionId = useRef(`qr-${mode}-${Date.now()}`).current;
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    let activeScanner;
    if (!isScanning) return;

    (async () => {
      try {
        // ① カメラ一覧を取得
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          alert('カメラが見つかりません');
          setIsScanning(false);
          return;
        }

        // ② 一番目のカメラの deviceId を使う（iOSで確実に背面カメラを選択）
        const cameraId = devices[0].id;
        console.log('[QRCodeScanner] 使用 cameraId=', cameraId);

        activeScanner = new Html5Qrcode(qrRegionId);
        scannerRef.current = activeScanner;

        // ③ deviceId を第一引数にして start() を呼び出す
        await activeScanner.start(
          cameraId,
          { fps: 10, qrbox: 250 },
          decodedText => {
            const id = decodedText.trim();
            console.log(`[QRCodeScanner] decoded="${id}" mode="${mode}"`);
            onScan(id);
            setIsScanning(false);
            onCancel?.();
          },
          errorMsg => {
            console.warn('[QRCodeScanner] scan error', errorMsg);
          }
        );
      } catch (err) {
        console.error('[QRCodeScanner] camera error', err);
        alert('カメラ起動に失敗しました');
        setIsScanning(false);
      }
    })();

    return () => {
      const sc = scannerRef.current;
      if (sc) {
        sc.stop().catch(() => {}).then(() => sc.clear());
      }
    };
  }, [isScanning, qrRegionId, mode, onScan, onCancel]);

  return (
    <div className="text-center">
      <h3 className="font-semibold mb-2">
        {mode === 'company' ? '会社IDスキャン中…' : 'メーカーIDスキャン中…'}
      </h3>
      <div
        id={qrRegionId}
        className="w-64 h-64 mx-auto border"
        style={{ display: isScanning ? 'block' : 'none' }}
      />
      {isScanning && (
        <button
          onClick={() => { setIsScanning(false); onCancel?.(); }}
          className="mt-2 px-4 py-2 bg-red-500 text-white rounded"
        >
          キャンセル
        </button>
      )}
    </div>
  );
}

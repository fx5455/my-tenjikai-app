// src/components/QRCodeScanner.jsx
import React, { useRef, useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

/**
 * QRCodeScanner.jsx
 *
 * Props:
 *  - mode: 'company' | 'maker'
 *  - onScan: (id: string) => void
 *  - onCancel: () => void
 */
export default function QRCodeScanner({ mode, onScan, onCancel }) {
  // モードごとにユニークな DOM ID を生成
  const qrRegionId = useRef(`qr-${mode}-${Date.now()}`).current;
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    let activeScanner;
    if (!isScanning) return;

    (async () => {
      try {
        // カメラ一覧を取得
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          alert('カメラが見つかりません');
          setIsScanning(false);
          return;
        }

        // 背面カメラを優先選択（label に "back" "rear" "環境" を含むもの）
        const backCamera = devices.find(d => {
          const lbl = d.label.toLowerCase();
          return lbl.includes('back') || lbl.includes('rear') || lbl.includes('environment') || lbl.includes('環境');
        }) || devices[0];
        console.log('[QRCodeScanner] 使用 cameraId=', backCamera.id, 'label=', backCamera.label);

        activeScanner = new Html5Qrcode(qrRegionId);
        scannerRef.current = activeScanner;

        // deviceId を指定してカメラ起動
        await activeScanner.start(
          backCamera.id,
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            const id = decodedText.trim();
            console.log(`[QRCodeScanner] decoded="${id}" mode="${mode}"`);
            onScan(id);
            setIsScanning(false);
            onCancel?.();
          },
          (errorMsg) => {
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

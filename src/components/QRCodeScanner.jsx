// src/components/QRCodeScanner.jsx
import React, { useRef, useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

/**
 * Props:
 *  - mode: 'company' | 'maker'
 *  - onScan: (id: string) => void
 *  - onCancel: () => void
 */
const QRCodeScanner = ({ mode, onScan, onCancel }) => {
  const qrRegionId = 'reader';
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    let activeScanner;
    if (isScanning) {
      (async () => {
        try {
          const devices = await Html5Qrcode.getCameras();
          if (!devices?.length) {
            alert('カメラが見つかりませんでした');
            setIsScanning(false);
            return;
          }
          activeScanner = new Html5Qrcode(qrRegionId);
          scannerRef.current = activeScanner;

          await activeScanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: 250 },
            decodedText => {
              const id = decodedText.trim();
              onScan(id);
              setIsScanning(false);
              onCancel?.();
            },
            errorMsg => {
              console.warn('読み取り中:', errorMsg);
            }
          );
        } catch (err) {
          console.error('カメラ起動エラー:', err);
          alert('カメラが使用できませんでした');
          setIsScanning(false);
        }
      })();
    }
    return () => {
      const sc = scannerRef.current;
      if (sc) {
        sc.stop().catch(() => {}).then(() => sc.clear());
      }
    };
  }, [isScanning, mode, onScan, onCancel]);

  return (
    <div className="text-center">
      <h3 className="font-semibold mb-2">
        {mode === 'company' ? '会社IDスキャン中…' : 'メーカーIDスキャン中…'}
      </h3>
      <div id={qrRegionId} className="w-64 h-64 mx-auto border" style={{ display: isScanning ? 'block' : 'none' }} />
      {isScanning && (
        <button onClick={() => { setIsScanning(false); onCancel?.(); }}
                className="mt-2 px-4 py-2 bg-red-500 text-white rounded">
          キャンセル
        </button>
      )}
    </div>
  );
};

export default QRCodeScanner;
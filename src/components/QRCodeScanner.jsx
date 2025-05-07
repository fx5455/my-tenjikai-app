import React, { useRef, useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

/**
 * QRCodeScanner.jsx
 *
 * Props:
 *  - mode: 'company' | 'maker'
 *  - onScan: (id: string) => void  // コールバックで読み取ったIDを返す
 *  - onCancel: () => void         // キャンセル時のハンドラ
 */
const QRCodeScanner = ({ mode, onScan, onCancel }) => {
  // ユニークIDを生成して複数モードでもDOM衝突を防ぐ
  const qrRegionId = useRef(`qr-reader-${mode}-${Date.now()}`).current;
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    let activeScanner;
    if (isScanning) {
      (async () => {
        try {
          // カメラ取得
          const devices = await Html5Qrcode.getCameras();
          if (!devices || devices.length === 0) {
            alert('カメラが見つかりませんでした');
            setIsScanning(false);
            return;
          }

          // インスタンス生成
          activeScanner = new Html5Qrcode(qrRegionId);
          scannerRef.current = activeScanner;

          // 読み取り開始
          await activeScanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: 250 },
            (decodedText) => {
              const id = decodedText.trim();
              console.log(`[QRCodeScanner] decodedText="${id}" mode="${mode}"`);
              // 読み取ったIDを親コンポーネントへ渡す
              onScan(id);
              setIsScanning(false);
              onCancel && onCancel();
            },
            (errorMsg) => {
              console.warn('[QRCodeScanner] 読み取り中:', errorMsg);
            }
          );
        } catch (err) {
          console.error('[QRCodeScanner] カメラ起動エラー:', err);
          alert('カメラが使用できませんでした');
          setIsScanning(false);
        }
      })();
    }
    return () => {
      // コンポーネントアンマウント時に停止・クリア
      const sc = scannerRef.current;
      if (sc) {
        sc.stop()
          .catch(() => {})
          .then(() => sc.clear());
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
          onClick={() => { setIsScanning(false); onCancel && onCancel(); }}
          className="mt-2 px-4 py-2 bg-red-500 text-white rounded"
        >
          キャンセル
        </button>
      )}
    </div>
  );
};

export default QRCodeScanner;

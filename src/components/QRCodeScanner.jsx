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
  const qrRegionId = useRef(`qr-${mode}-${Date.now()}`).current;
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    let activeScanner;
    if (!isScanning) return;

    (async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          alert('カメラが見つかりません');
          setIsScanning(false);
          return;
        }

        // 背面カメラ候補
        const backCamera = devices.find(d => {
          const lbl = (d.label || '').toLowerCase();
          return lbl.includes('back') || lbl.includes('rear') || lbl.includes('environment') || lbl.includes('環境');
        });

        activeScanner = new Html5Qrcode(qrRegionId);
        scannerRef.current = activeScanner;

        const startWithConfig = async (cameraConfig) => {
          console.log('[QRCodeScanner] try start with config:', cameraConfig);
          try {
            await activeScanner.start(
              cameraConfig,
              { fps: 10, qrbox: 250 },
              decodedText => {
                const id = decodedText.trim();
                console.log('[QRCodeScanner] decoded="'+id+'" mode="'+mode+'"');
                onScan(id);
                setIsScanning(false);
                onCancel?.();
              },
              errorMsg => {
                console.warn('[QRCodeScanner] scan error', errorMsg);
              }
            );
            return true;
          } catch (err) {
            console.warn('[QRCodeScanner] start failed', cameraConfig, err);
            return false;
          }
        };

        let started = false;
        // 1. backCamera.id (string) で試行
        if (backCamera) {
          started = await startWithConfig(backCamera.id);
        }
        // 2. facingMode:environment で試行
        if (!started) {
          started = await startWithConfig({ facingMode: { exact: 'environment' } });
        }
        // 3. first device id (string) で最終試行
        if (!started) {
          console.warn('[QRCodeScanner] falling back to first device id');
          started = await startWithConfig(devices[0].id);
        }

        if (!started) {
          throw new Error('全てのカメラ起動に失敗しました');
        }
      } catch (err) {
        console.error('[QRCodeScanner] camera error', err);
        alert('カメラ起動に失敗しました: ' + err.message);
        setIsScanning(false);
      }
    })();

    return () => {
      const sc = scannerRef.current;
      if (sc) sc.stop().catch(() => {}).then(() => sc.clear());
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

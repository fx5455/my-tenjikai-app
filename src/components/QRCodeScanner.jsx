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
    if (!isScanning) return;

    const activeScanner = new Html5Qrcode(qrRegionId);
    scannerRef.current = activeScanner;

    const decodeCallback = decodedText => {
      const id = decodedText.trim();
      console.log(`[QRCodeScanner] decoded="${id}" mode="${mode}"`);
      onScan(id);
      setIsScanning(false);
      onCancel?.();
    };

    const errorCallback = errorMsg => {
      console.warn('[QRCodeScanner] scan error', errorMsg);
    };

    (async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          throw new Error('カメラが見つかりません');
        }
        console.log('[QRCodeScanner] found devices', devices.map(d => d.label));

        // 起動順序: 1. Webカメラまたは最初のデバイスID 2. facingMode:environment exact 3. facingMode:environment ideal 4. プラットフォームデフォルト
        const configs = [
          devices[0].id,
          { facingMode: { exact: 'environment' } },
          { facingMode: { ideal: 'environment' } },
          true
        ];

        let started = false;
        for (const cfg of configs) {
          try {
            console.log('[QRCodeScanner] try start with config:', cfg);
            await activeScanner.start(
              cfg,
              { fps: 10, qrbox: 250 },
              decodeCallback,
              errorCallback
            );
            started = true;
            console.log('[QRCodeScanner] start succeeded with config:', cfg);
            break;
          } catch (e) {
            console.warn('[QRCodeScanner] start failed for config:', cfg, e);
          }
        }

        if (!started) {
          throw new Error('すべてのカメラ起動に失敗しました');
        }
      } catch (err) {
        console.error('[QRCodeScanner] camera error', err);
        alert('カメラ起動に失敗しました: ' + err.message);
        setIsScanning(false);
      }
    })();

    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .then(() => scannerRef.current.clear());
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

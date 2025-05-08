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

        // 背面カメラを優先する
        const backCamera = devices.find(d => {
          const lbl = (d.label || '').toLowerCase();
          return lbl.includes('back') || lbl.includes('rear') || lbl.includes('環境');
        });

        const trimmedQRRegion = qrRegionId;
        activeScanner = new Html5Qrcode(trimmedQRRegion);
        scannerRef.current = activeScanner;

        // 起動トライ関数
        const startWithConfig = async config => {
          try {
            await activeScanner.start(
              config,
              { fps: 10, qrbox: 250 },
              decodedText => {
                const id = decodedText.trim();
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
            console.warn('[QRCodeScanner] start failed', config, err);
            return false;
          }
        };

        // 1. deviceId 指定で試行
        let started = false;
        if (backCamera) {
          const deviceConfig = { deviceId: { exact: backCamera.id } };
          started = await startWithConfig(deviceConfig);
        }
        // 2. facingMode でフォールバック
        if (!started) {
          const faceConfig = { facingMode: { ideal: 'environment' } };
          started = await startWithConfig(faceConfig);
        }
        // 3. 最終的 fallback: defaultカメラ
        if (!started) {
          await startWithConfig(true);
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

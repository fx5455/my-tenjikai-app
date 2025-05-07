// src/components/QRCodeScanner.jsx
import React, { useRef, useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

/**
 * QRCodeScanner.jsx
 *
 * Props:
 * - mode: 'company' | 'maker'
 * - setCompanyId: (id: string) => void
 * - setMakerId: (id: string) => void
 * - onCancel: () => void
 *
 * マウント時にカメラを起動し、QRコード読み取り後にIDを返却します。
 */
const QRCodeScanner = ({ mode, setCompanyId, setMakerId, onCancel }) => {
  const qrRegionId = 'reader';
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    let scannerInstance;
    if (isScanning) {
      (async () => {
        try {
          const devices = await Html5Qrcode.getCameras();
          if (!devices || devices.length === 0) {
            alert('カメラが見つかりませんでした');
            setIsScanning(false);
            return;
          }
          scannerInstance = new Html5Qrcode(qrRegionId);
          scannerRef.current = scannerInstance;

          await scannerInstance.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: 250 },
            decodedText => {
              const id = decodedText.trim();
              if (mode === 'company') setCompanyId(id);
              else setMakerId(id);
              setIsScanning(false);
              onCancel();
            },
            errorMessage => {
              console.warn('読み取り中:', errorMessage);
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
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).then(() => scannerRef.current.clear());
      }
    };
  }, [isScanning, mode, setCompanyId, setMakerId, onCancel]);

  const handleCancel = () => {
    setIsScanning(false);
    onCancel();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '12px' }}>
        {mode === 'company' ? '会社IDスキャン中…' : 'メーカーIDスキャン中…'}
      </h3>
      <div id={qrRegionId} style={{ width: '300px', height: '300px', background: '#000' }} />
      {isScanning && (
        <button onClick={handleCancel} style={{ marginTop: '16px', padding: '8px 16px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          キャンセル
        </button>
      )}
    </div>
  );
};

export default QRCodeScanner;

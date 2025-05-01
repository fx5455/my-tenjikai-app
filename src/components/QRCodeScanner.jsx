import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

/**
 * QRCodeScanner コンポーネント
 * - モードに応じて会社ID/MakerIDスキャン
 * - 任意の文字列を読み取れる
 * - スキャン/キャンセルボタンを切り替え
 */
const QRCodeScanner = ({ mode, setCompanyId, setMakerId, onCancel }) => {
  const qrRegionId = 'reader';
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    let scanner;
    if (isScanning) {
      (async () => {
        try {
          const devices = await Html5Qrcode.getCameras();
          if (!devices?.length) {
            alert('カメラが見つかりませんでした');
            setIsScanning(false);
            return;
          }
          scanner = new Html5Qrcode(qrRegionId);
          scannerRef.current = scanner;
          await scanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: 250 },
            decodedText => {
              const value = decodedText.trim();
              if (mode === 'company') setCompanyId(value);
              else setMakerId(value);
              setIsScanning(false);
             onCancel && onCancel();
            },
            errorMessage => console.log('読み取り中...', errorMessage)
          );
        } catch (err) {
          console.error('カメラ起動エラー:', err);
          alert('カメラが使用できませんでした');
          setIsScanning(false);
        }
      })();
    } else {
      (async () => {
        scanner = scannerRef.current;
        if (scanner) {
          try { await scanner.stop(); await scanner.clear(); } catch {};
        }
      })();
    }
    // アンマウント時にも停止
    return () => {
      const sc = scannerRef.current;
      if (sc) sc.stop().catch(() => {}).then(() => sc.clear());
    };
  }, [isScanning, mode, setCompanyId, setMakerId, onCancel]);

  const handleToggle = () => {
    if (isScanning) {
      setIsScanning(false);
      onCancel && onCancel();
    } else {
      setIsScanning(true);
    }
  };

  return (
    <div className="my-4 text-center">
      <h3 className="font-semibold mb-2">
        {mode === 'company' ? '会社IDスキャン' : 'メーカーIDスキャン'}
      </h3>
      {/* 常に DOM に配置し、表示・非表示を制御 */}
      <div
        id={qrRegionId}
        className="w-full max-w-xs mx-auto border p-2 mb-2"
        style={{ display: isScanning ? 'block' : 'none' }}
      />
      <button
        onClick={handleToggle}
        className={`px-4 py-2 rounded text-sm ${
          isScanning ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
        }`}
      >
        {isScanning ? 'キャンセル' : 'スキャン'}
      </button>
    </div>
  );
};

export default QRCodeScanner;

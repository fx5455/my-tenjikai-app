import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

/**
 * QRCodeScanner コンポーネント
 * - モードに応じて会社ID/MakerIDのスキャンUIを表示
 * - 任意の文字列を読み取り可能
 * - スキャン/キャンセルボタンを切り替え
 */
const QRCodeScanner = ({ mode, setCompanyId, setMakerId, onCancel }) => {
  const qrRegionId = 'reader';
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);

  // スキャナ起動
  const startScanner = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices?.length) {
        alert('カメラが見つかりませんでした');
        return;
      }
      const scanner = new Html5Qrcode(qrRegionId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        decodedText => {
          const value = decodedText.trim();
          if (mode === 'company') setCompanyId(value);
          else setMakerId(value);
          stopScanner();
          setIsScanning(false);
        },
        errorMessage => console.log('読み取り中...', errorMessage)
      );
      setIsScanning(true);
    } catch (err) {
      console.error('カメラ起動エラー:', err);
      alert('カメラが使用できませんでした');
    }
  };

  // スキャナ停止
  const stopScanner = async () => {
    try {
      await scannerRef.current?.stop();
      await scannerRef.current?.clear();
    } catch {}
  };

  // コンポーネントアンマウント時に停止
  useEffect(() => {
    return () => stopScanner();
  }, []);

  // ボタンハンドラ
  const handleToggle = () => {
    if (isScanning) {
      stopScanner();
      setIsScanning(false);
      onCancel();
    } else {
      startScanner();
    }
  };

  return (
    <div className="my-4 text-center">
      <h3 className="font-semibold mb-2">
        {mode === 'company' ? '会社IDスキャン' : 'メーカーIDスキャン'}
      </h3>

      {/* スキャン中のみ表示 */}
      {isScanning && (
        <div id={qrRegionId} className="w-full max-w-xs mx-auto border p-2 mb-2" />
      )}

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

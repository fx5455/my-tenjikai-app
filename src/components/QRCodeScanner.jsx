import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

/**
 * QRCodeScanner コンポーネント
 * - モードに関わらず任意の文字列をスキャンして返却
 * - モード切替(会社ID or メーカーID)を明示表示
 * - キャンセル＆再スキャン機能
 */
const QRCodeScanner = ({ mode, setCompanyId, setMakerId, onCancel }) => {
  const qrRegionId = 'reader';
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(true);

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
          if (mode === 'company') {
            setCompanyId(value);
          } else {
            setMakerId(value);
          }
          scanner.stop();
          setIsScanning(false);
        },
        errorMessage => console.log('読み取り中...', errorMessage)
      );
    } catch (err) {
      console.error('カメラ起動エラー:', err);
      alert('カメラが使用できませんでした');
    }
  };

  const stopScanner = async () => {
    try {
      await scannerRef.current?.stop();
      await scannerRef.current?.clear();
    } catch {}
  };

  useEffect(() => {
    if (isScanning) startScanner();
    return () => {
      if (!isScanning) stopScanner();
    };
  }, [isScanning, mode]);

  const handleCancel = () => {
    stopScanner();
    setIsScanning(false);
    onCancel();
  };

  const handleRescan = () => setIsScanning(true);

  return (
    <div className="my-4 text-center">
      <h3 className="font-semibold mb-2">
        {mode === 'company' ? '会社IDスキャン中' : 'メーカーIDスキャン中'}
      </h3>
      <div id={qrRegionId} className="w-full max-w-xs mx-auto border p-2 mb-2" />
      <div className="flex justify-center space-x-4">
        <button
          onClick={handleCancel}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm"
        >
          キャンセル
        </button>
        {!isScanning && (
          <button
            onClick={handleRescan}
            className="bg-green-500 text-white px-3 py-1 rounded text-sm"
          >
            再スキャン
          </button>
        )}
      </div>
    </div>
  );
};

export default QRCodeScanner;

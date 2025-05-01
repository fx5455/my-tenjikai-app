import React, { useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const QRCodeScanner = ({ setCompanyId, setMakerId }) => {
  const qrRegionId = 'reader';

  useEffect(() => {
    let scanner;

    const startScanner = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length) {
          scanner = new Html5Qrcode(qrRegionId);

          await scanner.start(
            { facingMode: 'environment' }, // 背面カメラ推奨
            { fps: 10, qrbox: 250 },
            (decodedText) => {
              console.log('✅ QRコード検出:', decodedText);
              try {
                const parsed = JSON.parse(decodedText);
                if (parsed.companyId && parsed.makerId) {
                  setCompanyId(parsed.companyId);
                  setMakerId(parsed.makerId);
                  alert(`会社ID：${parsed.companyId}\nメーカーID：${parsed.makerId}`);
                  scanner.stop();
                } else {
                  alert('QRコードにcompanyId / makerIdが含まれていません');
                }
              } catch {
                alert('QRコードの内容がJSON形式ではありません');
              }
            },
            (errorMessage) => {
              // 読み取りエラー時（軽微なもので毎回出るのでログだけ）
              console.log('読み取り中...', errorMessage);
            }
          );
        } else {
          alert('カメラが見つかりませんでした');
        }
      } catch (err) {
        console.error('カメラ起動エラー:', err);
        alert('カメラが使用できませんでした');
      }
    };

    startScanner();

    return () => {
      if (scanner) {
        scanner.stop().then(() => {
          scanner.clear();
        });
      }
    };
  }, [setCompanyId, setMakerId]);

  return (
    <div className="my-4">
      <div id={qrRegionId} className="w-full max-w-xs mx-auto border p-2" />
      <p className="text-sm text-gray-500 text-center mt-2">QRコードを読み取ってください</p>
    </div>
  );
};

export default QRCodeScanner;

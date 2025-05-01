import React, { useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

/**
 * QRCodeScanner コンポーネント
 * - JSON形式またはカンマ区切りで companyId と makerId を取得
 * - プレーンテキストや不正な内容の場合はアラート表示
 */
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
            { facingMode: 'environment' }, // 背面カメラを推奨
            { fps: 10, qrbox: 250 },
            decodedText => {
              console.log('✅ QRコード検出:', decodedText);
              let cid, mid;
              let parsed = null;
              // まず JSON 形式を試行
              try {
                parsed = JSON.parse(decodedText);
                if (parsed.companyId && parsed.makerId) {
                  cid = parsed.companyId;
                  mid = parsed.makerId;
                } else {
                  parsed = null;
                }
              } catch {
                parsed = null;
              }

              // JSON でなければカンマ区切り形式を試行
              if (!parsed) {
                const parts = decodedText.split(/[,，]/).map(s => s.trim());
                if (parts.length >= 2) {
                  cid = parts[0];
                  mid = parts[1];
                }
              }

              if (cid && mid) {
                setCompanyId(cid);
                setMakerId(mid);
                alert(`会社ID：${cid}\nメーカーID：${mid}`);
                scanner.stop();
              } else {
                alert('QRコードに companyId と makerId を含む形式ではありません');
              }
            },
            errorMessage => {
              // 読み取りエラー時は詳細ログ
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
        scanner.stop().then(() => scanner.clear());
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

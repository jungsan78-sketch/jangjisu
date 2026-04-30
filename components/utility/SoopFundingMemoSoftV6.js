import SoopFundingMemoSoftV5 from './SoopFundingMemoSoftV5';

export default function SoopFundingMemoSoftV6() {
  return (
    <div className="funding-memo-soft-v6">
      <SoopFundingMemoSoftV5 />
      <style jsx global>{`
        .funding-memo-soft-v6 textarea {
          color: #111827 !important;
          background: #ffffff !important;
          -webkit-text-fill-color: #111827 !important;
        }

        .funding-memo-soft-v6 textarea::placeholder {
          color: #6b7280 !important;
          opacity: 1 !important;
          -webkit-text-fill-color: #6b7280 !important;
        }
      `}</style>
    </div>
  );
}

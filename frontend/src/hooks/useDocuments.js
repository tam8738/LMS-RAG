import { useState } from 'react';
import { MOCK_DOCUMENTS } from '../data/mockData';

export default function useDocuments() {
  const [docs, setDocs] = useState(MOCK_DOCUMENTS);

  const handleAddDoc = (doc) => {
    setDocs(prev => [...prev, doc]);
  };

  const handleUpdateDocStatus = (docId, status, onProcessed) => {
    setDocs(prev => {
      const found = prev.find(d => d.id === docId);
      const docName = found ? found.filename : 'Tài liệu';

      return prev.map(d => {
        if (d.id !== docId) return d;
        if (status === 'processing') {
          setTimeout(() => {
            setDocs(curr => curr.map(x => x.id === docId ? { ...x, status: 'processed' } : x));
            if (onProcessed) {
              onProcessed(docId, docName);
            }
          }, 2500);
        }
        return { ...d, status };
      });
    });
  };

  return {
    docs,
    handleAddDoc,
    handleUpdateDocStatus,
  };
}

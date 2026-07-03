import { MOCK_DOCUMENTS } from '../data/mockData';

const delay = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getDocs() {
  await delay();
  return [...MOCK_DOCUMENTS];
}

export async function addDoc(doc) {
  await delay();
  return doc;
}

export async function updateDocStatus(docId, status) {
  await delay();
  return { id: docId, status };
}

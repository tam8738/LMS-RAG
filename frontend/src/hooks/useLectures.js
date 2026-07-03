import { useState } from 'react';
import { MOCK_LECTURES } from '../data/mockData';

export default function useLectures() {
  const [lectures, setLectures] = useState(MOCK_LECTURES);

  const handleAddLecture = (lecture) => {
    setLectures(prev => [...prev, lecture]);
  };

  return {
    lectures,
    handleAddLecture,
  };
}

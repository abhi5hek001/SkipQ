import React from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, ArrowRight } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="p-8 flex flex-col items-center text-center h-full justify-center min-h-[400px]">
      <div className="bg-skipqYellow p-4 rounded-full mb-6">
        <QrCode size={48} className="text-yellow-600" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Skip the Line</h2>
      <p className="text-gray-500 mb-8 max-w-xs">
        Join the queue digitally from anywhere. Track your status in real-time and get notified.
      </p>
      <button 
        onClick={() => navigate('/join')}
        className="bg-black text-white px-8 py-4 rounded-full font-semibold flex items-center gap-2 hover:bg-gray-800 transition-colors w-full justify-center shadow-lg"
      >
        Join Queue
        <ArrowRight size={20} />
      </button>
    </div>
  );
};

export default Home;

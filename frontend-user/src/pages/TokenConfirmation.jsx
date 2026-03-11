import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Ticket, ArrowRight, CheckCircle2 } from 'lucide-react';

const TokenConfirmation = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    // Small delay to trigger the scale/fade animate transition
    setTimeout(() => setShowAnimation(true), 100);
  }, []);

  if (!state || !state.token) {
    return <Navigate to="/" />;
  }

  const { tokenNumber, position, queueId, id } = state.token;

  return (
    <div className="flex flex-col h-full bg-skipqYellow pb-8 min-h-[500px]">
      <div className="p-8 pb-4 flex flex-col items-center text-center">
        <div className={`transition-all duration-700 transform ${showAnimation ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
          <CheckCircle2 size={64} className="text-yellow-600 mb-4" />
        </div>
        <h2 className="text-2xl font-bold mb-2">You're in the Queue!</h2>
        <p className="text-yellow-800 mb-8 max-w-xs">
          You have successfully joined the queue. Keep this window open or remember your token.
        </p>

        <div className={`w-full bg-white rounded-3xl p-8 shadow-2xl relative overflow-hidden transition-all duration-1000 transform ${showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 to-yellow-600"></div>
          
          <div className="flex flex-col items-center">
            <span className="text-gray-500 font-medium tracking-widest uppercase text-sm mb-2">Your Token</span>
            <span className="text-6xl font-black tracking-tighter text-gray-900 mb-6 flex items-center gap-4">
              <Ticket className="text-yellow-500" size={40} />
              {tokenNumber}
            </span>
            
            <div className="w-full border-t border-dashed border-gray-200 my-4"></div>

            <div className="w-full flex justify-between items-center px-4 py-2">
              <span className="text-gray-500">Queue Position</span>
              <span className="font-bold text-xl">#{position}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 mt-auto pt-8">
        <button 
          onClick={() => navigate('/status', { state: { token: state.token } })}
          className="w-full bg-black text-white px-8 py-4 rounded-full font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-lg"
        >
          Continue to Queue Status
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default TokenConfirmation;

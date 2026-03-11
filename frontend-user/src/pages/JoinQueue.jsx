import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Loader2, CreditCard } from 'lucide-react';

const JoinQueue = () => {
  const [vendorId, setVendorId] = useState('1'); // Defaulting to main vendor (Admin)
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handlePaymentSimulation = async () => {
    setIsProcessing(true);
    setError('');

    try {
      // Simulate taking some time to "pay"
      await new Promise(resolve => setTimeout(resolve, 1500));

      const res = await fetch('https://skipq-backend-zcmw.onrender.com/api/queue/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join queue');
      }

      // Pass token details through router state
      navigate('/token', { state: { token: data.token } });

    } catch (err) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8 flex flex-col h-full items-center text-center">
      <h2 className="text-xl font-bold mb-6">Join the Queue</h2>

      <div className="w-full max-w-sm mb-8 bg-gray-50 border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col items-center">
        <div className="mb-4">
          <div className="w-32 h-32 bg-gray-200 rounded-2xl flex items-center justify-center p-4">
             <QrCode size={64} className="text-gray-400" />
          </div>
        </div>
        
        <p className="text-sm text-gray-500 mb-4">
          Or enter a Queue Code manually
        </p>

        <input 
          type="text" 
          placeholder="Queue Code (e.g., 1)" 
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black text-center text-lg font-medium"
        />
      </div>

      <div className="w-full max-w-sm flex items-center justify-between px-4 py-3 bg-skipqYellow rounded-2xl mb-8">
        <span className="font-semibold text-yellow-800">Joining Fee</span>
        <span className="font-bold text-yellow-900 text-lg">₹5.00</span>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <button 
        onClick={handlePaymentSimulation}
        disabled={isProcessing || !vendorId}
        className="mt-auto w-full bg-black text-white px-8 py-4 rounded-full font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl"
      >
        {isProcessing ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            Processing Payment...
          </>
        ) : (
          <>
            <CreditCard size={20} />
            Pay ₹5 & Join
          </>
        )}
      </button>
    </div>
  );
};

export default JoinQueue;

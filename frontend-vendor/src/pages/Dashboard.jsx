import React, { useEffect, useState, useContext } from 'react';
import { SocketContext } from '../App';
import { 
  Users, UserCheck, Clock, SkipForward,
  Trash2, QrCode, PlayCircle, Loader2
} from 'lucide-react';

const Dashboard = () => {
  const socket = useContext(SocketContext);
  const vendorId = 1; // Default vendor for simulation
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // We need currentToken from status, and analytics from analytics API
  const fetchData = async () => {
    try {
      const [statusRes, analyticsRes] = await Promise.all([
        fetch(`https://skipq-backend-zcmw.onrender.com/api/queue/status/${vendorId}`),
        fetch(`https://skipq-backend-zcmw.onrender.com/api/vendor/stats/${vendorId}`)
      ]);
      const statusData = await statusRes.json();
      const analyticsData = await analyticsRes.json();
      
      setData({ ...statusData, ...analyticsData });
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    socket.on('queue_updated', () => fetchData());
    socket.on('new_token', () => fetchData());
    socket.on('queue_reset', () => fetchData());

    return () => {
      socket.off('queue_updated');
      socket.off('new_token');
      socket.off('queue_reset');
    };
  }, [socket]);

  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      await fetch(`https://skipq-backend-zcmw.onrender.com/api/vendor/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId })
      });
    } catch (err) {
      console.error(err);
    }
    setActionLoading(false);
  };

  const handleReset = async () => {
    if (window.confirm("Are you sure you want to reset the entire queue? All tokens will be deleted.")) {
      handleAction('reset');
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="animate-spin text-gray-500" size={48} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Analytics Column */}
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard icon={<UserCheck size={24} className="text-green-600"/>} title="Total Served" value={data.totalTokensServedToday} bg="bg-green-50" />
            <StatCard icon={<Users size={24} className="text-blue-600"/>} title="Current Length" value={data.currentQueueLength} bg="bg-blue-50" />
            <StatCard icon={<Clock size={24} className="text-orange-600"/>} title="Avg Wait" value={`${Math.ceil(data.averageWaitTime / 60)} min`} bg="bg-orange-50" />
        </div>

        {/* Current Serving Card */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <PlayCircle className="text-red-500" />
              Currently Serving
            </h2>
            <div className="px-4 py-1 bg-gray-100 text-gray-600 font-semibold rounded-full text-sm uppercase tracking-wider">
              Token
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-8xl font-black tracking-tighter text-black w-full text-center md:text-left">
              {data.currentToken}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full justify-end">
              <button 
                onClick={() => handleAction('skip')}
                disabled={actionLoading || data.currentQueueLength === 0}
                className="px-6 py-4 rounded-2xl font-bold border-2 border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-2 justify-center transition-colors disabled:opacity-50"
              >
                <SkipForward size={20} />
                Skip Next
              </button>
              <button 
                onClick={() => handleAction('serve')}
                disabled={actionLoading || data.currentQueueLength === 0}
                className="px-8 py-4 rounded-2xl font-bold bg-black text-white hover:bg-gray-800 flex items-center gap-2 justify-center transition-colors shadow-lg shadow-gray-400/30 disabled:opacity-50"
              >
                <PlayCircle size={20} />
                Serve Next Token
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
           <h3 className="font-bold text-lg mb-4 text-gray-800 flex justify-between items-center">
             Next in Line
           </h3>
           <div className="flex flex-col gap-3">
             {data.nextTokens?.length > 0 ? data.nextTokens.map((t, idx) => (
                <div key={t.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 transition-colors hover:border-gray-300">
                  <div className="flex items-center gap-4">
                     <span className="text-gray-400 font-semibold font-mono w-4">{idx + 1}</span>
                     <span className="font-bold text-xl">{t.tokenNumber}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                    Pos: #{t.position}
                  </span>
                </div>
             )) : (
               <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                 No tokens waiting in queue.
               </div>
             )}
           </div>
        </div>

      </div>

      {/* Side Column */}
      <div className="space-y-6">
        
        {/* Actions Card */}
        <div className="bg-red-50 p-6 rounded-3xl shadow-sm border border-red-100">
          <h3 className="font-bold text-red-900 mb-2">Danger Zone</h3>
          <p className="text-sm text-red-700 mb-6 font-medium">Clear the entire queue and reset token numbers to start a new session.</p>
          <button 
            onClick={handleReset}
            className="w-full px-6 py-4 rounded-2xl font-bold bg-white text-red-600 border border-red-200 hover:bg-red-600 hover:text-white flex items-center gap-2 justify-center transition-all shadow-sm"
          >
            <Trash2 size={18} />
            Reset Queue
          </button>
        </div>

        {/* QR Code Gen */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 text-center flex flex-col items-center">
          <h3 className="font-bold text-gray-900 mb-2 w-full text-left">Your Join Link</h3>
          <p className="text-sm text-gray-500 mb-6 font-medium text-left">Customers can scan this code to join your queue directly via the mobile app.</p>
          
          <div className="bg-gray-100 p-6 rounded-3xl mb-4 w-48 h-48 flex items-center justify-center">
            {/* Simulating QR code display */}
            <QrCode size={120} strokeWidth={1.5} className="text-gray-800" />
          </div>
          
          <div className="bg-gray-100 px-4 py-2 rounded-full text-sm font-mono font-bold tracking-wider text-gray-600 w-full mb-4">
            Code: 1
          </div>
          
          <button className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
            Download QR Code
          </button>
        </div>

      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, bg }) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 flex flex-col gap-4">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${bg}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <p className="text-3xl font-bold tracking-tight text-gray-900">{value}</p>
    </div>
  </div>
);

export default Dashboard;

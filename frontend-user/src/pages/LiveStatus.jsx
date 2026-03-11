import React, { useEffect, useState, useContext } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { SocketContext } from '../App';
import { Bell, Clock, Users, X, Activity } from 'lucide-react';

const LiveStatus = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const socket = useContext(SocketContext);
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  if (!state || !state.token) {
    return <Navigate to="/" />;
  }

  const { tokenNumber, id: tokenId, queueId, vendorId } = state.token;

  const fetchStatus = async () => {
    try {
      // Hardcoding vendorId as 1 for simulation since it's the main vendor
      const res = await fetch(`http://localhost:5000/api/queue/status/1`);
      const data = await res.json();
      setQueueData(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching status', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Listen to real-time events
    socket.on('queue_updated', (data) => {
      // If our queue updated, refresh
      fetchStatus();
    });

    socket.on('token_served', (data) => {
      if (data.tokenNumber === tokenNumber) {
        addNotification("It's your turn! Please proceed to the counter.", "success");
      }
    });

    return () => {
      socket.off('queue_updated');
      socket.off('token_served');
    };
  }, [socket]);

  // Handle derived alerts
  useEffect(() => {
    if (queueData) {
      const waitTokens = queueData.peopleAhead;
      if (waitTokens === 0) {
        // Handled by token_served usually, but just in case
        addNotification("You are next in line!", "alert");
      } else if (waitTokens === 1) {
        addNotification("Please get ready, your turn is approaching.", "info");
      } else if (waitTokens === 5) {
        addNotification("You are 5 tokens away.", "info");
      }
    }
  }, [queueData]);

  const addNotification = (message, type) => {
    setNotifications(prev => {
      // Prevent duplicates
      if (prev.some(n => n.message === message)) return prev;
      return [...prev, { id: Date.now(), message, type }].slice(-3); // Keep last 3
    });
  };

  const cancelQueue = async () => {
    if (window.confirm('Are you sure you want to leave the queue?')) {
      try {
        await fetch('http://localhost:5000/api/queue/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenId })
        });
        navigate('/');
      } catch (error) {
        console.error('Cancel failed', error);
      }
    }
  };

  if (loading) return <div className="p-8 flex items-center justify-center">Loading status...</div>;
  if (!queueData || !queueData.queue) return <div className="p-8 flex items-center justify-center text-red-500">Queue not found.</div>;

  const progressPercentage = Math.max(0, Math.min(100, 100 - (queueData.peopleAhead / 20) * 100)); // arbitrary scale for demo

  return (
    <div className="p-6 flex flex-col h-full bg-gray-50 min-h-[600px]">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Activity className="text-green-500" size={24} />
        Live Queue Status
      </h2>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="mb-6 space-y-2">
          {notifications.map(notif => (
            <div key={notif.id} className="bg-white border-l-4 border-yellow-400 p-4 rounded-r-xl shadow-sm flex items-start justify-between animate-fade-in-down">
               <div className="flex gap-3">
                 <Bell className="text-yellow-500 mt-1" size={18} />
                 <p className="text-sm font-medium text-gray-800">{notif.message}</p>
               </div>
               <button onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}>
                 <X size={16} className="text-gray-400" />
               </button>
            </div>
          ))}
        </div>
      )}

      {/* Status Card */}
      <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 bg-skipqYellow rounded-bl-3xl">
          <span className="font-bold text-yellow-900">{tokenNumber}</span>
        </div>
        
        <div className="mb-6">
          <span className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Currently Serving</span>
          <div className="text-5xl font-black mt-2 text-gray-900 tracking-tighter">
            {queueData.currentToken}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center">
            <Users className="text-blue-500 mb-2" size={24} />
            <span className="text-2xl font-bold">{queueData.peopleAhead}</span>
            <span className="text-xs text-gray-500 font-medium">Ahead of you</span>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center">
            <Clock className="text-orange-500 mb-2" size={24} />
            <span className="text-2xl font-bold">{Math.ceil(queueData.estimatedWaitTime / 60)}</span>
            <span className="text-xs text-gray-500 font-medium">Est. Minutes</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8 px-2">
        <div className="flex justify-between text-xs text-gray-500 font-medium mb-2">
          <span>Joined</span>
          <span>Your Turn</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-black h-3 rounded-full transition-all duration-1000 ease-out" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      <button 
        onClick={cancelQueue}
        className="mt-auto w-full border-2 border-red-100 text-red-500 px-8 py-4 rounded-full font-semibold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
      >
        <X size={20} />
        Cancel & Leave Queue
      </button>

      <style>{`
        @keyframes fade-in-down {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down { animation: fade-in-down 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default LiveStatus;

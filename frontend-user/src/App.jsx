import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';
import Home from './pages/Home';
import JoinQueue from './pages/JoinQueue';
import TokenConfirmation from './pages/TokenConfirmation';
import LiveStatus from './pages/LiveStatus';

// Default connection to backend running on Onrender
const socket = io('https://skipq-backend-zcmw.onrender.com');

export const SocketContext = React.createContext();

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      <div className="min-h-screen flex flex-col items-center pt-8 pb-12 px-4 max-w-md mx-auto">
        <header className="w-full flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">SkipQ</h1>
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} title={isConnected ? 'Connected' : 'Disconnected'}></div>
        </header>
        <main className="flex-1 w-full bg-white shadow-xl rounded-3xl overflow-hidden relative">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/join" element={<JoinQueue />} />
            <Route path="/token" element={<TokenConfirmation />} />
            <Route path="/status" element={<LiveStatus />} />
          </Routes>
        </main>
      </div>
    </SocketContext.Provider>
  );
}

export default App;

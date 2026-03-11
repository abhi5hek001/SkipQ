import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';
import Dashboard from './pages/Dashboard';

const socket = io('http://localhost:5000');

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
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-6 md:p-12 align-middle">
        <header className="max-w-6xl mx-auto flex justify-between items-center mb-8 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">SkipQ Vendor</h1>
            <p className="text-sm text-gray-500 font-medium">Dashboard Control Center</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">{isConnected ? 'Server Connected' : 'Disconnected'}</span>
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </SocketContext.Provider>
  );
}

export default App;

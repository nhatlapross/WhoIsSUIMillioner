// app/multiplayer/layout.tsx - Wrap with WebSocket provider
import React from 'react';
import { WebSocketProvider } from '@/contexts/WebSocketContext';

export default function MultiplayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WebSocketProvider>
      {children}
    </WebSocketProvider>
  );
}
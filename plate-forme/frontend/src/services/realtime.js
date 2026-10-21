import { io } from 'socket.io-client';
import API from './api';

let socket;
let connectedToken;

export const getRealtimeSocket = () => {
  if (!socket) {
    const serverUrl = new URL(API.defaults.baseURL, window.location.origin).origin;
    socket = io(serverUrl, {
      autoConnect: false,
      auth: (callback) => callback({ token: localStorage.getItem('token') })
    });
  }
  return socket;
};

export const connectRealtime = () => {
  const realtimeSocket = getRealtimeSocket();
  const token = localStorage.getItem('token');
  if (realtimeSocket.connected && token !== connectedToken) {
    realtimeSocket.disconnect();
    realtimeSocket.auth = { token };
    connectedToken = token;
    realtimeSocket.connect();
  } else if (!realtimeSocket.connected) {
    realtimeSocket.auth = { token };
    connectedToken = token;
    realtimeSocket.connect();
  }
  return realtimeSocket;
};

export const subscribeToForum = (forumId, onMessage) => {
  const realtimeSocket = getRealtimeSocket();
  const joinForum = () => realtimeSocket.emit('forum:join', forumId);
  const handleMessage = (event) => {
    if (String(event.id_forum) === String(forumId)) onMessage();
  };

  realtimeSocket.on('connect', joinForum);
  realtimeSocket.on('forum:message', handleMessage);
  if (realtimeSocket.connected) joinForum();

  return () => {
    realtimeSocket.off('connect', joinForum);
    realtimeSocket.off('forum:message', handleMessage);
    if (realtimeSocket.connected) realtimeSocket.emit('forum:leave', forumId);
  };
};

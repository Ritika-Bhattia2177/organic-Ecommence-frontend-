import { io } from "socket.io-client";

let socket = null;

const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  return apiUrl.replace(/\/api\/?$/, "");
};

export const getSocket = () => {
  if (socket) {
    return socket;
  }

  socket = io(getSocketUrl(), {
    transports: ["websocket", "polling"],
    withCredentials: true,
  });

  return socket;
};

export const disconnectSocket = () => {
  if (!socket) {
    return;
  }

  socket.disconnect();
  socket = null;
};
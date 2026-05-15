import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../config/api";

let sharedSocket = null; // single connection across components

export function useSocket(handlers = {}) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const token = sessionStorage.getItem("mw_token");
    if (!token || !SOCKET_URL) return;

    // Reuse existing connection
    if (!sharedSocket) {
      sharedSocket = io(SOCKET_URL, {
        auth: { token },
        reconnection:      true,
        reconnectionDelay: 2000,
      });
    }

    const socket = sharedSocket;

    // Register all handlers passed in
    const listeners = Object.keys(handlersRef.current).map(event => {
      const listener = (...args) => handlersRef.current[event]?.(...args);
      socket.on(event, listener);
      return { event, listener };
    });

    return () => {
      listeners.forEach(({ event, listener }) => socket.off(event, listener));
    };
  }, []);
}

// Standalone helper — disconnect on logout
export function disconnectSocket() {
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
  }
}

export function getSharedSocket() {
  return sharedSocket;
}

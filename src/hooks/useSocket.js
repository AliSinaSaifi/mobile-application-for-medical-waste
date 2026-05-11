import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

let sharedSocket = null; // single connection across components

export function useSocket(handlers = {}) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const token = sessionStorage.getItem("mw_token");
    if (!token) return;

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
    const events = Object.keys(handlersRef.current);
    events.forEach(event => {
      socket.on(event, (...args) => handlersRef.current[event]?.(...args));
    });

    return () => {
      events.forEach(event => socket.off(event));
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
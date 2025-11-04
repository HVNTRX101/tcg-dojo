import { Server as SocketIOServer } from 'socket.io';

/**
 * WebRTC Signaling Service
 * Handles peer-to-peer connection setup for voice and video calls
 */

// Type definitions for WebRTC (server-side doesn't have these native types)
type RTCSessionDescriptionInit = any;
type RTCIceCandidateInit = any;

interface CallSession {
  callId: string;
  callerId: string;
  calleeId: string;
  type: 'voice' | 'video';
  status: 'ringing' | 'active' | 'ended';
  startedAt: Date;
  endedAt?: Date;
}

// Store active call sessions
const activeCalls = new Map<string, CallSession>();

// Store user to call mapping
const userCalls = new Map<string, string>(); // userId -> callId

let io: SocketIOServer | null = null;

/**
 * Initialize WebRTC signaling service
 */
export const initializeWebRTCService = (socketIo: SocketIOServer) => {
  io = socketIo;
  console.log('📞 WebRTC signaling service initialized');
};

/**
 * Setup WebRTC signaling events for a socket
 */
export const setupWebRTCEvents = (socket: any, userId: string) => {
  /**
   * Initiate a call
   */
  socket.on('call:initiate', async (data: {
    targetUserId: string;
    type: 'voice' | 'video';
    offer: RTCSessionDescriptionInit;
  }) => {
    const { targetUserId, type, offer } = data;

    // Check if target user is online
    if (!io) return;

    // Check if either user is already in a call
    if (userCalls.has(userId)) {
      socket.emit('call:error', { error: 'You are already in a call' });
      return;
    }

    if (userCalls.has(targetUserId)) {
      socket.emit('call:error', { error: 'User is already in a call' });
      return;
    }

    // Create call session
    const callId = `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const callSession: CallSession = {
      callId,
      callerId: userId,
      calleeId: targetUserId,
      type,
      status: 'ringing',
      startedAt: new Date(),
    };

    activeCalls.set(callId, callSession);
    userCalls.set(userId, callId);
    userCalls.set(targetUserId, callId);

    // Send call request to target user
    io.to(`user:${targetUserId}`).emit('call:incoming', {
      callId,
      callerId: userId,
      type,
      offer,
    });

    // Send confirmation to caller
    socket.emit('call:initiated', { callId });

    console.log(`📞 Call initiated: ${callId} (${type}) from ${userId} to ${targetUserId}`);
  });

  /**
   * Answer a call
   */
  socket.on('call:answer', async (data: {
    callId: string;
    answer: RTCSessionDescriptionInit;
  }) => {
    const { callId, answer } = data;

    const callSession = activeCalls.get(callId);
    if (!callSession) {
      socket.emit('call:error', { error: 'Call not found' });
      return;
    }

    if (callSession.calleeId !== userId) {
      socket.emit('call:error', { error: 'Unauthorized' });
      return;
    }

    // Update call status
    callSession.status = 'active';
    activeCalls.set(callId, callSession);

    // Send answer to caller
    if (io) {
      io.to(`user:${callSession.callerId}`).emit('call:answered', {
        callId,
        answer,
      });
    }

    console.log(`✅ Call answered: ${callId}`);
  });

  /**
   * Reject a call
   */
  socket.on('call:reject', async (data: { callId: string }) => {
    const { callId } = data;

    const callSession = activeCalls.get(callId);
    if (!callSession) {
      socket.emit('call:error', { error: 'Call not found' });
      return;
    }

    if (callSession.calleeId !== userId) {
      socket.emit('call:error', { error: 'Unauthorized' });
      return;
    }

    // Notify caller
    if (io) {
      io.to(`user:${callSession.callerId}`).emit('call:rejected', { callId });
    }

    // Clean up
    endCall(callId);

    console.log(`❌ Call rejected: ${callId}`);
  });

  /**
   * End a call
   */
  socket.on('call:end', async (data: { callId: string }) => {
    const { callId } = data;

    const callSession = activeCalls.get(callId);
    if (!callSession) {
      socket.emit('call:error', { error: 'Call not found' });
      return;
    }

    // Only participants can end the call
    if (callSession.callerId !== userId && callSession.calleeId !== userId) {
      socket.emit('call:error', { error: 'Unauthorized' });
      return;
    }

    // Notify other participant
    const otherUserId = callSession.callerId === userId
      ? callSession.calleeId
      : callSession.callerId;

    if (io) {
      io.to(`user:${otherUserId}`).emit('call:ended', { callId });
    }

    // Clean up
    endCall(callId);

    console.log(`📴 Call ended: ${callId}`);
  });

  /**
   * ICE candidate exchange
   */
  socket.on('call:ice-candidate', async (data: {
    callId: string;
    candidate: RTCIceCandidateInit;
  }) => {
    const { callId, candidate } = data;

    const callSession = activeCalls.get(callId);
    if (!callSession) {
      socket.emit('call:error', { error: 'Call not found' });
      return;
    }

    // Only participants can send ICE candidates
    if (callSession.callerId !== userId && callSession.calleeId !== userId) {
      socket.emit('call:error', { error: 'Unauthorized' });
      return;
    }

    // Forward to other participant
    const otherUserId = callSession.callerId === userId
      ? callSession.calleeId
      : callSession.callerId;

    if (io) {
      io.to(`user:${otherUserId}`).emit('call:ice-candidate', {
        callId,
        candidate,
      });
    }
  });

  /**
   * Get active call for user
   */
  socket.on('call:get-active', (callback: (session: CallSession | null) => void) => {
    const callId = userCalls.get(userId);
    if (callId) {
      const callSession = activeCalls.get(callId);
      callback(callSession || null);
    } else {
      callback(null);
    }
  });
};

/**
 * End a call and clean up resources
 */
const endCall = (callId: string) => {
  const callSession = activeCalls.get(callId);
  if (!callSession) return;

  callSession.status = 'ended';
  callSession.endedAt = new Date();

  // Remove from active calls
  userCalls.delete(callSession.callerId);
  userCalls.delete(callSession.calleeId);

  // Keep in history for analytics
  setTimeout(() => {
    activeCalls.delete(callId);
  }, 60 * 1000); // Remove after 1 minute
};

/**
 * Handle user disconnect during call
 */
export const handleUserDisconnect = (userId: string) => {
  const callId = userCalls.get(userId);
  if (!callId) return;

  const callSession = activeCalls.get(callId);
  if (!callSession) return;

  // Notify other participant
  const otherUserId = callSession.callerId === userId
    ? callSession.calleeId
    : callSession.callerId;

  if (io) {
    io.to(`user:${otherUserId}`).emit('call:ended', {
      callId,
      reason: 'User disconnected',
    });
  }

  // Clean up
  endCall(callId);

  console.log(`📴 Call ended due to disconnect: ${callId}`);
};

/**
 * Get active calls statistics
 */
export const getCallStatistics = () => {
  const calls = Array.from(activeCalls.values());

  return {
    totalActiveCalls: calls.filter(c => c.status === 'active').length,
    totalRingingCalls: calls.filter(c => c.status === 'ringing').length,
    voiceCalls: calls.filter(c => c.type === 'voice').length,
    videoCalls: calls.filter(c => c.type === 'video').length,
    averageCallDuration: calls
      .filter(c => c.endedAt && c.status === 'ended')
      .reduce((sum, c) => sum + (c.endedAt!.getTime() - c.startedAt.getTime()), 0) /
      (calls.filter(c => c.status === 'ended').length || 1),
  };
};

/**
 * Get call session
 */
export const getCallSession = (callId: string): CallSession | null => {
  return activeCalls.get(callId) || null;
};

/**
 * Check if user is in a call
 */
export const isUserInCall = (userId: string): boolean => {
  return userCalls.has(userId);
};

console.log('📞 WebRTC signaling service loaded');

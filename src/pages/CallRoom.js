import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { callApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { createCallSession } from '../providers';
import { toast } from 'react-toastify';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

const CallRoom = () => {
  const { callId } = useParams();
  const { astrologer } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const sessionRef = useRef(null);

  const [status, setStatus] = useState('Connecting');
  const [callData, setCallData] = useState(null);
  const [timer, setTimer] = useState(0);
  const [connStatus, setConnStatus] = useState('connected');
  const [connMessage, setConnMessage] = useState('');
  const timerRef = useRef(null);
  const heartbeatRef = useRef(null);
  const callIdRef = useRef(null);
  const tokenRefreshRef = useRef(null);
  const metricsBufferRef = useRef([]);
  const metricsFlushRef = useRef(null);

  useEffect(() => {
    if (!callId || !astrologer) return;

    const token = localStorage.getItem('astrologerToken');
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-call', { callId: parseInt(callId) });
      // On reconnect during active call, refresh heartbeat so server marks us alive immediately
      if (callIdRef.current) {
        socket.emit('call-heartbeat', { callId: callIdRef.current });
        setConnStatus('connected');
        setConnMessage('');
      }
    });

    // Local socket lost — show "Reconnecting..." overlay
    socket.on('disconnect', () => {
      if (callIdRef.current) {
        setConnStatus('reconnecting');
        setConnMessage('Connection lost — reconnecting...');
      }
    });
    socket.io.on('reconnect_attempt', () => {
      if (callIdRef.current) {
        setConnStatus('reconnecting');
        setConnMessage('Reconnecting to call...');
      }
    });
    socket.io.on('reconnect', () => {
      if (callIdRef.current) {
        setConnStatus('connected');
        setConnMessage('');
        toast.success('Reconnected');
      }
    });

    // Peer (customer) disconnected — show overlay
    socket.on('peer-connection-lost', (data) => {
      const sideLabel = data.disconnectedSide === 'customer' ? 'Customer' : 'Other side';
      setConnStatus('peer_lost');
      setConnMessage(`${sideLabel} disconnected. Waiting up to ${data.reconnectTimeout || 30}s...`);
    });
    socket.on('peer-reconnected', (data) => {
      setConnStatus('connected');
      setConnMessage('');
      const sideLabel = data.reconnectedSide === 'customer' ? 'Customer' : 'Other side';
      toast.success(`${sideLabel} reconnected`);
    });

    // Fetch call details
    callApi.getCallById({ callId }).then(res => {
      const c = res.data?.recordList || res.data;
      setCallData(c);
      if (c?.callStatus === 'Accepted') {
        setStatus('Active');
        startCall(c).catch(err => {
          console.error('startCall failed:', err);
          toast.error('Failed to connect: ' + (err.message || ''));
        });
      }
    }).catch((err) => console.error('getCallById error:', err));

    socket.on('call-accepted', (data) => {
      setStatus('Active');
      setCallData(prev => ({ ...prev, ...data }));
      startCall(data).catch(err => {
        console.error('startCall on accept failed:', err);
        toast.error('Failed to connect: ' + (err.message || ''));
      });
    });

    socket.on('call-ended', async () => {
      setStatus('Completed');
      await stopCall();
      if (timerRef.current) clearInterval(timerRef.current);
    });

    socket.on('call-error', (data) => {
      toast.error(data.message || 'Call error');
    });

    return () => {
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
      if (tokenRefreshRef.current) { clearInterval(tokenRefreshRef.current); tokenRefreshRef.current = null; }
      if (metricsFlushRef.current) { clearInterval(metricsFlushRef.current); metricsFlushRef.current = null; }
      socket.disconnect();
      stopCall();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callId, astrologer]);

  const startCall = async (data) => {
    try {
      const tokenRes = await callApi.getZegoToken({
        callId: parseInt(callId),
        userId: astrologer?.userId,
        isAstrologer: true,
      });
      if (tokenRes.data?.status !== 200) { toast.error('Failed to get call token'); return; }

      const isVideo = data.call_type == 11 || data.call_type === 'Video';
      const localEl = document.getElementById('local-stream');
      const remoteEl = document.getElementById('remote-stream');

      sessionRef.current = await createCallSession({
        tokenResponse: tokenRes.data,
        localEl,
        remoteEl,
        isVideo,
        onStats: (ev) => { metricsBufferRef.current.push({ ...ev, ts: Date.now() }); },
      });

      timerRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);

      // Drop-detection: emit heartbeat every 10s. Server auto-ends call if no heartbeat
      // from this side for 30s+ (handles browser crash, network drop, app force-close).
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      const cid = parseInt(callId);
      callIdRef.current = cid; // remember active callId for reconnect handlers
      const sock = socketRef.current;
      if (sock) sock.emit('call-heartbeat', { callId: cid });
      heartbeatRef.current = setInterval(() => {
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('call-heartbeat', { callId: cid });
        }
      }, 10000);

      // Quality metrics — flush buffered provider stats every 30s in a batch
      if (metricsFlushRef.current) clearInterval(metricsFlushRef.current);
      metricsFlushRef.current = setInterval(() => {
        const buf = metricsBufferRef.current;
        if (!buf.length) return;
        const events = buf.splice(0, buf.length);
        callApi.postMetrics({ callId: cid, events }).catch(() => {});
      }, 30000);

      // Token refresh for long calls (>1hr). Backend issues 4-hour tokens; we refresh
      // every 50 minutes so a fresh token is in place well before any expiry boundary.
      // HMS provider's renewToken is a no-op (HMS auth tokens valid 24hr+).
      if (tokenRefreshRef.current) clearInterval(tokenRefreshRef.current);
      tokenRefreshRef.current = setInterval(async () => {
        try {
          const refreshRes = await callApi.getZegoToken({
            callId: cid,
            userId: astrologer?.userId,
            isAstrologer: true,
          });
          if (refreshRes.data?.status !== 200) return;
          const newToken =
            refreshRes.data?.sdkConfig?.token ||
            refreshRes.data?.sdkConfig?.authToken ||
            refreshRes.data?.token;
          if (newToken && sessionRef.current?.renewToken) {
            await sessionRef.current.renewToken(newToken);
            console.log('[token] Refreshed for long call');
          }
        } catch (e) {
          console.error('[token] Refresh failed:', e);
        }
      }, 50 * 60 * 1000);
    } catch (err) {
      console.error('Call error:', err);
      toast.error('Failed to connect: ' + (err?.message || 'unknown'));
    }
  };

  const stopCall = async () => {
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    if (tokenRefreshRef.current) { clearInterval(tokenRefreshRef.current); tokenRefreshRef.current = null; }
    if (metricsFlushRef.current) {
      clearInterval(metricsFlushRef.current); metricsFlushRef.current = null;
      const buf = metricsBufferRef.current;
      if (buf.length && callIdRef.current) {
        const events = buf.splice(0, buf.length);
        callApi.postMetrics({ callId: callIdRef.current, events }).catch(() => {});
      }
    }
    callIdRef.current = null;
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session) {
      try { await session.leave(); } catch (e) { console.error('Leave failed:', e); }
    }
  };

  const handleEndCall = async () => {
    if (socketRef.current) socketRef.current.emit('end-call', { callId: parseInt(callId) });
    await stopCall();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const isVideo = callData?.call_type == 11 || callData?.call_type === 'Video';

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a0533', color: '#fff' }}>
      <div style={{ width: '100%', maxWidth: 600, padding: 20, textAlign: 'center' }}>

        {status === 'Connecting' && (
          <div>
            <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 700, margin: '0 auto 16px' }}>
              {(callData?.userName || 'U')[0]}
            </div>
            <h3>{callData?.userName || 'Customer'}</h3>
            <p style={{ color: '#a78bfa' }}>{isVideo ? 'Video' : 'Audio'} Call</p>
            <p style={{ color: '#c4b5d8', marginTop: 12 }}>Connecting...</p>
          </div>
        )}

        {/* Reconnection overlay (during active call only) */}
        {status === 'Active' && connStatus !== 'connected' && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
            background: connStatus === 'reconnecting' ? '#f59e0b' : '#dc2626',
            color: '#fff', padding: '10px 16px', textAlign: 'center',
            fontWeight: 600, fontSize: '0.9rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}>
            <span style={{ marginRight: 8 }}>{connStatus === 'reconnecting' ? '🔄' : '⚠️'}</span>
            {connMessage || (connStatus === 'reconnecting' ? 'Reconnecting...' : 'Connection issue')}
          </div>
        )}

        {status === 'Active' && (
          <div>
            {isVideo ? (
              <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#000', borderRadius: 16, overflow: 'hidden' }}>
                <video id="remote-stream" autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }}></video>
                <video id="local-stream" autoPlay playsInline muted style={{ position: 'absolute', bottom: 12, right: 12, width: 120, height: 90, borderRadius: 10, objectFit: 'cover', border: '2px solid #fff' }}></video>
              </div>
            ) : (
              <div style={{ padding: '40px 20px' }}>
                <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 700, margin: '0 auto 16px' }}>
                  {(callData?.userName || 'U')[0]}
                </div>
                <h3>{callData?.userName || 'Customer'}</h3>
                <p style={{ color: '#a78bfa' }}>Audio Call</p>
                <audio id="remote-stream" autoPlay></audio>
                <audio id="local-stream" autoPlay muted></audio>
              </div>
            )}
            <div style={{ margin: '20px 0', fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace' }}>{formatTime(timer)}</div>
            <button onClick={handleEndCall} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '16px 48px', borderRadius: 50, fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer' }}>
              End Call
            </button>
          </div>
        )}

        {status === 'Completed' && (
          <div>
            <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 16px', color: '#fff' }}>&#10003;</div>
            <h3>Call Ended</h3>
            <p style={{ color: '#c4b5d8' }}>Duration: {formatTime(timer)}</p>
            <button onClick={() => navigate('/')} style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '12px 32px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', marginTop: 20 }}>
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallRoom;

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { callApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

const CallRoom = () => {
  const { callId } = useParams();
  const { astrologer } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const zegoRef = useRef(null);

  const [status, setStatus] = useState('Connecting');
  const [callData, setCallData] = useState(null);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!callId || !astrologer) return;

    const token = localStorage.getItem('astrologerToken');
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-call', { callId: parseInt(callId) });
    });

    // Fetch call details
    callApi.getCallById({ callId }).then(res => {
      const c = res.data?.recordList || res.data;
      setCallData(c);
      if (c?.callStatus === 'Accepted') {
        setStatus('Active');
        startZegoCall(c).catch(err => {
          console.error('startZegoCall failed:', err);
          toast.error('Failed to connect: ' + (err.message || ''));
        });
      }
    }).catch((err) => console.error('getCallById error:', err));

    socket.on('call-accepted', (data) => {
      setStatus('Active');
      setCallData(prev => ({ ...prev, ...data }));
      startZegoCall(data).catch(err => {
        console.error('startZegoCall on accept failed:', err);
        toast.error('Failed to connect: ' + (err.message || ''));
      });
    });

    socket.on('call-ended', () => {
      setStatus('Completed');
      stopZegoCall();
      if (timerRef.current) clearInterval(timerRef.current);
    });

    socket.on('call-error', (data) => {
      toast.error(data.message || 'Call error');
    });

    return () => {
      socket.disconnect();
      stopZegoCall();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callId, astrologer]);

  const startZegoCall = async (data) => {
    try {
      const tokenRes = await callApi.getZegoToken({ callId: parseInt(callId), userId: astrologer?.userId, isAstrologer: true });
      if (tokenRes.data?.status !== 200) { toast.error('Failed to get call token'); return; }
      const { appID, roomID, userID, token, provider, serverUrl } = tokenRes.data;
      const isVideo = data.call_type == 11 || data.call_type === 'Video';
      const userName = astrologer?.name || 'Astrologer';

      if (provider === 'zego') {
        const zegoModule = await import('zego-express-engine-webrtc');
        const ZegoExpressEngine = zegoModule.ZegoExpressEngine || zegoModule.default;
        if (!ZegoExpressEngine) { toast.error('Zegocloud SDK not loaded'); return; }
        const zg = new ZegoExpressEngine(appID, serverUrl || 'wss://webliveroom-api.zegocloud.com/ws');
        zegoRef.current = zg;
        await zg.loginRoom(roomID, token, { userID: String(userID), userName });
        const localStream = await zg.createStream({ camera: { audio: true, video: isVideo } });
        const localEl = document.getElementById('local-stream');
        if (localEl) localEl.srcObject = localStream;
        await zg.startPublishingStream(`stream_${userID}`, localStream);
        zg.on('roomStreamUpdate', async (rid, updateType, streamList) => {
          if (updateType === 'ADD') {
            for (const s of streamList) {
              const remote = await zg.startPlayingStream(s.streamID);
              const el = document.getElementById('remote-stream');
              if (el) el.srcObject = remote;
            }
          }
        });
      } else if (provider === 'agora') {
        const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        zegoRef.current = { agoraClient: client, localTracks: [] };
        await client.join(appID, roomID, token, parseInt(userID) || 0);
        const [micTrack, camTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        zegoRef.current.localTracks = isVideo ? [micTrack, camTrack] : [micTrack];
        if (isVideo) { camTrack.play(document.getElementById('local-stream')); await client.publish([micTrack, camTrack]); }
        else { await client.publish([micTrack]); }
        client.on('user-published', async (remoteUser, mediaType) => {
          await client.subscribe(remoteUser, mediaType);
          if (mediaType === 'video') remoteUser.videoTrack.play(document.getElementById('remote-stream'));
          if (mediaType === 'audio') remoteUser.audioTrack.play();
        });
      } else if (provider === 'hms') {
        const { HMSReactiveStore } = await import('@100mslive/hms-video-store');
        const hms = new HMSReactiveStore();
        const hmsActions = hms.getHMSActions();
        zegoRef.current = { hmsActions };
        await hmsActions.join({ authToken: token, userName, settings: { isAudioMuted: false, isVideoMuted: !isVideo } });
      }

      timerRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);
    } catch (err) {
      console.error('Call error:', err);
      toast.error('Failed to connect: ' + (err.message || ''));
    }
  };

  const stopZegoCall = () => {
    if (!zegoRef.current) return;
    try {
      if (zegoRef.current.agoraClient) {
        zegoRef.current.localTracks?.forEach(t => { t.stop(); t.close(); });
        zegoRef.current.agoraClient.leave();
      } else if (zegoRef.current.hmsActions) {
        zegoRef.current.hmsActions.leave();
      } else {
        zegoRef.current.stopPublishingStream();
        zegoRef.current.logoutRoom();
        zegoRef.current.destroyEngine();
      }
    } catch (e) {}
    zegoRef.current = null;
  };

  const handleEndCall = () => {
    if (socketRef.current) socketRef.current.emit('end-call', { callId: parseInt(callId) });
    stopZegoCall();
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

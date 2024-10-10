import React, {useEffect, useRef, useState} from 'react';
import Peer from 'simple-peer';
import socket from '../../socket';
import VideoCard from '../Video/VideoCard';

const Room = (props) => {
    const currentUser = Math.random() + ""
    const [peers, setPeers] = useState([]);
    const [userVideoAudio, setUserVideoAudio] = useState({
        localUser: {video: true, audio: true},
    });

    const peersRef = useRef([]);
    const userVideoRef = useRef();
    const userStream = useRef();
    const roomId = 0;

    useEffect(() => {
        // Connect Camera & Mic
        navigator.mediaDevices
            .getUserMedia({video: true, audio: true})
            .then((stream) => {
                userVideoRef.current.srcObject = stream;
                userStream.current = stream;

                socket.emit('BE-join-room', {roomId, userName: currentUser});
                socket.on('FE-user-join', (users) => {
                    // all users
                    const peers = [];
                    users.forEach(({userId, info}) => {
                        let {userName, video, audio} = info;

                        if (userName !== currentUser) {
                            const peer = createPeer(userId, socket.id, stream);

                            peer.userName = userName;
                            peer.peerID = userId;

                            peersRef.current.push({
                                peerID: userId,
                                peer,
                                userName,
                            });
                            peers.push(peer);

                            setUserVideoAudio((preList) => {
                                return {
                                    ...preList,
                                    [peer.userName]: {video, audio},
                                };
                            });
                        }
                    });

                    setPeers(peers);
                });

                socket.on('FE-receive-call', ({signal, from, info}) => {
                    let {userName, video, audio} = info;
                    const peerIdx = findPeer(from);

                    if (!peerIdx) {
                        const peer = addPeer(signal, from, stream);

                        peer.userName = userName;

                        peersRef.current.push({
                            peerID: from,
                            peer,
                            userName: userName,
                        });
                        setPeers((users) => {
                            return [...users, peer];
                        });
                        setUserVideoAudio((preList) => {
                            return {
                                ...preList,
                                [peer.userName]: {video, audio},
                            };
                        });
                    }
                });

                socket.on('FE-call-accepted', ({signal, answerId}) => {
                    const peerIdx = findPeer(answerId);
                    peerIdx.peer.signal(signal);
                });


            });

        return () => {
            socket.disconnect();
        };
        // eslint-disable-next-line
    }, []);

    function createPeer(userId, caller, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on('signal', (signal) => {
            socket.emit('BE-call-user', {
                userToCall: userId,
                from: caller,
                signal,
            });
        });
        peer.on('disconnect', () => {
            peer.destroy();
        });

        return peer;
    }

    function addPeer(incomingSignal, callerId, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        });

        peer.on('signal', (signal) => {
            socket.emit('BE-accept-call', {signal, to: callerId});
        });

        peer.on('disconnect', () => {
            peer.destroy();
        });

        peer.signal(incomingSignal);

        return peer;
    }

    function findPeer(id) {
        return peersRef.current.find((p) => p.peerID === id);
    }

    function createUserVideo(peer, index, arr) {
        return (
            <VideoCard key={index} peer={peer} number={arr.length}/>
        );
    }

    return (
        <>
            <video
                ref={userVideoRef}
                muted
                autoPlay
                playInline
            ></video>

            {/* Joined User Vidoe */}
            {peers &&
                peers.map((peer, index, arr) => createUserVideo(peer, index, arr))}
        </>
    );
};


export default Room;

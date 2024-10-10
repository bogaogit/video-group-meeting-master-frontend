import io from 'socket.io-client';
const sockets = io('https://video-group-meeting-master.onrender.com', { autoConnect: true, forceNew: true });
// const sockets = io('/');
export default sockets;

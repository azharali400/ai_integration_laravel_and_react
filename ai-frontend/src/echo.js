import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

export const echo = new Echo({
    broadcaster: 'reverb',
    key: 'b9af83gpmr2sryit2y91', // Apki .env se key
    wsHost: '127.0.0.1',
    wsPort: 8082,
    forceTLS: false,
    enabledTransports: ['ws', 'wss'],
});
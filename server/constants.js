const MessageType = {
    CREATE_ROOM: 'create_room',
    JOIN_ROOM: 'join_room',
    LEAVE_ROOM: 'leave_room',
    ROOM_UPDATE: 'room_update',
    START_GAME: 'start_game',
    GAME_STARTED: 'game_started',
    NEXT_QUESTION: 'next_question',
    PLAYER_ANSWER: 'player_answer',
    PLAYER_ELIMINATED: 'player_eliminated',
    GAME_OVER: 'game_over',
    ERROR: 'error',
    PING: 'ping',
    PONG: 'pong'
};

const GameState = {
    WAITING: 'waiting',
    STARTING: 'starting',
    PLAYING: 'playing',
    FINISHED: 'finished'
};

module.exports = { MessageType, GameState };
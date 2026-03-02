const students = {};

const socketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        socket.on('student-join', (data) => {
            students[socket.id] = {
                name: data.name,
                score: 0,
            };
            io.emit('update-students', students);
            console.log(`Student joined: ${data.name}`);
        });

        socket.on('update-suspicion', (data) => {
            if (students[socket.id]) {
                // Safely handle both { score } object and raw number
                const score = (data && typeof data === 'object') ? data.score : data;
                students[socket.id].score = typeof score === 'number' ? score : 0;
                io.emit('update-students', students);
            }
        });

        socket.on('disconnect', () => {
            if (students[socket.id]) {
                console.log(`Student disconnected: ${students[socket.id].name}`);
                delete students[socket.id];
                io.emit('update-students', students);
            }
        });
    });
};

module.exports = socketHandler;

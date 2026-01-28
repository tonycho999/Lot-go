const { io } = require("socket.io-client");

const socket = io("http://localhost:3000");

socket.on("connect", () => {
    console.log("Connected:", socket.id);
    socket.emit("login", { username: "tester" });
});

socket.on("login_success", (data) => {
    console.log("Login Success:", data);

    // Test Chat
    socket.emit("send_chat", { message: "Hello World", scope: "global" });

    // Test Create Room
    socket.emit("create_room", { modeType: "auto" });
});

socket.on("chat_message", (msg) => {
    console.log("Received Chat:", msg);
});

socket.on("room_joined", (room) => {
    console.log("Room Joined:", room);

    // Test Leave
    socket.emit("leave_room");
});

socket.on("update_room_list", (rooms) => {
    console.log("Room List Updated:", rooms.length);
});

socket.on("disconnect", () => {
    console.log("Disconnected");
});

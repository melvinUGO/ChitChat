const express = require("express");
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Message = require("./models/Message");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const ws = require("ws");
const fs = require("fs");

mongoose.connect(process.env.MONGODB_URL);
const jwtSecret = process.env.JWT_SECRET;

app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use("/uploads", express.static(__dirname + "/uploads"));

app.get("/test", async (req, res) => {
  res.json({ message: "app is running" });
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "invalid request" });
  }
  const user = await User.findOne({ username });

  if (user) {
    return res.status(400).json({ message: "user already exist" });
  }

  const hashedPassword = (await bcrypt.hash(password, 10)).toString();

  const newUser = await User.create({ username, password: hashedPassword });

  const token = await jwt.sign(
    { userId: newUser._id, username },
    process.env.JWT_SECRET
  );

  res
    .cookie("token", token, { sameSite: "none", secure: true })
    .status(201)
    .json({
      id: newUser._id,
    });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "invalid request" });
  }

  const user = await User.findOne({ username });
  if (user) {
    const isPasswordCorrect = bcrypt.compareSync(password, user.password);
    if (isPasswordCorrect) {
      const token = await jwt.sign(
        { userId: user._id, username },
        process.env.JWT_SECRET
      );

      res
        .cookie("token", token, { sameSite: "none", secure: true })
        .status(200)
        .json({
          id: user._id,
        });
    } else {
      return res.status(400).json({ message: "invalid request" });
    }
  } else {
    return res.status(400).json({ message: "invalid request" });
  }
});

app.post("/logout", async (req, res) => {
  res.cookie("token", "", { sameSite: "none", secure: true }).status(200).json({
    message: "logged out",
  });
});

app.get("/profile", async (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    const userData = jwt.verify(token, jwtSecret);
    res.status(200).json(userData);
  } else {
    res.status(401).json({ message: "no token" });
  }
});

app.get("/people", async (req, res) => {
  const users = await User.find({}, { _id: 1, username: 1 });
  res.json(users);
});

app.get("/messages/:userId", async (req, res) => {
  const { userId } = req.params;
  const token = req.cookies?.token;
  if (token) {
    const userData = jwt.verify(token, jwtSecret);
    const ourUserId = userData.userId;
    const messages = await Message.find({
      sender: { $in: [userId, ourUserId] },
      recipient: { $in: [userId, ourUserId] },
    });

    res.status(200).json(messages);
  } else {
    res.status(401).json({ message: "no token" });
  }
});

let server;
const start = () => {
  mongoose.connect(process.env.MONGODB_URL);
  server = app.listen(3000);
  console.log("server listening on port 3000");
};

start();

const wss = new ws.WebSocketServer({ server });

wss.on("connection", (connection, req) => {
  function notifyAboutOnlinePeople() {
    [...wss.clients].forEach((client) => {
      client.send(
        JSON.stringify({
          online: [...wss.clients].map((c) => ({
            userId: c.userId,
            username: c.username,
          })),
        })
      );
    });
  }

  connection.isAlive = true;
  connection.timer = setInterval(() => {
    connection.ping();
    connection.deathTimer = setTimeout(() => {
      connection.isAlive = false;
      clearInterval(connection.timer);
      connection.terminate();
      notifyAboutOnlinePeople();
    }, 1000);
  }, 5000);

  connection.on("pong", () => {
    clearTimeout(connection.deathTimer);
  });

  // read username and id from the cookie for this connection
  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies
      .split(";")
      .find((str) => str.startsWith("token="));
    if (tokenCookieString) {
      const token = tokenCookieString.split("=")[1];
      if (token) {
        const userData = jwt.verify(token, jwtSecret);
        const { userId, username } = userData;
        connection.userId = userId;
        connection.username = username;
      }
    }
  }

  connection.on("message", async (message) => {
    const messageData = JSON.parse(message.toString());
    const { recipient, text, file } = messageData;
    let filename = null;
    if (file) {
      const parts = file.name.split(".");
      const ext = parts[parts.length - 1];
      filename = Date.now() + "." + ext;
      const path = __dirname + "/uploads/" + filename;
      const bufferData = new Buffer(file.data.split(",")[1], "base64");
      fs.writeFile(path, bufferData, () => {
        console.log("file saved at " + path);
      });
    }
    if (recipient && (text || file)) {
      const messageDocument = await Message.create({
        sender: connection.userId,
        recipient,
        text,
        file: file ? filename : null,
      });
      [...wss.clients]
        .filter((c) => c.userId === recipient)
        .forEach((c) =>
          c.send(
            JSON.stringify({
              text,
              sender: connection.userId,
              recipient,
              _id: messageDocument._id,
              file: file ? filename : null,
            })
          )
        );
    }
  });

  // notify users of other online users(when someone connects)
  notifyAboutOnlinePeople();
});

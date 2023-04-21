import React, { useContext, useEffect, useRef, useState } from "react";
import Avatar from "../components/Avatar";
import Logo from "../components/Logo";
import { UserContext } from "../contexts/UserContext";
import { uniqBy } from "lodash";
import axios from "axios";
import { connect } from "mongoose";
import Contact from "../components/Contact";

const Chat = () => {
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [offlinePeople, setOfflinePeople] = useState({});
  const [selectedUserId, setSelctedUserId] = useState(null);
  const [newMessageText, setNewMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const { username, id, setId, setUsername } = useContext(UserContext);
  const divUnderMessages = useRef();

  useEffect(() => {
    ConnectToWs();
  }, []);

  const ConnectToWs = () => {
    const ws = new WebSocket("ws://localhost:3000");
    setWs(ws);
    ws.addEventListener("message", handleMessage);
    ws.addEventListener("close", () => {
      setTimeout(() => {
        ConnectToWs();
      }, 1000);
    });
  };

  const handleMessage = (e) => {
    const messageData = JSON.parse(e.data);
    //console.log({ e, messageData });
    if ("online" in messageData) {
      showOnlinePeople(messageData.online);
    } else if ("text" in messageData) {
      if (messageData.sender === selectedUserId) {
        setMessages((prev) => [...prev, { ...messageData }]);
      }
    }
  };

  const showOnlinePeople = (peopleArray) => {
    const people = {};
    peopleArray.forEach(({ userId, username }) => {
      people[userId] = username;
    });
    setOnlinePeople(people);
  };

  const onlinePeopleExcludingCurrentUser = { ...onlinePeople };
  delete onlinePeopleExcludingCurrentUser[id];

  const logout = () => {
    axios.post("/logout").then(() => {
      setWs(null);
      setId(null);
      setUsername(null);
    });
  };

  const sendMessage = (e, file = null) => {
    if (e) e.preventDefault();
    ws.send(
      JSON.stringify({
        recipient: selectedUserId,
        text: newMessageText,
        file,
      })
    );

    if (file) {
      axios.get("/messages/" + selectedUserId).then((res) => {
        setMessages(res.data);
      });
    } else {
      setMessages((prev) => [
        ...prev,
        {
          text: newMessageText,
          sender: id,
          recipient: selectedUserId,
          _id: Date.now(),
        },
      ]);
      setNewMessageText("");
    }
  };

  const sendFile = (e) => {
    const file = e.target?.files?.[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      sendMessage(null, { name: file?.name, data: reader.result });
    };
  };

  useEffect(() => {
    const div = divUnderMessages.current;
    if (div) {
      div.scrollIntoView({ behaviour: "smooth", block: "end" });
    }
  }, [messages]);

  useEffect(() => {
    const fetchOfflineUsers = async () => {
      const res = await axios.get("/people");
      const offlinePeopleArr = res.data
        .filter((person) => person._id !== id)
        .filter((person) => !Object.keys(onlinePeople).includes(person._id));
      const offlinePeople = {};
      offlinePeopleArr.forEach((person) => {
        offlinePeople[person._id] = person;
      });
      setOfflinePeople(offlinePeople);
    };
    fetchOfflineUsers();
  }, [onlinePeople]);

  useEffect(() => {
    const fetchMessagesforSelectedUser = async () => {
      if (selectedUserId) {
        const messages = await axios.get("/messages/" + selectedUserId);
        setMessages(messages.data);
      }
    };

    fetchMessagesforSelectedUser();
  }, [selectedUserId]);

  const messagesWithoutDuplicates = uniqBy(messages, "_id");

  return (
    <div className="flex h-screen">
      <div className="bg-white w-1/3 flex flex-col">
        <div className=" flex-grow">
          <Logo />
          {Object.keys(onlinePeopleExcludingCurrentUser).map(
            (userId, index) => (
              <Contact
                id={userId}
                online={true}
                selected={userId === selectedUserId}
                username={onlinePeopleExcludingCurrentUser[userId]}
                onClick={() => setSelctedUserId(userId)}
                onlinePeople={onlinePeople}
                key={index}
              />
            )
          )}
          {Object.keys(offlinePeople).map((userId, index) => (
            <Contact
              id={userId}
              online={false}
              selected={userId === selectedUserId}
              username={offlinePeople[userId].username}
              onClick={() => setSelctedUserId(userId)}
              onlinePeople={onlinePeople}
              key={index}
            />
          ))}
        </div>
        <div className="p-2 text-center flex items-center justify-center">
          <span className="mr-2 text-sm text-gray-500 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
                clipRule="evenodd"
              />
            </svg>
            {username}
          </span>
          <button
            onClick={logout}
            className="text-sm text-gray-500 bg-blue-100 py-1 px-2 border rounded-sm"
          >
            Logout
          </button>
        </div>
      </div>
      <div className="flex flex-col bg-blue-50 w-2/3 p-2">
        <div className=" flex-grow">
          {!selectedUserId && (
            <div className=" flex h-full flex-grow items-center justify-center">
              <div className="text-gray-300"> &larr; Select conversation</div>
            </div>
          )}
          {!!selectedUserId && (
            <div className=" relative h-full ">
              <div className=" overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                {messagesWithoutDuplicates.map((message, index) => {
                  return (
                    <div
                      key={index}
                      className={`${
                        message.sender === id ? "text-right" : "text-left"
                      }`}
                    >
                      <div
                        className={`${
                          message.sender === id
                            ? " bg-blue-500 text-white "
                            : " bg-white text-gray-500 "
                        } p-2 m-2 rounded-md text-sm inline-block text-left`}
                      >
                        {message.text}
                        {message.file && (
                          <div>
                            <a
                              target="_blank"
                              className="border-b flex items-center gap-1"
                              href={
                                axios.defaults.baseURL +
                                "/uploads/" +
                                message.file
                              }
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="w-4 h-4"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 015.91 15.66l7.81-7.81a.75.75 0 011.061 1.06l-7.81 7.81a.75.75 0 001.054 1.068L18.97 6.84a2.25 2.25 0 000-3.182z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              {message.file}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={divUnderMessages}></div>
              </div>
            </div>
          )}
        </div>
        {!!selectedUserId && (
          <form className="flex gap-2" onSubmit={sendMessage}>
            <input
              required
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              type="text"
              placeholder="Type your message here..."
              className="bg-white border p-2 w-full sm:flex-grow rounded-sm"
            />
            <label className="bg-blue-200  p-2 text-gray-600 border border-blue-200 rounded-sm">
              <input type="file" hidden onChange={sendFile} />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6"
              >
                <path
                  fillRule="evenodd"
                  d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 015.91 15.66l7.81-7.81a.75.75 0 011.061 1.06l-7.81 7.81a.75.75 0 001.054 1.068L18.97 6.84a2.25 2.25 0 000-3.182z"
                  clipRule="evenodd"
                />
              </svg>
            </label>
            <button
              type="submit"
              className="bg-blue-500 p-2 text-white rounded-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Chat;

import React from "react";
import Avatar from "./Avatar";

const Contact = ({ id, username, onClick, selected, online }) => {
  return (
    <div
      onClick={() => onClick(id)}
      className={
        " border-b border-gray-100  flex items-center gap-2 capitalize cursor-pointer " +
        (selected ? "bg-blue-50" : "")
      }
    >
      {selected && <div className="w-1 bg-blue-500 h-12 rounded-r-md"></div>}
      <div className=" pl-4 flex items-center gap-2 py-2">
        <Avatar username={username} userId={id} online={online} />
        <span className="text-gray-800">{username}</span>
      </div>
    </div>
  );
};

export default Contact;

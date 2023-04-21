import React from "react";

const Avatar = ({ username, userId, online }) => {
  const colors = [
    "bg-red-200",
    "bg-green-200",
    "bg-purple-200",
    "bg-blue-200",
    "bg-yellow-200",
    "bg-teal-200",
  ];

  const userIdBase10 = parseInt(userId, 16);
  const colorIndex = userIdBase10 % colors.length;
  const color = colors[colorIndex];
  return (
    <div
      className={
        "w-8 h-8 capitalize relative bg-red-200 rounded-full flex justify-center items-center opacity-70 " +
        color
      }
    >
      {username[0]}
      {online && (
        <div className="absolute w-3 h-3 shadow-lg shadow-black bg-green-500 bottom-0 right-0 rounded-full border border-white"></div>
      )}
      {!online && (
        <div className="absolute w-3 h-3 shadow-lg shadow-black bg-gray-400 bottom-0 right-0 rounded-full border border-white"></div>
      )}
    </div>
  );
};

export default Avatar;

import { useContext, useState } from "react";
import RegisterAndLogin from "./pages/RegisterAndLogin";
import axios from "axios";
import { UserContext } from "./contexts/UserContext";
import Chat from "./pages/Chat";

function App() {
  axios.defaults.baseURL = "http://localhost:3000";
  axios.defaults.withCredentials = true;
  const { username, id } = useContext(UserContext);

  if (username) {
    return <Chat />;
  }

  return (
    <div className="">
      <RegisterAndLogin />
    </div>
  );
}

export default App;

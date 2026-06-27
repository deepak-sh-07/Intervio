"use client"
import  {useState,useRef} from "react"
export default function login() {
  const [name, Setname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cpassword, setCpassword] = useState("");
  const [Islogin, setIslogin] = useState(true);
  const login = () => {
    
  }
  const register = () => {
    
  }
  return (
    <>
      (
      islogin && (
      <div>
        <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="text" value = {password}  onChange={(e)=>setPassword(e.target.value)}/>
      <button>Sign in</button>
      </div>
      )
      )
      (
      !islogin && (
      <div>
        <input type="text" value = {name}  onChange={(e)=>setEmail(e.target.value)}/>
        <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="text" value = {email}  onChange={(e)=>setEmail(e.target.value)}/>
      <button>Sign Up</button>
      </div>
      )
      )
      
    </>
    
  );
}
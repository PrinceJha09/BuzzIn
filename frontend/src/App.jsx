import React from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Feed from './pages/Feed'
import Messages from './pages/Messages'
import Chatbox from './pages/Chatbox'
import Connections from './pages/Connections'
import Discover from './pages/Discover'
import Profile from './pages/Profile'
import CreatePost from './pages/CreatePost'
import { useUser, useAuth } from '@clerk/clerk-react'
import Layout from './pages/Layout.jsx' 
import toast, {Toaster} from 'react-hot-toast'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { fetchUser } from './features/users/usersSlice.js'
import { fetchConnections } from './features/connections/connectionsSlice.js'
import { useRef } from 'react'
import { addMessage } from './features/messages/messagesSlice.js'
import Notifications from './components/Notifications.jsx'

const App = () => {
  const {user} = useUser()

  const {getToken}= useAuth()
  const {pathname} = useLocation()
  const pathNameRef = useRef(pathname)
  const dispatch = useDispatch()
  useEffect(()=>{
    const fetchData = async()=> {
      if(user){
        const token = await getToken()
        dispatch(fetchUser(token))
        dispatch(fetchConnections(token))
      }
    }
    fetchData()
  },[user, getToken, dispatch])

  useEffect(()=>{
    pathNameRef.current = pathname
  },[pathname])

  useEffect(()=>{
    if(user){
      const eventSource = new EventSource(import.meta.env.VITE_BASEURL+'/api/message/'+user.id);

      eventSource.onmessage = (event)=>{
        console.log("SSE event received:", event.data);
        const message = JSON.parse(event.data)
        if(pathNameRef.current === ('/messages/'+ message.from_user_id._id)){
          dispatch(addMessage(message))
        }else{
          toast.custom((t)=>(
            <Notifications t={t} message={message}/>
          ),{position:'bottom-right'})
        }
         }
      eventSource.onerror = (err) => {
        console.error("SSE error:", err);
      };

      return ()=>{
        eventSource.close()
      }
    }
  },[user,dispatch])

  return (
    <>
    <Toaster/>
      <Routes>
        <Route path='/' element={!user?<Login/>:<Layout/>}>
          <Route index element={<Feed/>}/>
          <Route path='messages' element={<Messages/>}/>
          <Route path='messages/:userId' element={<Chatbox/>}/>
          <Route path='connections' element={<Connections/>}/>
          <Route path='discover' element={<Discover/>}/>
          <Route path='profile' element={<Profile/>}/>
          <Route path='profile/:profileId' element={<Profile/>}/>
          <Route path='create-post' element={<CreatePost/>}/>
        </Route>
      </Routes>
    </>
  )
}

export default App

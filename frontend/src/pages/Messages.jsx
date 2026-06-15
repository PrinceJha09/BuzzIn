import React from 'react'
import { dummyConnectionsData } from '../assets/assets'
import { Eye, MessageSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

const Messages = () => {
  const {connections}= useSelector((state)=>state.connections)
  const navigate = useNavigate()
  return (
    <div className='min-h-screen relative bg-slate-50'>
      <div className='max-w-6xl mx-auto p-6'>

        {/*Title */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-slate-900 mb-2'>Messages</h1>
          <p className='text-slate-600'>Talk to your loved ones</p>
        </div>

        {/*Connected Users */}
        <div className='flex flex-col gap-3'>
          
          {/* BUZZBEE AI Chatbot */}
          <div className='max-w-xl flex gap-5 p-6 bg-white shadow rounded-md border-l-4 border-indigo-500'>
            <img src="/buzzbee.svg" alt="" className='rounded-full size-12 mx-auto bg-indigo-50 p-0.5 border border-indigo-100'/>
            <div className='flex-1'>
              <div className='flex items-center gap-2'>
                <p className='font-medium text-slate-700'>BUZZBEE</p>
                <span className='px-2 py-0.5 text-[9px] font-bold bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-full uppercase tracking-wider'>AI Bot</span>
              </div>
              <p className='text-slate-500'>@buzzbee</p>
              <p className='text-sm text-gray-600'>BuzzIn AI Assistant 🐝</p>
            </div>

            <div className='flex flex-col gap-2 mt-4'>
              <button onClick={()=>navigate(`/messages/buzzbee`)} className='size-10 flex items-center justify-center text-sm rounded bg-indigo-50 hover:bg-indigo-100 active:scale-95 transition text-indigo-600 cursor-pointer border border-indigo-100'>
                <MessageSquare className='w-4 h-4'/>
              </button>
            </div>
          </div>

          {connections.map((user)=>(
            <div key={user._id} className='max-w-xl flex gap-5 p-6 bg-white shadow rounded-md'>
              <img src={user.profile_picture} alt="" className='rounded-full size-12 mx-auto'/>
              <div className='flex-1'>
                <p className='font-medium text-slate-700'>{user.full_name}</p>
                <p className='text-slate-500'>@{user.username}</p>
                <p className='text-sm text-gray-600'>@{user.bio}</p>
              </div>

              <div className='flex flex-col gap-2 mt-4'>
                <button onClick={()=>navigate(`/messages/${user._id}`)} className='size-10 flex items-center justify-center text-sm rounded bg-slate-100 hover:bg-slate-200 active:scale-95 transition text-slate-800 cursor-pointer gap-1'>
                  <MessageSquare className='w-4 h-4'/>
                </button>

                <button onClick={()=>navigate(`/profile/${user._id}`)} className='size-10 flex items-center justify-center text-sm rounded bg-slate-100 hover:bg-slate-200 active:scale-95 transition text-slate-800 cursor-pointer'>
                  <Eye className='w-4 h-4'/>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      
    </div>
  )
}

export default Messages

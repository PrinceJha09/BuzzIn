import { Inngest } from "inngest";
import User from "../models/User.js";
import Connection from "../models/Connection.js";
import sendEmail from "../configs/nodeMailer.js";
import Story from "../models/Story.js";
import Message from "../models/Message.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "buzzin-app" });

//Inngest function to save user data to database
const syncUserCreation = inngest.createFunction(
    {id: 'sync-user-from clerk'},
    {event: 'clerk/user.created'},
    async ({event}) => {
        const {id, first_name, last_name, email_addresses, image_url} = event.data 
        let username = email_addresses[0].email_address.split('@')[0]

        //Check availability of username
        const user = await User.findOne({username})

        if(user){
            username = username + Math.floor(Math.random() * 10000)
        }

        const userData = {
            _id: id,
            full_name: first_name + ' ' + last_name,
            username: username,
            email: email_addresses[0].email_address,
            profile_picture: image_url
        }
        await User.create(userData)    
    }
)

//Inngest function to update user in database
const syncUserUpdation = inngest.createFunction(
    {id: 'update-user-from clerk'},
    {event: 'clerk/user.updated'},
    async ({event}) => {
        const {id, first_name, last_name, email_addresses, image_url} = event.data 
        const updatedData ={
            email: email_addresses[0].email_address,
            full_name: first_name+' '+last_name,
            profile_picture:image_url
        }  
        await User.findByIdAndUpdate(id, updatedData) 
    }
)
//Inngest function to delete user in database
const syncUserDeletion = inngest.createFunction(
    {id: 'delete-user-from clerk'},
    {event: 'clerk/user.deleted'},
    async ({event}) => {
        const {id} = event.data 
        await User.findByIdAndDelete(id) 
    }
)

//Inngest Function to send Reminder when a new connection request is added
const sendNewConnectionRequestReminder = inngest.createFunction(
    {id : 'send-new-connection-request-reminder'},
    {event: "app/connection-request"},
    async ({event, step}) => {
        const {connectionId} = event.data;
        await step.run('send-connection-request-mail', async () => {
            const connection = await Connection.findById(connectionId).populate('from_user_id to_user_id');
            const subject = `👋 New Connection Request`
            const body = `
            <div style='font-family:Arial, sans-serif; padding:20px'>
            <h2>Hi ${connection.to_user_id.full_name},</h2>
            <p>${connection.from_user_id.full_name}-${connection.from_user_id.username} has sent you a connection request. You can accept it by clicking on the link below.</p>
            <a href="${process.env.FRONTEND_URL}/connections" style="color:"10b981;">Accept Connection Request</a>
            <br/>
            <p>Thanks,<br/>BuzzIn - Keep Buzzing</p>
            </div>
              `;

            await sendEmail({
                to: connection.to_user_id.email,
                subject,
                body
            })
        })

        const in24Hours = new Date(Date.now() + 24*60*60*1000)
        await step.sleepUntil("wait-for-24-hours", in24Hours)
        await step.run('send-connection-request-reminder', async () => {
            const connection = await Connection.findById(connectionId).populate("from-user-id to-user-id");
            if(connection.status === "accepted"){
                return {message: "Already Accepted"}
            }

            const subject = `👋 New Connection Request`
            const body = `
            <div style='font-family:Arial, sans-serif; padding:20px'>
            <h2>Hi ${connection.to_user_id.full_name},</h2>
            <p>${connection.from_user_id.full_name}-${connection.from_user_id.username} has sent you a connection request. You can accept it by clicking on the link below.</p>
            <a href="${process.env.FRONTEND_URL}/connections" style="color:"10b981;">Accept Connection Request</a>
            <br/>
            <p>Thanks,<br/>BuzzIn - Keep Buzzing</p>
            </div>
              `;

            await sendEmail({
                to: connection.to_user_id.email,
                subject,
                body
            })

            return {message: 'Reminder Sent'}
        })
    }
)

//Inngest function to delete story after 24 hours
const deleteStory = inngest.createFunction(
    {id: 'story-delete'},
    {event: 'app/story.delete'},
    async ({event, step})=>{
        const {storyId} = event.data;
        const in24Hours = new Date(Date.now() + 24*60*60*1000)
        await step.sleepUntil("wait-for-24-hours", in24Hours)
        await step.run("delete-story", async (params) => {
            await Story.findByIdAndDelete(storyId)
            return {message: "Story Deleted"}
        })
    }
)

const sendNotificationsOfUnseenMessages = inngest.createFunction(
    {id: "send-unseen-messages-notification"},
    {cron: "TZ=Asia/Kolkata 0 5 * * *"},
    async ({step})=>{
        const messages = await Message.find({seen: false}).populate('to_user_id');
        const unseenCount = {}

        messages.map(message => {
            unseenCount[message.to_user_id._id] = (unseenCount[message.to_user_id._id] || 0) + 1
        })

        for(const userId in unseenCount){
            const user = await User.findById(userId)
            const subject = `👀 You have ${unseenCount[userId]} unseen messages`
            const body = `
            <div style='font-family:Arial, sans-serif; padding:20px'>
            <h2>Hi ${user.full_name},</h2>
            <p>You have ${unseenCount[userId]} unseen messages</p>
            <p Click><a href="${process.env.FRONTEND_URL}/messages" style="color:"10b981;">here</a> to view</p>
            <br/>
            <p>Thanks,<br/>BuzzIn - Keep Buzzing</p>
            </div>
            `;

            await sendEmail({
                to: user_email,
                subject,
                body
            })
        }
        return {message : "Notification Sent."}
    }
)

// Create an empty array where we'll export future Inngest functions
export const functions = [
    syncUserCreation,
    syncUserUpdation,
    syncUserDeletion,
    sendNewConnectionRequestReminder,
    deleteStory,
    sendNotificationsOfUnseenMessages
]; 
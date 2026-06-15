import fs from 'fs'
import imagekit from '../configs/imageKit.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

//Create an empty object to store Server side event connection
const connections ={}

//Controller function for Server side event endpoint
export const sseController = (req, res) => {
    const {userId}= req.params;
    console.log('New Client Connected: ', userId)

    //Set server side event header
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control','no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', '*')

    //Add the client's response object to the connections object
    connections[userId] = res

    //Send an initial event to the client
    res.write(`data: ${JSON.stringify({ message: "Connected to Server Side Event Stream" })}\n\n`)

    //Handle Client Disconnection
    req.on('close', ()=>{
        //Remove the client's response object from the connections array
        delete connections[userId];
        console.log("Client Disconnected")
    })
}

//Send Message
export const sendMessage = async (req, res) => {
    try {
        const {userId} = req.auth();
        const {to_user_id, text} = req.body; 
        const image = req.file;
        let media_url = '';
        let message_type = image ? 'image' : 'text';

        if(message_type === 'image'){
            const fileBuffer = fs.readFileSync(image.path)
            const response = await imagekit.upload({
                file:fileBuffer,
                fileName: image.originalname,
            });
            media_url = imagekit.url({
                path: response.filePath,
                transformation: [
                    {quality:'auto'},
                    {format: 'webp'},
                    {width:'1280'}
                ]
            })
        }

        const message = await Message.create({
            from_user_id: userId,
            to_user_id,
            text,
            message_type,
            media_url
        })

        res.json({success: true, message});

        //Send message to to_user_id using Server Side Event
        const messageWithUserData = await Message.findById(message._id).populate('from_user_id')

        if(connections[to_user_id]){
            connections[to_user_id].write(`data: ${JSON.stringify(messageWithUserData)}\n\n`)
        }
    } catch (error) {
        console.log(error);
        res.json({success:false, message:error.message});
    }
}

//get chat messages

export const getChatMessages = async (req,res) => {
    try {
        const {userId}=req.auth()
        const {to_user_id}= req.body;
        const messages = await Message.find({
            $or : [
                {from_user_id: userId, to_user_id},
                {from_user_id: to_user_id, to_user_id: userId}
            ]
        }).sort({createdAt: -1})
        //Mark Messages As Seen

        await Message.updateMany({from_user_id:to_user_id, to_user_id:userId}, {seen: true})
        res.json({success:true, messages})
    } catch (error) {
        console.log(error);
        res.json({success:false, message:error.message});
    }
}


//Get User Recent Messages
export const getUserRecentMessages = async (req,res)=> {
    try {
        const {userId}= req.auth()
        const messages = await Message.find({to_user_id:userId}).populate('from_user_id to_user_id').sort({createdAt:-1})

        res.json({success:true, messages})
    } catch (error) {
        console.log(error);
        res.json({success:false, message:error.message});
    }
}

// Send Buzzbee AI Message (Session context context-based)
export const sendBuzzbeeMessage = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { text, history } = req.body;

        if (!text) {
            return res.json({ success: false, message: "Text is required" });
        }

        // Fetch user profile info
        const user = await User.findById(userId);
        const userProfileInfo = user ? `
User Profile Details:
- Name: ${user.full_name}
- Username: ${user.username}
- Email: ${user.email}
- Bio: ${user.bio}
- Location: ${user.location || 'Not provided'}
- Followers Count: ${user.followers?.length || 0}
- Following Count: ${user.following?.length || 0}
- Connections Count: ${user.connections?.length || 0}
` : "User profile info is not available.";

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // System prompt limiting bot to profile data & basic chat
        const systemPrompt = `You are BUZZBEE, a friendly, sleek, and helpful AI chatbot integrated directly into the BuzzIn social media application.
You only have knowledge of the user's profile details and you must limit your conversations to basic chat/queries (like small talk, questions about their profile, greeting them, or simple friendly messages).
If the user asks complex, unrelated, or search-heavy queries (e.g. coding, math, general knowledge, writing long documents, general news, or complex logical reasoning), you MUST politely decline and say that you can only help with basic chat queries and their BuzzIn profile.

Here are the user's profile details:
${userProfileInfo}

Rules:
1. Always maintain the persona of BUZZBEE (the BuzzIn AI assistant). Keep it brief, friendly, and sweet (feel free to use bee-themed puns or emojis like 🐝 occasionally).
2. For any query outside of basic chatting or user profile inquiries, respond politely with: "I'm sorry, as BUZZBEE, I am only able to help with basic chatting and questions about your BuzzIn profile."
3. Do NOT invent profile details that are not in the profile info.
4. Keep answers short and sweet (1-3 sentences).
`;

        // Format history contents for Gemini API
        const contents = [];
        if (Array.isArray(history)) {
            for (const msg of history) {
                if ((msg.role === 'user' || msg.role === 'model') && msg.text) {
                    contents.push({
                        role: msg.role,
                        parts: [{ text: msg.text }]
                    });
                }
            }
        }

        // Add the current message
        contents.push({
            role: 'user',
            parts: [{ text: text }]
        });

        // Call Gemini
        const result = await model.generateContent({
            contents: contents,
            systemInstruction: systemPrompt,
            generationConfig: {
                maxOutputTokens: 250,
                temperature: 0.7,
            }
        });

        const reply = result.response.text().trim();
        res.json({ success: true, reply });
    } catch (error) {
        console.error("Error in sendBuzzbeeMessage:", error);
        res.json({ success: false, message: error.message });
    }
}
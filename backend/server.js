import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './configs/db.js';
import { serve } from "inngest/express";
import { clerkMiddleware } from '@clerk/express'

import {inngest, functions} from './inngest/index.js'; 
import userRouter from './routes/userRoutes.js';
import postRouter from './routes/postRoutes.js';
import storyRouter from './routes/storyRoutes.js';
import messageRouter from './routes/messageRoutes.js';
import User from './models/User.js';

const app=express();
await connectDB();

const seedBuzzbee = async () => {
    try {
        const buzzbee = await User.findById('buzzbee');
        if (!buzzbee) {
            await User.create({
                _id: 'buzzbee',
                email: 'buzzbee@buzzin.ai',
                full_name: 'BUZZBEE',
                username: 'buzzbee',
                bio: 'BuzzIn AI Assistant 🐝',
                profile_picture: '/buzzbee.svg',
                cover_photo: '',
                location: 'BuzzIn Hive'
            });
            console.log('Seeded BUZZBEE chatbot user successfully!');
        }
    } catch (error) {
        console.error('Error seeding BUZZBEE chatbot:', error);
    }
};
await seedBuzzbee();


app.use(express.json());
app.use(cors());
app.use(clerkMiddleware())

app.get('/', (req, res) => {
    console.log("running....")
    res.send('Server is running')
});

app.use('/api/inngest', serve({client : inngest, functions})); 
app.use('/api/user', userRouter)
app.use('/api/post', postRouter )
app.use('/api/story', storyRouter)
app.use('/api/message', messageRouter)

const PORT = process.env.PORT || 4000; 
app.listen(PORT, ()=> console.log(`Server is running on port ${PORT}`));
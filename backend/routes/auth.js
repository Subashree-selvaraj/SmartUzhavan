const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Signup route
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Validate input
        if ((!email && !phone) || (email && !password) || !name) {
            return res.status(400).json({ error: 'Invalid input data' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [
                { email: email },
                { phone: phone }
            ]
        });

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Create new user
        const user = new User({
            fullName: name,
            email: email,
            password: password,
            phone: phone
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Error creating user' });
    }
});

// Login route
router.post('/login', async (req, res) => {
    try {
        const { email, password, phone, otp } = req.body;

        // Validate input
        if ((!email && !phone) || (email && !password) || (phone && !otp)) {
            return res.status(400).json({ error: 'Invalid input data' });
        }

        // Find user by email or phone
        const user = await User.findOne({
            $or: [
                { email: email },
                { phone: phone }
            ]
        });

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Handle email login
        if (email && password) {
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid password' });
            }
        }
        // Handle phone login
        else if (phone && otp) {
            const isValidOTP = user.verifyOTP(otp);
            if (!isValidOTP) {
                return res.status(401).json({ error: 'Invalid or expired OTP' });
            }
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error logging in' });
    }
});

// Send OTP route
router.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        // Find or create user
        let user = await User.findOne({ phone });
        if (!user) {
            user = new User({ phone });
        }

        // Generate and save OTP
        const otp = user.generateOTP();
        await user.save();

        // In a real app, you would send the OTP via SMS
        console.log(`OTP for ${phone}: ${otp}`);

        res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ error: 'Error sending OTP' });
    }
});

// Helper: upsert Firestore user record if admin available
async function upsertUserDocIfAvailable(uid, data) {
	try {
		const admin = require('firebase-admin');
		if (!admin.apps.length || !admin.firestore) return;
		const db = admin.firestore();
		await db.collection('users').doc(uid).set({
			uid,
			...data,
			updatedAt: new Date()
		}, { merge: true });
	} catch (_) {}
}

module.exports = router; 
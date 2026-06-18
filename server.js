const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Get all appointments
app.get('/api/appointments', (req, res) => {
    fs.readFile(path.join(__dirname, 'db.json'), 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read database' });
        }
        const db = JSON.parse(data);
        const { date } = req.query;
        if (date) {
            return res.json(db.appointments.filter(a => a.date === date));
        }
        res.json(db.appointments);
    });
});

// Create new appointment
app.post('/api/appointments', (req, res) => {
    fs.readFile(path.join(__dirname, 'db.json'), 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read database' });
        }
        
        const db = JSON.parse(data);
        const newAppointment = {
            id: Date.now(),
            ...req.body,
            status: 'Pending',
            createdAt: new Date().toLocaleString()
        };
        
        db.appointments.push(newAppointment);
        
        fs.writeFile(path.join(__dirname, 'db.json'), JSON.stringify(db, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to save appointment' });
            }
            res.status(201).json(newAppointment);
        });
    });
});

// Update appointment status
app.put('/api/appointments/:id', (req, res) => {
    fs.readFile(path.join(__dirname, 'db.json'), 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read database' });
        }
        
        const db = JSON.parse(data);
        const appointmentId = parseInt(req.params.id);
        
        db.appointments = db.appointments.map(apt => {
            if (apt.id === appointmentId) {
                return { ...apt, status: req.body.status };
            }
            return apt;
        });
        
        fs.writeFile(path.join(__dirname, 'db.json'), JSON.stringify(db, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to update appointment' });
            }
            res.json({ message: 'Appointment status updated' });
        });
    });
});

// Clear all appointments
app.delete('/api/appointments', (req, res) => {
    const db = { appointments: [] };
    fs.writeFile(path.join(__dirname, 'db.json'), JSON.stringify(db, null, 2), (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to clear appointments' });
        }
        res.json({ message: 'All appointments cleared' });
    });
});

// Send email confirmation
app.post('/api/send-email', async (req, res) => {
    const { email, name, phone, date, time, mapsLink } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    // Create transporter using Gmail (app password required)
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'tejastejukr@gmail.com',
            pass: 'kbsh tybj icyu zhst'
        }
    });

    const mailOptions = {
        from: 'tejastejukr@gmail.com',
        to: email,
        subject: '✅ Appointment Confirmation - Sri Sheshashayi Dental Clinic',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #f5f8fc; border-radius: 16px;">
                <div style="background: linear-gradient(135deg, #0F6CBF, #0B5394); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: #fff; margin: 0; font-size: 1.5rem;">🦷 Sri Sheshashayi Dental</h1>
                    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Appointment Confirmation</p>
                </div>
                <div style="background: #fff; padding: 24px; border-radius: 0 0 12px 12px;">
                    <p style="font-size: 1.1rem; color: #1F2937;"><strong>Dear ${name},</strong></p>
                    <p style="color: #6B7280;">Your appointment has been booked successfully. Here are the details:</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                        <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #6B7280;">Patient Name</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: 600;">${name}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #6B7280;">Phone</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: 600;">${phone}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #6B7280;">Date</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: 600;">${date}</td></tr>
                        <tr><td style="padding: 8px; color: #6B7280;">Time</td><td style="padding: 8px; font-weight: 600;">${time}</td></tr>
                    </table>
                    <p style="color: #6B7280; font-size: 0.9rem;">📍 <strong>Address:</strong> No. 1347, Pavan Heights, 60 Feet Road, AECS Layout, Kundalahalli, Bangalore - 560037</p>
                    <p style="color: #6B7280; font-size: 0.9rem;">📞 <strong>Phone:</strong> <a href="tel:+919342573236" style="color: #0F6CBF;">+91 9342573236</a></p>
                    <p style="color: #6B7280; font-size: 0.9rem;">🗺️ <strong>Location:</strong> <a href="${mapsLink || 'https://share.google/6C62APk3ROePjW2Ir'}" target="_blank" style="color: #0F6CBF;">View on Google Maps</a></p>
                    <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;">
                    <p style="color: #9CA3AF; font-size: 0.8rem; text-align: center;">Thank you for choosing Sri Sheshashayi Multispeciality Dental Clinic!</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ message: 'Email sent successfully' });
    } catch (error) {
        console.error('Email error:', error.message);
        res.status(500).json({ error: 'Failed to send email: ' + error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`✅ Network access: http://192.168.68.103:${PORT}`);
    console.log(`✅ API Endpoints:`);
    console.log(`   GET    /api/appointments`);
    console.log(`   POST   /api/appointments`);
    console.log(`   PUT    /api/appointments/:id`);
    console.log(`   DELETE /api/appointments`);
    console.log(`   POST   /api/send-email`);
});

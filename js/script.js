/* ========================================
   Sri Sheshashayi Multispeciality Dental Clinic
   Main JavaScript
   ======================================== */

const API_URL = 'http://localhost:5000/api';
const CLINIC_MAPS_LINK = 'https://share.google/6C62APk3ROePjW2Ir';
let bookedSlots = [];
let lastAppointment = null;

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function openWhatsApp() {
    if (!lastAppointment) return;
    const { name, phone, date, time } = lastAppointment;
    const whatsappMessage = `*Appointment Confirmation*\n\nName: ${name}\nPhone: ${phone}\nDate: ${date}\nTime: ${time}\n\nClinic Location: ${CLINIC_MAPS_LINK}`;
    const encoded = encodeURIComponent(whatsappMessage);
    window.open(`https://wa.me/919342573236?text=${encoded}`, '_blank');
    closeModal('success-modal');
}

async function loadBookedSlots(date) {
    const select = document.getElementById('popup-time');
    const options = select.querySelectorAll('option:not([value=""])');
    options.forEach(opt => {
        opt.disabled = false;
        opt.style.color = '';
        opt.style.backgroundColor = '';
    });
    if (!date) return;

    try {
        const response = await fetch(`${API_URL}/appointments?date=${date}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            cache: 'no-cache'
        });
        if (!response.ok) throw new Error('Failed');
        const appointments = await response.json();
        bookedSlots = appointments.filter(a => a.date === date).map(a => a.time);

        if (bookedSlots.length > 0) {
            options.forEach(opt => {
                if (bookedSlots.includes(opt.value)) {
                    opt.disabled = true;
                    opt.title = 'This time slot is already booked';
                    opt.style.color = '#dc2626';
                    opt.style.backgroundColor = '#fee2e2';
                }
            });
        }
    } catch (e) {
        const local = JSON.parse(localStorage.getItem('dentalAppointments') || '[]');
        bookedSlots = local.filter(a => a.date === date).map(a => a.time);
        if (bookedSlots.length > 0) {
            options.forEach(opt => {
                if (bookedSlots.includes(opt.value)) {
                    opt.disabled = true;
                    opt.title = 'This time slot is already booked';
                    opt.style.color = '#dc2626';
                    opt.style.backgroundColor = '#fee2e2';
                }
            });
        }
    }
}

document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'popup-date') {
        loadBookedSlots(e.target.value);
    }
});

function showServiceDetails(title, description) {
    alert(`${title}\n\n${description}`);
}

async function submitAppointmentToServer() {
    console.log('1. Form submission started');
    const name = document.getElementById('popup-name').value.trim();
    const phone = document.getElementById('popup-phone').value.trim();
    const email = document.getElementById('popup-email').value.trim();
    const date = document.getElementById('popup-date').value;
    const time = document.getElementById('popup-time').value;
    const selectedIndex = document.getElementById('popup-time').selectedIndex;
    const selectEl = document.getElementById('popup-time');
    const phoneRegex = /^[6-9]\d{9}$/;

    console.log('2. Form values:', { name, phone, email, date, time });

    if (!phoneRegex.test(phone)) {
        alert('Please enter valid 10 digit mobile number');
        return false;
    }
    if (selectEl.options[selectedIndex] && selectEl.options[selectedIndex].disabled) {
        alert('❌ This time slot is already booked. Please choose another slot.');
        return false;
    }

    const appointmentData = { name, phone, email, date, time };

    try {
        console.log('3. Sending POST request to:', `${API_URL}/appointments`);
        const response = await fetch(`${API_URL}/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appointmentData)
        });

        console.log('4. Response status:', response.status);

        if (response.ok) {
            console.log('5. Response OK, showing popup');
            let emailOk = false;
            try {
                const emailResp = await fetch(`${API_URL}/send-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...appointmentData, mapsLink: CLINIC_MAPS_LINK })
                });
                emailOk = emailResp.ok;
            } catch (e) {
                emailOk = false;
            }

            lastAppointment = { name, phone, date, time };
            document.getElementById('success-message').textContent = `Name: ${name}\nDate: ${date}\nTime: ${time}`;
            const successModal = document.getElementById('success-modal');
            console.log('6. Success modal element:', successModal);
            if (successModal) {
                successModal.style.display = 'block';
                console.log('7. Modal display set to block');
            } else {
                console.log('7. ERROR: Success modal not found!');
            }
            
            document.getElementById('quick-appointment-form').reset();
            loadBookedSlots(date);
        } else {
            alert('❌ Failed to save appointment');
        }
    } catch (error) {
        console.log('8. Error caught:', error);
        alert('✅ Appointment booked! (Server offline - saved locally)');
        const appointments = JSON.parse(localStorage.getItem('dentalAppointments') || '[]');
        appointments.push({ ...appointmentData, status: 'Pending' });
        localStorage.setItem('dentalAppointments', JSON.stringify(appointments));
        
        const whatsappMessage = `*New Appointment Request*\n\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nDate: ${date}\nTime: ${time}`;
        const encoded = encodeURIComponent(whatsappMessage);
        window.open(`https://wa.me/919342573236?text=${encoded}`, '_blank');

        try {
            await fetch(`${API_URL}/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appointmentData)
            });
        } catch (e) {}
        
        closeModal('appointment-modal');
    }

    return false;
}

async function loadAppointmentsFromServer() {
    const tableBody = document.getElementById('appointments-table-body');
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:25px;">Loading appointments...</td></tr>';
    
    try {
        const response = await fetch(`${API_URL}/appointments`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            throw new Error('Server response not available');
        }
        
        const appointments = await response.json();
        
        if (appointments.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:25px;">✅ No appointments booked yet</td></tr>';
            return;
        }

        tableBody.innerHTML = appointments.map(apt => `
            <tr>
                <td>${apt.name}</td>
                <td>${apt.phone}</td>
                <td>${apt.email || '-'}</td>
                <td>${apt.date}</td>
                <td>${apt.time}</td>
                <td style="color: ${apt.status === 'Success' ? '#10b981' : apt.status === 'Pending' ? '#0F6CBF' : '#dc2626'}; font-weight:600;">${apt.status}</td>
                <td>
                    <button onclick="updateAppointmentStatus(${apt.id}, 'Success')" style="background:#10b981; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:0.8rem;">✓ Mark Done</button>
                </td>
            </tr>
        `).join('');
            
        document.getElementById('clear-appointments').onclick = async function() {
            if(confirm('Are you sure you want to delete all appointments?')) {
                await fetch(`${API_URL}/appointments`, { method: 'DELETE' });
                loadAppointmentsFromServer();
            }
        };
        
    } catch (error) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:25px; color: #dc2626;">⚠️ Server offline - showing local appointments</td></tr>';
        const appointments = JSON.parse(localStorage.getItem('dentalAppointments') || '[]');
        
        if (appointments.length > 0) {
            tableBody.innerHTML += appointments.map(apt => `
                <tr>
                    <td>${apt.name}</td>
                    <td>${apt.phone}</td>
                    <td>${apt.date}</td>
                    <td>${apt.time}</td>
                    <td style="color: #0F6CBF; font-weight:600;">${apt.status}</td>
                </tr>
            `).join('');
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
    
    const header = document.getElementById('header');
    if (header) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                header.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.12)';
            } else {
                header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.08)';
            }
        });
    }
    
    const counters = document.querySelectorAll('.counter-number');
    if (counters.length && !window.countersAnimated) {
        window.countersAnimated = true;
        counters.forEach(counter => {
            const target = parseInt(counter.getAttribute('data-target'));
            const duration = 2000;
            const increment = target / (duration / 16);
            let current = 0;
            
            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    counter.textContent = Math.floor(current);
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target;
                }
            };
            
            updateCounter();
        });
    }
    
    const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.feature-card, .service-card, .testimonial-card, .faq-item, .counters').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease-out';
        observer.observe(el);
    });
    
    const style = document.createElement('style');
    style.textContent = `.visible { opacity: 1 !important; transform: translateY(0) !important; }`;
    document.head.appendChild(style);
    
    console.log('✅ Sri Sheshashayi Dental Clinic Website Loaded Successfully');
});
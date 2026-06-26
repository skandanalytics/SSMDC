/* ========================================
   Sri Sheshashayi Multispeciality Dental Clinic
   Main JavaScript
   ======================================== */

// Detect if we're running from a file:// URL (no server) or via http://
const isFileProtocol = window.location.protocol === 'file:';

// If accessed via http:// (server running), use dynamic origin for API
// If accessed via file:// (direct open), disable server calls entirely
const API_URL = isFileProtocol ? null : `${window.location.origin}/api`;

const CLINIC_MAPS_LINK = 'https://share.google/6C62APk3ROePjW2Ir';
let bookedSlots = [];
let lastAppointment = null;

/**
 * Handle phone click - on desktop (1024px+), prevent dialer and show tooltip instead.
 * On mobile/tablet, allow normal tel: behavior.
 */
function handlePhoneClick(event) {
    if (window.innerWidth >= 1024) {
        event.preventDefault();
        
        // Show tooltip message
        const tooltip = event.currentTarget.querySelector('.phone-tooltip, .phone-tooltip-desktop');
        if (tooltip) {
            tooltip.classList.add('show');
            setTimeout(function() {
                tooltip.classList.remove('show');
                tooltip.style.opacity = '0';
                tooltip.style.visibility = 'hidden';
                setTimeout(function() {
                    tooltip.style.opacity = '';
                    tooltip.style.visibility = '';
                }, 300);
            }, 3000);
        }
        return false;
    }
    return true;
}

/**
 * Handle hash link scroll with fixed header offset
 */
function handleHashLink(href) {
    const targetId = href.substring(1); // Remove #
    if (!targetId) return;
    
    const target = document.getElementById(targetId);
    if (!target) return;
    
    const header = document.getElementById('header');
    const headerHeight = header ? header.offsetHeight : 80;
    
    // Close mobile menu if open
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    if (hamburger && navMenu) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    }
    
    const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight;
    
    window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
    });
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function openWhatsApp() {
    if (!lastAppointment) return;
    const { name, phone, date, time } = lastAppointment;
    const whatsappMessage = `*Appointment Confirmation*\n\nName: ${name}\nPhone: ${phone}\nDate: ${date}\nTime: ${time}\n\nClinic Location: ${CLINIC_MAPS_LINK}`;
    const encoded = encodeURIComponent(whatsappMessage);
    const waUrl = `https://wa.me/919342573236?text=${encoded}`;
    
    // Use window.location instead of window.open for mobile compatibility
    window.location.href = waUrl;
    
    closeModal('success-modal');
}

async function loadBookedSlots(date) {
    try {
        const select = document.getElementById('popup-time');
        if (!select) return;
        const options = select.querySelectorAll('option:not([value=""])');
        options.forEach(opt => {
            opt.disabled = false;
            opt.style.color = '';
            opt.style.backgroundColor = '';
        });
        if (!date) return;

        // Try fetching from server only if we have an API_URL (not file://)
        if (API_URL) {
            try {
                const response = await fetch(`${API_URL}/appointments?date=${date}`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    cache: 'no-cache',
                    signal: AbortSignal.timeout(2000)
                });
                if (response.ok) {
                    const appointments = await response.json();
                    bookedSlots = appointments.filter(a => a.date === date).map(a => a.time);
                    markBookedSlots(options);
                    return;
                }
            } catch (e) {
                // Server fetch failed, fall through to localStorage
            }
        }

        // Fallback to localStorage
        const local = JSON.parse(localStorage.getItem('dentalAppointments') || '[]');
        bookedSlots = local.filter(a => a.date === date).map(a => a.time);
        markBookedSlots(options);
        
    } catch (e2) {}
}

function markBookedSlots(options) {
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

document.addEventListener('change', function(e) {
    if (e.target && (e.target.id === 'popup-date' || e.target.id === 'popup-date-mobile')) {
        loadBookedSlots(e.target.value);
    }
});

function showServiceDetails(title, description) {
    alert(`${title}\n\n${description}`);
}

function validateFullName(name) {
    const trimmed = name.trim();
    
    if (!trimmed) {
        return { valid: false, message: 'Please enter your full name' };
    }
    
    // Allow letters, spaces, comma, period, apostrophe, hyphen
    const validPattern = /^[a-zA-Z\s,.\'-]+$/;
    if (!validPattern.test(trimmed)) {
        return { valid: false, message: 'Name can only contain letters and these symbols: , . \' -' };
    }
    
    // Check for multiple consecutive special characters
    const consecutiveSpecial = /[.,\'\-]{2,}/;
    if (consecutiveSpecial.test(trimmed)) {
        return { valid: false, message: 'Please avoid multiple consecutive special characters' };
    }
    
    // Must have at least one letter
    if (!/[a-zA-Z]/.test(trimmed)) {
        return { valid: false, message: 'Please enter a valid name' };
    }
    
    return { valid: true, value: trimmed, message: 'Valid name' };
}

function validatePhoneNumber(phone) {
    const trimmed = phone.trim();
    
    if (!trimmed) {
        return { valid: false, message: 'Please enter your phone number' };
    }
    
    // Remove all spaces for validation
    const cleaned = trimmed.replace(/\s/g, '');
    
    // Check if starts with +91 or 91 (incomplete country code entry)
    if ((cleaned === '+91' || cleaned === '91') && cleaned.length <= 3) {
        return { valid: false, message: 'Please enter the complete phone number including the country code.', showCountryHint: true };
    }
    
    // Check if starts with +91 or 91
    if (cleaned.startsWith('+91')) {
        const numberOnly = cleaned.substring(3);
        if (!/^\d+$/.test(numberOnly)) {
            return { valid: false, message: 'Phone number can only contain digits after country code' };
        }
        const totalLength = cleaned.length;
        if (totalLength < 12 || totalLength > 14) {
            return { valid: false, message: 'Please enter the complete phone number including the country code.' };
        }
        return { valid: true, value: cleaned, message: 'Valid phone number' };
    } 
    else if (cleaned.startsWith('91')) {
        const numberOnly = cleaned.substring(2);
        if (!/^\d+$/.test(numberOnly)) {
            return { valid: false, message: 'Phone number can only contain digits after country code' };
        }
        const totalLength = cleaned.length;
        if (totalLength < 12 || totalLength > 14) {
            return { valid: false, message: 'Please enter the complete phone number including the country code.' };
        }
        return { valid: true, value: cleaned, message: 'Valid phone number' };
    } 
    else {
        // Should be exactly 10 digits
        if (!/^\d{10}$/.test(cleaned)) {
            return { valid: false, message: 'Please enter a valid 10-digit mobile number (e.g., 9876543210)' };
        }
        return { valid: true, value: cleaned, message: 'Valid phone number' };
    }
}

function showValidationError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.className = 'validation-msg error';
    }
}

function showValidationSuccess(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.className = 'validation-msg success';
    }
}

function clearValidation(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = '';
        element.className = 'validation-msg';
    }
}

document.addEventListener('input', function(e) {
    if (e.target && (e.target.id === 'popup-name' || e.target.id === 'popup-name-mobile')) {
        // Allow only letters, spaces, comma, period, apostrophe, hyphen
        let value = e.target.value;
        const cleaned = value.replace(/[^a-zA-Z\s,.\'-]/g, '');
        if (value !== cleaned) {
            e.target.value = cleaned;
        }
        
        // Determine correct error element ID
        const errorId = e.target.id === 'popup-name' ? 'name-error' : 'name-error-mobile';
        
        // Real-time validation - only show errors, no success suggestions
        const result = validateFullName(e.target.value);
        if (e.target.value.length > 0 && !result.valid) {
            showValidationError(errorId, result.message);
        } else {
            clearValidation(errorId);
        }
    }
    
    if (e.target && (e.target.id === 'popup-phone' || e.target.id === 'popup-phone-mobile')) {
        // Allow digits and + only at start
        let value = e.target.value;
        const cleaned = value.replace(/[^0-9+]/g, '');
        
        // Ensure + appears only at the start
        if (cleaned.includes('+')) {
            const parts = cleaned.split('+');
            if (parts.length > 2 || (parts.length === 2 && parts[0] !== '')) {
                e.target.value = '+' + parts[parts.length - 1];
            } else {
                e.target.value = cleaned;
            }
        } else {
            e.target.value = cleaned;
        }
        
        // Determine correct error element ID
        const errorId = e.target.id === 'popup-phone' ? 'phone-error' : 'phone-error-mobile';
        
        // Real-time validation - only show errors, no success suggestions
        const result = validatePhoneNumber(e.target.value);
        if (e.target.value.length > 0 && !result.valid) {
            showValidationError(errorId, result.message);
        } else {
            clearValidation(errorId);
        }
    }
});

// Listen for focus/blur to handle the +91/91 hint message
document.addEventListener('focus', function(e) {
    if (e.target && (e.target.id === 'popup-phone' || e.target.id === 'popup-phone-mobile')) {
        const errorId = e.target.id === 'popup-phone' ? 'phone-error' : 'phone-error-mobile';
        if (e.target.value.length === 0) {
            clearValidation(errorId);
        }
    }
}, true);

function submitAppointmentToServer(e) {
    // Prevent form from submitting/reloading the page
    if (e) e.preventDefault();

    const nameInput = document.getElementById('popup-name');
    const phoneInput = document.getElementById('popup-phone');
    const emailInput = document.getElementById('popup-email');
    const dateInput = document.getElementById('popup-date');
    const timeSelect = document.getElementById('popup-time');
    
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();
    const date = dateInput.value;
    const time = timeSelect.value;
    const selectedIndex = timeSelect.selectedIndex;

    // Validate name
    const nameValidation = validateFullName(name);
    if (!nameValidation.valid) {
        showValidationError('name-error', nameValidation.message);
        nameInput.focus();
        return false;
    }

    // Validate phone
    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.valid) {
        showValidationError('phone-error', phoneValidation.message);
        phoneInput.focus();
        return false;
    }

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('Please enter a valid email address');
        emailInput.focus();
        return false;
    }

    if (timeSelect.options[selectedIndex] && timeSelect.options[selectedIndex].disabled) {
        alert('❌ This time slot is already booked. Please choose another slot.');
        return false;
    }

    const appointmentData = { name: nameValidation.value, phone: phoneValidation.value, email, date, time };

    // Save to localStorage immediately
    try {
        const appointments = JSON.parse(localStorage.getItem('dentalAppointments') || '[]');
        appointments.push({ ...appointmentData, status: 'Pending' });
        localStorage.setItem('dentalAppointments', JSON.stringify(appointments));
    } catch (e) {}

    // Show success popup IMMEDIATELY
    showSuccessPopup(nameValidation.value, phoneValidation.value, date, time);
    document.getElementById('quick-appointment-form').reset();
    clearValidation('name-error');
    clearValidation('phone-error');
    loadBookedSlots(date);

    // Try to save to server in background ONLY if not file:// protocol
    if (API_URL) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        fetch(`${API_URL}/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appointmentData),
            signal: controller.signal
        })
        .then(response => {
            clearTimeout(timeoutId);
            if (response.ok) {
                fetch(`${API_URL}/send-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...appointmentData, mapsLink: CLINIC_MAPS_LINK })
                }).catch(() => {});
            }
        })
        .catch(() => {
            clearTimeout(timeoutId);
        });
    }

    return false;
}

function showSuccessPopup(name, phone, date, time) {
    lastAppointment = { name, phone, date, time };
    
    // Format date nicely (e.g., "24 June 2026")
    let formattedDate = date;
    try {
        const parts = date.split('-');
        if (parts.length === 3) {
            const d = new Date(parts[0], parts[1] - 1, parts[2]);
            const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            formattedDate = parseInt(parts[2]) + ' ' + months[parseInt(parts[1]) - 1] + ' ' + parts[0];
        }
    } catch(e) {}
    
    const nameEl = document.getElementById('success-name');
    const dateEl = document.getElementById('success-date');
    const timeEl = document.getElementById('success-time');
    
    if (nameEl) nameEl.textContent = name;
    if (dateEl) dateEl.textContent = formattedDate;
    if (timeEl) timeEl.textContent = time;
    
    const successModal = document.getElementById('success-modal');
    if (successModal) {
        successModal.style.display = 'flex';
    }
}

async function loadAppointmentsFromServer() {
    const tableBody = document.getElementById('appointments-table-body');
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:25px;">Loading appointments...</td></tr>';

    try {
        if (!API_URL) {
            throw new Error('No server (file:// mode)');
        }

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
                    <td>${apt.email || '-'}</td>
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
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    handleHashLink(href);
                }
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
            const parent = counter.closest('.counter-item');
            const label = parent ? parent.querySelector('.counter-label') : null;
            const isSatisfaction = label && label.textContent.trim() === 'Patient Satisfaction';
            const duration = 2000;
            const increment = target / (duration / 16);
            let current = 0;

            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    if (isSatisfaction) {
                        counter.innerHTML = Math.floor(current) + '<span class="counter-percent">%</span>';
                    } else {
                        counter.textContent = Math.floor(current);
                    }
                    requestAnimationFrame(updateCounter);
                } else {
                    if (isSatisfaction) {
                        counter.innerHTML = target + '<span class="counter-percent">%</span>';
                    } else {
                        counter.textContent = target;
                    }
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

    // Set today's date as default for date picker
    const dateInput = document.getElementById('popup-date');
    if (dateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    // Set today's date for mobile form as well
    const dateInputMobile = document.getElementById('popup-date-mobile');
    if (dateInputMobile) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInputMobile.value = `${yyyy}-${mm}-${dd}`;
    }

    // Attach submit handler to the appointment form
    const form = document.getElementById('quick-appointment-form');
    if (form) {
        form.addEventListener('submit', submitAppointmentToServer);
    }

    console.log('✅ Sri Sheshashayi Dental Clinic Website Loaded Successfully');
    console.log(`   Mode: ${isFileProtocol ? 'Offline (file://)' : 'Server (' + window.location.origin + ')'}`);
});
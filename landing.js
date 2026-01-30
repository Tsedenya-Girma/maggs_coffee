/* ==========================================================================
   1. CAROUSEL LOGIC
   ========================================================================== */
const next = document.getElementById("next");
const prev = document.getElementById("prev");
const carousal = document.querySelector(".carousal");
const list = document.querySelector(".carousal .list");
const thumbnail = document.querySelector(".carousal .thumbnail");

const timeRunning = 500; // Must match CSS transition time
let runTimeOut;

/**
 * Handles the sliding transition for the carousel
 * @param {string} type - 'next' or 'prev'
 */
function showSlider(type) {
    const items = document.querySelectorAll(".carousal .list .item");
    const thumbs = document.querySelectorAll(".carousal .thumbnail .item");

    if (type === "next") {
        // Move first item to the end
        list.appendChild(items[0]);
        thumbnail.appendChild(thumbs[0]);
        carousal.classList.add("next");
    } else {
        // Move last item to the beginning
        list.prepend(items[items.length - 1]);
        thumbnail.prepend(thumbs[thumbs.length - 1]);
        carousal.classList.add("prev");
    }

    // Remove animation classes after transition finishes
    clearTimeout(runTimeOut);
    runTimeOut = setTimeout(() => {
        carousal.classList.remove("next", "prev");
    }, timeRunning);
}

// Event Listeners for Navigation
next.onclick = () => showSlider("next");
prev.onclick = () => showSlider("prev");

// Menu link: set flag so index.html allows access (index only from landing)
document.getElementById('menu-link')?.addEventListener('click', function () {
    sessionStorage.setItem('maggs_from_landing', '1');
});


/* ==========================================================================
   2. SCROLL REVEAL ANIMATIONS
   ========================================================================== */
const observerOptions = {
    threshold: 0.1 // Triggers when 10% of the element is visible
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, observerOptions);

// Attach observer to all elements with the .reveal class
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));


/* ==========================================================================
   3. AUTH / ORDER MODAL LOGIC
   ========================================================================== */
const modal = document.getElementById('authModal');
const closeIcon = document.querySelector('.close-icon');
const modalTitle = document.getElementById('modalTitle');

/**
 * Opens the modal and updates title text
 */
function openOrderModal() {
    if (modal) {
        if (modalTitle) modalTitle.innerText = "Start Your Order";
        modal.classList.add('active');
    }
}

// Close Modal (Clicking the 'X' icon)
if (closeIcon) {
    closeIcon.onclick = () => {
        modal.classList.remove('active');
    };
}

// Close Modal (Clicking anywhere outside the card)
window.onclick = (event) => {
    if (event.target === modal) {
        modal.classList.remove('active');
    }
};


/* ==========================================================================
   4. OPTIONAL: PARALLAX EFFECT
   ========================================================================== */
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const floatImg = document.querySelector('.floating-img');
    if (floatImg) {
        // Subtly move the image slower than the scroll speed
        floatImg.style.transform = `translateY(${scrolled * 0.05}px)`;
    }
});

  
//FETCH//

const authForm = document.querySelector('.auth-form');
const switchLink = document.getElementById('switchLink');
let isSignUp = false;

// Toggle Login/Signup text
switchLink.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUp = !isSignUp;
    document.getElementById('modalTitle').innerText = isSignUp ? "Create Account" : "Welcome Back";
    document.getElementById('submitBtn').innerText = isSignUp ? "Sign Up" : "Let's Go";
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('authUsername').value;
    const password = document.getElementById('authPassword').value;
    const action = isSignUp ? 'signup' : 'login';

    try {
        const response = await fetch('auth.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, username, password })
        });

        const result = await response.json();

      // Inside landing.js login logic
if (result.success) {
    alert("Login successful!");
    // This is the key line that script.js looks for!
    sessionStorage.setItem('maggs_from_landing', '1'); 
    window.location.href = "index.html"; 
}
    } catch (error) {
        console.error("Error:", error);
        alert("Server error. Make sure WAMP is running!");
    }
});
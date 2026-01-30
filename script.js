// // =============================================
// // LANDING GATE: index only accessible from landing page
// // =============================================
// (function () {
//     try {
//         var fromLanding = sessionStorage.getItem('maggs_from_landing');
//         if (!fromLanding) {
//             var landing = 'landing.htm';
//             if (typeof window !== 'undefined' && window.location && window.location.replace) {
//                 window.location.replace(landing);
//             }
//             throw new Error('Redirect to landing');
//         }
//     } catch (e) {
//         if (e.message === 'Redirect to landing') return;
//         throw e;
//     }
// })();

// =============================================
// GLOBAL CONFIGURATION
// =============================================
const CONFIG = {
    MODEL_PATHS: {
        "cup": "models/glass_cup.glb",
    },
    
    // Drink colors
    DRINK_COLORS: {
        "latte": 0x8B4513,     // Coffee brown
        "matcha": 0x7BA05B,    // Matcha green
        "americano": 0x4A2C2A  // Dark brown
    },
    
    // Milk color adjustments
    MILK_COLORS: {
        "whole": 0xF5F5DC,
        "almond": 0xF5DEB3,
        "soy": 0xF0E68C,
        "oat": 0xDAA520
    },
    
    // Flavor colors (for visual representation)
    FLAVOR_COLORS: {
        "vanilla": 0xF3E5AB,
        "caramel": 0xD2691E,
        "hazelnut": 0x8B4513,
        "chocolate": 0x5D4037,
        "none": null
    },
    
    // Topping visual effects - IMPROVED SIZING
    TOPPING_EFFECTS: {
        "whippedcream": { 
            type: "foam", 
            height: 0.15,     // Reduced for better proportion
            radius: 0.45,     // Matches cup radius
            color: 0xFFFFFF 
        },
        "chocolatesauce": { 
            type: "drizzle", 
            color: 0x5D4037,
            count: 5          // Number of drizzle lines
        },
        "cinnamon": { 
            type: "sprinkle", 
            color: 0xD2691E,
            count: 20         // More sprinkle particles
        },
        "carameldrizzle": { 
            type: "drizzle", 
            color: 0xD2691E,
            count: 5 
        },
        "none": null
    },
    
    // Prices
    PRICES: {
        "latte": 5.99,
        "matcha": 6.49,
        "americano": 4.99,
        "almond": 0.25,
        "soy": 0.25,
        "oat": 0.25,
        "vanilla": 0.50,
        "caramel": 0.50,
        "hazelnut": 0.50,
        "chocolate": 0.75,
        "whippedcream": 0.75,
        "chocolatesauce": 0.50,
        "cinnamon": 0.25,
        "carameldrizzle": 0.50
    }
};

// App State
let appState = {
    config: {
        drink: "latte",
        milk: "whole",
        flavor: "none",
        topping: "none",
        price: 5.99
    },
    
    threejs: {
        scene: null,
        camera: null,
        renderer: null,
        cupModel: null,
        liquidMesh: null,
        toppingMesh: null,
        isRotating: true,
        isLoading: false,
        animationId: null,
        rotationSpeed: 0.005
    }
};

// Drink builder state
let drinkBuilderState = {
    selectedType: null,
    selectedMilk: null,
    selectedFlavor: null,
    selectedTopping: null,
    currentStep: 1,
    currentRotation: 0
};

// =============================================
// MAIN CART FUNCTIONALITY
// =============================================
async function saveOrderToDB(items, total) {
    // This part removes "ETB" or "$" so only the number is sent
    const cleanTotal = total.toString().replace(/[^0-9.]/g, ''); 
    
    console.log("Attempting to save order...", {items, total: cleanTotal});
    try {
        const response = await fetch('save_order.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items, total: cleanTotal }) 
        });
        
        const result = await response.json();
        console.log("📡 Database Response:", result);
        return result.success;
    } catch (e) {
        console.error("Connection failed. Check if WAMP is GREEN.", e);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM loaded, initializing app...');

    // Clear displayed prices so only DB prices show (prevents "real price then revert to HTML")
    document.querySelectorAll('.price-tag, .drink-card .price, .featured-card .price').forEach(el => {
        el.textContent = '…';
        el.setAttribute('data-db-pending', '1');
    });
    
    // 1. SELECTORS
    const cart = document.getElementById("cart");
    const cartBtn = document.getElementById("cart-btn");
    const closeCart = document.getElementById("close-cart");
    const cartBadge = document.querySelector(".badge");
    const cartItemsContainer = document.getElementById("cart-items");
    const totalDisplay = document.getElementById("total");
    
    // Select all add buttons
    const addButtons = document.querySelectorAll(".modern-add-btn, .featured-add-btn, .add-btn-circle");
    
    // Customization Modal Selectors
    const customizeModal = document.getElementById('customize-modal');
    const closeCustomize = document.getElementById('close-customize');
    const confirmAdd = document.getElementById('confirm-add');
    const qtyText = document.getElementById('current-qty');
    const modalItemName = document.getElementById('modal-item-name');
    const modalSubtotal = document.getElementById('modal-subtotal');
    const fastingOption = document.getElementById('fasting-option');
    const sugarOption = document.getElementById('sugar-option');
    const plusQty = document.getElementById('plus-qty');
    const minusQty = document.getElementById('minus-qty');

    // Initialize cart data
    if (!window.cartData) {
        window.cartData = [];
    }
    // Products from DB (name -> { is_available }) for out-of-stock check
    if (!window.productsByNormalizedName) {
        window.productsByNormalizedName = {};
    }
    
    let tempItem = null; // Stores item currently in modal
    let currentQty = 1;

    // 2. TOGGLE MAIN CART
    if (cartBtn) {
        cartBtn.addEventListener("click", () => {
            cart.classList.add("open");
            updateCartUI(); // Refresh UI when opening
        });
    }
    
    if (closeCart) {
        closeCart.addEventListener("click", () => {
            cart.classList.remove("open");
        });
    }

    // 3. CUSTOMIZATION MODAL LOGIC
addButtons.forEach(button => {
    button.addEventListener('click', () => {
        const name = button.getAttribute('data-name');
        const priceText = button.getAttribute('data-price');
        const price = parseFloat(priceText);

        // Check if item is out of stock (from admin)
        const normalized = (name || '').toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
        const productInfo = window.productsByNormalizedName && window.productsByNormalizedName[normalized];
        if (productInfo && (productInfo.is_available === 0 || productInfo.is_available === '0')) {
            alert('This item is currently out of stock.');
            return;
        }
        
        // Find the closest card or section to determine if it's a snack
        const isSnack = button.closest('.snack-card') || button.closest('#snacks');

        // Select the option groups (Fasting and Sugar)
        const dietaryGroup = fastingOption.closest('.option-group');
        const sugarGroup = sugarOption.closest('.option-group');

        if (isSnack) {
            dietaryGroup.classList.add('blurred');
            sugarGroup.classList.add('blurred');
        } else {
            dietaryGroup.classList.remove('blurred');
            sugarGroup.classList.remove('blurred');
        }

        // Reset quantity and show correct subtotal 
        currentQty = 1;
        if (qtyText) qtyText.textContent = '1';
        tempItem = { name, price };
        const card = button.closest('.drink-card, .featured-card');
        const titleEl = card && card.querySelector('h4, h3');
        if (modalItemName) modalItemName.textContent = titleEl ? titleEl.textContent.trim() : (name.charAt(0).toUpperCase() + name.slice(1));
        if (modalSubtotal) modalSubtotal.textContent = (price * currentQty).toFixed(2);
        customizeModal.style.display = 'flex';
    });
});

    // Modal Quantity Controls
    if (plusQty) {
        plusQty.addEventListener('click', () => { 
            currentQty++; 
            qtyText.textContent = currentQty; 
            updateModalSubtotal(); 
        });
    }
    
    if (minusQty) {
        minusQty.addEventListener('click', () => { 
            if (currentQty > 1) { 
                currentQty--; 
                qtyText.textContent = currentQty; 
                updateModalSubtotal(); 
            } 
        });
    }

    function updateModalSubtotal() {
        if (tempItem && modalSubtotal) {
            modalSubtotal.textContent = (tempItem.price * currentQty).toFixed(2);
        }
    }

    // Close Modal
    if (closeCustomize) {
        closeCustomize.addEventListener('click', () => {
            customizeModal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target == customizeModal) {
            customizeModal.style.display = 'none';
        }
    });

    // 4. FINAL ADD TO CART LOGIC
    if (confirmAdd) {
        confirmAdd.addEventListener('click', () => {
            if (!tempItem) return;
            
            const fasting = fastingOption ? fastingOption.value : "Non-Fasting (Milk)";
            const sugar = sugarOption ? sugarOption.value : "Normal";
            
            // Check if exact same customization already exists in cart
            const existingItem = window.cartData.find(item => 
                item.name === tempItem.name && 
                item.fasting === fasting && 
                item.sugar === sugar
            );

            if (existingItem) {
                existingItem.quantity += currentQty;
            } else {
                window.cartData.push({ 
                    name: tempItem.name, 
                    price: tempItem.price, 
                    quantity: currentQty,
                    fasting: fasting,
                    sugar: sugar
                });
            }

            updateCartUI();
            customizeModal.style.display = 'none';
            cart.classList.add("open"); // Show sidebar after adding
        });
    }

    // 5. SEARCH BAR LOGIC
    const searchInput = document.getElementById("search");
    const drinkCards = document.querySelectorAll(".drink-card");

    if (searchInput && drinkCards.length > 0) {
        searchInput.addEventListener("keyup", () => {
            const value = searchInput.value.toLowerCase().trim();
            drinkCards.forEach(card => {
                const titleElement = card.querySelector("h4");
                const drinkName = titleElement ? titleElement.textContent.toLowerCase() : '';
                card.style.display = drinkName.includes(value) ? "block" : "none";
            });
        });
    }

    // 6. CATEGORY FILTER TABS
    const filterButtons = document.querySelectorAll('.filter-btn');
    const categorySections = document.querySelectorAll('.category-section');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');
            
            const category = button.getAttribute('data-category');
            
            if (category === 'all') {
                // Show all sections
                categorySections.forEach(section => {
                    section.style.display = 'block';
                });
            } else {
                // Hide all sections first
                categorySections.forEach(section => {
                    section.style.display = 'none';
                });
                
                // Show matching sections
                const matchingSection = document.getElementById(category);
                if (matchingSection) {
                    matchingSection.style.display = 'block';
                }
            }
        });
    });

    // Initialize cart UI
    updateCartUI();
    
    // Setup 3D drink builder modal
    setupDrinkBuilderModal();
    
    // Load products from database and update prices (save button & out-of-stock use these)
    setTimeout(loadProductsAndUpdatePrices, 150);
    // Re-apply DB prices after a short delay in case something overwrote them
    setTimeout(loadProductsAndUpdatePrices, 900);
    
    console.log('🎉 App initialization complete!');

/* =============================================
   FINAL INTEGRATED CODE
   ============================================= */
const mainCheckoutBtn = document.getElementById('checkout-now');
const buyNowBtn = document.getElementById('buy-now');
// 1. HELPER FUNCTION

if (mainCheckoutBtn) {
    mainCheckoutBtn.addEventListener('click', async (e) => {
        // PREVENT THE REFRESH 
        e.preventDefault();

        const totalDisplay = document.getElementById('total');
        
        // 2. Validate Cart
        if (!window.cartData || window.cartData.length === 0) {
            alert("Your cart is empty!");
            return;
        }

        // 3. Clean the total amount ( Data formatting)
        const totalRaw = totalDisplay.textContent;
        const cleanTotal = totalRaw.replace(/[^0-9.]/g, ''); 
        const numericTotal = parseFloat(cleanTotal);

        if (isNaN(numericTotal) || numericTotal <= 0) {
            alert("Invalid total amount!");
            return;
        }

        // 4. Save to Database
        const isSaved = await saveOrderToDB(window.cartData, cleanTotal);

        if (isSaved) {
            // 5. Create Chapa Payment Form 
            const tx_ref = "TX-" + Date.now();
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = "https://api.chapa.co/v1/hosted/pay";

            const baseUrl = window.location.origin + (window.location.pathname.replace(/\/[^/]*$/, '') || '');
            
            const params = {
                'public_key': "CHAPUBK_TEST-ZQdiPTaJyl2fIuEhMHYqVHu7tj2NE0mj",
                'tx_ref': tx_ref,
                'amount': cleanTotal,
                'currency': 'ETB',
                'email': 'girmatsedenay@gmail.com',
                'title': 'Cart Checkout',
                'description': `Payment for ${window.cartData.length} items`,
                'return_url': baseUrl + '/maggs-game.html'
            };

            for (const key in params) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = params[key];
                form.appendChild(input);
            }

            document.body.appendChild(form);
            form.submit();
        } else {
            alert("Checkout Error: Could not save your cart to the database.");
        }
    });
}
// 3. BUY NOW (SINGLE ITEM)
if (buyNowBtn) {
        buyNowBtn.addEventListener('click', async () => {
            const modalSubtotal = document.getElementById('modal-subtotal');
        const modalItemName = document.getElementById('modal-item-name');
        
        if (!modalSubtotal || !modalItemName) {
            console.error("Modal elements not found!");
            return;
        }

        const amountRaw = modalSubtotal.textContent;
        // 1. Remove "$" or "ETB" so PHP gets a pure number
        const cleanAmount = amountRaw.replace(/[^0-9.]/g, '');
        const numericAmount = parseFloat(cleanAmount);

        // 2. Stop if the price is 0 or invalid
        if (isNaN(numericAmount) || numericAmount <= 0) {
            alert("Invalid item price!");
            return;
        }

        const itemName = modalItemName.textContent;
        
        // 3. Prepare the clean data for the database
        const orderData = [{ 
            name: itemName, 
            price: numericAmount, 
            quantity: 1 
        }];
        const isSaved = await saveOrderToDB(orderData, cleanAmount);

            if (isSaved) {
                const tx_ref = "TX-" + Date.now();
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = "https://api.chapa.co/v1/hosted/pay";

                const baseUrl = window.location.origin + (window.location.pathname.replace(/\/[^/]*$/, '') || '');
                const params = {
                    'public_key': "CHAPUBK_TEST-ZQdiPTaJyl2fIuEhMHYqVHu7tj2NE0mj",
                    'tx_ref': tx_ref,
                    'amount': cleanAmount,
                    'currency': 'ETB',
                    'email': 'girmatsedenay@gmail.com',
                    'title': 'Drink Order',
                    'description': 'Payment for ' + itemName,
                    'return_url': baseUrl + '/maggs-game.html'
                };

                for (const key in params) {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.value = params[key];
                    form.appendChild(input);
                }
                document.body.appendChild(form);
                form.submit();
            } else {
                alert("Database Error: Could not log order.");
            }
        });
    }
});

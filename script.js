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
// =============================================
// 3D DRINK BUILDER MODAL SETUP - FIXED
// =============================================

function setupDrinkBuilderModal() {
    const openModalBtn = document.getElementById('openModal');
    const closeModalBtn = document.getElementById('closeModal');
    const modal = document.getElementById('drinkModal');
    
    if (openModalBtn && modal) {
        openModalBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            console.log('Opening 3D drink builder modal...');
            modal.style.display = 'flex';
            
            // Reset selections
            resetSelections();
            
            // Initialize Three.js after a short delay to ensure DOM is ready
            setTimeout(() => {
                initThreeJS();
            }, 100);
        });
    }
    
    if (closeModalBtn && modal) {
        closeModalBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            console.log('Closing 3D drink builder modal...');
            modal.style.display = 'none';
            cleanup3DScene();
        });
    }
    
    // Close modal when clicking outside
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
                cleanup3DScene();
            }
        });
    }
    
    // Setup step navigation
    const prevBtn = document.getElementById('prev-step');
    const nextBtn = document.getElementById('next-step');
    const addBtn = document.getElementById('add-to-cart-final');
    
    if (prevBtn) prevBtn.addEventListener('click', handlePrevStep);
    if (nextBtn) nextBtn.addEventListener('click', handleNextStep);
    if (addBtn) addBtn.addEventListener('click', addCustomDrinkToCart);
    
    // Setup rotation controls
    const rotateLeft = document.getElementById('rotate-left');
    const rotateRight = document.getElementById('rotate-right');
    const toggleRotation = document.getElementById('toggle-rotation');
    
    if (rotateLeft) {
        rotateLeft.addEventListener('click', () => {
            appState.threejs.isRotating = false;
            if (appState.threejs.cupModel) {
                appState.threejs.cupModel.rotation.y -= Math.PI / 8; // More precise rotation
            }
        });
    }
    
    if (rotateRight) {
        rotateRight.addEventListener('click', () => {
            appState.threejs.isRotating = false;
            if (appState.threejs.cupModel) {
                appState.threejs.cupModel.rotation.y += Math.PI / 8;
            }
        });
    }
    
    if (toggleRotation) {
        toggleRotation.addEventListener('click', () => {
            appState.threejs.isRotating = !appState.threejs.isRotating;
            toggleRotation.textContent = appState.threejs.isRotating ? '⏸️ Stop' : '▶️ Start';
            toggleRotation.title = appState.threejs.isRotating ? 'Stop Auto Rotation' : 'Start Auto Rotation';
        });
    }
    
    // Setup option selection
    setupOptionSelection();
}

function initThreeJS() {
    console.log('🔄 Initializing Three.js scene...');
    
    // Get canvas element
    const canvas = document.getElementById('drinkCanvas');
    if (!canvas) {
        console.error('❌ Canvas element not found!');
        return;
    }
    
    // Clean up any existing scene
    cleanup3DScene();
    
    // Show loading overlay
    showCanvasLoading(true);
    
    try {
        // Create scene with transparent background
        appState.threejs.scene = new THREE.Scene();
        appState.threejs.scene.background = new THREE.Color(0xf9f1e8);
        
        // Get canvas dimensions
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        
        console.log(`Canvas dimensions: ${width}x${height}`);
        
        // Create camera
        appState.threejs.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        appState.threejs.camera.position.set(0, 0.3, 4);
        appState.threejs.camera.lookAt(0, 0.3, 0);
        
        // Create renderer
        appState.threejs.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true,
            canvas: canvas,
            preserveDrawingBuffer: true
        });
        
        // Set renderer size to match canvas container
        appState.threejs.renderer.setSize(width, height, false);
        appState.threejs.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        appState.threejs.renderer.shadowMap.enabled = false;
        
        // Setup lights
        setupLights();
        
        // Create improved transparent cup
        createSimpleCup();
        
        // Try to load 3D model
        load3DModel();
        
        // Start animation loop
        animate();
        
        // Handle window resize
        window.addEventListener('resize', onWindowResize);
        
        console.log('✅ Three.js scene initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing Three.js:', error);
        showCanvasError('Failed to initialize 3D viewer');
    }
}

function setupLights() {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    appState.threejs.scene.add(ambientLight);
    
    // Main directional light
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.6);
    mainLight.position.set(2, 4, 3);
    mainLight.castShadow = false;
    appState.threejs.scene.add(mainLight);
    
    // Fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-2, 2, -2);
    fillLight.castShadow = false;
    appState.threejs.scene.add(fillLight);
    
    // Back light for rim lighting
    const backLight = new THREE.DirectionalLight(0xffffff, 0.2);
    backLight.position.set(0, 2, -3);
    appState.threejs.scene.add(backLight);
}

function createSimpleCup() {
    console.log('Creating improved transparent cup...');
    
    const group = new THREE.Group();
    group.position.set(0, 0, 0);
    
    // IMPROVED: Cup body with better transparency
    const cupGeometry = new THREE.CylinderGeometry(0.5, 0.45, 1.2, 32);
    const cupMaterial = new THREE.MeshPhysicalMaterial({ 
        color: 0xF5F5F5,
        roughness: 0.05,
        metalness: 0.3,
        transparent: true,
        opacity: 0.25,           // More transparent
        transmission: 0.8,       // Glass-like transmission
        thickness: 0.05,
        side: THREE.DoubleSide,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05
    });
    
    const cup = new THREE.Mesh(cupGeometry, cupMaterial);
    cup.castShadow = false;
    cup.receiveShadow = false;
    cup.userData = { isCup: true };
    group.add(cup);
    
    // Create initial liquid
    createLiquidForCup();
    
    // Handle
    const handleGeometry = new THREE.TorusGeometry(0.2, 0.04, 16, 100, Math.PI);
    const handleMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x5d4037,
        roughness: 0.3,
        metalness: 0.5
    });
    
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.x = 0.5;
    handle.position.y = 0;
    handle.rotation.z = Math.PI / 2;
    handle.castShadow = false;
    handle.userData = { isHandle: true };
    group.add(handle);
    
    // Base plate
    const baseGeometry = new THREE.CylinderGeometry(0.55, 0.55, 0.05, 32);
    const baseMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B7355,
        roughness: 0.5,
        metalness: 0.2
    });
    
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -0.625;
    base.castShadow = false;
    group.add(base);
    
    appState.threejs.cupModel = group;
    appState.threejs.scene.add(appState.threejs.cupModel);
    
    // Hide loading overlay
    showCanvasLoading(false);
}

function createLiquidForCup() {
    if (!appState.threejs.cupModel) return;
    
    // Remove existing liquid if any
    if (appState.threejs.liquidMesh) {
        appState.threejs.cupModel.remove(appState.threejs.liquidMesh);
    }
    
    // LIQUID DIMENSIONS - Adjusted to fit inside the cup properly
    // Slightly smaller than cup to show glass thickness
    const liquidGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.4, 32);
    
    // Base drink color (will be updated in applyCustomization)
    let drinkColor = CONFIG.DRINK_COLORS[drinkBuilderState.selectedType] || 0x8B4513;
    
    const liquidMaterial = new THREE.MeshPhysicalMaterial({ 
        color: drinkColor,
        roughness: 0.1,
        metalness: 0.05,
        transparent: true,
        opacity: 0.95,           // More opaque liquid
        transmission: 0.1,       // Slight transmission for depth
        thickness: 0.1
    });
    
    const liquid = new THREE.Mesh(liquidGeometry, liquidMaterial);
    liquid.position.y = -0.01;    // Positioned inside cup
    liquid.castShadow = false;
    liquid.receiveShadow = false;
    liquid.userData = { isLiquid: true };
    
    appState.threejs.liquidMesh = liquid;
    appState.threejs.cupModel.add(appState.threejs.liquidMesh);
}

function load3DModel() {
    if (!THREE.GLTFLoader) {
        console.warn('⚠️ GLTFLoader not available, using simple cup');
        showCanvasLoading(false);
        return;
    }

    const loader = new THREE.GLTFLoader();
    const modelPath = CONFIG.MODEL_PATHS.cup || 'models/ikea_glass.glb';

    console.log(`📦 Loading 3D model from: ${modelPath}`);

    loader.load(
        modelPath,
        // ✅ SUCCESS
        (gltf) => {
            console.log('✅ 3D Model loaded successfully');

            // Remove existing cup model if any
            if (appState.threejs.cupModel) {
                appState.threejs.scene.remove(appState.threejs.cupModel);
                appState.threejs.cupModel.traverse(obj => {
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) {
                        if (Array.isArray(obj.material)) {
                            obj.material.forEach(m => m.dispose());
                        } else {
                            obj.material.dispose();
                        }
                    }
                });
            }

            // Store model
            appState.threejs.cupModel = gltf.scene;

            // Configure materials for transparency
            configureCupModel(appState.threejs.cupModel);

            // Add to scene
            appState.threejs.scene.add(appState.threejs.cupModel);

            // Create liquid after model is positioned
            createLiquidForCup();

            // Apply user customization
            applyCustomization();

            // Hide loading overlay
            showCanvasLoading(false);
        },
        // 📊 PROGRESS
        (progress) => {
            if (progress.total) {
                const percent = ((progress.loaded / progress.total) * 100).toFixed(1);
                console.log(`⏳ Loading model: ${percent}%`);
            }
        },
        // ❌ ERROR
        (error) => {
            console.error('❌ Error loading 3D model:', error);
            showCanvasLoading(false);
            // Show error but keep the simple cup visible
        }
    );
}

function configureCupModel(cupModel) {
    const box = new THREE.Box3().setFromObject(cupModel);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Center model at origin
    cupModel.position.sub(center);

    // Scale model to a nice size
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1.6 / maxDim;
    cupModel.scale.setScalar(scale);

    // Slight rotation for aesthetics
    cupModel.rotation.y = Math.PI / 6;

    // Auto-position camera
    const camera = appState.threejs.camera;
    const fov = camera.fov * (Math.PI / 180);
    const distance = (maxDim * scale) / (2 * Math.tan(fov / 2));

    camera.position.set(0, 2, distance * 1.7);
    camera.lookAt(0, 0.1, 0);

    // Update clipping planes
    camera.near = distance / 10;
    camera.far = distance * 10;
    camera.updateProjectionMatrix();

    // Make cup materials transparent
    cupModel.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
            
            // If this is the cup material, make it transparent
            if (child.material && (child.name.toLowerCase().includes('cup') || 
                                   child.name.toLowerCase().includes('glass') ||
                                   child.material.name.toLowerCase().includes('glass'))) {
                child.material.transparent = true;
                child.material.opacity = 0.3;
                child.material.transmission = 0.8;
                child.material.roughness = 0.1;
                child.material.metalness = 0.3;
            }
        }
    });
}

function applyCustomization() {
    if (!appState.threejs.cupModel || !appState.threejs.liquidMesh) return;
    
    console.log('Applying customization:', drinkBuilderState);
    
    // Update liquid color based on selections
    let finalColor = CONFIG.DRINK_COLORS[drinkBuilderState.selectedType] || 0x8B4513;
    
    // Adjust for milk type (lighten the color)
    if (drinkBuilderState.selectedMilk && drinkBuilderState.selectedMilk !== 'none') {
        const milkColor = CONFIG.MILK_COLORS[drinkBuilderState.selectedMilk] || 0xF5F5DC;
        finalColor = mixColors(finalColor, milkColor, 0.5); // More milk influence
    }
    
    // Adjust for flavor (tint the color)
    if (drinkBuilderState.selectedFlavor && drinkBuilderState.selectedFlavor !== 'none') {
        const flavorColor = CONFIG.FLAVOR_COLORS[drinkBuilderState.selectedFlavor];
        if (flavorColor) {
            finalColor = mixColors(finalColor, flavorColor, 0.4); // Flavor tint
        }
    }
    
    // Apply color to liquid
    appState.threejs.liquidMesh.material.color.setHex(finalColor);
    appState.threejs.liquidMesh.material.needsUpdate = true;
    
    // Handle toppings
    updateTopping();
    
    // Update price display
    updatePrice();
}

function updateTopping() {
    // Remove existing topping
    if (appState.threejs.toppingMesh) {
        appState.threejs.cupModel.remove(appState.threejs.toppingMesh);
        appState.threejs.toppingMesh = null;
    }
    
    if (!drinkBuilderState.selectedTopping || drinkBuilderState.selectedTopping === 'none') {
        return;
    }
    
    const toppingEffect = CONFIG.TOPPING_EFFECTS[drinkBuilderState.selectedTopping];
    if (!toppingEffect) return;
    
    let toppingMesh;
    
    switch (toppingEffect.type) {
        case 'foam':
            const foamHeight = toppingEffect.height || 0.40;  // taller
            const foamRadius = toppingEffect.radius || 0.45;

            // Hemisphere geometry
            const foamGeometry = new THREE.SphereGeometry(
            foamRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2
        );
            const foamMaterial = new THREE.MeshStandardMaterial({ 
            color: toppingEffect.color || 0xFFFFFF,
            roughness: 0.7,
            metalness: 0.0
        });

            const foamMesh = new THREE.Mesh(foamGeometry, foamMaterial);
            foamMesh.scale.y = foamHeight / foamRadius; // vertical height

            const foamGroup = new THREE.Group();
            foamGroup.add(foamMesh);

            // Shrink horizontally
            foamGroup.scale.x = 0.3;
            foamGroup.scale.z = 0.3;

            // Position above liquid
            foamGroup.position.y = 0.22;  

            toppingMesh = foamGroup;
            break;
            
        case 'drizzle':
            // Create drizzle effect - IMPROVED SIZING
            const drizzleCount = toppingEffect.count || 5;
            const drizzleGroup = new THREE.Group();
            
            // Create multiple drizzle lines
            for (let i = 0; i < drizzleCount; i++) {
                const drizzleHeight = 0.15 + Math.random() * 0.1;
                const drizzleGeometry = new THREE.CylinderGeometry(0.008, 0.008, drizzleHeight, 6);
                const drizzleMaterial = new THREE.MeshStandardMaterial({ 
                    color: toppingEffect.color || 0x5D4037,
                    roughness: 0.3,
                    metalness: 0.1
                });
                
                const drizzle = new THREE.Mesh(drizzleGeometry, drizzleMaterial);
                
                // Position drizzle on top of drink
                const angle = (i / drizzleCount) * Math.PI * 2;
                const radius = 0.01 * (0.8 + Math.random() * 0.4);
                
                drizzle.position.x = Math.cos(angle) * radius;
                drizzle.position.y = 0.17 + Math.random() * 0.05;
                drizzle.position.z = Math.sin(angle) * radius;
                
                // Tilt drizzle slightly
                drizzle.rotation.x = Math.PI / 2;
                drizzle.rotation.z = angle + (Math.random() - 0.5) * 0.5;
                
                drizzleGroup.add(drizzle);
            }
            
            toppingMesh = drizzleGroup;
            break;
            
        case 'sprinkle':
            // Create sprinkle particles - IMPROVED SIZING
            const sprinkleCount = toppingEffect.count || 20;
            const sprinkleGroup = new THREE.Group();
            const sprinkleGeometry = new THREE.SphereGeometry(0.01, 6, 6);
            const sprinkleMaterial = new THREE.MeshStandardMaterial({ 
                color: toppingEffect.color || 0xD2691E,
                roughness: 0.8,
                metalness: 0.1
            });
            
            // Create multiple sprinkle particles
            for (let i = 0; i < sprinkleCount; i++) {
                const sprinkle = new THREE.Mesh(sprinkleGeometry, sprinkleMaterial);
                
                // Position sprinkles on top of foam/drink
                sprinkle.position.set(
                    (Math.random() - 0.5) * 0.2,
                    0.17 + Math.random() * 0.02,
                    (Math.random() - 0.5) * 0.2
                );
                
                // Random rotation for visual variety
                sprinkle.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );
                
                sprinkleGroup.add(sprinkle);
            }
            
            toppingMesh = sprinkleGroup;
            break;
    }
    
    if (toppingMesh) {
        toppingMesh.castShadow = false;
        toppingMesh.receiveShadow = false;
        appState.threejs.toppingMesh = toppingMesh;
        appState.threejs.cupModel.add(toppingMesh);
    }
}

function mixColors(color1, color2, ratio) {
    const r1 = (color1 >> 16) & 0xFF;
    const g1 = (color1 >> 8) & 0xFF;
    const b1 = color1 & 0xFF;
    
    const r2 = (color2 >> 16) & 0xFF;
    const g2 = (color2 >> 8) & 0xFF;
    const b2 = color2 & 0xFF;
    
    const r = Math.floor(r1 * (1 - ratio) + r2 * ratio);
    const g = Math.floor(g1 * (1 - ratio) + g2 * ratio);
    const b = Math.floor(b1 * (1 - ratio) + b2 * ratio);
    
    return (r << 16) | (g << 8) | b;
}

function animate() {
    if (!appState.threejs.renderer || !appState.threejs.scene || !appState.threejs.camera) {
        return;
    }
    
    appState.threejs.animationId = requestAnimationFrame(animate);
    
    // Auto-rotate if enabled
    if (appState.threejs.isRotating && appState.threejs.cupModel) {
        appState.threejs.cupModel.rotation.y += appState.threejs.rotationSpeed;
    }
    
    appState.threejs.renderer.render(appState.threejs.scene, appState.threejs.camera);
}

function onWindowResize() {
    const canvas = document.getElementById('drinkCanvas');
    if (!canvas || !appState.threejs.camera || !appState.threejs.renderer) return;
    
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    
    appState.threejs.camera.aspect = width / height;
    appState.threejs.camera.updateProjectionMatrix();
    appState.threejs.renderer.setSize(width, height, false);
}

function cleanup3DScene() {
    console.log('🧹 Cleaning up 3D scene...');
    
    // Stop animation loop
    if (appState.threejs.animationId) {
        cancelAnimationFrame(appState.threejs.animationId);
        appState.threejs.animationId = null;
    }
    
    // Dispose of renderer
    if (appState.threejs.renderer) {
        appState.threejs.renderer.dispose();
        appState.threejs.renderer.forceContextLoss();
        appState.threejs.renderer = null;
    }
    
    // Clear scene
    if (appState.threejs.scene) {
        // Dispose of geometries and materials
        appState.threejs.scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        appState.threejs.scene = null;
    }
    
    // Reset state
    appState.threejs.camera = null;
    appState.threejs.cupModel = null;
    appState.threejs.liquidMesh = null;
    appState.threejs.toppingMesh = null;
    appState.threejs.isRotating = true;
}

function showCanvasLoading(show) {
    const canvas = document.getElementById('drinkCanvas');
    if (!canvas) return;
    
    // Remove existing overlay
    const existingOverlay = canvas.parentElement.querySelector('.canvas-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    if (show) {
        const overlay = document.createElement('div');
        overlay.className = 'canvas-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading 3D Viewer...</div>
        `;
        canvas.parentElement.appendChild(overlay);
    }
}

function showCanvasError(message) {
    const canvas = document.getElementById('drinkCanvas');
    if (!canvas) return;
    
    // Remove existing overlay
    const existingOverlay = canvas.parentElement.querySelector('.canvas-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'canvas-overlay';
    overlay.innerHTML = `
        <div style="color: #d9534f; font-size: 24px; margin-bottom: 10px;">⚠️</div>
        <div class="loading-text" style="color: #d9534f;">${message}</div>
        <button onclick="createSimpleCup(); this.parentElement.remove();" 
                style="margin-top: 15px; padding: 8px 16px; background: #9C6644; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Use Simple Cup
        </button>
    `;
    canvas.parentElement.appendChild(overlay);
}

// =============================================
// DRINK BUILDER UI FUNCTIONS
// =============================================

function resetSelections() {
    drinkBuilderState.selectedType = null;
    drinkBuilderState.selectedMilk = null;
    drinkBuilderState.selectedFlavor = null;
    drinkBuilderState.selectedTopping = null;
    drinkBuilderState.currentStep = 1;
    
    // Reset UI
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    
    const firstStep = document.querySelector(`.step[data-step="1"]`);
    if (firstStep) firstStep.classList.add('active');
    
    document.querySelectorAll('.step-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const firstContent = document.getElementById('step-1');
    if (firstContent) firstContent.classList.add('active');
    
    // Update navigation buttons
    const prevBtn = document.getElementById('prev-step');
    const nextBtn = document.getElementById('next-step');
    const addBtn = document.getElementById('add-to-cart-final');
    
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.style.display = 'block';
    if (addBtn) addBtn.style.display = 'none';
    
    // Clear selection highlights
    document.querySelectorAll('.drinktype-option, .milk-option, .flavor-option, .topping-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Update selection display
    updateSelectionDisplay();
}

function setupOptionSelection() {
    // Drink type options
    const drinkTypeOptions = document.querySelectorAll('.drinktype-option');
    drinkTypeOptions.forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.drinktype-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            drinkBuilderState.selectedType = option.dataset.type;
            updateSelectionDisplay();
            
            // Create liquid if not exists, or recreate with new type
            if (!appState.threejs.liquidMesh) {
                createLiquidForCup();
            }
            applyCustomization();
        });
    });
    
    // Milk options
    const milkOptions = document.querySelectorAll('.milk-option');
    milkOptions.forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.milk-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            drinkBuilderState.selectedMilk = option.dataset.milk;
            updateSelectionDisplay();
            applyCustomization();
        });
    });
    
    // Flavor options
    const flavorOptions = document.querySelectorAll('.flavor-option');
    flavorOptions.forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.flavor-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            drinkBuilderState.selectedFlavor = option.dataset.flavor;
            updateSelectionDisplay();
            applyCustomization();
        });
    });
    
    // Topping options
    const toppingOptions = document.querySelectorAll('.topping-option');
    toppingOptions.forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.topping-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            drinkBuilderState.selectedTopping = option.dataset.topping;
            updateSelectionDisplay();
            applyCustomization();
        });
    });
}

function updateSelectionDisplay() {
    const typeDisplay = document.getElementById('selected-type');
    const milkDisplay = document.getElementById('selected-milk');
    const flavorDisplay = document.getElementById('selected-flavor');
    const toppingDisplay = document.getElementById('selected-topping');
    const priceDisplay = document.getElementById('custom-drink-price');
    
    if (typeDisplay) {
        typeDisplay.textContent = drinkBuilderState.selectedType ? 
            drinkBuilderState.selectedType.charAt(0).toUpperCase() + drinkBuilderState.selectedType.slice(1) : 'Not selected';
    }
    
    if (milkDisplay) {
        milkDisplay.textContent = drinkBuilderState.selectedMilk ? 
            drinkBuilderState.selectedMilk.charAt(0).toUpperCase() + drinkBuilderState.selectedMilk.slice(1) : 
            (drinkBuilderState.selectedType === 'americano' ? 'Not needed' : 'Not selected');
    }
    
    if (flavorDisplay) {
        flavorDisplay.textContent = drinkBuilderState.selectedFlavor ? 
            (drinkBuilderState.selectedFlavor === 'none' ? 'None' : 
             drinkBuilderState.selectedFlavor.charAt(0).toUpperCase() + drinkBuilderState.selectedFlavor.slice(1)) : 'Not selected';
    }
    
    if (toppingDisplay) {
        toppingDisplay.textContent = drinkBuilderState.selectedTopping ? 
            (drinkBuilderState.selectedTopping === 'none' ? 'None' : 
             drinkBuilderState.selectedTopping.charAt(0).toUpperCase() + drinkBuilderState.selectedTopping.slice(1)) : 'Not selected';
    }
    
    // Update price
    updatePrice();
}

function updatePrice() {
    let price = 0;
    
    if (drinkBuilderState.selectedType && CONFIG.PRICES[drinkBuilderState.selectedType]) {
        price = CONFIG.PRICES[drinkBuilderState.selectedType];
    } else {
        price = 5.99; // Default price
    }
    
    // Add milk price if not whole milk
    if (drinkBuilderState.selectedMilk && drinkBuilderState.selectedMilk !== 'whole' && 
        CONFIG.PRICES[drinkBuilderState.selectedMilk]) {
        price += CONFIG.PRICES[drinkBuilderState.selectedMilk];
    }
    
    // Add flavor price if selected and not 'none'
    if (drinkBuilderState.selectedFlavor && drinkBuilderState.selectedFlavor !== 'none' && 
        CONFIG.PRICES[drinkBuilderState.selectedFlavor]) {
        price += CONFIG.PRICES[drinkBuilderState.selectedFlavor];
    }
    
    // Add topping price if selected and not 'none'
    if (drinkBuilderState.selectedTopping && drinkBuilderState.selectedTopping !== 'none' && 
        CONFIG.PRICES[drinkBuilderState.selectedTopping]) {
        price += CONFIG.PRICES[drinkBuilderState.selectedTopping];
    }
    
    const priceDisplay = document.getElementById('custom-drink-price');
    if (priceDisplay) {
        priceDisplay.textContent = price.toFixed(2);
    }
    
    // Store in app state
    appState.config.price = price;
}

function handlePrevStep() {
    if (drinkBuilderState.currentStep > 1) {
        drinkBuilderState.currentStep--;
        updateStepUI();
    }
}

function handleNextStep() {
    if (drinkBuilderState.currentStep < 3) {
        // Validate current step before proceeding
        if (drinkBuilderState.currentStep === 1 && !drinkBuilderState.selectedType) {
            alert('Please select a drink type first!');
            return;
        }
        
        if (drinkBuilderState.currentStep === 2 && !drinkBuilderState.selectedMilk && 
            drinkBuilderState.selectedType !== 'americano') {
            alert('Please select a milk type!');
            return;
        }
        
        drinkBuilderState.currentStep++;
        updateStepUI();
    }
}

function updateStepUI() {
    // Update progress steps
    document.querySelectorAll('.step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.toggle('active', stepNum === drinkBuilderState.currentStep);
    });
    
    // Update step content
    document.querySelectorAll('.step-content').forEach(content => {
        const contentId = content.id;
        const contentStep = parseInt(contentId.split('-')[1]);
        content.classList.toggle('active', contentStep === drinkBuilderState.currentStep);
    });
    
    // Update navigation buttons
    const prevBtn = document.getElementById('prev-step');
    const nextBtn = document.getElementById('next-step');
    const addToCartBtn = document.getElementById('add-to-cart-final');
    
    if (prevBtn) prevBtn.disabled = drinkBuilderState.currentStep === 1;
    
    if (drinkBuilderState.currentStep === 3) {
        if (nextBtn) nextBtn.style.display = 'none';
        if (addToCartBtn) addToCartBtn.style.display = 'block';
    } else {
        if (nextBtn) nextBtn.style.display = 'block';
        if (addToCartBtn) addToCartBtn.style.display = 'none';
    }
}

function addCustomDrinkToCart() {
    if (!drinkBuilderState.selectedType) {
        alert('Please select a drink type first!');
        return;
    }
    
    if (!drinkBuilderState.selectedMilk && drinkBuilderState.selectedType !== 'americano') {
        alert('Please select a milk type!');
        return;
    }
    
    // Create a unique name for the custom drink
    const drinkName = `Custom ${drinkBuilderState.selectedType.charAt(0).toUpperCase() + drinkBuilderState.selectedType.slice(1)}`;
    const priceElement = document.getElementById('custom-drink-price');
    const price = priceElement ? parseFloat(priceElement.textContent) : 5.99;
    
    // Create custom drink item
    const customItem = { 
        name: drinkName, 
        price: price, 
        quantity: 1,
        fasting: drinkBuilderState.selectedMilk === 'whole' ? "Non-Fasting (Milk)" : "Fasting (Alternative Milk)",
        sugar: "Normal",
        custom: true,
        type: drinkBuilderState.selectedType,
        milk: drinkBuilderState.selectedMilk || 'none',
        flavor: drinkBuilderState.selectedFlavor || 'none',
        topping: drinkBuilderState.selectedTopping || 'none'
    };
    
    // Get or create the cartData array
    if (typeof window.cartData === 'undefined') {
        window.cartData = [];
    }
    
    // Add the custom drink to the cart
    window.cartData.push(customItem);
    
    // Update the cart UI
    updateCartUI();
    
    // Close the custom drink modal
    const modal = document.getElementById('drinkModal');
    if (modal) modal.style.display = 'none';
    
    // Clean up 3D scene
    cleanup3DScene();
    
    // Show the cart sidebar
    const cart = document.getElementById("cart");
    if (cart) cart.classList.add("open");
    
    // Show success message
    alert('✅ Custom drink added to cart!');
}
// =============================================
// CART MANAGEMENT FUNCTIONS
// =============================================

function updateCartUI() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalDisplay = document.getElementById('total');
    const cartBadge = document.querySelector('.badge');
    
    if (!cartItemsContainer || !totalDisplay || !cartBadge || !window.cartData) {
        return;
    }
    
    // Clear current cart items
    cartItemsContainer.innerHTML = "";
    let total = 0;
    let count = 0;
    
    // Add all items to cart
    window.cartData.forEach((item, index) => {
        total += item.price * item.quantity;
        count += item.quantity;
        
        const div = document.createElement("div");
        div.className = "cart-item";
        div.style.display = "flex"; 
        div.style.width = "100%";
        
        // Check if it's a custom drink to show custom details
        const customDetails = item.custom ? 
            `<div style="color: #9C6644; font-size: 0.85rem; margin: 4px 0;">
                ${item.type.charAt(0).toUpperCase() + item.type.slice(1)} • 
                ${item.milk !== 'none' ? item.milk.charAt(0).toUpperCase() + item.milk.slice(1) + ' Milk' : 'No Milk'} • 
                ${item.flavor !== 'none' ? item.flavor.charAt(0).toUpperCase() + item.flavor.slice(1) : 'No Flavor'} • 
                ${item.topping === 'none' ? 'No Topping' : item.topping.charAt(0).toUpperCase() + item.topping.slice(1)}
            </div>` : 
            `<div style="color: #9C6644; font-size: 0.85rem; margin: 4px 0;">
                ${item.fasting} • ${item.sugar}
            </div>`;
        
        div.innerHTML = `
            <div class="item-info" style="flex: 1;">
                <strong style="text-transform: capitalize; font-family: 'Inter', sans-serif;">${item.name}</strong>
                ${customDetails}
                <small style="color: #5d4037;">${item.quantity} x $${item.price.toFixed(2)}</small>
            </div>
            <div style="text-align: right; min-width: 80px;">
                <div style="font-weight: 800; color: #5d4037; margin-bottom: 8px;">$${(item.price * item.quantity).toFixed(2)}</div>
                <button class="remove-btn" onclick="removeCartItem(${index})">Remove</button>
            </div>
        `;
        cartItemsContainer.appendChild(div);
    });
    
    // Update total and badge
    totalDisplay.textContent = total.toFixed(2);
    cartBadge.textContent = count;
}

window.removeCartItem = function(index) {
    if (window.cartData && window.cartData.length > index) {
        window.cartData.splice(index, 1);
        updateCartUI();
    }
};

// Make sure updateCartUI is globally accessible
window.updateCartUI = updateCartUI;

// Make createSimpleCup accessible from error overlay
window.createSimpleCup = createSimpleCup;

// Helper function to update price elements
function updatePriceElement(element, price) {
    // Update price tag in the same card
    const priceTag = element.closest('.drink-card, .featured-card')?.querySelector('.price-tag');
    if (priceTag) {
        priceTag.textContent = `$${parseFloat(price).toFixed(0)}`;
    }
    
    // Update data-price attribute on buttons
    if (element.hasAttribute('data-price')) {
        element.setAttribute('data-price', parseFloat(price).toFixed(0));
    }
}

// Helper function to update card price
function updateCardPrice(card, price) {
    const priceTag = card.querySelector('.price-tag');
    const button = card.querySelector('[data-name]');
    
    if (priceTag) {
        priceTag.textContent = `$${parseFloat(price).toFixed(0)}`;
        priceTag.removeAttribute('data-db-pending');
    }
    if (button) {
        button.setAttribute('data-price', parseFloat(price).toFixed(0));
    }
}

// Helper: set in-stock / out-of-stock state on card (from admin)
function setCardStockState(card, isAvailable) {
    const button = card.querySelector('.modern-add-btn, .featured-add-btn, [data-name]');
    if (!button) return;
    button.setAttribute('data-available', isAvailable);
    if (isAvailable === '0') {
        card.classList.add('out-of-stock');
        button.textContent = 'Out of stock';
        button.disabled = true;
    } else {
        card.classList.remove('out-of-stock');
        button.textContent = 'Add';
        button.disabled = false;
    }
}

// Load products from database and update prices dynamically
function getProductsApiUrl() {
    if (window.location.protocol === 'file:') return null;
    // Relative URL works on WAMP/XAMPP: same folder as current page
    return 'get_products.php';
}

async function loadProductsAndUpdatePrices() {
    function showError(msg, isWarning) {
        let el = document.getElementById('db-status-msg');
        if (!el) {
            el = document.createElement('div');
            el.id = 'db-status-msg';
            el.style.cssText = 'position:fixed;top:10px;right:10px;padding:12px 16px;max-width:320px;border-radius:8px;z-index:99999;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,0.25);';
            document.body.appendChild(el);
        }
        el.style.background = isWarning ? '#fff3cd' : '#f8d7da';
        el.style.border = '2px solid ' + (isWarning ? '#ffc107' : '#dc3545');
        el.style.color = '#333';
        el.innerHTML = msg;
        el.style.display = 'block';
    }

    try {
        const apiUrl = getProductsApiUrl();
        if (!apiUrl) {
            showError('⚠️ Open this page via a web server (e.g. <strong>http://localhost/aaaaaa/</strong>), not by double‑clicking the file. Prices load from the database.');
            return;
        }
        console.log('🔄 Fetching products from:', apiUrl);
        const response = await fetch(apiUrl + (apiUrl.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now());
        let products;
        try {
            products = await response.json();
        } catch (parseErr) {
            const text = await response.text().catch(() => '');
            if (!response.ok) {
                showError('get_products.php not found (HTTP ' + response.status + '). Open the site via <strong>http://localhost/yourfolder/</strong> where your files are.');
            } else {
                showError('Server returned invalid response. Check that get_products.php and db.php are in the same folder and PHP is running.');
            }
            console.error('Response was not JSON:', text.slice(0, 200));
            return;
        }

        if (!response.ok) {
            showError(products && products.error ? products.error : 'Server error ' + response.status);
            return;
        }

        if (products && products.error) {
            showError('Database: ' + products.error);
            console.error("❌", products.error);
            return;
        }

        if (!Array.isArray(products) || products.length === 0) {
            showError('No products in database. Run <strong>database_schema.sql</strong> in phpMyAdmin (database: maggs_coffee).');
            console.log('⚠️ No products found in database');
            return;
        }

        console.log(`📦 Found ${products.length} products in database:`, products);

        // Build availability map for out-of-stock check when user taps Add (handle string "0"/"1" from DB)
        window.productsByNormalizedName = {};
        products.forEach(p => {
            const norm = (p.name || '').toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
            if (norm) {
                window.productsByNormalizedName[norm] = { 
                    is_available: (p.is_available == 1 || p.is_available === '1') ? 1 : 0,
                    name: p.name,
                    price: p.price
                };
            }
        });
        console.log("📋 Products map:", window.productsByNormalizedName);
        
        let updatedCount = 0;
        
        // Update prices and availability for each product
        products.forEach(product => {
            // Normalize product name for matching (lowercase, remove spaces/special chars)
            const normalizedName = product.name.toLowerCase()
                .replace(/\s+/g, '')
                .replace(/[^a-z0-9]/g, '');
            const isAvailable = product.is_available == 1 ? '1' : '0';
            
            console.log(`🔍 Looking for: "${product.name}" (normalized: "${normalizedName}")`);
            
            let found = false;
            
            // Strategy 1: Match by h4 title text (most reliable - matches what user sees)
            const allCards = document.querySelectorAll('.drink-card');
            allCards.forEach(card => {
                const titleElement = card.querySelector('h4');
                if (titleElement) {
                    const cardTitle = titleElement.textContent.trim();
                    const normalizedCardTitle = cardTitle.toLowerCase()
                        .replace(/\s+/g, '')
                        .replace(/[^a-z0-9]/g, '');
                    
                    // Exact match only (no partial) so "Americano" doesn't match "Strawberry Americano", and "Espresso" doesn't match "Double Espresso"
                    if (normalizedName === normalizedCardTitle) {
                        console.log(`  ✓ Found exact match: "${cardTitle}" → Price: ${product.price}, Stock: ${isAvailable}`);
                        updateCardPrice(card, product.price);
                        setCardStockState(card, isAvailable);
                        updatedCount++;
                        found = true;
                    }
                    else if (product.name.toLowerCase().trim() === cardTitle.toLowerCase().trim()) {
                        console.log(`  ✓ Found direct text match: "${product.name}" = "${cardTitle}" → Price: ${product.price}, Stock: ${isAvailable}`);
                        updateCardPrice(card, product.price);
                        setCardStockState(card, isAvailable);
                        updatedCount++;
                        found = true;
                    }
                }
            });
            
            // Strategy 2: Find elements by exact data-name match (if not found by title)
            if (!found) {
                const exactMatch = document.querySelectorAll(`[data-name="${normalizedName}"]`);
                if (exactMatch.length > 0) {
                    console.log(`  ✓ Found ${exactMatch.length} match(es) by data-name`);
                    exactMatch.forEach(element => {
                        updatePriceElement(element, product.price);
                        element.setAttribute('data-available', isAvailable);
                        const card = element.closest('.drink-card, .featured-card');
                        if (card) setCardStockState(card, isAvailable);
                        updatedCount++;
                    });
                    found = true;
                }
            }
            
            // Strategy 3: Update featured section by title match
            const featuredCards = document.querySelectorAll('.featured-card');
            featuredCards.forEach(card => {
                const titleElement = card.querySelector('h3, h4');
                if (titleElement) {
                    const cardTitle = titleElement.textContent.trim().toLowerCase()
                        .replace(/\s+/g, '')
                        .replace(/[^a-z0-9]/g, '');
                    if (cardTitle && normalizedName === cardTitle) {
                        console.log(`  ✓ Found featured card match: "${titleElement.textContent}"`);
                        const priceElement = card.querySelector('.price');
                        if (priceElement) {
                            priceElement.textContent = `$${parseFloat(product.price).toFixed(0)}`;
                            priceElement.removeAttribute('data-db-pending');
                            updatedCount++;
                        }
                        setCardStockState(card, isAvailable);
                    }
                }
            });
            
            if (!found) {
                console.warn(`  ⚠️ No match found for "${product.name}" (normalized: "${normalizedName}")`);
                console.warn(`     Try checking if the HTML has a card with title matching "${product.name}"`);
            }
        });
        
        console.log(`✅ Updated ${updatedCount} price element(s) from database`);
        
        // Show status message
        let statusMsg = document.getElementById('db-status-msg');
        if (!statusMsg) {
            statusMsg = document.createElement('div');
            statusMsg.id = 'db-status-msg';
            statusMsg.style.cssText = 'position:fixed;top:10px;right:10px;padding:10px 15px;background:#fff;border:2px solid #9C6644;border-radius:8px;z-index:9999;font-size:12px;box-shadow:0 2px 10px rgba(0,0,0,0.2);';
            document.body.appendChild(statusMsg);
        }
        
        if (updatedCount === 0 && products.length > 0) {
            statusMsg.innerHTML = `⚠️ No products matched!<br>Check console (F12) for details.`;
            statusMsg.style.background = '#fff3cd';
            statusMsg.style.borderColor = '#ffc107';
            console.error("⚠️ WARNING: No products matched! Check product names in database match HTML card titles.");
            console.log("Sample DB product names:", products.slice(0, 5).map(p => p.name));
            console.log("Sample HTML titles:", Array.from(document.querySelectorAll('.drink-card h4')).slice(0, 5).map(h => h.textContent.trim()));
        } else if (updatedCount > 0) {
            statusMsg.innerHTML = `✅ Loaded ${updatedCount} products from database`;
            statusMsg.style.background = '#d4edda';
            statusMsg.style.borderColor = '#28a745';
            setTimeout(() => statusMsg.remove(), 3000);
        } else {
            statusMsg.innerHTML = `⚠️ No products in database`;
            statusMsg.style.background = '#fff3cd';
            statusMsg.style.borderColor = '#ffc107';
        }
    } catch (e) {
        console.error("❌ Error loading products:", e);
    }
}

// Make function globally accessible
window.loadProductsAndUpdatePrices = loadProductsAndUpdatePrices;

// Manual refresh function (call from browser console: loadProductsAndUpdatePrices())
console.log("💡 Tip: Open browser console (F12) and type: loadProductsAndUpdatePrices() to manually refresh prices from database");
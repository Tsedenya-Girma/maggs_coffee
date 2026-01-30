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
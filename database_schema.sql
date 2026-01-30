

-- ========== PRODUCTS ==========
CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(50),
    image_url VARCHAR(500),
    is_available TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== ORDERS ==========
CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_name VARCHAR(255) DEFAULT 'Guest Customer',
    items_json LONGTEXT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    order_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_status VARCHAR(50) DEFAULT 'Unpaid',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ========== USERS (for admin login later) ==========
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== INSERT PRODUCTS (run only once; if table already has data, skip or TRUNCATE products first) ==========
INSERT INTO products (name, description, price, category, image_url) VALUES
('Strawberry Latte', 'Fresh strawberry cream with espresso', 260.00, 'iced', 'images/strawberry latte.png'),
('Cinnamon Latte', 'Spiced cinnamon with creamy latte', 260.00, 'iced', 'images/cinnamon latte.png'),
('Caramel Latte', 'Rich caramel drizzle on smooth latte', 260.00, 'iced', 'images/caramel latte.png'),
('Vanilla Latte', 'Classic vanilla bean infused', 260.00, 'iced', 'images/vanilla latte.png'),
('Banana Bread Latte', 'Warm banana bread flavors', 260.00, 'iced', 'images/banana bread late .png'),
('Mocha Latte', 'Chocolate espresso delight', 260.00, 'iced', 'images/mocha latte.png'),
('Berry Latte', 'Creamy, bright berry bliss', 280.00, 'iced', 'images/berry latte.png'),
('Salted honey Latte', 'Rich latte, salted honey warmth', 260.00, 'iced', 'images/salted honey latte.png'),
('Strawberry Matcha', 'Sweet strawberry with premium matcha', 275.00, 'matcha', 'images/strawberry matcha.png'),
('Vanilla Matcha', 'Vanilla infused ceremonial grade', 275.00, 'matcha', 'images/vanilla matcha.png'),
('Caramel Matcha', 'Salted caramel matcha fusion', 275.00, 'matcha', 'images/caramel matcha.png'),
('Cinnamon Matcha', 'Spiced cinnamon twist', 275.00, 'matcha', 'images/cinnamon matcha.png'),
('Mocha Matcha', 'Chocolate matcha fusion', 275.00, 'matcha', 'images/mocha matcha.png'),
('Banana Bread Matcha', 'Toasty banana bread, creamy matcha', 275.00, 'matcha', 'images/banana bread matcha.png'),
('Berry Matcha', 'Vibrant berry-infused matcha latte', 295.00, 'matcha', 'images/berry matcha.png'),
('Salted Honey Matcha', 'Sweet honey, salty matcha finish', 275.00, 'matcha', 'images/salted honey matcha.png'),
('Strawberry Americano', 'Berry twist on classic americano', 200.00, 'americano', 'images/strawberry americano.png'),
('Caramel Americano', 'Caramel sweetness in bold coffee', 200.00, 'americano', 'images/caramel americano.png'),
('Vanilla Americano', 'Smooth vanilla infused', 200.00, 'americano', 'images/vanilla americano.png'),
('Cinnamon Americano', 'Iced americano with cinnamon spice', 200.00, 'americano', 'images/cinnamon americano.png'),
('Banana Bread Americano', 'Iced americano with cinnamon spice', 200.00, 'americano', 'images/banana bread americano.png'),
('Mocha Americano', 'Iced americano with mocha richness', 200.00, 'americano', 'images/mocha americano.png'),
('Berry Americano', 'Iced americano with Berry richness', 210.00, 'americano', 'images/berry americano.png'),
('Salted Honey Americano', 'Cool americano, salted honey finish', 200.00, 'americano', 'images/salted honey americano.png'),
('Espresso', 'Pure single shot', 80.00, 'hot', 'images/espresso.png'),
('Double Espresso', 'Double the shot double the energy', 120.00, 'hot', 'images/double espresso.png'),
('Latte', 'Creamy steamed milk with espresso', 140.00, 'hot', 'images/latte.png'),
('Cappuccino', 'Equal parts espresso, milk, foam', 130.00, 'hot', 'images/cappuccino.png'),
('Americano', 'Bold, smooth espresso with water', 100.00, 'hot', 'images/americano.png'),
('Mocha', 'Chocolate espresso delight', 160.00, 'hot', 'images/mocha.png'),
('White Mocha', 'Creamy white chocolate espresso delight', 170.00, 'hot', 'images/white mocha.png'),
('Flat White', 'Smooth microfoam perfection', 140.00, 'hot', 'images/flat white.png'),
('Macchiato', 'Espresso stained with milk', 110.00, 'hot', 'images/macchiato.png'),
('Penut Macchiato', 'Nutty espresso with creamy peanut notes', 190.00, 'hot', 'images/penut macchiato.png'),
('Hot Chocolate', 'Rich, creamy chocolate comfort drink', 210.00, 'hot', 'images/hot chocolata.png'),
('Milk', 'Fresh, creamy, wholesome milk', 170.00, 'hot', 'images/milk.png'),
('Avocado Smoothie', 'Creamy avocado with honey', 250.00, 'juice', 'images/Avocado Smoothie.png'),
('Strawberry Smoothie', 'Fresh strawberries & yogurt', 250.00, 'juice', 'images/strawberry smoothie.png'),
('Banana Smoothie', 'Creamy banana with almond milk', 250.00, 'juice', 'images/banana smoothie.png'),
('Papaya Smoothie', 'Creamy Papaya with honey', 250.00, 'juice', 'images/papaye smoothie.png'),
('Strawberry Mojito', 'Fresh mint & strawberry refreshment', 190.00, 'juice', 'images/strawberry mojito.png'),
('Classic Mojito', 'Traditional mint & lime', 170.00, 'juice', 'images/classic mojito.png'),
('Cinnamon Mojito', 'Traditional cinnamon & lime', 190.00, 'juice', 'images/cinnamon mojito.png'),
('Croissant', 'Buttery, flaky, golden French pastry', 193.00, 'snacks', 'images/croissant.png'),
('Muffin', 'Sweet, fluffy, bakery-fresh delight', 165.00, 'snacks', 'images/muffin.png'),
('Scone', 'Buttery, crumbly, lightly sweet pastry', 179.00, 'snacks', 'images/scone.png'),
('Banana Bread Slice', 'Moist, sweet, comforting banana loaf', 193.00, 'snacks', 'images/banana bread slice.png'),
('Cinnamon Roll', 'Warm, sticky, indulgent cinnamon delight', 220.00, 'snacks', 'images/cinnamon roll.png'),
('Cookie', 'Sweet, freshly baked classic cookie', 138.00, 'snacks', 'images/cookie.png'),
('Brownie', 'Rich, fudgy, chocolate indulgence', 193.00, 'snacks', 'images/brownie.png'),
('Granola Bar', 'Nutty, chewy, wholesome snack bar', 151.00, 'snacks', 'images/granola bar.png');

<?php
header('Content-Type: application/json; charset=utf-8');

// Always return JSON (no PHP notices/warnings as HTML)
if (!file_exists(__DIR__ . '/db.php')) {
    echo json_encode(["error" => "db.php not found. Place get_products.php in the same folder as db.php."]);
    exit;
}
require_once __DIR__ . '/db.php';

if (!isset($conn) || !$conn) {
    echo json_encode(["error" => "Database connection failed. Check db.php (database: maggs_coffee)."]);
    exit;
}

// One row per product name (dedupe: if INSERT was run multiple times, keep lowest id per name)
$query = "SELECT p.id, p.name, p.description, p.price, p.category, p.image_url, p.is_available
          FROM products p
          INNER JOIN (
            SELECT LOWER(TRIM(name)) AS n, MIN(id) AS mid FROM products GROUP BY LOWER(TRIM(name))
          ) x ON LOWER(TRIM(p.name)) = x.n AND p.id = x.mid
          ORDER BY p.category, p.name ASC";
$result = $conn->query($query);
$products = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $products[] = $row;
    }
    echo json_encode($products);
} else {
    $err = mysqli_error($conn);
    $hint = (strpos($err, "doesn't exist") !== false)
        ? " Run database_schema.sql in phpMyAdmin (database: maggs_coffee) to create the products table."
        : "";
    echo json_encode(["error" => $err . $hint]);
}
?>
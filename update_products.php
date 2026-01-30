<?php
header("Content-Type: application/json");
require_once 'db.php';

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
    echo json_encode(["success" => false, "error" => "Invalid JSON in request"]);
    exit;
}

if (!isset($data['id'])) {
    echo json_encode(["success" => false, "error" => "No ID provided"]);
    exit;
}

$id = intval($data['id']);

// Handle PRICE Update
if (isset($data['price'])) {
    $price = floatval($data['price']);
    $stmt = $conn->prepare("UPDATE products SET price = ? WHERE id = ?");
    $stmt->bind_param("di", $price, $id);

    if (!$stmt->execute()) {
        echo json_encode([
            "success" => false,
            "error" => mysqli_error($conn) ?: "Database update failed"
        ]);
        $stmt->close();
        exit;
    }

    $affected = $stmt->affected_rows;
    $stmt->close();

    if ($affected === 0) {
        echo json_encode([
            "success" => false,
            "error" => "No product found with that ID, or database table 'products' is empty. Run your SQL to create/seed the products table."
        ]);
        exit;
    }

    echo json_encode(["success" => true]);
    exit;
}

// Handle STOCK Update
if (isset($data['is_available'])) {
    $status = intval($data['is_available']);
    $stmt = $conn->prepare("UPDATE products SET is_available = ? WHERE id = ?");
    $stmt->bind_param("ii", $status, $id);

    if (!$stmt->execute()) {
        echo json_encode([
            "success" => false,
            "error" => mysqli_error($conn) ?: "Database update failed"
        ]);
        $stmt->close();
        exit;
    }

    $affected = $stmt->affected_rows;
    $stmt->close();

    if ($affected === 0) {
        echo json_encode([
            "success" => false,
            "error" => "No product found with that ID."
        ]);
        exit;
    }

    echo json_encode(["success" => true]);
    exit;
}

echo json_encode(["success" => false, "error" => "No price or is_available provided to update"]);
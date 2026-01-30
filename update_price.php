<?php
header('Content-Type: application/json');
require_once 'db.php';

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

if (isset($data['id']) && isset($data['price'])) {
    $id = intval($data['id']);
    $price = floatval($data['price']);
    $stmt = $conn->prepare("UPDATE products SET price = ? WHERE id = ?");
    $stmt->bind_param("di", $price, $id);
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Price updated!"]);
    } else {
        echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "Missing data"]);
}
?>
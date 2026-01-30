<?php
include 'db.php';
header('Content-Type: application/json');

$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    echo json_encode(["success" => false, "message" => "No data received"]);
    exit;
}

$items_json = json_encode($data['items']);
$total = $data['total'];
$customer = "Guest Customer";

// Match your SQL exactly: customer_name, items_json, total_amount
$sql = "INSERT INTO orders (customer_name, items_json, total_amount, status) VALUES (?, ?, ?, 'Pending')";
$stmt = $conn->prepare($sql);

if ($stmt) {
    $stmt->bind_param("ssd", $customer, $items_json, $total);
    if ($stmt->execute()) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false, "message" => "SQL Error: " . $stmt->error]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Prepare Error: " . $conn->error]);
}
?>
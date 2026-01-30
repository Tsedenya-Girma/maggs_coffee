<?php
include 'db.php';
$data = json_decode(file_get_contents('php://input'), true);
if (isset($data['id'])) {
    $stmt = $conn->prepare("UPDATE orders SET status = ? WHERE id = ?");
    $stmt->bind_param("si", $data['status'], $data['id']);
    if ($stmt->execute()) echo json_encode(["status" => "success"]);
}
?>
<?php
include 'db.php'; // Ensure your database connection is here

// Fetch all orders, but rename 'order_time' to 'time' so it matches the admin.js logic
$query = "SELECT id, customer_name, items_json, total_amount, status, order_time 
          FROM orders 
          ORDER BY id DESC";

$result = $conn->query($query);
$orders = [];

if ($result) {
    while($row = $result->fetch_assoc()) {
        // Convert the JSON string from the DB back into a list for the frontend
        $row['items'] = json_decode($row['items_json'], true); 
        $orders[] = $row;
    }
}

// Always return the data as JSON
header('Content-Type: application/json');
echo json_encode($orders);
?>
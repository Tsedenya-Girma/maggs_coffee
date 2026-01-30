<?php
header('Content-Type: application/json');
$conn = new mysqli("localhost", "root", "", "maggs_coffee");

if ($conn->connect_error) {
    die(json_encode(["success" => false, "message" => "Database connection failed"]));
}

$data = json_decode(file_get_contents("php://input"), true);
$action = $data['action']; // 'signup' or 'login'
$user = $data['username'];
$pass = $data['password'];

if ($action === 'signup') {
    // Hash password for security
    $hashed_pass = password_hash($pass, PASSWORD_DEFAULT);
    $stmt = $conn->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    $stmt->bind_param("ss", $user, $hashed_pass);
    
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Account created!"]);
    } else {
        echo json_encode(["success" => false, "message" => "Username already exists"]);
    }
} 

if ($action === 'login') {
    $stmt = $conn->prepare("SELECT password FROM users WHERE username = ?");
    $stmt->bind_param("s", $user);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        if (password_verify($pass, $row['password'])) {
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["success" => false, "message" => "Wrong password"]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "User not found"]);
    }
}
?>
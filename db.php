<?php
$conn = new mysqli("localhost", "root", "", "maggs_coffee");
if ($conn->connect_error) {
    header('Content-Type: application/json');
    die(json_encode(["success" => false, "message" => "Connect Error"]));
}
?>
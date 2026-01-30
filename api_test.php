<?php

header('Content-Type: text/html; charset=utf-8');
echo "<h1>API & DB Test (WAMP)</h1><pre>\n";

echo "1. PHP works: " . (defined('PHP_VERSION') ? 'YES (' . PHP_VERSION . ')' : 'NO') . "\n";

$dbOk = false;
$conn = null;
if (file_exists(__DIR__ . '/db.php')) {
    echo "2. db.php: FOUND\n";
    require_once __DIR__ . '/db.php';
    if (isset($conn) && $conn) {
        if ($conn->connect_error) {
            echo "3. Database connection: FAIL – " . $conn->connect_error . "\n";
            echo "   Fix: Create database 'maggs_coffee' in phpMyAdmin and run database_schema.sql\n";
        } else {
            echo "3. Database connection: OK (maggs_coffee)\n";
            $dbOk = true;
        }
    } else {
        echo "3. Database: \$conn not set (check db.php)\n";
    }
} else {
    echo "2. db.php: NOT FOUND in " . __DIR__ . "\n";
}

if ($dbOk && $conn) {
    $r = $conn->query("SELECT COUNT(*) as n FROM products");
    if ($r) {
        $row = $r->fetch_assoc();
        echo "4. Products table: OK – " . $row['n'] . " rows\n";
        if ($row['n'] == 0) {
            echo "   Fix: Run database_schema.sql in phpMyAdmin to insert products.\n";
        }
    } else {
        echo "4. Products table: FAIL – " . mysqli_error($conn) . "\n";
        echo "   Fix: Run database_schema.sql in phpMyAdmin (database: maggs_coffee).\n";
    }
}

echo "\n</pre><p><strong>If all above are OK</strong>, open <code>index.html</code> via the same URL base, e.g. <code>http://localhost/aaaaaa/</code> (not by double‑clicking the file).</p>";

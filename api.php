<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

function respond($statusCode, $payload){
  http_response_code($statusCode);
  echo json_encode($payload, JSON_UNESCAPED_UNICODE);
  exit;
}

$nid = isset($_GET['nationalId']) ? preg_replace('/[^0-9]/', '', $_GET['nationalId']) : '';
if(strlen($nid) !== 10){
  respond(400, [ 'success' => false, 'message' => 'رقم السجل المدني يجب أن يكون 10 أرقام' ]);
}

$file = __DIR__ . '/data.json';
if(!file_exists($file)){
  respond(500, [ 'success' => false, 'message' => 'ملف البيانات غير موجود' ]);
}

$json = file_get_contents($file);
$data = json_decode($json, true);
if(!is_array($data)){
  respond(500, [ 'success' => false, 'message' => 'تعذر قراءة البيانات' ]);
}

$found = null;
foreach($data as $row){
  if(isset($row['nationalId']) && $row['nationalId'] === $nid){
    $found = $row;
    break;
  }
}

if($found === null){
  respond(404, [ 'success' => false, 'message' => 'لا توجد بيانات للرقم المدني المدخل' ]);
}

respond(200, [ 'success' => true, 'data' => $found ]);

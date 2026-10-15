<?php

ini_set( 'display_errors', true );
error_reporting( E_ALL );
set_time_limit( 0 );

// Load IPB
require_once( '../../init.php' );
\IPS\Dispatcher\External::i();
	

// Check if the form has been submitted
if ($_SERVER["REQUEST_METHOD"] == "POST")
{
	// Retrieve the text from the form input
	$inputText = $_POST['inputText'];

	// Display the submitted text
	echo "<h3>You submitted:</h3>";
	echo "<p>" . htmlspecialchars($inputText) . "</p>";
	try
	{
		var_dump( \IPS\Http\Url::external( $inputText )->requestUntrusted(1, 5000)->get() );
	}
	catch( \Exception $e )
	{
		var_dump( $e );
	}

}

$url = htmlspecialchars($_SERVER["PHP_SELF"]);
$value = $_POST['inputText'] ?? '';

print <<<EOF
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Text Submission Form</title>
</head>
<body>
	<!-- Create a form that submits to itself -->
	<form action="$url" method="post">
		<label for="inputText">Enter text:</label>
		<input type="text" id="inputText" name="inputText" size=100 value="{$value}" required>
		<button type="submit">Submit</button>
	</form>
</body>
</html>
EOF;


exit();
<?php

ini_set( 'display_errors', true );
//error_reporting( E_ALL  );
set_time_limit( 0 );
// Load IPB
require_once( '../../init.php' );
\IPS\Dispatcher\External::i();
	
	
\IPS\Dispatcher::i()->controllerLocation = 'front';
\IPS\Member::loggedIn()->member_id = 0;
	
$tests = array();

/* --- Baseline --- */
$tests['Baseline: text/html, noCache not present, is guest, GET request, csrfKey not present'] = [
	'shouldcache' => true,
	'result' => \IPS\Output::i()->isCacheable( 'text/html', false )
];

/* --- JSON --- */
$tests['application/json'] = [
	'shouldcache' => false,
	'result' => \IPS\Output::i()->isCacheable( 'application/json', false )
];

/* --- POST --- */
$_SERVER['REQUEST_METHOD'] = 'POST';
$tests['post request'] = [
	'shouldcache' => false,
	'result' => \IPS\Output::i()->isCacheable( 'text/html', false )
];
$_SERVER['REQUEST_METHOD'] = 'GET';

/* --- CSRF KEY --- */
\IPS\Request::i()->csrfKey = md5( uniqid() );
$tests['csrfKey present'] = [
	'shouldcache' => false,
	'result' => \IPS\Output::i()->isCacheable( 'text/html', false )
];
unset( \IPS\Request::i()->csrfKey );
	
/* --- noCache cookie --- */
\IPS\Request::i()->cookie['noCache'] = md5( uniqid() );
$tests['noCache cookie present'] = [
	'shouldcache' => false,
	'result' => \IPS\Output::i()->isCacheable( 'text/html', false )
];
unset( \IPS\Request::i()->cookie['noCache'] );

/* --- setCacheTime(false) --- */
\IPS\Output::i()->setCacheTime( false );
$tests['setCacheTime(false)'] = [
	'shouldcache' => false,
	'result' => \IPS\Output::i()->isCacheable( 'text/html', false )
];

/* --- is logged in --- */
\IPS\Output::i()->setCacheTime( \IPS\DateTime::ts( time() + 86400, true ) );
\IPS\Member::loggedIn()->member_id = 1;
$tests['is logged in'] = [
	'shouldcache' => false,
	'result' => \IPS\Output::i()->isCacheable( 'text/html', false )
];
\IPS\Member::loggedIn()->member_id = 0;
/* Output the results */
header( "Content-Type: text/html");
print <<<EOF
<html>
 <title>Counter Tests</title>
 <style>
  * { font-family: sans-serif; }
  table { width: 100%; }
  td.msg, td.url { font-family: monospace; }
  tr.header { background-color: black; color: white; }
  td.app_header { background-color: #999999; color: white; }
  .info { padding: 12px 0px; }
 </style>
 <body>
 <table border=1 cellborder=1 cellpadding=4>
 <tr class='header'>
  <td>Test</td>
  <td>Should Cache</td>
  <td>isCacheable()</td>
 </tr>

EOF;

foreach ( $tests as $type => $test )
{
	$shouldcache = $test['shouldcache'] ? '<span style="color:green">Yes</span>' : '<span style="color:red">No</span>';
	$result = $test['result'] ? '<span style="color:green">Can Cache</span>' : '<span style="color:red">Cannot Cache</span>';

	print <<<EOF
<tr>
	<td class="message">{$type}</td>
	<td class="message">{$shouldcache}</td>
	<td class="passfail">{$result}</td>
</tr>

EOF;

}

print <<<EOF
</table>
</body>
</html>

EOF;

exit();



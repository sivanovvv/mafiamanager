<?php

ini_set( 'display_errors', true );
error_reporting( E_ALL );
set_time_limit( 0 );

// Load IPB
require_once( '../../init.php' );
\IPS\Dispatcher\External::i();
	
/* Lets do some tests */
$tests = [
	
	// These tests should be successful

	[ 'https://google.com', true, 'Normal domain name' ],
	[ 'https://mattmecham.com/test/redirect-good.php', true, 'Redirects to different page on same domain' ],
	[ 'https://mattmecham.com/test/html.php', true, 'Returns text/html content type' ],
	[ 'https://2001:db8:3333:4444:CCCC:DDDD:EEEE:FFFF', true, 'Public IPv6 IP address' ],
	[ 'https://157.240.247.35', true, 'Public IP address' ],
	[ 'http://faß.de', true, 'Unicode domain name' ],
	
	// These tests should fail
	
	[ 'https://mattmecham.com/test/redirect-bad.php', false, 'Redirects to a different domain' ],
	[ 'https://mattmecham.com/test/json.php', false, 'Returns application/json content type' ],
	[ 'https://1050:0000:0000:0000:0005:0600:300c:326b', false, 'Private IPv6 IP address' ],
	
	[ 'https://192.168.1.1', false, 'Private IPv4 IP address (192)' ],
	[ 'https://172.16.0.0', false, 'Private IPv4 IP address (172)' ],
	[ 'https://10.5.0.0', false, 'Private IPv4 IP address (10)' ],
	
	[ 'https://localhost', false, 'Localhost' ],
	[ 'https://mattcham.com:8888', false, 'Site with non-standard port' ],
	[ 'https://[::1]', false, 'IPv6 localhost IP address' ],
	[ 'https://127.0.0.1', false, 'IPv4 IP address' ],
	[ 'file:///etc/passwd', false, 'Not http(s)' ],
	[ 'http://[0:0:0:0:0:ffff:127.0.0.1]', false, 'IPv6 is square brackets' ],
	[ 'http://[fd00:ec2::254]/latest/meta-data/', false, 'AWS Meta data endpoint encoded as IPv6' ],
	[ '0://evil.com:80;http://google.com:80', false, 'Bypass filter_var() function'],
	
	[ 'http://0x7f.0x0.0x0.0x1', false, 'Hex domain name' ],
	[ 'http://0177.0.0.0x1', false, 'Mix of oct/hex/dec domain name' ],
	[ 'http://2130706433', false, 'Decimal IP location'],
	[ 'http://ⓔⓧⓐⓜⓟⓛⓔ.ⓒⓞⓜ', false, 'Bypass with enclosed alphanumerics' ],
	[ 'http://157.240.247.35:80\@127.2.2.2:80', false, 'Bypass weak parsing' ],
	[ 'http://make-127-0-0-1-rr.1u.ms', false, 'DNS redirection to 127.0.0.1'],
	[ 'http://make-cname-localhost-rr.1u.ms', false, 'CNAME redirection to localhost' ],
	[ 'ssrf.php?url=sftp://evil.com:80', false, 'URL in a query string' ],
	[ 'http://brutelogic.com.br/poc.svg', false, 'Javascript alert in an SVG' ],

		
];

header( "Content-Type: text/html");
print <<<EOF
<html>
 <title>SSRF Tests</title>
 <style>
  * { font-family: sans-serif; }
  td.msg, td.url { font-family: monospace; }
  tr.header { background-color: black; color: white; }
  .info { padding: 12px 0px; }
 </style>
 <body>
 <div class="info">Most of these tests are from <a href='https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Server%20Side%20Request%20Forgery/README.md'>https://github.com/swisskyrepo/PayloadsAllTheThings/</a>
 </div>
 <table border=1 cellborder=1 cellpadding=4>
 <tr class='header'>
  <td>Test URL</td>
  <td>Test</td>
  <td>Expected Result</td>
  <td>Actual Result</td>
  <td>Fail message</td>
 </tr>

EOF;
foreach( $tests as $test )
{
	$url = $test[0];
	$expectedOutcome = $test[1] ? '<span style="color:green">pass</span>' : '<span style="color:red">fail</span>';
	$comments = $test[2];
	$message = '';
	
	try
	{
		\IPS\Http\Url::external( $url )->requestUntrusted(1, 5000)->get();
		$outcome = '<span style="color:green">pass</span>';
	}
	catch( \Exception $e )
	{
		$outcome = '<span style="color:red">fail</span>';
		$message = $e->getMessage();
	}
	
	print <<<EOF
	<tr>
		<td class="url">{$url}</td>
		<td class="comment">{$comments}</td>
		<td class="expected">{$expectedOutcome}</td>
		<td class="result">{$outcome}</td>
		<td class="msg">{$message}</td>
	</tr>
	
EOF;
}

print <<<EOF
</table>
</body>
</html>

EOF;


exit();
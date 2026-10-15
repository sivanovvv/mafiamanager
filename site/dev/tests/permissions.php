<?php

use IPS\Db;
use IPS\Dispatcher;
use IPS\Dispatcher\External;
use IPS\forums\Topic;
use IPS\Member;
use IPS\Member\Group;

ini_set( 'display_errors', true );
set_time_limit( 0 );

/* Init framework */
require_once( '../../init.php' );
External::i();

$tests = array();

/* Get the lastest topic that is not locked, pinned or hidden */
$topic = Topic::load( Db::i()->select( 'tid', 'forums_topics', array( 'state=? AND pinned=0 and approved=1', 'open' ), 'last_post DESC', array( 0, 1 ) )->first() );

foreach( [ 'assign', 'view', 'view_hidden', 'reply', 'review', 'assign', 'edit', 'delete', 'move', 'merge', 'split', 'pin', 'unpin', 'lock', 'unlock', 'hide', 'share', 'solve', 'add',
			 'unhide', 'feature', 'publish', 'helpful', 'restore', 'onMessage', 'featureComment', 'unfeatureComment', 'toggleItemModeration', 'rate', 'react', 'unrecognize', 'recognize'  ] as $action )
{
	$tests[ "Permission: can( '{$action}' )" ] = $topic->can( $action );
}

header( "Content-Type: text/html");

$name = Member::loggedIn()->name;
$group = Group::load( Member::loggedIn()->member_group_id );
$groupName = Member::loggedIn()->language()->get( "core_group_{$group->g_id}" );

/* Output */
print <<<EOF
<html>
 <title>Permission Extension Tests</title>
 <style>
  * { font-family: sans-serif; }
  table { width: 100%; }
  td.msg, td.url { font-family: monospace; }
  tr.header { background-color: black; color: white; }
  td.app_header { background-color: #999999; color: white; }
  .info { padding: 12px 0px; }
 </style>
 <body>
 <h1>Logged in as {$name}; group {$groupName}</h1>
 <p>Testing against topic <a href="{$topic->url()}" target="_blank">{$topic->title}</a>. To check other members, log in as them on the community and reload this test.</p>
 <table border=1 cellborder=1 cellpadding=4>
 <tr class='header'>
  <td>Test</td>
  <td>can() result</td>
 </tr>

EOF;

foreach ( $tests as $type => $result )
{
	$result = $result ? '<span style="color:green">Yes</span>' : '<span style="color:red">No</span>';

	print <<<EOF
<tr>
	<td class="message">{$type}</td>
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



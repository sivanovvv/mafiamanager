<?php

use IPS\Dispatcher\External;
use IPS\Request;
use const IPS\CACHE_METHOD;
use const IPS\REDIS_ENABLED;
use const IPS\STORE_METHOD;

include '../init.php';

External::i();

header("Content-type: text/plain");

if ( isset( Request::i()->key ) )
{
	print_r( \IPS\Redis::i()->debugGetKeys( isset( Request::i()->key ) ? Request::i()->key . '*' : '*' ) );
}

$redis = NULL;
$info  = NULL;
$datasource  = array();

if ( CACHE_METHOD == 'Redis' or STORE_METHOD == 'Redis' )
{
	$info = \IPS\Redis::i()->info();

	$data = array( 'type' => 'redis_datastore', 'count' => NULL, 'enabled' => false );

	if ( STORE_METHOD == 'Redis' )
	{
		$data['enabled'] = true;

		/* Lets ensure we have in the cache */
		$data['count'] = count( \IPS\Redis::i()->debugGetKeys( \IPS\Redis::i()->get( 'redisKey_store' ) . '_str_*', TRUE ) );
	}

	$datasource[] = $data;

	$data = array( 'type' => 'redis_cache', 'count' => NULL, 'enabled' => false );

	if ( CACHE_METHOD == 'Redis' )
	{
		$data['enabled'] = true;

		/* Lets ensure we have something */
		$data['count'] = count( \IPS\Redis::i()->debugGetKeys( \IPS\Redis::i()->get( 'redisKey' ) . '_*', TRUE ) );
	}

	/* And now sessions */
	if ( CACHE_METHOD == 'Redis' and REDIS_ENABLED )
	{
		$datasource[] = array( 'type' => 'redis_sessions', 'count' => count( \IPS\Redis::i()->debugGetKeys( 'session_id_*', TRUE ) ), 'enabled' => true );
		$datasource[] = array( 'type' => 'redis_topic_views', 'count' => \IPS\Redis::i()->zCard('topic_views'), 'enabled' => true );
		$datasource[] = array( 'type' => 'redis_advert_impressions', 'count' => \IPS\Redis::i()->zCard('advert_impressions'), 'enabled' => true );
	}
	else
	{
		$datasource[] = array( 'type' => 'redis_sessions'   , 'count' => NULL, 'enabled' => false );
		$datasource[] = array( 'type' => 'redis_topic_views', 'count' => NULL, 'enabled' => false );
	}
}

print_r( $datasource );
print_r( $info );


exit();
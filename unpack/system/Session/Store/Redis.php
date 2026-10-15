<?php
/**
 * @brief		Redis Session Handler
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @package		Invision Community
 * @since		6 September 2017
 */

namespace IPS\Session\Store;

/* To prevent PHP errors (extending class does not exist) revealing path */

use IPS\Member;
use IPS\Member\Group;
use IPS\Redis as RedisClass;
use IPS\Session\Front;
use IPS\Session\Store;
use IPS\Settings;
use RedisException;
use function array_chunk;
use function array_slice;
use function count;
use function defined;
use function in_array;
use function is_array;
use function is_null;
use const IPS\TEXT_ENCRYPTION_KEY;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * Redis Session Handler
 */
class Redis extends Store
{
	/**
	 * @brief	Default expiration for keys in seconds
	 */
	static protected int $ttl = 1800; #30 mins

	/**
	 * Return the hash we will use to obfuscate the session ID
	 *
	 * @return string
	 */
	public static function getHash(): string
	{
		if ( TEXT_ENCRYPTION_KEY )
		{
			return TEXT_ENCRYPTION_KEY;
		}

		return Settings::i()->sql_pass;
	}
	
	/**
	 * Load the session from the storage engine 
	 *
	 * @param string $sessionId	Session ID
	 * @return	array|NULL
	 */
	public function loadSession( string $sessionId ): ?array
	{
		if ( $result = RedisClass::i()->hGetAll( static::_key( 'session_id_' . md5( $sessionId . static::getHash() ) ) ) )
		{
			try
			{
				return RedisClass::i()->decode( $result['data'] );
			}
			catch( RedisException $e ){}
		}
		
		return NULL;
	}
	
	/**
	 * Update the session storage engine
	 *
	 * @param array $data	Session data to store
	 * @return void
	 */
	public function updateSession( array $data ) : void
	{
		/* Groups are loaded into memory so this does not cause a query */
		$group = Group::load( $data['member_group'] );

		/* Update the specific session */
		RedisClass::i()->del( static::_key( 'session_id_' . md5( $data['id'] . static::getHash() ) ) );
		RedisClass::i()->hMSet( static::_key( 'session_id_' . md5( $data['id'] . static::getHash() ) ), array(
			'member_id'		=> $data['member_id'],
			'member_name'	=> $data['member_name'],
			'seo_name'		=> $data['seo_name'],
			'member_group'	=> $data['member_group'],
			'login_type'	=> $data['login_type'],
			'in_editor'	    => $data['in_editor'],
			'data' 			=> RedisClass::i()->encode( $data )
		), static::$ttl );
		
		/* Update the list of sessions for the online list [ microtime => sessionID ] */
		RedisClass::i()->zAdd( static::_key( 'session_map' ), time(), 'session_id_' . md5( $data['id'] . static::getHash() ), static::$ttl );
		
		/* Update users list */
		if ( $data['uagent_type'] == 'search' )
		{
			/* Make a unique row based on IP and user-agent to prevent multiple rows for each spider */
			RedisClass::i()->zAdd( static::_key( 'session_online_spiders' ), time(), md5( $data['ip_address'] . $data['browser'] ), static::$ttl );
		}
		else if ( $data['member_id'] )
		{
			RedisClass::i()->zAdd( static::_key( 'session_online_users' ), time(), $data['member_id'] . '__' . 'session_id_' . md5( $data['id'] . static::getHash() ), static::$ttl );
		}
		else
		{
			/* A guest may have one ip address but multiple devices, but we don't really need to track that */
			RedisClass::i()->zAdd( static::_key( 'session_online_guests' ), time(), md5( $data['ip_address'] ), static::$ttl );
		}
				
		/* Delete old items */
		if ( ! RedisClass::i()->get( static::_key( 'session_cleanup' ) ) )
		{
			/* Do a little clean up */
			RedisClass::i()->zRemRangeByScore( static::_key( 'session_map' ), 0, time() - static::$ttl );
			RedisClass::i()->zRemRangeByScore( static::_key( 'session_online_spiders' ), 0, time() - static::$ttl );
			RedisClass::i()->zRemRangeByScore( static::_key( 'session_online_users' ), 0, time() - static::$ttl );
			RedisClass::i()->zRemRangeByScore( static::_key( 'session_online_guests' ), 0, time() - static::$ttl );
			
			/* And do it again in 3ish mins */
			RedisClass::i()->setEx( static::_key( 'session_cleanup' ), 180, time() );
		}
	}
	
	/**
	 * Delete from the session engine
	 *
	 * @param string $sessionId	Session ID
	 * @return	void
	 */
	public function deleteSession( string $sessionId ) : void
	{
		$data = $this->loadSession( $sessionId );
		RedisClass::i()->del( static::_key( 'session_id_' . md5( $sessionId . static::getHash() ) ) );
		RedisClass::i()->zRem( static::_key( 'session_map' ), 'session_id_' . md5( $sessionId . static::getHash() ) );
		RedisClass::i()->zRem( static::_key( 'session_online_spiders' ), md5( $data['ip_address'] . $data['browser'] ) );
		RedisClass::i()->zRem( static::_key( 'session_online_users' ), $data['member_id'] . '__' . 'session_id_' . md5( $data['id'] . static::getHash() ) );
		RedisClass::i()->zRem( static::_key( 'session_online_guests' ), md5( $data['ip_address'] ) );
	}
	
	/**
	 * Delete from the session engine
	 *
	 * @param	int			$memberId	You can probably figure this out right?
	 * @param	string|NULL	$userAgent	User Agent [optional]
	 * @param	array|NULL	$keepSessionIds	Array of session ids to keep [optional]
	 * @return	void
	 */
	public function deleteByMember( int $memberId, string $userAgent=NULL, array $keepSessionIds=NULL ) : void
	{
		if ( ! is_array( $keepSessionIds ) and ! is_null( $keepSessionIds ) )
		{
			$keepSessionIds = array( $keepSessionIds );
		}
		
		$sessionMap = RedisClass::i()->zRange( static::_key( 'session_online_users' ), 0, -1 );

		foreach( $sessionMap as $index => $redisKey )
		{
			$key = explode( '__', $redisKey );
			$session = RedisClass::i()->hMGet( $key[1], array( 'data' ) );

			try
			{
				$sessionMap[ $index ] = RedisClass::i()->decode( $session['data'] );
			}
			catch( RedisException $e ){}
		}

		foreach( $sessionMap as $session )
		{
			/* SessionMap may not link to a valid session, remove if that is the case */
			if( !is_array( $session ) )
			{
				RedisClass::i()->zRem( static::_key( 'session_map' ), $session );
				continue;
			}

			$delete = false;
			if ( $session['member_id'] == $memberId )
			{
				$delete = true;
			}
			
			if ( $userAgent and $userAgent != $session['browser'] )
			{
				$delete = false;
			}
			  
			if ( $keepSessionIds and in_array( $session['id'], $keepSessionIds ) )
			{
				$delete = false;
			}
			
			if ( $delete )
			{
				$this->deleteSession( $session['id'] );
			}
		}
	}
	
	/**
	 * Fetch all active session keys
	 *
	 * @return	array of session IDs
	 */
	public function getSessionIds(): array
	{
		if ( $result = RedisClass::i()->zRangeByScore( static::_key( 'session_map' ), '-inf', '+inf', array( 'withscores' => false ) ) )
		{
			return $result;
		}
		
		return array();
	}
	
	/**
	 * Delete from the session engine
	 *
	 * @param int $memberId	You can probably figure this out right?
	 * @return	array|FALSE
	 */
	public function getLatestMemberSession( int $memberId ): array|FALSE
	{
		$redis = RedisClass::i()->zRevRangeByScore( static::_key( 'session_online_users' ), '+inf', '-inf', array('withscores' => FALSE, 'alpha' => TRUE ) );

		if( is_array( $redis ) )
		{
			foreach ( $redis as $data )
			{
				[ $id, $sessionKey ] = explode( '__', $data );

				if ( $id == $memberId )
				{
					if ( $result = RedisClass::i()->hGetAll( static::_key( $sessionKey ) ) )
					{
						try
						{
							return RedisClass::i()->decode( $result['data'] );
						}
						catch ( RedisException $e ) {}
					}
				}
			}
		}
		
		return FALSE;
	}
	
	/**
	 * Clear sessions - abstracted so it can be called externally without initiating a session
	 *
	 * @param int $timeout	Sessions older than the number of seconds provided will be deleted
	 * @return void
	 */
	public static function clearSessions( int $timeout ) : void
	{
		/* Remove the public facing items. This is only called by PHP's session gc so individual sessions do not need removing as they are cleaned by Redis' TTL */
		RedisClass::i()->zRemRangeByScore( static::_key( 'session_map' ), 0, time() - $timeout );
		RedisClass::i()->zRemRangeByScore( static::_key( 'session_online_spiders' ), 0, time() - $timeout );
		RedisClass::i()->zRemRangeByScore( static::_key( 'session_online_users' ), 0, time() - $timeout );
		RedisClass::i()->zRemRangeByScore( static::_key( 'session_online_guests' ), 0, time() - $timeout );
		RedisClass::i()->del( static::_key( 'session_onlinelist' ) );
	}
	
	/**
	 * Redis key
	 */
	protected static ?string $_redisKey = NULL;
	
	/**
	 * Returns a key to be stored with Redis
	 *
	 * @param string $key		Key suffix
	 * @return	string
	 */
	protected static function _key( string $key ): string
	{
		/* Only version the assembled online-list cache. We do not want to wipe session hashes if this key is invalid. */
		if ( $key == 'session_onlinelist' )
		{
			if ( !static::$_redisKey )
			{
				/* Last access ensures that the data is not stale if we fail back to MySQL and then go back to Redis later */
				if ( !( static::$_redisKey = RedisClass::i()->get( 'redisKey_session' ) ) OR ! RedisClass::i()->get( 'redisStore_lastAccess' ) )
				{
					static::$_redisKey = md5( mt_rand() );
					RedisClass::i()->setex( 'redisKey_session', 604800, static::$_redisKey );
					RedisClass::i()->setex( 'redisStore_lastAccess', ( 3 * 3600 ), time() );
				}
			}
	
			return static::$_redisKey . '_' . $key;
		}
		else
		{
			return $key;
		}
	}
	
	/**
	 * Resets the session key to force ignore any previous redis data stored
	 *
	 * @return	void
	 */
	protected static function resetKey() : void
	{
		static::$_redisKey = md5( mt_rand() );
		RedisClass::i()->setex( 'redisKey_session', 604800, static::$_redisKey );
	}
	
	/**
	 * Soft freshness for the assembled online list (seconds).
	 * Sessions are written on shutdown, so this must stay short enough that a
	 * member who arrived on a later request is picked up on the next page load.
	 */
	protected static int $onlineListFreshTtl = 30;

	/**
	 * Redis TTL for the assembled online list (seconds). Longer than freshness so waiters can use stale data while a rebuild runs.
	 */
	protected static int $onlineListHardTtl = 600;

	/**
	 * Rebuild lock TTL (seconds)
	 */
	protected static int $onlineListLockTtl = 15;

	/**
	 * Session hashes fetched per pipeline round-trip
	 */
	protected static int $onlineListPipelineChunk = 250;

	/**
	 * Max sessions to include when assembling the browsable online list
	 */
	protected static int $onlineListMaxSessions = 500;

	/**
	 * @var array|null  Assembled online user data for this request
	 */
	protected ?array $onlineUsers = null;
	
	/**
	 * Fetch all online users (but not spiders)
	 *
	 * @param int $flags				Bitwise flags
	 * @param string $sort				Sort direction
	 * @param array|null $limit				Limit [ offset, limit ]
	 * @param int|null $memberGroup		Limit by a specific member group ID
	 * @param boolean $showAnonymous		Show anonymously logged in peoples?
	 * @return array|int
	 */
	public function getOnlineUsers( int $flags=0, string $sort='desc', array $limit=NULL, int $memberGroup=NULL, bool $showAnonymous=FALSE ): array|int
	{
		/* Counts do not need session hashes; the user/guest ZSETs already track who is online */
		if ( ( $flags & static::ONLINE_COUNT_ONLY ) and ! $memberGroup )
		{
			try
			{
				return $this->countOnlineUsersFromZsets( $flags );
			}
			catch ( RedisException $e )
			{
				return 0;
			}
		}

		if( $this->onlineUsers === NULL )
		{
			$this->onlineUsers = $this->loadOnlineUserList();
		}

		$return = $this->onlineUsers;

		if ( $flags )
		{
			$members = array();
			foreach( $return as $id => $data )
			{
				/* No members */
				if ( ! ( $flags & static::ONLINE_MEMBERS ) )
				{
					if ( $data['member_id'] )
					{
						continue;
					}
				}
				
				if ( ! ( $flags & static::ONLINE_GUESTS ) )
				{
					if ( ! $data['member_id'] )
					{
						continue;
					}
				}
				
				if ( $memberGroup and $data['member_group'] != $memberGroup )
				{
					continue;
				}
				
				if ( ! $showAnonymous and $data['login_type'] == Front::LOGIN_TYPE_ANONYMOUS and ( !Member::loggedIn()->member_id OR $data['member_id'] != Member::loggedIn()->member_id ) )
				{
					continue;
				}
				
				$members[ $id ] = $data;
			}
			
			/* Count only? */
			if ( $flags & static::ONLINE_COUNT_ONLY )
			{
				return count( $members );
			}
			
			usort( $members, function( $m1, $m2 ) use ( $sort )
			{
				return $sort === 'asc'
					? $m1['running_time'] <=> $m2['running_time']
					: $m2['running_time'] <=> $m1['running_time'];
			} );
			
			if ( $limit )
			{
				return array_slice( $members, $limit[0], $limit[1], TRUE );
			}
			
			return $members;
		}
		
		return $return;
	}

	/**
	 * Load the de-duplicated online list from cache, or rebuild it.
	 *
	 * Only one request should rebuild at a time. If someone else is already doing
	 * that and we still have an old list, use it. If we have nothing, rebuild
	 * anyway, the lock does not wait, it just says "someone else got there first",
	 * and the first page load after login often sees an empty cache because
	 * sessions are only written when the request finishes.
	 *
	 * @return	array
	 */
	protected function loadOnlineUserList(): array
	{
		$cached = $this->readOnlineUserCache();
		if ( $cached !== NULL and ( time() - $cached['built'] ) < static::$onlineListFreshTtl )
		{
			return $cached['users'];
		}

		$gotLock = $this->acquireOnlineListLock();
		try
		{
			/* Re-read Redis, not $cached. Another request may have written since the GET above. */
			$latest = $this->readOnlineUserCache();
			if ( $latest !== NULL )
			{
				$cached = $latest;
				$fresh = ( time() - $cached['built'] ) < static::$onlineListFreshTtl;
				if ( $fresh or ! $gotLock )
				{
					return $cached['users'];
				}
			}

			$users = $this->rebuildOnlineUserList();
			if ( $gotLock )
			{
				$this->writeOnlineUserCache( $users );
			}
			return $users;
		}
		catch ( RedisException $e )
		{
			return $cached['users'] ?? array();
		}
		finally
		{
			if ( $gotLock )
			{
				$this->releaseOnlineListLock();
			}
		}
	}

	/**
	 * Read the encoded online-list cache.
	 *
	 * @return	array|null	{ built: int, users: array } or NULL on miss/invalid
	 */
	protected function readOnlineUserCache(): ?array
	{
		try
		{
			$raw = RedisClass::i()->get( static::_key( 'session_onlinelist' ) );
			if ( ! $raw )
			{
				return NULL;
			}

			$decoded = RedisClass::i()->decode( $raw );
			if ( ! is_array( $decoded ) or ! isset( $decoded['built'], $decoded['users'] ) or ! is_array( $decoded['users'] ) or ! count( $decoded['users'] ) )
			{
				RedisClass::i()->del( static::_key( 'session_onlinelist' ) );
				return NULL;
			}

			return $decoded;
		}
		catch ( RedisException $e )
		{
			/* WRONGTYPE from the old SORT STORE list, or a decode failure */
			try
			{
				RedisClass::i()->del( static::_key( 'session_onlinelist' ) );
			}
			catch ( RedisException $e2 ) {}

			return NULL;
		}
	}

	/**
	 * Store the assembled online list.
	 *
	 * Empty results are not cached. The first request after login often sees no
	 * hashes yet because sessions are written on shutdown; caching that empty
	 * list would hide everyone (except the prepended viewer) until TTL expires.
	 *
	 * @param	array	$users
	 * @return	void
	 */
	protected function writeOnlineUserCache( array $users ) : void
	{
		if ( ! count( $users ) )
		{
			RedisClass::i()->del( static::_key( 'session_onlinelist' ) );
			return;
		}

		RedisClass::i()->setEx( static::_key( 'session_onlinelist' ), static::$onlineListHardTtl, RedisClass::i()->encode( array(
			'built'	=> time(),
			'users'	=> $users
		) ) );
	}

	/**
	 * Acquire a single-flight lock for rebuilding the online list.
	 *
	 * @return	bool
	 */
	protected function acquireOnlineListLock(): bool
	{
		try
		{
			return (bool) RedisClass::i()->set( 'session_onlinelist_lock', '1', array( 'nx', 'ex' => static::$onlineListLockTtl ) );
		}
		catch ( RedisException $e )
		{
			return FALSE;
		}
	}

	/**
	 * Release the online-list rebuild lock.
	 *
	 * @return	void
	 */
	protected function releaseOnlineListLock() : void
	{
		try
		{
			RedisClass::i()->del( 'session_onlinelist_lock' );
		}
		catch ( RedisException $e ) {}
	}

	/**
	 * Rebuild the online list from session hashes without Redis SORT.
	 *
	 * Member sessions are already tracked in session_online_users (scored by last-update
	 * time). Guests are not included. Only the most recent member sessions are fetched
	 * (see $onlineListMaxSessions). Hashes are read in pipelined chunks so Redis can
	 * serve other clients between round-trips.
	 *
	 * @return	array
	 */
	protected function rebuildOnlineUserList(): array
	{
		$entries = RedisClass::i()->zRevRangeByScore( static::_key( 'session_online_users' ), time(), time() - static::$ttl, array(
			'withscores' => FALSE,
			'limit' => array( 0, static::$onlineListMaxSessions )
		) );
		if ( ! is_array( $entries ) or ! count( $entries ) )
		{
			return array();
		}

		$sessionKeys = array();
		foreach ( $entries as $entry )
		{
			$parts = explode( '__', $entry, 2 );
			if ( isset( $parts[1] ) )
			{
				$sessionKeys[] = $parts[1];
			}
		}

		if ( ! count( $sessionKeys ) )
		{
			return array();
		}

		$return = array();
		$cutoff = time() - static::$ttl;
		$redis = RedisClass::i()->connection( 'read' );

		foreach ( array_chunk( $sessionKeys, static::$onlineListPipelineChunk ) as $chunk )
		{
			$pipe = $redis->pipeline();
			foreach ( $chunk as $key )
			{
				$pipe->hGetAll( $key );
			}

			$rows = $pipe->exec();
			if ( ! is_array( $rows ) )
			{
				continue;
			}

			foreach ( $rows as $hash )
			{
				if ( ! is_array( $hash ) or empty( $hash['data'] ) )
				{
					continue;
				}

				try
				{
					$data = RedisClass::i()->decode( $hash['data'] );
				}
				catch ( RedisException $e )
				{
					continue;
				}

				if ( ! is_array( $data ) or ! count( $data ) )
				{
					continue;
				}

				$fields = array(
					'member_id'		=> $hash['member_id'] ?? 0,
					'member_name'	=> $hash['member_name'] ?? '',
					'seo_name'		=> $hash['seo_name'] ?? '',
					'member_group'	=> $hash['member_group'] ?? 0,
					'login_type'	=> (int) ( $hash['login_type'] ?? 0 ),
				);

				/* Have we already fetched this member? Newest session wins because keys are newest-first */
				if ( ! $fields['member_id'] or isset( $return[ $fields['member_id'] ] ) )
				{
					continue;
				}

				if ( ( $data['running_time'] ?? 0 ) < $cutoff )
				{
					continue;
				}

				$return[ $fields['member_id'] ] = array_merge( $data, $fields );
			}
		}

		return $return;
	}

	/**
	 * Count online members and/or guests from the dedicated ZSETs.
	 *
	 * Anonymous members cannot be excluded here (login_type lives on the session hash).
	 *
	 * @param	int	$flags
	 * @return	int
	 */
	protected function countOnlineUsersFromZsets( int $flags ): int
	{
		$count = 0;
		$min = time() - static::$ttl;
		$max = time();

		if ( $flags & static::ONLINE_GUESTS )
		{
			$guests = RedisClass::i()->zCount( static::_key( 'session_online_guests' ), $min, $max );
			$count += (int) $guests;
		}

		if ( $flags & static::ONLINE_MEMBERS )
		{
			$sessions = RedisClass::i()->zRevRangeByScore( static::_key( 'session_online_users' ), $max, $min, array( 'withscores' => FALSE ) );
			if ( is_array( $sessions ) )
			{
				$ids = array();
				foreach ( $sessions as $entry )
				{
					$ids[ explode( '__', $entry, 2 )[0] ] = true;
				}
				$count += count( $ids );
			}
		}

		return $count;
	}
	
	/**
	 * Fetch all members active at a specific location
	 *
	 * @param string $app		Application directory (core, forums, etc)
	 * @param string $module		Module
	 * @param string $controller Controller
	 * @param int $id			Current item ID (empty if none)
	 * @param string $url		Current viewing URL
	 * @return array
	 */
	public function getOnlineMembersByLocation( string $app, string $module, string $controller, ?int $id, string $url ): array
	{
		$members = array();
		
		foreach($this->getOnlineUsers(static::ONLINE_MEMBERS, 'desc') as $member )
		{
			if ( $member['current_appcomponent'] == $app and $member['current_module'] == $module and $member['current_controller'] == $controller and $member['current_id'] == $id )
			{
				if ( $url and mb_stristr( $member['location_url'], $url ) )
				{
					$members[ $member['member_id'] ] = array(
						'member_id'		=> $member['member_id'],
						'member_name'	=> $member['member_name'],
						'seo_name'		=> $member['seo_name'],
						'member_group'	=> $member['member_group'],
						'login_type'	=> $member['login_type'],
						'in_editor'		=> $member['in_editor']
					);
				}
			}
		}
			
		return $members;
	}
}
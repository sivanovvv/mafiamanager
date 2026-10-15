<?php
/**
 * @brief		Online Users Table Helper
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @package		Invision Community
 * @since		8th September 2017
 */

namespace IPS\core\Online;

/* To prevent PHP errors (extending class does not exist) revealing path */

use DateInterval;
use IPS\DateTime;
use IPS\Db;
use IPS\Helpers\Table\Table as TableHelper;
use IPS\Http\Url;
use IPS\Member;
use IPS\Member\Group;
use IPS\Request;
use IPS\Session\Front;
use IPS\Settings;
use function defined;
use function in_array;
use function intval;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * Online Users Table Helper
 */
class Table extends TableHelper
{	
	/**
	 * @brief	Rows
	 */
	protected static ?array $rows = null;
	
	/**
	 * @brief	WHERE clause
	 */
	protected array $where = array();
	
	/**
	 * @brief	Total matching members
	 */
	public int $count = 0;
	
	/**
	 * Constructor
	 *
	 * @param	Url|null $url	Base URL
	 * @return	void
	 */
	public function __construct( Url $url=NULL )
	{
		/* Init */	
		parent::__construct( $url );
	}

	/**
	 * Get rows
	 *
	 * @param	array|null	$advancedSearchValues	Values from the advanced search form
	 * @return	array
	 */
	public function getRows( array $advancedSearchValues=NULL ): array
	{
		if ( static::$rows === NULL )
		{
			/* Always return an array */
			static::$rows = array();

			$sortDirection = ( ( $this->sortDirection and mb_strtolower( $this->sortDirection ) == 'asc' ) ? 'asc' : 'desc' );
			$where = $this->memberWhere();

			$this->count = (int) Db::i()->select( 'COUNT(*)', 'core_members', $where )->first();

			/* If we're not filtering - update our most online count */
			if ( $this->filter === NULL )
			{
				$mostOnline = json_decode( Settings::i()->most_online, TRUE );
				if ( $this->count > $mostOnline['count'] )
				{
					Settings::i()->changeValues( array( 'most_online' => json_encode( array(
						'count'		=> $this->count,
						'time'		=> time()
					) ) ) );
				}
			}

	  		$this->pages = $this->count ? (int) ceil( $this->count / $this->limit ) : 0;

			$offset = $this->limit * ( $this->page - 1 );
			$columns = array_unique( array_merge( Member::columnsForPhoto(), array( 'last_activity', 'members_bitoptions', 'members_bitoptions2', 'timezone', 'joined' ) ) );
			$select = Db::i()->select( implode( ',', $columns ), 'core_members', $where, 'last_activity ' . $sortDirection, array( $offset, $this->limit ) );

			foreach ( $select as $row )
			{
				$member = Member::constructFromData( $row );
				$_row = array(
					'member_id'		=> $row['member_id'],
					'member_name'	=> $row['name'],
					'photo'			=> NULL,
					'running_time'	=> $row['last_activity'],
					'login_type'	=> $member->isOnlineAnonymously() ? Front::LOGIN_TYPE_ANONYMOUS : Front::LOGIN_TYPE_MEMBER,
				);

				/* Add in any 'custom' fields */
				$row = $_row;
				if ( $this->include !== NULL )
				{
					$row = array();
					foreach ( $this->include as $k )
					{
						$row[ $k ] = $_row[$k] ?? NULL;
					}
					
					if( !empty( $advancedSearchValues ) AND !isset( Request::i()->noColumn ) )
					{
						foreach ( $advancedSearchValues as $k => $v )
						{
							$row[ $k ] = $_row[$k] ?? NULL;
						}
					}
				}
			
				foreach ( $row as $k => $v )
				{
					/* Parse if necessary (NB: deliberately do this before removing the row in case we need to do some processing, but don't want the column to actually show) */
					if( isset( $this->parsers[ $k ] ) )
					{
						$parserFunction = $this->parsers[ $k ];
						$v = $parserFunction( $v, $_row );
					}
					else
					{
						$v = htmlspecialchars( $v, ENT_DISALLOWED | ENT_QUOTES, 'UTF-8', FALSE );
					}
	
					/* Are we including this one? */
					if( ( ( $this->include !== NULL and !in_array( $k, $this->include ) ) or ( $this->exclude !== NULL and in_array( $k, $this->exclude ) ) ) and !array_key_exists( $k, $advancedSearchValues ) )
					{
						unset( $row[ $k ] );
						continue;
					}
												
					/* Add to array */
					$row[ $k ] = $v;
				}
				
				static::$rows[ $_row['member_id'] ] = $row;
			}
		}
		
		/* Return */
		return static::$rows;
	}

	/**
	 * WHERE clause for members active in the last 30 minutes
	 *
	 * @return	array
	 */
	protected function memberWhere(): array
	{
		$where = array(
			array( 'completed=?', true ),
			array( 'last_activity>?', DateTime::create()->sub( new DateInterval( 'PT30M' ) )->getTimeStamp() )
		);

		if ( $this->filter and mb_stristr( $this->filter, 'group_' ) )
		{
			$where[] = array( 'member_group_id=?', intval( $this->filters[ $this->filter ] ) );
		}

		if ( ! Member::loggedIn()->isAdmin() )
		{
			$visible = array( '( ! ' . Db::i()->bitwiseWhere( Member::$bitOptions['members_bitoptions'], 'is_anon' ) . ' )' );

			$anonymousGroups = array();
			foreach ( Group::groups( TRUE, FALSE ) as $group )
			{
				if ( $group->g_hide_online_list == 1 )
				{
					$anonymousGroups[] = $group->g_id;
				}
			}

			if ( $anonymousGroups )
			{
				$visible[] = Db::i()->in( 'member_group_id', $anonymousGroups, TRUE );
			}

			$visibleSql = implode( ' AND ', $visible );

			if ( Member::loggedIn()->member_id )
			{
				$where[] = array( '( member_id=? OR ( ' . $visibleSql . ' ) )', Member::loggedIn()->member_id );
			}
			else
			{
				$where[] = array( $visibleSql );
			}
		}

		return $where;
	}

	/**
	 * Return the table headers
	 *
	 * @param	array|NULL	$advancedSearchValues	Advanced search values
	 * @return	array
	 */
	public function getHeaders( array $advancedSearchValues=NULL ): array
	{
		return array();
	}
}

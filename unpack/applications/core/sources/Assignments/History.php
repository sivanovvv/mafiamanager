<?php

/**
 * @brief        History
 * @author        <a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright    (c) Invision Power Services, Inc.
 * @license        https://www.invisioncommunity.com/legal/standards/
 * @package        Invision Community
 * @subpackage
 * @since        5/29/2026
 */

namespace IPS\core\Assignments;

/* To prevent PHP errors (extending class does not exist) revealing path */

use IPS\Content\Item;
use IPS\Member;
use IPS\Member\Team;
use IPS\Patterns\ActiveRecord;
use OutOfRangeException;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

class History extends ActiveRecord
{
	const LOG_ASSIGN = 'assigned';
	const LOG_REASSIGN = 'reassigned';
	const LOG_CLOSED = 'closed';
	const LOG_REPLY = 'replied';
	const LOG_SOLVED = 'solved';

	/**
	 * @brief       Database Table
	 */
	public static ?string $databaseTable = 'core_assignments_history';

	/**
	 * @brief       Database Prefix
	 */
	public static string $databasePrefix = 'history_';

	/**
	 * @brief       Multiton Store
	 */
	protected static array $multitons;

	/**
	 * @brief       Default Values
	 */
	protected static ?array $defaultValues = NULL;

	/**
	 * @return array
	 */
	public function get_text() : array
	{
		return isset( $this->_data['text'] ) ? json_decode( html_entity_decode( $this->_data['text'], ENT_QUOTES ), true ) : [];
	}

	/**
	 * @param array|null $val
	 * @return void
	 */
	public function set_text( ?array $val ) : void
	{
		$this->_data['text'] = $val ? json_encode( $val ) : null;
	}

	/**
	 * @return Assignment
	 */
	public function assignment() : Assignment
	{
		return Assignment::load( $this->assignment_id );
	}

	/**
	 * @return Member
	 */
	public function member() : Member
	{
		return Member::load( $this->by );
	}

	/**
	 * Formatted description of the logged action
	 *
	 * @return string
	 */
	public function blurb() : string
	{
		$params = [];
		switch( $this->type )
		{
			case static::LOG_ASSIGN:
			case static::LOG_REASSIGN:
				if( isset( $this->text['to'] ) )
				{
					$type = mb_substr( $this->text['to'], 0, 1 );
					$id = mb_substr( $this->text['to'], 1 );
					if( $type == Assignment::ASSIGNMENT_TEAM )
					{
						try
						{
							$to = Team::load( $id )->name;
						}
						catch( OutOfRangeException ){}
					}
					else
					{
						$to = Member::load( $id )->link();
					}

					$params['htmlsprintf'] = [
						( $to ?? '' )
					];
				}
				break;

			case static::LOG_REPLY:
			case static::LOG_SOLVED:
				$item = $this->assignment()->item;
				if( $item instanceof Item )
				{
					$commentClass = $item::$commentClass;
					if( isset( $this->text['content_id'] ) )
					{
						try
						{
							$reply = $commentClass::load( $this->text['content_id'] );
							$params['htmlsprintf'] = [ (string) $reply->url() ];
						}
						catch( OutOfRangeException ){}
					}
				}
				break;
		}

		return Member::loggedIn()->language()->addToStack( 'history_assignment__' . $this->type, true, $params );
	}

	/**
	 * Extra data to display under the formatted description
	 *
	 * @return string
	 */
	public function extra() : string
	{
		return $this->text['reason'] ?? '';
	}

	public function save() : void
	{
		if( $this->_new )
		{
			$this->date = time();

			if( !$this->by )
			{
				$this->by = Member::loggedIn()->member_id;
			}
		}

		parent::save();
	}
}
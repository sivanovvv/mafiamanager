<?php
/**
 * @brief		5.0.19 Beta 2 Upgrade Code
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @package		Invision Community

 * @since		17 Apr 2026
 */

namespace IPS\core\setup\upg_5001902;

use IPS\core\Assignments\History;
use IPS\Db;
use IPS\Request;
use IPS\Task;
use function defined;

/* To prevent PHP errors (extending class does not exist) revealing path */
if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * 5.0.19 Beta 2 Upgrade Code
 */
class Upgrade
{
	/**
	 * Build the assignment history table as best as we can
	 *
	 * @return bool|array
	 */
	public function step1() : bool|array
	{
		$perCycle	= 1000;
		$did		= 0;
		$limit		= intval( Request::i()->extra );

		$insert = [];
		foreach( Db::i()->select( "*", 'core_assignments', null, 'assign_date', [ $limit, $perCycle ] ) as $row )
		{
			$did++;

			$insert[] = [
				'history_assignment_id' => $row['assign_id'],
				'history_date' => $row['assign_date'],
				'history_by' => $row['assign_by'],
				'history_type' => History::LOG_ASSIGN,
				'history_text' => json_encode( [ 'to' => $row['assign_type'] . $row['assign_to'] ] )
			];

			if( isset( $row['assign_reply_time'] ) and $row['assign_reply_time'] )
			{
				$insert[] = [
					'history_assignment_id' => $row['assign_id'],
					'history_date' => $row['assign_reply_time'],
					'history_by' => $row['assign_reply_by'],
					'history_type' => History::LOG_REPLY,
					'history_text' => json_encode( [ 'content_id' => $row['assign_reply_id'] ] )
				];
			}

			if( isset( $row['assign_closed'] ) and $row['assign_closed'] )
			{
				$insert[] = [
					'history_assignment_id' => $row['assign_id'],
					'history_date' => $row['assign_closed'],
					'history_by' => null,
					'history_type' => History::LOG_CLOSED,
					'history_text' => null
				];
			}
		}

		if( count( $insert ) )
		{
			Db::i()->insert( 'core_assignments_history', $insert );
		}

		if ( $did )
		{
			return ( $limit + $did );
		}
		else
		{
			unset( $_SESSION['_step1Count'] );

			return true;
		}
	}

	// You can create as many additional methods (step2, step3, etc.) as is necessary.
	// Each step will be executed in a new HTTP request
}
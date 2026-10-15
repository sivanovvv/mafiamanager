<?php
/**
 * @brief		5.0.15 Beta 1 Upgrade Code
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @package		Invision Community

 * @since		05 Dec 2025
 */

namespace IPS\core\setup\upg_5001500;

use IPS\Db;
use function defined;

/* To prevent PHP errors (extending class does not exist) revealing path */
if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * 5.0.15 Beta 1 Upgrade Code
 */
class Upgrade
{
	/**
	 * Clear bad records from the followers cache table
	 *
	 * @return	bool|array 	If returns TRUE, upgrader will proceed to next step. If it returns any other value, it will set this as the value of the 'extra' GET parameter and rerun this step (useful for loops)
	 */
	public function step1() : bool|array
	{
		/* We had a bug that was storing the member follows as IPS\core\Member instead of \IPS\Member.
		This caused the follow cache to always be 0. Clear out the bad records; they will be recalculated with
		the correct class. */
		Db::i()->delete( 'core_follow_count_cache', [ 'class=?', 'IPS\core\Member' ] );

		return TRUE;
	}
	
	// You can create as many additional methods (step2, step3, etc.) as is necessary.
	// Each step will be executed in a new HTTP request
}
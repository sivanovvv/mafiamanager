<?php
/**
 * @brief		{version_human} Upgrade Code
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @package		Invision Community

 * @since		17 Apr 2026
 */

namespace IPS\core\setup\upg_5001900;

use IPS\Content\Search\Index;
use IPS\Settings;
use IPS\Task;
use function defined;

/* To prevent PHP errors (extending class does not exist) revealing path */
if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * {version_human} Upgrade Code
 */
class Upgrade
{
	/**
	 * Queue the task to build missing PWA icons based on sizes
	 *
	 * @return	bool|array 	If returns TRUE, upgrader will proceed to next step. If it returns any other value, it will set this as the value of the 'extra' GET parameter and rerun this step (useful for loops)
	 */
	public function step1() : bool|array
	{
		if ( isset( Settings::i()->search_method ) AND Settings::i()->search_method === 'elastic' )
		{
			Index::i()->rebuild();
		}

		Task::queue( 'core', 'PWAIcons', [], 4 );

		return TRUE;
	}
	
	// You can create as many additional methods (step2, step3, etc.) as is necessary.
	// Each step will be executed in a new HTTP request
}
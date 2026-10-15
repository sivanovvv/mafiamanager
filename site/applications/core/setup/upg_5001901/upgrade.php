<?php
/**
 * @brief		{version_human} Upgrade Code
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @package		Invision Community

 * @since		17 Apr 2026
 */

namespace IPS\core\setup\upg_5001901;

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
 * 5.0.19 Beta 1 Upgrade Code
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
		return TRUE;
	}

	// You can create as many additional methods (step2, step3, etc.) as is necessary.
	// Each step will be executed in a new HTTP request
}
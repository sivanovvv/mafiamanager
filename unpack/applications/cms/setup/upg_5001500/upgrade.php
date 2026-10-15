<?php
/**
 * @brief		5.0.15 Beta 1 Upgrade Code
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @package		Invision Community
 * @subpackage	Pages
 * @since		04 Dec 2025
 */

namespace IPS\cms\setup\upg_5001500;

use IPS\Application;
use IPS\Db;
use IPS\Patterns\ActiveRecordIterator;
use IPS\cms\Blocks\Block;
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
	 * Remove orphaned blocks
	 *
	 * @return	bool|array 	If returns TRUE, upgrader will proceed to next step. If it returns any other value, it will set this as the value of the 'extra' GET parameter and rerun this step (useful for loops)
	 */
	public function step1() : bool|array
	{
		$applications = array_keys( Application::applications() );
		foreach( new ActiveRecordIterator( Db::i()->select( '*', 'cms_blocks', Db::i()->in('block_plugin_app', $applications, true) ), Block::class ) AS $block )
		{
			$block->delete();
		}

		return TRUE;
	}
	
	// You can create as many additional methods (step2, step3, etc.) as is necessary.
	// Each step will be executed in a new HTTP request
}
<?php
/**
 * @brief		5.0.20 Beta 1 Upgrade Code
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @package		Invision Community

 * @since		09 Jul 2026
 */

namespace IPS\core\setup\upg_5002000;

use IPS\Db;
use IPS\Login\Handler\OAuth2\Custom;
use function defined;

/* To prevent PHP errors (extending class does not exist) revealing path */
if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * 5.0.20 Beta 1 Upgrade Code
 */
class Upgrade
{
	/**
	 * Fix any corrupted custom login handlers
	 *
	 * @return	bool|array 	If returns TRUE, upgrader will proceed to next step. If it returns any other value, it will set this as the value of the 'extra' GET parameter and rerun this step (useful for loops)
	 */
	public function step1() : bool|array
	{
		foreach( Db::i()->select( '*', 'core_login_methods', [ 'login_classname=?', Custom::class ] ) as $row )
		{
			$settings = json_decode( $row['login_settings'], true );
			foreach( [ 'authorization_endpoint_secure', 'forgot_password_url' ] as $key )
			{
				if( isset( $settings[ $key ] ) and is_array( $settings[ $key ] ) )
				{
					$settings[ $key ] = $settings[ $key ]['url'];
				}
			}

			Db::i()->update( 'core_login_methods', [ 'login_settings' => json_encode( $settings ) ], [ 'login_id=?', $row['login_id'] ] );
		}

		return TRUE;
	}
	
	// You can create as many additional methods (step2, step3, etc.) as is necessary.
	// Each step will be executed in a new HTTP request
}
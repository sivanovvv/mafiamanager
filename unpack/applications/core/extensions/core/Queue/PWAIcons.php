<?php
/**
 * @brief		Background Task
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @package		Invision Community

 * @since		17 Apr 2026
 */

namespace IPS\core\extensions\core\Queue;

use Exception;
use IPS\core\modules\admin\settings\webapp as webappController;
use IPS\Extensions\QueueAbstract;
use IPS\File;
use IPS\Log;
use IPS\Member;
use IPS\Settings;
use IPS\Task\Queue\OutOfRangeException as QueueOutOfRangeException;
use OutOfRangeException;
use function defined;

/* To prevent PHP errors (extending class does not exist) revealing path */
if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * Background Task
 */
class PWAIcons extends QueueAbstract
{
	/**
	 * Parse data before queuing
	 *
	 * @param	array	$data
	 * @return	array|null
	 */
	public function preQueueData( array $data ): ?array
	{
		/* See if we have a startup icon */
		$setting = json_decode( Settings::i()->icons_apple_startup, TRUE ) ?? array();
		if( empty( $setting['original'] ) )
		{
			return $data;
		}

		/* We only need to generate the ones we are missing */
		$data['sizes'] = [];
		foreach( webappController::$appleStartupSizes as $filename => $_sizes )
		{
			if( !array_key_exists( $filename, $setting ) )
			{
				$data['sizes'][] = $filename;
			}
		}

		return $data;
	}

	/**
	 * Run Background Task
	 *
	 * @param	array						$data	Data as it was passed to \IPS\Task::queue()
	 * @param	int							$offset	Offset
	 * @return	int							New offset
	 * @throws	QueueOutOfRangeException	        Indicates offset doesn't exist and thus task is complete
	 */
	public function run( array &$data, int $offset ): int
	{
		if( empty( $data['sizes'] ) )
		{
			throw new QueueOutOfRangeException;
		}

		$setting = json_decode( Settings::i()->icons_apple_startup, TRUE ) ?? array();
		$filename = $data['sizes'][ $offset ];
		$_sizes = webappController::$appleStartupSizes[ $filename ] ?? [];

		try
		{
			$file = File::get( 'core_Icons', $setting['original'] );
			$originalContents = $file->contents();
			$setting[ $filename ] = webappController::generateImage( $filename, $_sizes, $originalContents );

			Settings::i()->changeValues( [
				'icons_apple_startup' => json_encode( $setting )
			]);
		}
		catch ( Exception $e )
		{
			Log::log( $e, 'apple-startup-image' );
		}

		$offset++;
		if( $offset >= count( $data['sizes'] ) )
		{
			throw new QueueOutOfRangeException;
		}

		return $offset;
	}
	
	/**
	 * Get Progress
	 *
	 * @param	array					$data	Data as it was passed to \IPS\Task::queue()
	 * @param	int						$offset	Offset
	 * @return	array( 'text' => 'Doing something...', 'complete' => 50 )	Text explaining task and percentage complete
	 * @throws	OutOfRangeException	Indicates offset doesn't exist and thus task is complete
	 */
	public function getProgress( array $data, int $offset ): array
	{
		return [
			'text'		=> Member::loggedIn()->language()->addToStack('backgroundQueue_pwaIcons'),
			'complete'	=> $offset ? round( 100 / count( $data['sizes'] ) * $offset, 2 ) : 0,
		];
	}

	/**
	 * Perform post-completion processing
	 *
	 * @param	array	$data		Data returned from preQueueData
	 * @param	bool	$processed	Was anything processed or not? If preQueueData returns NULL, this will be FALSE.
	 * @return	void
	 */
	public function postComplete( array $data, bool $processed = TRUE ) : void
	{
		webappController::cleanup();
	}
}
<?php
/**
 * @brief		Background Task
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @package		Invision Community
 * @subpackage	Gallery
 * @since		04 May 2026
 */

namespace IPS\gallery\extensions\core\Queue;

use IPS\Content\Search\Index;
use IPS\Db;
use IPS\Extensions\QueueAbstract;
use IPS\gallery\Image;
use IPS\Member;
use IPS\Patterns\ActiveRecordIterator;
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
class FixImageTitles extends QueueAbstract
{
	/**
	 * Parse data before queuing
	 *
	 * @param	array	$data
	 * @return	array|null
	 */
	public function preQueueData( array $data ): ?array
	{
		$data['count'] = (int) Db::i()->select( 'count(*)', 'gallery_images', [ 'image_caption=?', '' ] )->first();
		$data['processed'] = 0;
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
		$images = iterator_to_array(
			new ActiveRecordIterator(
				Db::i()->select( '*', 'gallery_images', [ 'image_caption=?', '' ], 'image_id', [ 0, $this->rebuild ] ),
				Image::class
			)
		);

		foreach( $images as $image )
		{
			/** @var Image $image */
			$image->caption = $image->file_name;
			$image->save();

			Index::i()->index( $image );
			$data['processed']++;
		}

		if( $data['processed'] >= $data['count'] )
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
			'text' => Member::loggedIn()->language()->addToStack( 'queue_fixing_image_titles' ),
			'complete' => $data['processed'] ? ( round( 100 / $data['count'] * $data['processed'], 2 ) ) : 0
 		];
	}
}
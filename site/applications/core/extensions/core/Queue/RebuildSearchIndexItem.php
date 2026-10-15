<?php
/**
 * @brief		Background Task: Rebuild Search Index Item
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @package		Invision Community
 * @since		20 May 2026
 */

namespace IPS\core\extensions\core\Queue;

/* To prevent PHP errors (extending class does not exist) revealing path */

use Exception;
use IPS\Application;
use IPS\Content\Comment;
use IPS\Content;
use IPS\Content\FuturePublishing;
use IPS\Content\Item;
use IPS\Content\Search\Elastic\Index as ElasticIndex;
use IPS\Content\Search\Index;
use IPS\Content\Search\SearchContent;
use IPS\Db;
use IPS\Db\Exception as DbException;
use IPS\Extensions\QueueAbstract;
use IPS\IPS;
use IPS\Log;
use IPS\Member;
use IPS\Patterns\ActiveRecordIterator;
use IPS\Settings;
use OutOfRangeException;
use Throwable;
use function class_exists;
use function defined;
use function explode;
use function in_array;
use function is_subclass_of;
use function method_exists;
use function round;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * Background Task: Rebuild Search Index Item
 */
class RebuildSearchIndexItem extends QueueAbstract
{
	/**
	 * @brief Number of records to index per cycle
	 */
	public int $index = 50;

	/**
	 * Parse data before queuing
	 *
	 * @param	array	$data
	 * @return	array|null
	 */
	public function preQueueData( array $data ): ?array
	{
		if ( Settings::i()->search_method !== 'elastic' or !isset( $data['class'], $data['id'] ) )
		{
			return null;
		}

		$classname = $data['class'];
		if ( !class_exists( $classname ) or !is_subclass_of( $classname, Item::class ) )
		{
			return null;
		}

		$exploded = explode( '\\', $classname );
		if ( !Application::appIsEnabled( $exploded[1] ) )
		{
			return null;
		}

		try
		{
			/* @var Item $item */
			$item = $classname::load( $data['id'] );
		}
		catch ( OutOfRangeException )
		{
			return null;
		}

		if ( !$this->itemHasSearchableContent( $item ) )
		{
			return null;
		}

		$data['count']			= 1 + $this->contentCount( $item );
		$data['processed']		= 0;
		$data['phase']			= 'remove';
		$data['commentsDone']	= false;
		$data['reviewsDone']	= false;
		$data['lastCommentId']	= 0;
		$data['lastReviewId']	= 0;

		return $data;
	}

	/**
	 * Run Background Task
	 *
	 * @param	mixed	$data	Data as it was passed to \IPS\Task::queue()
	 * @param	int		$offset	Offset
	 * @return	int		New offset
	 * @throws	\IPS\Task\Queue\OutOfRangeException	Indicates task is complete
	 */
	public function run( mixed &$data, int $offset ): int
	{
		if ( Settings::i()->search_method !== 'elastic' or !isset( $data['class'], $data['id'] ) )
		{
			throw new \IPS\Task\Queue\OutOfRangeException;
		}

		$classname = $data['class'];
		$exploded = explode( '\\', $classname );
		if ( !class_exists( $classname ) or !Application::appIsEnabled( $exploded[1] ) or !is_subclass_of( $classname, Item::class ) )
		{
			throw new \IPS\Task\Queue\OutOfRangeException;
		}

		try
		{
			/* @var Item $item */
			$item = $classname::load( $data['id'] );
		}
		catch ( OutOfRangeException )
		{
			throw new \IPS\Task\Queue\OutOfRangeException;
		}

		$index = Index::i();
		if ( !( $index instanceof ElasticIndex ) )
		{
			throw new \IPS\Task\Queue\OutOfRangeException;
		}

		while ( true )
		{
			switch ( $data['phase'] ?? 'remove' )
			{
				case 'remove':
					$index->directIndexRemoval( $classname, (int) $data['id'], TRUE );
					$data['phase'] = 'item';
					$data['processed']++;
					break;

				case 'item':
					$data['phase'] = 'comments';
					if ( !$item::$firstCommentRequired and SearchContent::isSearchable( $item ) and $this->shouldIndexObject( $item ) )
					{
						$indexer = Index::massIndexer();
						$indexer->index( $item );
						unset( $indexer );

						$data['processed']++;
					}
					break;

				case 'comments':
					$done = $this->indexChildBatch( $item, 'comment', $data );
					if ( !empty( $data['commentsDone'] ) )
					{
						$data['phase'] = 'reviews';
					}

					if ( $done )
					{
						return $data['processed'];
					}
					break;

				case 'reviews':
					$done = $this->indexChildBatch( $item, 'review', $data );
					if ( !empty( $data['reviewsDone'] ) )
					{
						$data['phase'] = 'finish';
					}

					if ( $done )
					{
						return $data['processed'];
					}
					break;

				case 'finish':
				default:
					$index->updateItemsIndex( $item );
					throw new \IPS\Task\Queue\OutOfRangeException;
			}
		}
	}

	/**
	 * Get Progress
	 *
	 * @param	mixed	$data	Data as it was passed to \IPS\Task::queue()
	 * @param	int		$offset	Offset
	 * @return	array
	 * @throws	OutOfRangeException	Indicates task is complete
	 */
	public function getProgress( mixed $data, int $offset ): array
	{
		if ( !isset( $data['class'], $data['id'] ) )
		{
			throw new OutOfRangeException;
		}

		$title = $data['title'] ?? $data['class'] . ' #' . $data['id'];
		$url   = $data['url'] ?? '';

		return array(
			'text'		=> Member::loggedIn()->language()->addToStack( 'reindexing_search_index_item', FALSE, array( 'sprintf' => array( $url, $title ) ) ),
			'complete'	=> $data['count'] ? round( 100 / $data['count'] * $data['processed'], 2 ) : 100
		);
	}

	/**
	 * Does the item have any searchable content?
	 *
	 * @param	Item	$item	The item
	 * @return	bool
	 */
	protected function itemHasSearchableContent( Item $item ): bool
	{
		if ( SearchContent::isSearchable( $item ) )
		{
			return true;
		}

		if ( isset( $item::$commentClass ) and SearchContent::isSearchable( $item::$commentClass ) )
		{
			return true;
		}

		if ( isset( $item::$reviewClass ) and SearchContent::isSearchable( $item::$reviewClass ) )
		{
			return true;
		}

		return false;
	}

	/**
	 * Count child content that will be processed.
	 *
	 * @param	Item	$item	The item
	 * @return	int
	 */
	protected function contentCount( Item $item ): int
	{
		$count = 0;

		if ( !$item::$firstCommentRequired and SearchContent::isSearchable( $item ) )
		{
			$count++;
		}

		foreach ( array( 'comment', 'review' ) as $type )
		{
			$classname = $this->childClass( $item, $type );
			if ( $classname and SearchContent::isSearchable( $classname ) )
			{
				try
				{
					$count += Db::i()->select( 'COUNT(*)', $classname::$databaseTable, $this->childWhere( $item, $type ) )->first();
				}
				catch ( DbException ) { }
			}
		}

		return $count;
	}

	/**
	 * Index one batch of comments or reviews.
	 *
	 * @param	Item	$item	The item
	 * @param	string	$type	comment or review
	 * @param	array	$data	Queue data
	 * @return	int
	 */
	protected function indexChildBatch( Item $item, string $type, array &$data ): int
	{
		$doneKey  = $type === 'comment' ? 'commentsDone' : 'reviewsDone';
		$lastKey  = $type === 'comment' ? 'lastCommentId' : 'lastReviewId';
		$classname = $this->childClass( $item, $type );

		if ( !$classname or !SearchContent::isSearchable( $classname ) )
		{
			$data[ $doneKey ] = true;
			return 0;
		}

		$idColumn  = $classname::$databaseColumnId;
		$where     = $this->childWhere( $item, $type, (int) $data[ $lastKey ] );
		$done      = 0;
		$indexer   = Index::massIndexer();

		try
		{
			foreach ( new ActiveRecordIterator( Db::i()->select( '*', $classname::$databaseTable, $where, $classname::$databasePrefix . $idColumn . ' ASC', array( 0, $this->index ) ), $classname ) as $object )
			{
				try
				{
					if ( $this->shouldIndexObject( $object ) )
					{
						$indexer->index( $object );
					}
				}
				catch ( Exception | Throwable $e )
				{
					Log::log( $e, 'rebuildSearchIndexItem' );
				}

				$data[ $lastKey ] = $object->$idColumn;
				$data['processed']++;
				$done++;
			}
		}
		catch ( DbException ) { }

		unset( $indexer );

		if ( $done < $this->index )
		{
			$data[ $doneKey ] = true;
		}

		return $done;
	}

	/**
	 * Build child where clause.
	 *
	 * @param	Item	$item	The item
	 * @param	string	$type	comment or review
	 * @param	int		$lastId	Last processed child ID
	 * @return	array
	 */
	protected function childWhere( Item $item, string $type, int $lastId=0 ): array
	{
		$classname = $this->childClass( $item, $type );
		$itemIdColumn = $item::$databaseColumnId;
		$where = array(
			array( $classname::$databasePrefix . $classname::$databaseColumnMap['item'] . '=?', $item->$itemIdColumn )
		);

		if ( is_subclass_of( $classname, Comment::class ) and $classname::commentWhere() !== NULL )
		{
			$where[] = $classname::commentWhere();
		}

		if ( $lastId )
		{
			$where[] = array( $classname::$databasePrefix . $classname::$databaseColumnId . '>?', $lastId );
		}

		return $where;
	}

	/**
	 * Get the configured child class for comments or reviews.
	 *
	 * @param	Item	$item	The item
	 * @param	string	$type	comment or review
	 * @return	string|null
	 */
	protected function childClass( Item $item, string $type ): ?string
	{
		if ( $type === 'comment' and isset( $item::$commentClass ) )
		{
			return $item::$commentClass;
		}

		if ( $type === 'review' and isset( $item::$reviewClass ) )
		{
			return $item::$reviewClass;
		}

		return null;
	}

	/**
	 * Should this object be sent to the index?
	 *
	 * @param	Content	$object	The object
	 * @return	bool
	 */
	protected function shouldIndexObject( Content $object ): bool
	{
		if ( IPS::classUsesTrait( $object, FuturePublishing::class ) and $object->isFutureDate() )
		{
			return false;
		}

		if ( method_exists( $object, 'hidden' ) and in_array( $object->hidden(), array( -2, -3 ) ) )
		{
			return false;
		}

		return true;
	}
}

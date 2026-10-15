<?php
/**
 * @brief		Elasticsearch Batch Index Queue Task
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @package		Invision Community
 * @since		18 May 2026
 */

namespace IPS\core\tasks;

/* To prevent PHP errors (extending class does not exist) revealing path */

use IPS\Content\Search\Elastic\Index;
use IPS\Db;
use IPS\Settings;
use IPS\Task;
use IPS\Task\Exception;
use function defined;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * Elasticsearch Batch Index Queue Task
 *
 * Drains core_search_index_queue in bulk batches rather than making one
 * HTTP call to OpenSearch per content write. The task disables itself when
 * the queue is empty and is re-enabled automatically whenever Index::index()
 * adds a new row.
 */
class elasticsearchindexqueue extends Task
{
	/**
	 * @brief	Documents per bulk request
	 */
	const BATCH_SIZE = 200;

	/**
	 * Execute
	 *
	 * If ran successfully, should return anything worth logging. Only log something
	 * worth mentioning (don't log "task ran successfully"). Return NULL (actual NULL, not '' or 0) to not log (which will be most cases).
	 * If an error occurs which means the task could not finish running, throw an \IPS\Task\Exception - do not log an error as a normal log.
	 * Tasks should execute within the time of a normal HTTP request.
	 *
	 * @return	mixed	Message to log or NULL
	 * @throws	Exception
	 */
	public function execute(): mixed
	{
		if ( Settings::i()->search_method !== 'elastic' )
		{
			return NULL;
		}

		$esUrl = Index::elasticBaseUrl();
		$index = new Index( $esUrl );

		$this->runUntilTimeout( function() use ( $index )
		{
			$rows = \iterator_to_array(
				Db::i()->select( '*', 'core_search_index_queue', NULL, 'queue_added ASC, queue_id ASC', static::BATCH_SIZE )
			);

			if ( !count( $rows ) )
			{
				$this->enabled = FALSE;
				$this->save();
				return FALSE;
			}

			$processedIds = array_column( $rows, 'queue_id' );

			if ( !$index->processBatchQueue( $rows ) )
			{
				throw new Exception( $this, 'elasticsearch_index_queue_failed' );
			}

			Db::i()->delete( 'core_search_index_queue', Db::i()->in( 'queue_id', $processedIds ) );

			return TRUE;
		} );

		return NULL;
	}

	/**
	 * Cleanup
	 *
	 * If your task takes longer than 15 minutes to run, this method
	 * will be called before execute(). Use it to clean up anything which
	 * may not have been done
	 *
	 * @return	void
	 */
	public function cleanup(): void
	{

	}
}

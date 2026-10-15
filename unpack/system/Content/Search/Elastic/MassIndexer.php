<?php
/**
 * @brief		Elasticsearch Mass Indexer
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @package		Invision Community
 * @since		15 Nov 2017
*/

namespace IPS\Content\Search\Elastic;

/* To prevent PHP errors (extending class does not exist) revealing path */

use IPS\Content;
use IPS\Content\Comment;
use IPS\Content\Item;
use IPS\Http\Request\Exception as RequestException;
use IPS\Http\Url;
use IPS\Log;
use OutOfRangeException;
use Throwable;
use function defined;
use function get_class;
use const IPS\LONG_REQUEST_TIMEOUT;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * Elasticsearch Mass Indexer
 */
class MassIndexer extends Index
{
	/**
	 * @brief	Accumulated bulk payload for the main search index
	 */
	protected ?array $data = array();

	/**
	 * @brief	Items index refresh tracking: item class/id pairs touched by this batch
	 */
	protected array $itemsToRefresh = array();

	/**
	 * Index an item
	 *
	 * @param	Content	$object	Item to add
	 * @return	void
	 */
	public function index( Content $object ): void
	{
		if ( $indexData = $this->indexData( $object ) and $indexData['index_permissions'] )
		{
			/* We do not need to store soft deleted items, they are removed/restored appropriately */
			if ( isset( $indexData['index_hidden'] ) and $indexData['index_hidden'] === -2 )
			{
				return;
			}

			$indexData['index_id'] = $this->getIndexId( $object );

			/* Accumulate for main index bulk request */
			$this->data[] = array(
				'index'	=> array(
					'_index'	=> trim( $this->url->data[ Url::COMPONENT_PATH ], '/' ),
					'_id'		=> $indexData['index_id'],
				)
			);
			$this->data[] = $indexData;

			/* Track the parent item so the shared items-index refresh logic can run after the main bulk write */
			if ( $object instanceof Item )
			{
				$itemClass      = get_class( $object );
				$itemIdColumn   = $itemClass::$databaseColumnId;
				$itemId         = $object->$itemIdColumn;
			}
			elseif ( $object instanceof Comment )
			{
				$commentClass = get_class( $object );
				if ( !isset( $commentClass::$itemClass ) )
				{
					return;
				}
				$itemClass = $commentClass::$itemClass;
				$itemId    = $indexData['index_item_id'];
			}
			else
			{
				return;
			}

			$this->itemsToRefresh[ $itemClass . '-' . $itemId ] = array( $itemClass, $itemId );
		}
	}

	/**
	 * Commit at the end of the request
	 *
	 * @return	void
	 */
	public function __destruct()
	{
		$bulkSucceeded = true;

		/* Flush main index */
		if ( $this->data )
		{
			$bulkSucceeded = false;
			$json = implode( "\n", array_map( 'json_encode', $this->data ) ) . "\n";
			try
			{
				$response = Index::request( $this->url->setPath( '/_bulk' ) )->setHeaders( array( 'Content-Type' => 'application/x-ndjson' ) )->post( $json );

				if ( $error = $this->getResponseError( $response ) )
				{
					Log::log( $error, 'elasticsearch_response_error' );
				}
				else
				{
					$response = $response->decodeJson();
					if ( !empty( $response['errors'] ) )
					{
						Log::log( $this->bulkResponseErrors( $response ), 'elasticsearch_bulk_index_errors' );
					}
					else
					{
						$bulkSucceeded = true;
					}
				}
			}
			catch ( RequestException $e )
			{
				Log::log( $e, 'elasticsearch' );
			}
		}

		/* Refresh items index rows using the same canonical logic as direct indexing, but batched via _bulk */
		if ( $bulkSucceeded and $this->itemsToRefresh )
		{
			$maintenancePayload = array();
			foreach ( $this->itemsToRefresh as $item )
			{
				try
				{
					$itemObject = $item[0]::load( $item[1] );
					$maintenancePayload = array_merge( $maintenancePayload, $this->itemsMaintenanceBulkPayload( $itemObject ) );
				}
				catch ( OutOfRangeException $e ) { }
				catch ( Throwable $e )
				{
					Log::log( $e, 'elasticsearch' );
				}
			}

			if ( $maintenancePayload )
			{
				$this->executeBulkPayloadChunked( $maintenancePayload, LONG_REQUEST_TIMEOUT );
			}
		}

		$this->data           = null;
		$this->itemsToRefresh = array();
	}
}

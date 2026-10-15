<?php
/**
 * @brief		Elasticsearch Search Index
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @package		Invision Community
 * @since		31 Oct 2017
*/

namespace IPS\Content\Search\Elastic;

/* To prevent PHP errors (extending class does not exist) revealing path */

use Exception;
use IPS\Application;
use IPS\Content\Comment;
use IPS\Content\Item;
use IPS\Content\Search\Index as SearchIndex;
use IPS\Content\Search\Elastic\Exception as ElasticException;
use IPS\Content;
use IPS\Content\Taggable;
use IPS\DateTime;
use IPS\Db;
use IPS\Http\Request\Exception as RequestException;
use IPS\Http\Request\Curl;
use IPS\Http\Response;
use IPS\Http\Url;
use IPS\IPS;
use IPS\Log;
use IPS\Member;
use IPS\Settings;
use OutOfRangeException;
use RuntimeException;
use StdClass;
use function count;
use function defined;
use function get_class;
use function in_array;
use function intval;
use function is_array;
use function is_null;
use function preg_replace;
use function strtolower;
use function substr;
use const IPS\ELASTICSEARCH_PASSWORD;
use const IPS\ELASTICSEARCH_USER;
use const IPS\LONG_REQUEST_TIMEOUT;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * Elasticsearch Search Index
 */
class Index extends SearchIndex
{
	/**
	 * @brief	Maximum number of bulk API entries per _bulk request (approx safeguard)
	 */
	const BULK_MAX_ENTRIES = 2000;

	/**
	 * @brief	Elasticsearch version requirements
	 */
	const MINIMUM_VERSION = '8.0.0';
	const UNSUPPORTED_VERSION = '9.0.0';

	/**
	 * Resolve the Elasticsearch/OpenSearch content index name
	 *
	 * @return	string
	 */
	public static function baseIndexName(): string
	{
		if ( Application::appIsEnabled( 'cloud' ) )
		{
			$tenant = \IPS\Cicloud\getCicUsername();
			if ( $tenant )
			{
				return 'ips_' . static::sanitizeIndexSegment( $tenant ) . '_content';
			}
		}

		return Settings::i()->search_elastic_index;
	}

	/**
	 * Sanitize a tenant segment for use in an index name (lowercase a-z, 0-9, underscore)
	 *
	 * @param	string	$segment
	 * @return	string
	 */
	public static function sanitizeIndexSegment( string $segment ): string
	{
		return preg_replace( '/[^a-z0-9_]/', '_', strtolower( $segment ) );
	}

	/**
	 * Build the main content index URL from configured server and resolved index name
	 *
	 * @return	Url
	 */
	public static function elasticBaseUrl(): Url
	{
		return Url::external( rtrim( Settings::i()->search_elastic_server, '/' ) . '/' . static::baseIndexName() );
	}

	/**
	 * @brief	The main search index URL
	 */
	protected Url $url;

	/**
	 * @brief	The items index URL (one document per content item, used for activity streams)
	 */
	protected Url $itemsUrl;

	/**
	 * @brief	Per-request item metadata cache
	 */
	protected array $metaDataCache = array();

	/**
	 * Constructor
	 *
	 * @param	Url	$url	The server URL (main index)
	 * @return	void
	 */
	public function __construct( Url $url )
	{
		$this->url      = $url;
		$this->itemsUrl = $url->setPath( rtrim( $url->data[ Url::COMPONENT_PATH ], '/' ) . '_items' );
	}

	/**
	 * Initalize when first setting up
	 *
	 * @return	void
	 */
	public function init(): void
	{
		try
		{
			$analyzer = Settings::i()->search_elastic_analyzer;
			$settings = array(
				'max_result_window'	=> Settings::i()->search_index_maxresults
			);
			if ( $analyzer === 'custom' )
			{
				$settings['analysis'] = json_decode( '{' . Settings::i()->search_elastic_custom_analyzer . '}', TRUE );
				$analyzer = key( $settings['analysis']['analyzer'] );
			}

			Index::request( $this->url )->delete();
			Index::request( $this->itemsUrl )->delete();

			$definition = array(
				'settings'	=> $settings,
				'mappings'	=> array(
					'properties'	=> array(
						'index_id'				    => array( 'type' => 'keyword' ),
						'index_class'				=> array( 'type' => 'keyword' ),
						'index_object_id'			=> array( 'type' => 'long' ),
						'index_item_id'				=> array( 'type' => 'long' ),
						'index_container_class'		=> array( 'type' => 'keyword' ),
						'index_container_id'		=> array( 'type' => 'long' ),
						'index_title'				=> array(
							'type' 		=> 'text',
							'analyzer'	=> $analyzer,
						),
						'index_content'				=> array(
							'type' 		=> 'text',
							'analyzer'	=> $analyzer,
						),
						'index_permissions'			=> array( 'type' => 'keyword' ),
						'index_date_created'		=> array(
							'type' 		=> 'date',
							'format'	=> 'epoch_second',
						),
						'index_date_updated'		=> array(
							'type' 		=> 'date',
							'format'	=> 'epoch_second',
						),
						'index_date_commented'		=> array(
							'type' 		=> 'date',
							'format'	=> 'epoch_second',
						),
						'index_author'				=> array( 'type' => 'long' ),
						'index_tags'				=> array( 'type' => 'keyword' ),
						'index_prefix'				=> array( 'type' => 'keyword' ),
						'index_hidden'				=> array( 'type' => 'byte' ),
						'index_item_index_id'		=> array( 'type' => 'keyword' ),
						'index_item_author'			=> array( 'type' => 'long' ),
						'index_club_id'				=> array( 'type' => 'long' ),
						'index_class_type_id_hash'	=> array( 'type' => 'keyword' ),
						'index_comments'			=> array( 'type' => 'long' ),
						'index_reviews'				=> array( 'type' => 'long' ),
						'index_participants'		=> array( 'type' => 'long' ),
						'index_is_anon'				=> array( 'type' => 'byte' ),
						'index_item_solved'			=> array( 'type' => 'byte' )
					)
				)
			);

			try
			{
				$response = Index::request( $this->url )->setHeaders( array( 'Content-Type' => 'application/json' ) )->put( json_encode( $definition ) );

				if( $response->httpResponseCode != 200 )
				{
					throw new RuntimeException;
				}
			}
			catch( Exception $e )
			{
				Log::log( $e, 'elasticsearch' );
			}

			/* Items index — one document per content item, avoids _update_by_query for last-comment tracking */
			$itemsDefinition = array(
				'settings'	=> array( 'max_result_window' => Settings::i()->search_index_maxresults ),
				'mappings'	=> array(
					'properties'	=> array(
						'index_id'				=> array( 'type' => 'keyword' ),
						'index_class'			=> array( 'type' => 'keyword' ),
						'index_item_id'			=> array( 'type' => 'long' ),
						'index_container_class'	=> array( 'type' => 'keyword' ),
						'index_container_id'	=> array( 'type' => 'long' ),
						'index_permissions'		=> array( 'type' => 'keyword' ),
						'index_date_created'	=> array(
							'type'   => 'date',
							'format' => 'epoch_second',
						),
						'index_date_updated'	=> array(
							'type'   => 'date',
							'format' => 'epoch_second',
						),
						'index_date_commented'	=> array(
							'type'   => 'date',
							'format' => 'epoch_second',
						),
						'index_author'			=> array( 'type' => 'long' ),
						'index_item_author'		=> array( 'type' => 'long' ),
						'index_participants'	=> array( 'type' => 'long' ),
						'index_tags'			=> array( 'type' => 'keyword' ),
						'index_prefix'			=> array( 'type' => 'keyword' ),
						'index_hidden'			=> array( 'type' => 'byte' ),
						'index_item_index_id'	=> array( 'type' => 'keyword' ),
						'index_club_id'			=> array( 'type' => 'long' ),
						'index_class_type_id_hash' => array( 'type' => 'keyword' ),
						'index_item_solved'		=> array( 'type' => 'byte' ),
						'index_is_anon'			=> array( 'type' => 'byte' ),
						'last_comment_index_id'	=> array( 'type' => 'keyword' ),
					)
				)
			);

			try
			{
				$response = Index::request( $this->itemsUrl )->setHeaders( array( 'Content-Type' => 'application/json' ) )->put( json_encode( $itemsDefinition ) );

				if( $response->httpResponseCode != 200 )
				{
					throw new RuntimeException;
				}
			}
			catch( Exception $e )
			{
				Log::log( $e, 'elasticsearch' );
			}
		}
		catch ( Exception $e )
		{
			Log::log( $e, 'elasticsearch' );
		}
	}

	/**
	 * Get index data
	 *
	 * @param	Content	$object	Item to add
	 * @return	array|NULL
	 */
	public function indexData( Content $object ): array|NULL
	{
		if ( $indexData = parent::indexData( $object ) )
		{
			$indexData['index_permissions'] = explode( ',', $indexData['index_permissions'] );
			unset( $indexData['index_is_last_comment'] );

			if ( $object instanceof Item )
			{
				$indexData = array_merge( $indexData, $this->metaData( $object ) );
			}
			else
			{
				$indexData = array_merge( $indexData, $this->metaData( $object->item() ) );
			}

			return $indexData;
		}

		return NULL;
	}

	/**
	 * Index an item.
	 * Queues the operation for batch processing by default; set the ELASTICSEARCH_QUEUE_INDEX
	 * constant to FALSE in constants.php to index synchronously instead.
	 *
	 * @param	Content	$object	Item to add
	 * @return	void
	 */
	public function index( Content $object ): void
	{
		if ( !\IPS\ELASTICSEARCH_QUEUE_INDEX )
		{
			$this->indexDirect( $object );
			return;
		}

		$class    = get_class( $object );
		$idColumn = $class::$databaseColumnId;

		Db::i()->replace( 'core_search_index_queue', array(
			'queue_class'     => $class,
			'queue_object_id' => $object->$idColumn,
			'queue_action'    => 'index',
			'queue_added'     => time(),
		) );

		/* Wake the batch task if it has put itself to sleep */
		Db::i()->update( 'core_tasks', array( 'enabled' => 1 ), array( 'app=? AND `key`=?', 'core', 'elasticsearchindexqueue' ) );
	}

	/**
	 * Index an item synchronously (bypasses the batch queue).
	 * Used when ELASTICSEARCH_QUEUE_INDEX is FALSE, and internally after batch processing.
	 *
	 * @param	Content	$object	Item to index
	 * @return	void
	 */
	protected function indexDirect( Content $object ): void
	{
		$this->metaDataCache = array();

		if ( $indexData = $this->indexData( $object ) )
		{
			$indexData['index_id'] = $this->getIndexId( $object );

			/* Never store soft deleted content */
			if ( isset( $indexData['index_hidden'] ) and $indexData['index_hidden'] === -2 )
			{
				$this->removeFromSearchIndex( $object );
				$this->metaDataCache = array();
				return;
			}

			if ( !$indexData['index_permissions'] )
			{
				$this->removeFromSearchIndex( $object );
				$this->metaDataCache = array();
				return;
			}

			try
			{
				$r = Index::request(
					$this->url->setPath( $this->url->data[ Url::COMPONENT_PATH ] . '/_doc/' . $this->getIndexId( $object ) ),
					LONG_REQUEST_TIMEOUT
				)->setHeaders( array( 'Content-Type' => 'application/json' ) )->put( json_encode( $indexData ) );

				if ( $error = $this->getResponseError( $r ) )
				{
					throw new ElasticException( $error['type'] . ': ' . $error['reason'] );
				}

				$item = ( $object instanceof Item ) ? $object : $object->item();
				$this->rebuildMetaData( $item );
				$this->updateItemsIndex( $item );
			}
			catch ( RequestException $e )
			{
				Log::log( $e, 'elasticsearch' );
			}
			catch ( ElasticException $e )
			{
				Log::log( $e, 'elasticsearch_response_error' );
			}
		}

		$this->metaDataCache = array();
	}

	/**
	 * Update (or create) the items index document for the given content item.
	 * The items index holds one document per item so activity streams can retrieve
	 * the correct "last comment" doc without scatter _update_by_query calls.
	 *
	 * @param	Item	$item	The content item
	 * @return	void
	 */
	public function updateItemsIndex( Item $item ): void
	{
		$bulkPayload = $this->itemsMaintenanceBulkPayload( $item );
		if ( !$bulkPayload )
		{
			return;
		}

		$this->executeBulkPayloadChunked( $bulkPayload, LONG_REQUEST_TIMEOUT );
	}

	/**
	 * Build bulk operations for items-index maintenance for a single parent item.
	 * Includes items index doc write and any required main-index comment doc index sync.
	 *
	 * @param	Item	$item	The content item
	 * @return	array			Flat list of bulk API entries; each element becomes one NDJSON line in the request body
	 */
	protected function itemsMaintenanceBulkPayload( Item $item ): array
	{
		$itemsIndexName = trim( $this->itemsUrl->data[ Url::COMPONENT_PATH ], '/' );
		$mainIndexName  = trim( $this->url->data[ Url::COMPONENT_PATH ], '/' );
		$itemIndexId    = $this->getIndexId( $item );

		$payload = array();

		try
		{
			$firstComment = null;
			if ( $item::$firstCommentRequired )
			{
				$firstComment = $item->firstComment();
				if ( !$firstComment )
				{
					$payload[] = array(
						'delete' => array(
							'_index' => $itemsIndexName,
							'_id'    => $itemIndexId,
						)
					);
					return $payload;
				}
			}

			$lastComment = $item->comments( 1, 0, 'date', 'desc', NULL, FALSE, NULL, NULL, TRUE, FALSE );
			if ( !$lastComment and $item::$firstCommentRequired )
			{
				/* No visible comments remain, so this item should not appear in item-only streams. */
				$payload[] = array(
					'delete' => array(
						'_index' => $itemsIndexName,
						'_id'    => $itemIndexId,
					)
				);
				return $payload;
			}

			$source             = $lastComment ?: $item;
			$lastCommentIndexId = $this->getIndexId( $source );

			$itemData = $this->indexData( $firstComment ?: $item );
			if ( !$itemData )
			{
				return array();
			}

			$sourceData = $lastComment ? $this->indexData( $lastComment ) : $itemData;
			if ( !$sourceData )
			{
				return array();
			}

			$itemsDoc = array(
				'index_id'				=> $itemIndexId,
				'index_class'			=> get_class( $firstComment ?: $item ),
				'index_item_id'			=> $itemData['index_item_id'],
				'index_container_class'	=> $itemData['index_container_class'],
				'index_container_id'	=> $itemData['index_container_id'],
				'index_permissions'		=> $sourceData['index_permissions'],
				'index_date_created'	=> $itemData['index_date_created'],
				'index_date_updated'	=> $sourceData['index_date_updated'],
				'index_date_commented'	=> $sourceData['index_date_commented'],
				'index_author'			=> $sourceData['index_author'],
				'index_item_author'		=> $itemData['index_item_author'],
				'index_participants'	=> $itemData['index_participants'],
				'index_hidden'			=> $sourceData['index_hidden'],
				'index_item_index_id'	=> $itemIndexId,
				'index_club_id'			=> $itemData['index_club_id'],
				'index_tags'			=> $itemData['index_tags'],
				'index_prefix'			=> $itemData['index_prefix'],
				'index_item_solved'		=> $itemData['index_item_solved'],
				'index_is_anon'			=> $sourceData['index_is_anon'],
				'last_comment_index_id'	=> $lastCommentIndexId,
			);

			$commentsToSync = array();
			if ( $firstComment )
			{
				$commentsToSync[ $this->getIndexId( $firstComment ) ] = $firstComment;
			}
			if ( $source instanceof Comment )
			{
				$commentsToSync[ $lastCommentIndexId ] = $source;
			}

			foreach ( $commentsToSync as $commentIndexId => $comment )
			{
				$commentData = $this->indexData( $comment );
				if ( !$commentData )
				{
					continue;
				}

				$commentData['index_id']              = $commentIndexId;
				$commentData['index_date_updated']    = $sourceData['index_date_updated'];
				$commentData['index_date_commented']  = $sourceData['index_date_commented'];

				$payload[] = array(
					'index' => array(
						'_index' => $mainIndexName,
						'_id'    => $commentIndexId,
					)
				);
				$payload[] = $commentData;
			}

			$payload[] = array(
				'index' => array(
					'_index' => $itemsIndexName,
					'_id'    => $itemIndexId,
				)
			);
			$payload[] = $itemsDoc;
		}
		catch ( RequestException $e )
		{
			Log::log( $e, 'elasticsearch' );
			return array();
		}

		return $payload;
	}

	/**
	 * Execute a bulk payload, chunked to avoid excessively large requests.
	 *
	 * @param	array	$bulkEntries	Flat list of bulk API entries; each element becomes one NDJSON line in the request body
	 * @param	int|null	$timeout	Timeout
	 * @return	void
	 */
	protected function executeBulkPayloadChunked( array $bulkEntries, int|null $timeout=NULL ): void
	{
		if ( !$bulkEntries )
		{
			return;
		}

		$timeout = $timeout ?? LONG_REQUEST_TIMEOUT;

		$chunks = array_chunk( $bulkEntries, static::BULK_MAX_ENTRIES );
		foreach ( $chunks as $chunk )
		{
			$json = implode( "\n", array_map( 'json_encode', $chunk ) ) . "\n";
			try
			{
				$response = Index::request( $this->url->setPath( '/_bulk' ), $timeout )
					->setHeaders( array( 'Content-Type' => 'application/x-ndjson' ) )
					->post( $json );

				if ( $error = $this->getResponseError( $response ) )
				{
					Log::log( $error, 'elasticsearch_response_error' );
					continue;
				}

				$decoded = $response->decodeJson();
				if ( !empty( $decoded['errors'] ) )
				{
					Log::log( $this->bulkResponseErrors( $decoded ), 'elasticsearch_bulk_index_errors' );
				}
			}
			catch ( RequestException $e )
			{
				Log::log( $e, 'elasticsearch' );
			}
		}
	}

	/**
	 * Process a batch of rows from core_search_index_queue.
	 * Called by the elasticsearchindexqueue task — not intended for direct use.
	 *
	 * @param	array	$rows	Rows from core_search_index_queue
	 * @return	bool
	 */
	public function processBatchQueue( array $rows ): bool
	{
		$this->metaDataCache = array();

		$bulkPayload    = array();
		$itemsToRebuild = array(); /* keyed class:id → Item */

		foreach ( $rows as $row )
		{
			$class    = $row['queue_class'];
			$objectId = (int) $row['queue_object_id'];

			if ( $row['queue_action'] === 'remove' )
			{
				if ( !$this->directIndexRemoval( $class, $objectId ) )
				{
					$this->metaDataCache = array();
					return FALSE;
				}
				continue;
			}

			/* Load the object — it may have been deleted since it was queued */
			try
			{
				if ( !class_exists( $class ) )
				{
					continue;
				}
				$object = $class::load( $objectId );
			}
			catch ( OutOfRangeException )
			{
				if ( !$this->directIndexRemoval( $class, $objectId ) )
				{
					$this->metaDataCache = array();
					return FALSE;
				}
				continue;
			}

			/* Resolve parent item before deciding whether this row is still indexable; even skipped/removed comments
			   can change item metadata such as participants, tags, counts, and the items index row. */
			try
			{
				$item = null;
				if ( $object instanceof Item )
				{
					$item = $object;
				}
				elseif ( $object instanceof Comment )
				{
					$item = $object->item();
				}

				if ( $item )
				{
					$itemKey = get_class( $item ) . ':' . $item->{ $item::$databaseColumnId };
					$itemsToRebuild[ $itemKey ] = $item;
				}
			}
			catch ( OutOfRangeException ) { }

			$indexData = $this->indexData( $object );
			if ( !$indexData )
			{
				if ( $object instanceof Item and $object::$firstCommentRequired )
				{
					/* We should be looking for commentClass, not itemClass, so skip deletion */
					continue;
				}

				if ( !$this->directIndexRemoval( $class, $objectId ) )
				{
					$this->metaDataCache = array();
					return FALSE;
				}
				continue;
			}

			if ( !$indexData['index_permissions'] )
			{
				if ( !$this->directIndexRemoval( $class, $objectId ) )
				{
					$this->metaDataCache = array();
					return FALSE;
				}
				continue;
			}

			/* Don't store soft deleted content as restore() re-adds it to the index */
			if ( isset( $indexData['index_hidden'] ) and $indexData['index_hidden'] === -2 )
			{
				if ( !$this->directIndexRemoval( $class, $objectId ) )
				{
					$this->metaDataCache = array();
					return FALSE;
				}
				continue;
			}

			$indexData['index_id'] = $this->getIndexId( $object );

			$bulkPayload[] = array(
				'index' => array(
					'_index' => trim( $this->url->data[ Url::COMPONENT_PATH ], '/' ),
					'_id'    => $indexData['index_id'],
				)
			);
			$bulkPayload[] = $indexData;
		}

		/* Send bulk request to main index */
		if ( $bulkPayload )
		{
			$json = implode( "\n", array_map( 'json_encode', $bulkPayload ) ) . "\n";

			try
			{
				$response = Index::request( $this->url->setPath( '/_bulk' ) )
					->setHeaders( array( 'Content-Type' => 'application/x-ndjson' ) )
					->post( $json );

				if ( $error = $this->getResponseError( $response ) )
				{
					Log::log( $error, 'elasticsearch_response_error' );
					$this->metaDataCache = array();
					return FALSE;
				}

				$response = $response->decodeJson();
				if ( !empty( $response['errors'] ) )
				{
					Log::log( $this->bulkResponseErrors( $response ), 'elasticsearch_bulk_index_errors' );
					$this->metaDataCache = array();
					return FALSE;
				}
			}
			catch ( RequestException $e )
			{
				Log::log( $e, 'elasticsearch' );
				$this->metaDataCache = array();
				return FALSE;
			}
		}

		/* Rebuild metadata and update items index, once per parent item */
		$itemsMaintenancePayload = array();
		foreach ( $itemsToRebuild as $item )
		{
			$this->rebuildMetaData( $item );
			$itemsMaintenancePayload = array_merge( $itemsMaintenancePayload, $this->itemsMaintenanceBulkPayload( $item ) );
		}

		$this->executeBulkPayloadChunked( $itemsMaintenancePayload, LONG_REQUEST_TIMEOUT );

		$this->metaDataCache = array();
		return TRUE;
	}

	/**
	 * Extract a concise list of errors from an Elasticsearch bulk response
	 *
	 * @param	array	$response	Bulk response
	 * @return	array
	 */
	protected function bulkResponseErrors( array $response ): array
	{
		$errors = array();
		foreach ( $response['items'] ?? array() as $item )
		{
			foreach ( $item as $action => $result )
			{
				if ( isset( $result['error'] ) )
				{
					$errors[] = array(
						'action' => $action,
						'id'     => $result['_id'] ?? NULL,
						'status' => $result['status'] ?? NULL,
						'error'  => $result['error'],
					);
				}
			}

			if ( count( $errors ) >= 10 )
			{
				break;
			}
		}

		return $errors ?: array( 'errors' => TRUE );
	}

	/**
	 * Clear out any tasks associated with the search index method
	 *
	 * @return void
	 */
	public function clearTasks(): void
	{
		try
		{
			/* This request *intentionally* goes to _tasks and not (ourpath)/_tasks */
			$response = Index::request( $this->url->setPath( '/_tasks' ), LONG_REQUEST_TIMEOUT )->setHeaders( array( 'Content-Type' => 'application/json' ) )->get();

			if( $error = $this->getResponseError( $response ) )
			{
				throw new ElasticException( $error['type'] . ' ' . $error['reason'] ?? '' );
			}

			$response = $response->decodeJson();

			foreach( $response['nodes'] as $nodeId => $nodeData )
			{
				foreach( $nodeData['tasks'] as $taskId => $taskData )
				{
					/* We only need to worry about deleting parent tasks */
					if( isset( $taskData['parent_task_id'] ) )
					{
						continue;
					}

					/* If the task is cancellable it isn't finished yet */
					if( $taskData['cancellable'] === TRUE )
					{
						continue;
					}

					Index::request( $this->url->setPath( '/.tasks/task' . $taskId ), LONG_REQUEST_TIMEOUT )->setHeaders( array( 'Content-Type' => 'application/json' ) )->delete();
				}
			}
		}
		catch ( ElasticException $e )
		{
			Log::log( $e, 'elasticsearch_response_error' );
		}
		catch( Exception $e )
		{
			Log::log( $e, 'elasticsearch' );
		}
	}

	/**
	 * Get the comment / review counts for an item
	 *
	 * @param	Item	$item					The content item
	 * @return	array|null
	 */
	protected function metaData( Item $item ): ?array
	{
		if( !Content\Search\SearchContent::isSearchable( $item ) )
		{
			return null;
		}

		/* Store the result from metaData() as it is expensive and can run multiple times per index */
		$databaseColumnId = $item::$databaseColumnId;
		$cacheKey = get_class( $item ) . ':' . $item->$databaseColumnId;
		if ( isset( $this->metaDataCache[ $cacheKey ] ) )
		{
			return $this->metaDataCache[ $cacheKey ];
		}

		/* @var array $databaseColumnMap */
		$participants = array( $item->mapped('author') );
		if ( isset( $item::$commentClass ) )
		{
			/* @var Comment $commentClass */
			$commentClass = $item::$commentClass;
			foreach ( Db::i()->select( 'DISTINCT ' . $commentClass::$databasePrefix . $commentClass::$databaseColumnMap['author'], $commentClass::$databaseTable, array( $commentClass::$databasePrefix . $commentClass::$databaseColumnMap['item'] . '=?', $item->$databaseColumnId ) ) as $authorId )
			{
				$participants[] = (int) $authorId;
			}
		}
		if ( isset( $item::$reviewClass ) )
		{
			/* @var Content\Review $reviewClass */
			$reviewClass = $item::$reviewClass;
			foreach ( Db::i()->select( 'DISTINCT ' . $reviewClass::$databasePrefix . $reviewClass::$databaseColumnMap['author'], $reviewClass::$databaseTable, array( $reviewClass::$databasePrefix . $reviewClass::$databaseColumnMap['item'] . '=?', $item->$databaseColumnId ) ) as $authorId )
			{
				$participants[] = (int) $authorId;
			}
		}
		$participants = array_values( array_unique( $participants ) );

		$isSolved = 0;
		if ( IPS::classUsesTrait( $item, 'IPS\Content\Solvable' ) and $item->isSolved() )
		{
			$isSolved = 1;
		}

		$metaData = array(
			'index_comments'		=> $item->mapped('num_comments'),
			'index_reviews'			=> $item->mapped('num_reviews'),
			'index_participants'	=> $participants,
			'index_tags'			=> ( IPS::classUsesTrait( $item, Taggable::class ) ? $item->tags() : [] ),
			'index_prefix'			=> ( IPS::classUsesTrait( $item, Taggable::class ) ? $item->prefix() : null ),
			'index_item_solved'     => $isSolved
		);

		$this->metaDataCache[ $cacheKey ] = $metaData;

		return $metaData;
	}

	/**
	 * Rebuild the comment / review counts /participants for an item
	 *
	 * @param	Item	$item					The content item
	 * @return	void
	 */
	protected function rebuildMetaData( Item $item ): void
	{
		$databaseColumnId = $item::$databaseColumnId;
		$class = get_class( $item );
		$classes = array( $class );
		if ( isset( $class::$commentClass ) )
		{
			$classes[] = $class::$commentClass;
		}
		if ( isset( $class::$reviewClass ) )
		{
			$classes[] = $class::$reviewClass;
		}

		try
		{
			$updates  = array();
			$params	  = array();
			$metaData = $this->metaData( $item );
			foreach ( $metaData as $k => $v )
			{
				$updates[]	= "ctx._source.{$k} = params.param_{$k};";
				if ( is_array( $v ) )
				{
					$params[ 'param_' . $k ]	= ( $k !== 'index_tags' ? array_map( 'intval', $v ) : $v );
				}
				elseif ( is_null( $v ) )
				{
					$params['param_' . $k ]		= null;
				}
				else
				{
					$params['param_' . $k ]		= intval( $v );
				}
			}

			$r = Index::request( $this->url->setPath( $this->url->data[ Url::COMPONENT_PATH ] . '/_update_by_query' )->setQueryString( array( 'conflicts' => 'proceed', 'wait_for_completion' => 'false', 'scroll_size' => Settings::i()->search_index_maxresults ) ), LONG_REQUEST_TIMEOUT )->setHeaders( array( 'Content-Type' => 'application/json' ) )->post( json_encode( array(
				'script'	=> array(
					'source'	=> implode( ' ', $updates ),
					'lang'		=> 'painless',
					'params'	=> $params
				),
				'query'		=> array(
					'bool'		=> array(
						'must'		=> array(
							array(
								'terms'	=> array(
									'index_class' => $classes
								)
							),
							array(
								'term'	=> array(
									'index_item_id' => $item->$databaseColumnId
								)
							),
						)
					)
				)
			) ) );

			if( $error = $this->getResponseError( $r ) )
			{
				throw new ElasticException( $error['type'] . ' ' . $error['reason'] ?? '' );
			}
		}
		catch ( RequestException $e )
		{
			Log::log( $e, 'elasticsearch' );
		}
	}

	/**
	 * Retrieve the search ID for an item
	 *
	 * @param	Content	$object	Item to add
	 * @return	string
	 */
	public function getIndexId( Content $object ): string
	{
		$databaseColumnId = $object::$databaseColumnId;
		return strtolower( str_replace( '\\', '_', substr( get_class( $object ), 4 ) ) ) . '-' . $object->$databaseColumnId;
	}

	/**
	 * Remove item
	 *
	 * @param	Content	$object				Item to remove
	 * @param	bool	$waitForCompletion	Wait for delete-by-query operations to complete
	 * @return	void
	 */
	public function removeFromSearchIndex( Content $object, bool $waitForCompletion=FALSE ): void
	{
		try
		{
			$class    = get_class( $object );
			$idColumn = $class::$databaseColumnId;

			$this->directIndexRemoval( $class, $object->$idColumn, $waitForCompletion );

			if ( !( $object instanceof Item ) )
			{
				$item = $object->item();
				$this->rebuildMetaData( $item );
				$this->updateItemsIndex( $item );
			}
		}
		catch ( RequestException $e )
		{
			Log::log( $e, 'elasticsearch' );
		}
	}

	/**
	 * Direct removal from the search index - only used when we don't need to perform ancillary cleanup (i.e. orphaned data)
	 *
	 * @param	string	$class					Class
	 * @param	int		$id						ID
	 * @param	bool	$waitForCompletion		Wait for delete-by-query operations to complete
	 * @return	bool
	 */
	public function directIndexRemoval( string $class, int $id, bool $waitForCompletion=FALSE ): bool
	{
		try
		{
			$indexId = strtolower( str_replace( '\\', '_', substr( $class, 4 ) ) ) . '-' . $id;
			Index::request( $this->url->setPath( $this->url->data[ Url::COMPONENT_PATH ] . '/_doc/' . $indexId ) )->delete();

			if ( is_subclass_of( $class, 'IPS\Content\Item' ) )
			{
				/* Remove from items index */
				Index::request( $this->itemsUrl->setPath( $this->itemsUrl->data[ Url::COMPONENT_PATH ] . '/_doc/' . $indexId ) )->delete();

				if ( isset( $class::$commentClass ) )
				{
					$commentClass = $class::$commentClass;
					$queryString = array( 'conflicts' => 'proceed' );
					if ( !$waitForCompletion )
					{
						$queryString['wait_for_completion'] = 'false';
					}
					Index::request( $this->url->setPath( $this->url->data[ Url::COMPONENT_PATH ] . '/_delete_by_query' )->setQueryString( $queryString ), LONG_REQUEST_TIMEOUT )->setHeaders( array( 'Content-Type' => 'application/json' ) )->post( json_encode( array(
						'query'	=> array(
							'bool' => array(
								'must' => array(
									array(
										'term'	=> array(
											'index_class' => $commentClass
										)
									),
									array(
										'term'	=> array(
											'index_item_id' => $id
										)
									),
								)
							)
						)
					) ) );
				}
				if ( isset( $class::$reviewClass ) )
				{
					$reviewClass = $class::$reviewClass;
					$queryString = array( 'conflicts' => 'proceed' );
					if ( !$waitForCompletion )
					{
						$queryString['wait_for_completion'] = 'false';
					}
					Index::request( $this->url->setPath( $this->url->data[ Url::COMPONENT_PATH ] . '/_delete_by_query' )->setQueryString( $queryString ), LONG_REQUEST_TIMEOUT )->setHeaders( array( 'Content-Type' => 'application/json' ) )->post( json_encode( array(
						'query'	=> array(
							'bool' => array(
								'must' => array(
									array(
										'term'	=> array(
											'index_class' => $reviewClass
										)
									),
									array(
										'term'	=> array(
											'index_item_id' => $id
										)
									),
								)
							)
						)
					) ) );
				}
			}

			return TRUE;
		}
		catch ( RequestException $e )
		{
			Log::log( $e, 'elasticsearch' );
			return FALSE;
		}
	}

	/**
	 * Removes all content for a classs
	 *
	 * @param	string		$class 	The class
	 * @param	int|NULL	$containerId		The container ID to delete, or NULL
	 * @param	int|NULL	$authorId			The author ID to delete, or NULL
	 * @return	void
	 */
	public function removeClassFromSearchIndex( string $class, int|null $containerId=null, int|null $authorId=null ): void
	{
		try
		{
			$itemsClasses = array( $class );
			if ( is_subclass_of( $class, Item::class ) )
			{
				if ( $class::$firstCommentRequired and isset( $class::$commentClass ) )
				{
					$itemsClasses[] = $class::$commentClass;
				}
			}
			$deleteItemsIndex = ( !$authorId || is_subclass_of( $class, Item::class ) );

			if ( $containerId or $authorId )
			{
				$query = array(
					'bool'	=> array(
						'must'	=> array(
							array(
								'term'	=> array(
									'index_class' => $class
								)
							)
						)
					)
				);

				if ( $containerId )
				{
					$query['bool']['must'][] = array(
						'term'	=> array(
							'index_container_id' => $containerId
						)
					);
				}

				if ( $authorId )
				{
					$query['bool']['must'][] = array(
						'term'	=> array(
							'index_author' => $authorId
						)
					);
				}

				Index::request( $this->url->setPath( $this->url->data[ Url::COMPONENT_PATH ] . '/_delete_by_query' )->setQueryString( array( 'conflicts' => 'proceed', 'wait_for_completion' => 'false' ) ) )->setHeaders( array( 'Content-Type' => 'application/json' ) )->post( json_encode( array(
					'query'	=> $query
				) ) );

				if ( $deleteItemsIndex )
				{
					$itemsQuery = array(
						'bool' => array(
							'must' => array(
								array(
									'terms' => array(
										'index_class' => array_values( array_unique( $itemsClasses ) )
									)
								)
							)
						)
					);

					if ( $containerId )
					{
						$itemsQuery['bool']['must'][] = array(
							'term' => array(
								'index_container_id' => $containerId
							)
						);
					}

					if ( $authorId and is_subclass_of( $class, Item::class ) )
					{
						$itemsQuery['bool']['must'][] = array(
							'term' => array(
								'index_item_author' => $authorId
							)
						);
					}

					Index::request( $this->itemsUrl->setPath( $this->itemsUrl->data[ Url::COMPONENT_PATH ] . '/_delete_by_query' )->setQueryString( array( 'conflicts' => 'proceed', 'wait_for_completion' => 'false' ) ) )->setHeaders( array( 'Content-Type' => 'application/json' ) )->post( json_encode( array(
						'query'	=> $itemsQuery
					) ) );
				}
			}
			else
			{
				Index::request( $this->url->setPath( $this->url->data[ Url::COMPONENT_PATH ] . '/_delete_by_query' )->setQueryString( array( 'conflicts' => 'proceed', 'wait_for_completion' => 'false' ) ) )->setHeaders( array( 'Content-Type' => 'application/json' ) )->post( json_encode( array(
					'query'	=> array(
						'term'	=> array(
							'index_class' => $class
						)
					)
				) ) );

				if ( $deleteItemsIndex )
				{
					Index::request( $this->itemsUrl->setPath( $this->itemsUrl->data[ Url::COMPONENT_PATH ] . '/_delete_by_query' )->setQueryString( array( 'conflicts' => 'proceed', 'wait_for_completion' => 'false' ) ) )->setHeaders( array( 'Content-Type' => 'application/json' ) )->post( json_encode( array(
						'query'	=> array(
							'terms'	=> array(
								'index_class' => array_values( array_unique( $itemsClasses ) )
							)
						)
					) ) );
				}
			}
		}
		catch ( RequestException $e )
		{
			Log::log( $e, 'elasticsearch' );
		}
	}

	/**
	 * Mass Update (when permissions change, for example)
	 *
	 * @param	string				$class 						The class
	 * @param	int|NULL			$containerId				The container ID to update, or NULL
	 * @param	int|NULL			$itemId						The item ID to update, or NULL
	 * @param	string|NULL			$newPermissions				New permissions (if applicable)
	 * @param	int|NULL			$newHiddenStatus			New hidden status (if applicable) special value 2 can be used to indicate hidden only by parent
	 * @param	int|NULL			$newContainer				New container ID (if applicable)
	 * @param	int|NULL			$authorId					The author ID to update, or NULL
	 * @param	int|NULL			$newItemId					The new item ID (if applicable)
	 * @param	int|NULL			$newItemAuthorId			The new item author ID (if applicable)
	 * @param	bool				$addAuthorToPermissions		If true, the index_author_id will be added to $newPermissions - used when changing the permissions for a node which allows access only to author's items
	 * @return	void
	 */
	public function massUpdate( string $class, int|null $containerId = null, int|null $itemId = null, string|null $newPermissions = null, int|null $newHiddenStatus = null, int|null $newContainer = null, int|null $authorId = null, int|null $newItemId = null, int|null $newItemAuthorId = null, bool $addAuthorToPermissions = FALSE ): void
	{
		try
		{
			$conditions = array();
			$conditions['must'][] = array(
				'term'	=> array(
					'index_class' => $class
				)
			);
			if ( $containerId !== NULL )
			{
				$conditions['must'][] = array(
					'term'	=> array(
						'index_container_id' => $containerId
					)
				);
			}
			if ( $itemId !== NULL )
			{
				$conditions['must'][] = array(
					'term'	=> array(
						'index_item_id' => $itemId
					)
				);
			}
			if ( $authorId !== NULL )
			{
				$conditions['must'][] = array(
					'term'	=> array(
						'index_item_author' => $authorId
					)
				);
			}

			$itemsIndexClass = NULL;
			if ( is_subclass_of( $class, Item::class ) )
			{
				/* Again, we are weird and when storing topics, we want to store it as the comment class, not the item class */
				$itemsIndexClass = ( $class::$firstCommentRequired and isset( $class::$commentClass ) ) ? $class::$commentClass : $class;
			}
			elseif ( is_subclass_of( $class, Comment::class ) and isset( $class::$itemClass ) )
			{
				$itemClass = $class::$itemClass;
				if ( $itemClass::$firstCommentRequired )
				{
					$itemsIndexClass = $class;
				}
			}

			$itemsIndexConditions = function ( array $sourceConditions ) use ( $itemsIndexClass ): array
			{
				$itemsConditions = $sourceConditions;
				foreach ( $itemsConditions['must'] as $key => $condition )
				{
					if ( isset( $condition['term']['index_class'] ) )
					{
						$itemsConditions['must'][ $key ] = array(
							'term'	=> array(
								'index_class' => $itemsIndexClass
							)
						);
						break;
					}
				}

				return $itemsConditions;
			};

			$updates	= array();
			$params		= array();
			if ( $newPermissions !== NULL )
			{
				$updates[] = "ctx._source.index_permissions = params.params_indexpermissions;";
				$params['params_indexpermissions']	= explode( ',', $newPermissions );
			}
			if ( $newContainer )
			{
				$updates[] = "ctx._source.index_container_id = params.params_indexcontainer;";
				$params['params_indexcontainer']	= $newContainer;

				/* @var Item $itemClass */
				if ( $itemClass = ( in_array( Item::class, class_parents( $class ) ) ? $class : $class::$itemClass ) and $containerClass = $itemClass::$containerNodeClass and IPS::classUsesTrait( $containerClass, 'IPS\Content\ClubContainer' ) and $clubIdColumn = $containerClass::clubIdColumn() )
				{
					try
					{
						$updates[] = "ctx._source.index_club_id = params.params_indexclub;";
						$params['params_indexclub']	= intval( $containerClass::load( $newContainer )->$clubIdColumn );
					}
					catch ( OutOfRangeException )
					{
						$updates[] = "ctx._source.index_club_id = params.params_indexclub;";
						$params['params_indexclub']	= null;
					}
				}
			}
			if ( $newItemId )
			{
				$updates[] = "ctx._source.index_item_id = params.params_indexitem;";
				$params['params_indexitem']	= $newItemId;
			}
			if ( $newItemAuthorId )
			{
				$updates[] = "ctx._source.index_item_author = params.params_indexauthor;";
				$params['params_indexauthor']	= $newItemAuthorId;
			}

			if ( count( $updates ) )
			{
				Index::request( $this->url->setPath( $this->url->data[ Url::COMPONENT_PATH ] . '/_update_by_query' )->setQueryString( array( 'conflicts' => 'proceed', 'wait_for_completion' => 'false', 'scroll_size' => Settings::i()->search_index_maxresults ) ) )->setHeaders( array( 'Content-Type' => 'application/json' ) )->post( json_encode( array(
					'script'	=> array(
						'source'	=> implode( ' ', $updates ),
						'lang'		=> 'painless',
						'params'	=> $params
					),
					'query'		=> array(
						'bool'		=> $conditions
					)
				) ) );

				if ( $itemsIndexClass )
				{
					Index::request( $this->itemsUrl->setPath( $this->itemsUrl->data[ Url::COMPONENT_PATH ] . '/_update_by_query' )->setQueryString( array( 'conflicts' => 'proceed', 'wait_for_completion' => 'false', 'scroll_size' => Settings::i()->search_index_maxresults ) ) )->setHeaders( array( 'Content-Type' => 'application/json' ) )->post( json_encode( array(
						'script'	=> array(
							'source'	=> implode( ' ', $updates ),
							'lang'		=> 'painless',
							'params'	=> $params
						),
						'query'		=> array(
							'bool'		=> $itemsIndexConditions( $conditions )
						)
					) ) );
				}
			}

			if ( $addAuthorToPermissions )
			{
				$addAuthorToPermissionsConditions = $conditions;
				$addAuthorToPermissionsConditions['must_not'][] = array(
					'term'	=> array(
						'index_author' => 0
					)
				);

				Index::request( $this->url->setPath( $this->url->data[ Url::COMPONENT_PATH ] . '/_update_by_query' )->setQueryString( array( 'conflicts' => 'proceed', 'wait_for_completion' => 'false', 'scroll_size' => Settings::i()->search_index_maxresults ) ) )->setHeaders( array( 'Content-Type' => 'application/json' ) )->post( json_encode( array(
					'script'	=> array(
						'source'	=> "ctx._source.index_permissions.add( 'm' + ctx._source.index_author );",
						'lang'		=> 'painless'
					),
					'query'		=> array(
						'bool'		=> $conditions
					)
				) ) );

				if ( $itemsIndexClass )
				{
					/* Items index index_author is the last comment author, so use item author here. */
					$itemsAddAuthorConditions = $itemsIndexConditions( $conditions );
					$itemsAddAuthorConditions['must_not'][] = array(
						'term'	=> array(
							'index_item_author' => 0
						)
					);

					Index::request( $this->itemsUrl->setPath( $this->itemsUrl->data[ Url::COMPONENT_PATH ] . '/_update_by_query' )->setQueryString( array( 'conflicts' => 'proceed', 'wait_for_completion' => 'false', 'scroll_size' => Settings::i()->search_index_maxresults ) ) )->setHeaders( array( 'Content-Type' => 'application/json' ) )->post( json_encode( array(
						'script'	=> array(
							'source'	=> "ctx._source.index_permissions.add( 'm' + ctx._source.index_item_author );",
							'lang'		=> 'painless'
						),
						'query'		=> array(
							'bool'		=> $itemsAddAuthorConditions
						)
					) ) );
				}
			}

			if ( $newHiddenStatus !== NULL )
			{
				if ( $newHiddenStatus === 2 )
				{
					$conditions['must'][] = array(
						'term'	=> array(
							'index_hidden' => 0
						)
					);
				}
				else
				{
					$conditions['must'][] = array(
						'term'	=> array(
							'index_hidden' => 2
						)
					);
				}

				Index::request( $this->url->setPath( $this->url->data[ Url::COMPONENT_PATH ] . '/_update_by_query' )->setQueryString( array( 'conflicts' => 'proceed', 'wait_for_completion' => 'false', 'scroll_size' => Settings::i()->search_index_maxresults ) ) )->setHeaders( array( 'Content-Type' => 'application/json' ) )->post( json_encode( array(
					'script'	=> array(
						'source'	=> "ctx._source.index_hidden = params.newHiddenStatus;",
						'lang'		=> 'painless',
						'params'	=> array( 'newHiddenStatus' => $newHiddenStatus )
					),
					'query'		=> array(
						'bool'		=> $conditions
					)
				) ) );

				if ( $itemsIndexClass )
				{
					Index::request( $this->itemsUrl->setPath( $this->itemsUrl->data[ Url::COMPONENT_PATH ] . '/_update_by_query' )->setQueryString( array( 'conflicts' => 'proceed', 'wait_for_completion' => 'false', 'scroll_size' => Settings::i()->search_index_maxresults ) ) )->setHeaders( array( 'Content-Type' => 'application/json' ) )->post( json_encode( array(
						'script'	=> array(
							'source'	=> "ctx._source.index_hidden = params.newHiddenStatus;",
							'lang'		=> 'painless',
							'params'	=> array( 'newHiddenStatus' => $newHiddenStatus )
						),
						'query'		=> array(
							'bool'		=> $itemsIndexConditions( $conditions )
						)
					) ) );
				}
			}
		}
		catch ( RequestException $e )
		{
			Log::log( $e, 'elasticsearch' );
		}
	}

	/**
	 * Convert an arbitary number of elasticsearch conditions into a query
	 *
	 * @param	array	$conditions	Conditions
	 * @return	array
	 */
	public static function convertConditionsToQuery( array $conditions ): array
	{
		if ( count( $conditions ) == 1 )
		{
			return $conditions[0];
		}
		elseif ( count( $conditions ) == 0 )
		{
			return array( 'match_all' => new StdClass );
		}
		else
		{
			return array(
				'bool' => array(
					'must' => $conditions
				)
			);
		}
	}

	/**
	 * Update data for the first and last comment after a merge.
	 * Re-indexes the first and last comment, then refreshes the items index for the item.
	 *
	 * @param	Item	$item	The item
	 * @return	void
	 */
	public function rebuildAfterMerge( Item $item ): void
	{
		if ( $item::$commentClass )
		{
			$firstComment = $item->comments( 1, 0, 'date', 'asc', NULL, FALSE, NULL, NULL, TRUE, FALSE, FALSE );
			$lastComment  = $item->comments( 1, 0, 'date', 'desc', NULL, FALSE, NULL, NULL, TRUE, FALSE, FALSE );

			try
			{
				if ( $firstComment )
				{
					$this->index( $firstComment );
				}
				if ( $lastComment )
				{
					$this->index( $lastComment );
				}

				$this->updateItemsIndex( $item );
			}
			catch ( RequestException $e )
			{
				Log::log( $e, 'elasticsearch' );
			}
		}
	}

	/**
	 * Reset the last comment pointer for a content item.
	 *
	 * Elastic tracks the current activity-stream document in the items index rather
	 * than with an index_is_last_comment flag on the main index documents.
	 *
	 * @param	array				$classes					The classes for this item/comment set
	 * @param	int|NULL			$indexItemId				The index item ID
	 * @param	int|NULL			$ignoreId					ID to ignore because it is being removed
	 * @param	int|null			$firstCommentId				The first comment in this item, used only if $firstCommentRequired
	 * @return	void
	 */
	public function resetLastComment( array $classes, int|null $indexItemId, int|null $ignoreId = null, int|null $firstCommentId=null ): void
	{
		if ( $indexItemId === null )
		{
			return;
		}

		$itemClass = null;
		foreach ( $classes as $class )
		{
			if ( is_subclass_of( $class, Item::class ) )
			{
				$itemClass = $class;
				break;
			}

			if ( is_subclass_of( $class, Comment::class ) )
			{
				$itemClass = $class::$itemClass;
				break;
			}
		}

		if ( $itemClass === null )
		{
			return;
		}

		try
		{
			$item = $itemClass::load( $indexItemId );
			$this->updateItemsIndex( $item );
		}
		catch ( OutOfRangeException )
		{
			try
			{
				$indexId = strtolower( str_replace( '\\', '_', substr( $itemClass, 4 ) ) ) . '-' . $indexItemId;
				Index::request( $this->itemsUrl->setPath( $this->itemsUrl->data[ Url::COMPONENT_PATH ] . '/_doc/' . $indexId ) )->delete();
			}
			catch ( RequestException $e )
			{
				Log::log( $e, 'elasticsearch' );
			}
		}
	}

	/**
	 * Prune search index
	 *
	 * @param	DateTime|NULL	$cutoff	The date to delete index records from, or NULL to delete all
	 * @return	void
	 */
	public function prune( DateTime|null $cutoff = NULL ): void
	{
		if ( $cutoff )
		{
			try
			{
				Index::request( $this->url->setPath( $this->url->data[ Url::COMPONENT_PATH ] . '/_delete_by_query' )->setQueryString( array( 'conflicts' => 'proceed', 'wait_for_completion' => 'false' ) ) )->setHeaders( array( 'Content-Type' => 'application/json' ) )->post( json_encode( array(
					'query'	=> array(
						'range'	=> array(
							'index_date_updated' => array(
								'lt' => $cutoff->getTimestamp()
							)
						)
					)
				) ) );

				Index::request( $this->itemsUrl->setPath( $this->itemsUrl->data[ Url::COMPONENT_PATH ] . '/_delete_by_query' )->setQueryString( array( 'conflicts' => 'proceed', 'wait_for_completion' => 'false' ) ) )->setHeaders( array( 'Content-Type' => 'application/json' ) )->post( json_encode( array(
					'query'	=> array(
						'range'	=> array(
							'index_date_updated' => array(
								'lt' => $cutoff->getTimestamp()
							)
						)
					)
				) ) );
			}
			catch ( RequestException $e )
			{
				Log::log( $e, 'elasticsearch' );
			}
		}
		else
		{
			$this->init();
		}
	}

	/**
	 * Given a list of item index IDs, return the ones that a given member has participated in
	 *
	 * @param	array		$itemIndexIds	Item index IDs
	 * @param	Member	$member			The member
	 * @return 	array
	 */
	public function iPostedIn( array $itemIndexIds, Member $member ): array
	{
		try
		{
			/* Set the query */
			$query = array(
				'bool'	=> array(
					'filter' => array(
						array(
							'terms'	=> array(
								'index_item_index_id' => $itemIndexIds
							),
						),
						array(
							'term'	=> array(
								'index_author' => $member->member_id
							)
						)
					)
				)
			);

			/* Get the count */
			$count = Index::request( $this->url->setPath( $this->url->data[ Url::COMPONENT_PATH ] . '/_search' ) )->setHeaders( array( 'Content-Type' => 'application/json' ) )->get( json_encode( array(
				'size'	=> 0,
				'query'	=> $query
			) ) )->decodeJson();
			$total = $count['hits']['total']['value'] ?? $count['hits']['total'];
			if ( !$total )
			{
				return array();
			}

			/* Now get the unique item ids */
			$results = Index::request( $this->url->setPath( $this->url->data[ Url::COMPONENT_PATH ] . '/_search' ) )->setHeaders( array( 'Content-Type' => 'application/json' ) )->get( json_encode( array(
				'aggs'	=> array(
					'itemIds' => array(
						'terms'	=> array(
							'field'	=> 'index_item_index_id',
							'size'	=> $total
						)
					)
				),
				'query'	=> $query
			) ) )->decodeJson();
		}
		catch ( Exception $e )
		{
			Log::log( $e, 'elasticsearch' );
			return array();
		}

		$iPostedIn = array();
		foreach ( $results['aggregations']['itemIds']['buckets'] as $result )
		{
			if ( $result['doc_count'] )
			{
				$iPostedIn[] = $result['key'];
			}
		}

		return $iPostedIn;
	}

	/**
	 * Given a list of "index_class_type_id_hash"s, return the ones that a given member has permission to view
	 *
	 * @param	array		$hashes			Item index hashes
	 * @param	Member	$member			The member
	 * @param	int|NULL		$limit			Number of results to return
	 * @return 	array
	 */
	public function hashesWithPermission( array $hashes, Member $member, int|null $limit = null ): array
	{
		try
		{
			$results = Index::request( $this->url->setPath( $this->url->data[ Url::COMPONENT_PATH ] . '/_search' ) )->setHeaders( array( 'Content-Type' => 'application/json' ) )->get( json_encode( array(
				'query'	=> array(
					'bool'	=> array(
						'filter' => array(
							array(
								'terms' => array(
									'index_class_type_id_hash' => $hashes
								)
							),
							array(
								'terms' => array(
									'index_permissions' => array_merge( $member->permissionArray(), array( '*' ) )
								)
							),
							array(
								'term'	=> array(
									'index_hidden' => 0
								)
							)
						)
					)
				),
				'size'	=> $limit ?: 10 // If we define a limit, use that, otherwise default to 10 which is ElasticSearch's default
			) ) )->decodeJson();
		}
		catch ( Exception $e )
		{
			Log::log( $e, 'elasticsearch' );
			return array();
		}

		$hashesWithPermission = array();
		foreach ( $results['hits']['hits'] as $result )
		{
			$hashesWithPermission[ $result['_source']['index_class_type_id_hash'] ] = $result['_source']['index_class_type_id_hash'];
		}

		return $hashesWithPermission;
	}

	/**
	 * Get timestamp of oldest thing in index
	 *
	 * @return 	int|null
	 */
	public function firstIndexDate(): int|NULL
	{
		try
		{
			$results = Index::request( $this->url->setPath( $this->url->data[ Url::COMPONENT_PATH ] . '/_search' ) )->setHeaders( array( 'Content-Type' => 'application/json' ) )->get( json_encode( array(
				'size'	=> 1,
				'sort'	=> array( array( 'index_date_updated' => 'asc' ) )
			) ) )->decodeJson();

			if ( isset( $results['hits']['hits'][0] ) )
			{
				return $results['hits']['hits'][0]['_source']['index_date_updated'];
			}

			return NULL;
		}
		catch ( Exception $e )
		{
			Log::log( $e, 'elasticsearch' );
			return NULL;
		}
	}

	/**
	 * Convert terms into stemmed terms for the highlighting JS
	 *
	 * @param	array	$terms	Terms
	 * @return	array
	 */
	public function stemmedTerms( array $terms ): array
	{
		$analyzer = Settings::i()->search_elastic_analyzer;
		if ( $analyzer === 'custom' )
		{
			$analysisSettings = json_decode( '{' . Settings::i()->search_elastic_custom_analyzer . '}', TRUE );
			$analyzer = key( $analysisSettings['analyzer'] );
		}

		try
		{
			$results = Index::request( $this->url->setPath( '/_analyze' ) )->setHeaders( array( 'Content-Type' => 'application/json' ) )->get( json_encode( array(
				'analyzer'	=> $analyzer,
				'text'		=> implode( ' ', $terms )
			) ) )->decodeJson();

			if ( isset( $results['tokens'] ) )
			{
				$stemmed = $terms;
				foreach ( $results['tokens'] as $token )
				{
					$stemmed[] = $token['token'];
				}
				return $stemmed;
			}

			return $terms;
		}
		catch ( Exception )
		{
			return $terms;
		}
	}

	/**
	 * Supports filtering by views?
	 *
	 * @return	bool
	 */
	public function supportViewFiltering(): bool
	{
		return FALSE;
	}

	/**
	 * Wrapper to account for log in where needed
	 *
	 * @param Url $url
	 * @param int|null $timeout
	 * @return Curl
	 */
	public static function request( Url $url, int|null $timeout=NULL ) : Curl
	{
		if ( ELASTICSEARCH_USER or ELASTICSEARCH_PASSWORD )
		{
			return $url->request( $timeout )->login( ELASTICSEARCH_USER, ELASTICSEARCH_PASSWORD );
		}

		return $url->request( $timeout );
	}

	/**
	 * Check response to see if an error was produced
	 *
	 * @param	Response	$response	Response object
	 * @return	array|null
	 */
	protected function getResponseError( Response $response ): array|NULL
	{
		/* Log any errors */
		if( $response->httpResponseCode != 200 AND $content = $response->decodeJson() AND isset( $content['error'] ) )
		{
			return $content['error'];
		}

		return NULL;
	}
}

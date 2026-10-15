<?php
/**
 * @brief		largeTopics Task
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @package		Invision Community
{subpackage}
 * @since		09 Oct 2025
 */

namespace IPS\forums\tasks;

use IPS\Db;
use IPS\forums\Topic;
use IPS\Patterns\ActiveRecordIterator;
use IPS\Task;
use IPS\Task\Exception as TaskException;
use function defined;
use const IPS\LARGE_TOPIC_LOCK;

/* To prevent PHP errors (extending class does not exist) revealing path */
if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * largeTopics Task
 */
class largeTopics extends Task
{
	/**
	 * @brief	timestamp of the earliest topic we want to fetch
	 * @var		int
	 */
	const EARLIEST_TOPICS_TO_FETCH = 1762174055;

	/**
	 * @brief	Batch Size
	 * @var		int
	 */
	const NO_OF_TOPICS_TO_FETCH = 10;

	/**
	 * Execute
	 *
	 * If ran successfully, should return anything worth logging. Only log something
	 * worth mentioning (don't log "task ran successfully"). Return NULL (actual NULL, not '' or 0) to not log (which will be most cases).
	 * If an error occurs which means the task could not finish running, throw an \IPS\Task\Exception - do not log an error as a normal log.
	 * Tasks should execute within the time of a normal HTTP request.
	 *
	 * @return	mixed	Message to log or NULL
	 * @throws	TaskException
	 */
	public function execute() : mixed
	{
		$largeTopics = iterator_to_array(
			new ActiveRecordIterator(
				Db::i()->select( '*', 'forums_topics', [ 'posts + topic_queuedposts >= ? and state=? and last_post > ?', LARGE_TOPIC_LOCK, 'open', static::EARLIEST_TOPICS_TO_FETCH ] , limit: static::NO_OF_TOPICS_TO_FETCH ),
				Topic::class
			)
		);

		$log = '';
		/** @var Topic $topic */
		foreach( $largeTopics as $topic )
		{
			$topic->autoCloseLargeTopic();
			$log .= "Splitting topic {$topic->tid} with {$topic->posts} posts;";
		}

		return $log ?: null;
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
	public function cleanup() : void
	{
		
	}
}
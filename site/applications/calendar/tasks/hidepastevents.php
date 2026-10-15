<?php
/**
 * @brief		hidepastevents Task
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @package		Invision Community
 * @since		28 Jan 2026
 */

namespace IPS\calendar\tasks;

use DateTimeZone;
use IPS\calendar\Calendar;
use IPS\calendar\Event;
use IPS\Content\Search\Index;
use IPS\DateTime;
use IPS\Db;
use IPS\Task;
use IPS\Task\Exception as TaskException;
use function defined;

/* To prevent PHP errors (extending class does not exist) revealing path */
if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * hidepastevents Task
 */
class hidepastevents extends Task
{
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
		/* Get all calendars that are hiding past events */
		$calendarIds = iterator_to_array(
			Db::i()->select( 'cal_id', 'calendar_calendars',
				[ '(' . Db::i()->bitwiseWhere( Calendar::$bitOptions['calendar_bitoptions'], 'bw_skip_past_events', true, 'cal_' ) . ')' ] )
		);

		if( empty( $calendarIds ) )
		{
			$this->enabled = false;
			$this->save();
			return null;
		}

		$now = DateTime::create();
		$lastRun = DateTime::ts( $this->last_run );
		$log = '';
		$this->runUntilTimeout( function() use ( &$log, $calendarIds, $now, $lastRun ) {

			/* Get all events that have ended since the last time the task was run */
			$now = $now->setTimezone( new DateTimeZone( 'UTC' ) )->format( 'Y-m-d H:i:s' );
			$lastRun = $lastRun->setTimezone( new DateTimeZone( 'UTC' ) )->format( 'Y-m-d H:i:s' );

			$events = iterator_to_array(
				Db::i()->select( '*', 'calendar_events', [
					[ Db::i()->in( 'event_calendar_id', $calendarIds ) ],
					[ '( ( event_end_date is null and event_start_date BETWEEN ? AND ? ) OR event_end_date BETWEEN ? AND ? )', $lastRun, $now, $lastRun, $now ]
				] )
			);

			foreach( $events as $event )
			{
				$log .= $event['event_id'] . '; ';
				Index::i()->massUpdate( Event::class, null, $event['event_id'], '' );
				Index::i()->massUpdate( Event\Comment::class, null, $event['event_id'], '' );
				Index::i()->massUpdate( Event\Review::class, null, $event['event_id'], '' );
			}

			return (bool) count( $events );
		});

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
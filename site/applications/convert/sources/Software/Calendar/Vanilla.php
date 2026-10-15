<?php

/**
 * @brief		Converter Vanilla Events Class
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @package		Invision Community
 * @subpackage	convert
 * @since		18 May 2026
 */

namespace IPS\convert\Software\Calendar;
use Exception;
use IPS\calendar\Event;
use IPS\Content;
use IPS\convert\App;
use IPS\convert\Software;
use IPS\convert\Software\Core\Vanilla as VanillaCore;
use IPS\convert\Tools\Vanilla\AST;
use IPS\Http\Url;
use IPS\Request;
use IPS\Task;
use OutOfRangeException;
use function defined;

/* To prevent PHP errors (extending class does not exist) revealing path */
if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * Vanilla Calendar Converter
 */
class Vanilla extends Software
{
	/**
	 * Software Name
	 *
	 * @return    string
	 */
	public static function softwareName(): string
	{
		/* Child classes must override this method */
		return "Vanilla Cloud";
	}

	/**
	 * Software Key
	 *
	 * @return    string
	 */
	public static function softwareKey(): string
	{
		/* Child classes must override this method */
		return "vanilla";
	}

	/**
	 * Requires Parent
	 *
	 * @return    boolean
	 */
	public static function requiresParent(): bool
	{
		return TRUE;
	}

	/**
	 * Possible Parent Conversions
	 *
	 * @return    array|null
	 */
	public static function parents(): ?array
	{
		return [ 'core' => [ 'vanilla' ] ];
	}

	/**
	 * Content we can convert from this software.
	 *
	 * @return    array|null
	 */
	public static function canConvert(): ?array
	{
		return [
			'convertCalendarCalendars' => [
				'table' => 'Group',
				'where' => NULL
			],
			'convertCalendarEvents' => [
				'table' => 'Event',
				'where' => NULL
			],
			'convertCalendarRsvps' => [
				'table' => 'UserEvent',
				'where' => NULL
			],
			'convertCalendarComments' => [
				'table'		=> 'Comment',
				'where'		=> [ 'parentRecordType=?', 'event' ]
			]
		];
	}

	/**
	 * Finish - Adds everything it needs to the queues and clears data store
	 *
	 * @return    array        Messages to display
	 */
	public function finish(): array
	{
		/* Content Rebuilds */
		Task::queue( 'convert', 'RebuildContent', [ 'app' => $this->app->app_id, 'link' => 'calendar_events', 'class' => Event::class ], 2, [ 'app', 'link', 'class' ] );
		Task::queue( 'core', 'RebuildItemCounts', [ 'class' => Event::class ], 3, [ 'class' ] );

		return [ "f_rebuild_events", "f_recount_calendar" ];
	}

	/**
	 * Pre-process content for the Invision Community text parser
	 *
	 * @param	string			The post
	 * @param	string|null		Content Classname passed by post-conversion rebuild
	 * @param	int|null		Content ID passed by post-conversion rebuild
	 * @param	App|null		App object if available
	 * @return	string			The converted post
	 */
	public static function fixPostData( string $post, ?string $className=null, ?int $contentId=null, ?App $app=null ): string
	{
		return VanillaCore::fixPostData( $post, $className, $contentId, $app );
	}

	/**
	 * Convert calendars
	 *
	 * @return	void
	 */
	public function convertCalendarCalendars() : void
	{
		$libraryClass = $this->getLibrary();
		$libraryClass::setKey( 'GroupID' );

		$calendars = $this->fetch( 'Group', 'GroupID' );

		foreach( $calendars AS $row )
		{
			$libraryClass->convertCalendar( [
				'cal_id'			=> $row['GroupID'] + 10000,
				'cal_title'			=> 'Events',
				'cal_club_id'     	=> $row['GroupID'],
			] );

			$libraryClass->setLastKeyValue( $row['GroupID'] );
		}
	}

	/**
	 * Convert events
	 *
	 * @return	void
	 */
	public function convertCalendarEvents() : void
	{
		$libraryClass = $this->getLibrary();
		$libraryClass::setKey( 'EventID' );

		try
		{
			$this->app->getLink( 1, 'calendar_calendars' );
		}
		catch( OutOfRangeException  )
		{
			$libraryClass->convertCalendar( [
				'cal_id'			=> 1,
				'cal_title'			=> 'Converted Events',
			] );
		}

		foreach( $this->fetch( 'Event', 'EventID' ) as $row )
		{
			/* Is this in a group/club? */
			$calendarId = 1;
			if( !empty( $row['GroupID'] ) )
			{
				$calendarId = $row['GroupID'] + 10000;
			}

			// Add Format Type (for later processing) if Markdown
			$format = strtolower( $row['Format'] );
			if( $format == 'markdown' )
			{
				$row['Body'] = '<!--Markdown-->' . $row['Body'];
			}
			elseif( $format == 'rich' )
			{
				$row['Body'] = VanillaCore::processQuill( $row['Body'], $this->app, 'calendar_event', $calendarId, $row['EventID'] );
			}
			elseif( $format == 'rich2' )
			{
				$row['Body'] = AST::parse( $row['Body'], $this->app, 'calendar_event', $calendarId, $row['EventID'] );
			}

			$row['Body'] = preg_replace( "/\[ATTACH=\d+\]\s*<br>/i", '', $row['Body'] );

			// Cover photo
			$coverPhoto = $coverPhotoPath = NULL;
			try
			{
				if( $media = $this->db->select( '*', 'Media', [ 'ForeignID=? AND ForeignTable=? AND Active=?', $row['EventID'], 'Event', 1 ] )->first() )
				{
					$coverPhoto = pathinfo( $media['Path'], PATHINFO_BASENAME );
					$coverPhotoPath = VanillaCore::parseMediaLocation( $media['Path'], $this->app->_parent->_session['more_info']['convertMembers']['attach_location'] );
				}
			}
			catch( \UnderflowException ) {}

			$libraryClass->convertCalendarEvent( [
				'event_id'			=> $row['EventID'],
				'event_calendar_id'	=> $calendarId,
				'event_member_id'	=> $row['InsertUserID'],
				'event_title'		=> $row['Name'],
				'event_content'		=> $row['Body'],
				'event_saved'		=> VanillaCore::mysqlToDateTime( $row['DateInserted'] ),
				'event_start_date'	=> VanillaCore::mysqlToDateTime( $row['DateStarts'] ),
				'event_end_date'	=> VanillaCore::mysqlToDateTime( $row['DateEnds'] ),
				'event_location'	=> $row['Location'],
				'event_url'			=> $row['LocationUrl'],
				'event_online'		=> str_starts_with( $row['LocationUrl'], 'http' ),
				'event_cover_photo' => $coverPhoto
			], filepath: $coverPhotoPath );

			$libraryClass->setLastKeyValue( $row['EventID'] );
		}
	}

	/**
	 * Convert RSVPs
	 *
	 * @return	void
	 */
	public function convertCalendarRsvps() : void
	{
		$libraryClass = $this->getLibrary();
		$libraryClass::$usingKeys = FALSE;

		foreach( $this->fetch( 'UserEvent', 'UserID' ) as $row )
		{
			$response = match ( $row['Attending'] )
			{
				'No' => Event::RSVP_NO,
				'Interested' => Event::RSVP_MAYBE,
				'Yes' => Event::RSVP_YES
			};

			$libraryClass->convertCalendarRsvp( [
				'rsvp_event_id' => $row['EventID'],
				'rsvp_member_id' => $row['UserID'],
				'rsvp_date' => VanillaCore::mysqlToDateTime( $row['DateInserted'] ),
				'rsvp_response' => $response
			] );
		}
	}

	/**
	 * Convert Calendar Comments
	 *
	 * @return	void
	 */
	public function convertCalendarComments() : void
	{
		$libraryClass = $this->getLibrary();
		$libraryClass::setKey( 'CommentID' );

		foreach( $this->fetch( 'Comment', 'CommentID', [ 'parentRecordType=?', 'event' ] ) AS $row )
		{
			// Add Format Type (for later processing) if Markdown
			$format = strtolower( $row['Format'] );
			if( $format == 'markdown' )
			{
				$row['Body'] = '<!--Markdown-->' . $row['Body'];
			}
			elseif( $format == 'rich' )
			{
				$row['Body'] = VanillaCore::processQuill( $row['Body'], $this->app, 'calendar_event_comments', $row['parentRecordID'], $row['CommentID'] );
			}
			elseif( $format == 'rich2' )
			{
				$row['Body'] = AST::parse( $row['Body'], $this->app, 'calendar_event_comments', $row['parentRecordID'], $row['CommentID'] );
			}

			$libraryClass->convertCalendarComment([
				'comment_id'		=> $row['CommentID'],
				'comment_eid'		=> $row['parentRecordID'],
				'comment_text'		=> $row['Body'],
				'comment_mid'		=> $row['InsertUserID'],
				'comment_date'		=> VanillaCore::mysqlToDateTime( $row['DateInserted'] ),
			] );
			$libraryClass->setLastKeyValue( $row['CommentID'] );
		}
	}

	/**
	 * Check if we can redirect the legacy URLs from this software to the new locations
	 *
	 * @return    Url|NULL
	 * @note	Forums and profiles don't use an ID in the URL. While we may be able to somehow cross reference this with our SEO slug, it wouldn't be reliable.
	 */
	public function checkRedirects(): ?Url
	{
		$url = Request::i()->url();

		if( preg_match( '#/events/([0-9]+)-#i', $url->data[ Url::COMPONENT_PATH ], $matches ) )
		{
			$class	= Event::class;
			$types	= [ 'calendar_events' ];
			$oldId	= (int) $matches[1];
		}

		if( isset( $class ) )
		{
			try
			{
				try
				{
					$data = (string) $this->app->getLink( $oldId, $types );
				}
				catch( OutOfRangeException $e )
				{
					return NULL;
				}
				$item = $class::load( $data );

				if( $item instanceof Content )
				{
					if( $item->canView() )
					{
						return $item->url();
					}
				}
			}
			catch( Exception $e )
			{
				return NULL;
			}
		}

		return NULL;
	}
}
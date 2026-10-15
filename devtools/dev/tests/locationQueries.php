<?php

use IPS\calendar\Event;
use IPS\Db;
use IPS\Dispatcher\External;
use IPS\forums\Forum;
use IPS\forums\Topic;
use IPS\Member;
use IPS\Patterns\ActiveRecordIterator;

ini_set( 'display_errors', true );
set_time_limit( 0 );

require_once '../../init.php';
External::i();

\IPS\Dispatcher::i()->controllerLocation = 'front';

$member = Member::loggedIn();
$results = [];

/**
 * Convert an item iterator into plain rows for display.
 *
 * @param ActiveRecordIterator $iterator
 * @param string $titleField
 * @param array|null $originLocation
 * @return array
 */
function summarizeItems( ActiveRecordIterator $iterator, string $titleField='title', ?array $originLocation=NULL ): array
{
	$rows = [];

	foreach ( $iterator as $item )
	{
		$idColumn = $item::$databaseColumnId;
		$distance = NULL;
		if ( $originLocation !== NULL and $item->latitude !== NULL and $item->longitude !== NULL )
		{
			$distance = round(
				calculateDistanceMiles(
					(float) $originLocation['lat'],
					(float) $originLocation['lon'],
					(float) $item->latitude,
					(float) $item->longitude
				),
				2
			);
		}

		$rows[] = [
			'id' => $item->$idColumn,
			'title' => $item->mapped( $titleField ),
			'distance' => $distance,
			'latitude' => $item->latitude,
			'longitude' => $item->longitude,
		];
	}

	return $rows;
}

/**
 * Count all rows from an item iterator without building display rows.
 *
 * @param ActiveRecordIterator $iterator
 * @return int
 */
function countItems( ActiveRecordIterator $iterator ): int
{
	$count = 0;

	foreach ( $iterator as $item )
	{
		$count++;
	}

	return $count;
}

/**
 * Mirror the SQL haversine calculation in PHP for display/assertions.
 *
 * @param float $originLat
 * @param float $originLon
 * @param float $targetLat
 * @param float $targetLon
 * @return float
 */
function calculateDistanceMiles( float $originLat, float $originLon, float $targetLat, float $targetLon ): float
{
	return 3959 * acos(
		cos( deg2rad( $originLat ) ) *
		cos( deg2rad( $targetLat ) ) *
		cos( deg2rad( $targetLon ) - deg2rad( $originLon ) ) +
		sin( deg2rad( $originLat ) ) *
		sin( deg2rad( $targetLat ) )
	);
}

/**
 * Render a pass/fail chip.
 *
 * @param bool $pass
 * @return string
 */
function chip( bool $pass ): string
{
	return $pass ? '<span style="color:green">Pass</span>' : '<span style="color:red">Fail</span>';
}

try
{
	$forumLimit = 5;
	$forumRow = Db::i()->select(
		'tid,forum_id',
		'forums_topics',
		[ 'approved=?', 1 ],
		'last_post DESC',
		[ 0, 1 ]
	)->first();

	$forum = Forum::load( $forumRow['forum_id'] );
	$forumWhere = [
		[ Topic::$databaseTable . '.' . Topic::$databaseColumnMap['container'] . '=?', $forumRow['forum_id'] ],
	];

	$forumItems = Topic::getItemsWithPermission(
		$forumWhere,
		Topic::$databaseTable . '.' . Topic::$databaseColumnMap['date'] . ' DESC',
		$forumLimit,
		'view',
		\IPS\Content\Filter::FILTER_AUTOMATIC,
		Topic::SELECT_IDS_FIRST,
		$member,
		FALSE,
		FALSE,
		FALSE,
		FALSE,
		NULL,
		FALSE,
		TRUE,
		TRUE,
		TRUE,
		FALSE,
		NULL
	);

	$forumFullCount = countItems(
		Topic::getItemsWithPermission(
			$forumWhere,
			Topic::$databaseTable . '.' . Topic::$databaseColumnMap['date'] . ' DESC',
			NULL,
			'view',
			\IPS\Content\Filter::FILTER_AUTOMATIC,
			Topic::SELECT_IDS_FIRST,
			$member,
			FALSE,
			FALSE,
			FALSE,
			FALSE,
			NULL,
			FALSE,
			TRUE,
			TRUE,
			TRUE,
			FALSE,
			NULL
		)
	);

	$forumCount = Topic::getItemsWithPermission(
		$forumWhere,
		Topic::$databaseTable . '.' . Topic::$databaseColumnMap['date'] . ' DESC',
		$forumLimit,
		'view',
		\IPS\Content\Filter::FILTER_AUTOMATIC,
		Topic::SELECT_IDS_FIRST,
		$member,
		FALSE,
		FALSE,
		FALSE,
		TRUE,
		NULL,
		FALSE,
		TRUE,
		TRUE,
		TRUE,
		FALSE,
		NULL
	);

	$forumRows = summarizeItems( $forumItems );
	$forumCount = (int) $forumCount;
	$results[] = [
		'name' => 'Forum query (no distance)',
		'countOnly' => $forumCount,
		'returned' => count( $forumRows ),
		'fullReturned' => $forumFullCount,
		'pass' => count( $forumRows ) > 0 && $forumCount === $forumFullCount && $forumCount >= count( $forumRows ),
		'details' => [
			'forum' => $forum->_title,
			'sourceTopicId' => $forumRow['tid'],
			'limit' => $forumLimit,
			'countOnly' => $forumCount,
			'returned' => count( $forumRows ),
			'fullReturned' => $forumFullCount,
			'items' => $forumRows,
		],
	];
}
catch ( Throwable $e )
{
	$results[] = [
		'name' => 'Forum query (no distance)',
		'countOnly' => 'n/a',
		'returned' => 'n/a',
		'fullReturned' => 'n/a',
		'pass' => false,
		'details' => [
			'error' => $e->getMessage(),
		],
	];
}

try
{
	$distanceLimit = 5;
	$eventRow = Db::i()->select(
		'event_id,event_calendar_id,event_latitude,event_longitude',
		'calendar_events',
		[
			'event_latitude IS NOT NULL AND event_longitude IS NOT NULL AND event_approved=?',
			1
		],
		'event_saved DESC',
		[ 0, 1 ]
	)->first();

	$location = [
		'lat' => $eventRow['event_latitude'],
		'lon' => $eventRow['event_longitude'],
	];

	$eventWhere = [
		[ Event::$databaseTable . '.' . Event::$databasePrefix . Event::$databaseColumnMap['container'] . '=?', $eventRow['event_calendar_id'] ],
	];

	$distanceItems = Event::getItemsWithPermission(
		$eventWhere,
		NULL,
		$distanceLimit,
		'view',
		\IPS\Content\Filter::FILTER_AUTOMATIC,
		Event::SELECT_IDS_FIRST,
		$member,
		FALSE,
		FALSE,
		FALSE,
		FALSE,
		NULL,
		FALSE,
		TRUE,
		TRUE,
		TRUE,
		FALSE,
		$location
	);

	$distanceFullCount = countItems(
		Event::getItemsWithPermission(
			$eventWhere,
			NULL,
			NULL,
			'view',
			\IPS\Content\Filter::FILTER_AUTOMATIC,
			Event::SELECT_IDS_FIRST,
			$member,
			FALSE,
			FALSE,
			FALSE,
			FALSE,
			NULL,
			FALSE,
			TRUE,
			TRUE,
			TRUE,
			FALSE,
			$location
		)
	);

	$distanceCount = Event::getItemsWithPermission(
		$eventWhere,
		NULL,
		$distanceLimit,
		'view',
		\IPS\Content\Filter::FILTER_AUTOMATIC,
		Event::SELECT_IDS_FIRST,
		$member,
		FALSE,
		FALSE,
		FALSE,
		TRUE,
		NULL,
		FALSE,
		TRUE,
		TRUE,
		TRUE,
		FALSE,
		$location
	);

	$distanceRows = summarizeItems( $distanceItems, 'title', $location );
	$distanceCount = (int) $distanceCount;
	$distanceValues = array_filter( array_map( fn( $row ) => $row['distance'], $distanceRows ), fn( $distance ) => $distance !== null );
	$withinRadius = count( $distanceValues ) ? max( $distanceValues ) < 500 : false;

	$results[] = [
		'name' => 'Distance query (calendar events)',
		'countOnly' => $distanceCount,
		'returned' => count( $distanceRows ),
		'fullReturned' => $distanceFullCount,
		'pass' => count( $distanceRows ) > 0 && $distanceCount === $distanceFullCount && $distanceCount >= count( $distanceRows ) && $withinRadius,
		'details' => [
			'sourceEventId' => $eventRow['event_id'],
			'location' => $location,
			'limit' => $distanceLimit,
			'countOnly' => $distanceCount,
			'returned' => count( $distanceRows ),
			'fullReturned' => $distanceFullCount,
			'maxDistance' => count( $distanceValues ) ? max( $distanceValues ) : null,
			'items' => $distanceRows,
		],
	];
}
catch ( Throwable $e )
{
	$results[] = [
		'name' => 'Distance query (calendar events)',
		'countOnly' => 'n/a',
		'returned' => 'n/a',
		'fullReturned' => 'n/a',
		'pass' => false,
		'details' => [
			'error' => $e->getMessage(),
		],
	];
}

header( 'Content-Type: text/html' );

print <<<EOF
<html>
<title>Location Query Tests</title>
<style>
 * { font-family: sans-serif; }
 body { margin: 20px; }
 table { width: 100%; border-collapse: collapse; }
 th, td { border: 1px solid #ccc; padding: 8px; vertical-align: top; }
 tr.header { background-color: black; color: white; }
 pre { margin: 0; white-space: pre-wrap; word-break: break-word; }
</style>
<body>
<h1>Location Query Tests</h1>
<p>Logged in as {$member->name} (#{$member->member_id}). These checks force the IDs-first query path and compare a normal forum pull against a location-based event pull.</p>
<table>
<tr class="header">
 <th>Test</th>
 <th>Pass/Fail</th>
 <th>Count Only</th>
 <th>Returned</th>
 <th>Full Returned</th>
 <th>Details</th>
</tr>
EOF;

foreach ( $results as $result )
{
	$details = htmlspecialchars( json_encode( $result['details'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8' );
	$status = chip( $result['pass'] );

	print <<<EOF
<tr>
 <td>{$result['name']}</td>
 <td>{$status}</td>
 <td>{$result['countOnly']}</td>
 <td>{$result['returned']}</td>
 <td>{$result['fullReturned']}</td>
 <td><pre>{$details}</pre></td>
</tr>
EOF;
}

print <<<EOF
</table>
</body>
</html>
EOF;

exit();

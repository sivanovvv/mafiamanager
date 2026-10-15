<?php
/**
 * @brief		Statistics Chart Extension
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/

 * @since		05 Feb 2026
 */

namespace IPS\core\extensions\core\Statistics;

use IPS\core\Statistics\Chart;
use IPS\Helpers\Chart as ChartClass;
use IPS\Helpers\Chart\Database;
use IPS\Http\Url;
use IPS\Member;
use IPS\Member\Club;
use function defined;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * Statistics Chart Extension
 */
class ClubRegistrations extends Chart
{
	/**
	 * @brief	Controller
	 */
	public ?string $controller = 'core_club_registrations';
	
	/**
	 * Render Chart
	 *
	 * @param   Url	$url	URL the chart is being shown on.
	 * @return ChartClass
	 */
	public function getChart( Url $url ): ChartClass
	{
		$chart	= new Database( $url, 'core_clubs_memberships', 'joined', '', array(
			'isStacked' => TRUE,
			'backgroundColor' 	=> '#ffffff',
			'hAxis'				=> array( 'gridlines' => array( 'color' => '#f5f5f5' ) ),
			'lineWidth'			=> 1,
			'areaOpacity'		=> 0.4
		), 'ColumnChart', 'monthly', array( 'start' => 0, 'end' => 0 ), array( 'club_id', 'name' ), 'signups' );
		$chart->setExtension( $this );

		$chart->joins[] = array( 'core_clubs', 'core_clubs.id=core_clubs_memberships.club_id' );
		$chart->groupBy = 'club_id';

		foreach( Club::clubs( NULL, NULL, 'name' ) as $club )
		{
			$chart->addSeries( $club->name, 'number', 'COUNT(*)', TRUE, $club->id );
		}

		$chart->title = Member::loggedIn()->language()->addToStack('stats_clubs_signups');
		$chart->availableTypes = array( 'ColumnChart', 'BarChart' );

		return $chart;
	}
}
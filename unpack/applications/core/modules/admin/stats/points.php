<?php
/**
 * @brief		points
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @package		Invision Community

 * @since		10 Mar 2021
 */

namespace IPS\core\modules\admin\stats;

/* To prevent PHP errors (extending class does not exist) revealing path */

use IPS\core\Statistics\Chart;
use IPS\DateTime;
use IPS\Dispatcher;
use IPS\Dispatcher\Controller;
use IPS\Helpers\Form;
use IPS\Helpers\Form\DateRange;
use IPS\Helpers\Table\Db as TableDb;
use IPS\Http\Url;
use IPS\Member;
use IPS\Member\Group;
use IPS\Output;
use IPS\Request;
use IPS\Theme;
use Throwable;
use function defined;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * points
 */
class points extends Controller
{
	/**
	 * @brief	Allow MySQL RW separation for efficiency
	 */
	public static bool $allowRWSeparation = TRUE;


	public static bool $csrfProtected = true;

	/**
	 * Execute
	 *
	 * @return	void
	 */
	public function execute() : void
	{
		Dispatcher::i()->checkAcpPermission( 'overview_manage' );
		parent::execute();
	}

	/**
	 * Points earned activity chart
	 *
	 * @return	void
	 */
	protected function manage() : void
	{
		$tabs = array(
			'total' => 'stats_points_total',
			'list' => 'stats_points_by_group',
			'member'	=> 'stats_points_by_member',
		);

		Request::i()->tab ??= 'total';
		$activeTab = ( array_key_exists( Request::i()->tab, $tabs ) ) ? Request::i()->tab : 'total';

		if ( $activeTab === 'total' )
		{
			$chart = Chart::loadFromExtension( 'core', 'Points' )->getChart( Url::internal( "app=core&module=stats&controller=points&tab=" . $activeTab ) );
		}
		else
		{
			$defaults = array( 'start' => DateTime::create()->setDate( date('Y'), date('m'), 1 ), 'end' => new DateTime );

			if( isset( Request::i()->pointsDateStart ) AND isset( Request::i()->pointsDateEnd ) )
			{
				$defaults = array( 'start' => DateTime::ts( (int) Request::i()->pointsDateStart ), 'end' => DateTime::ts( (int) Request::i()->pointsDateEnd ) );
			}

			$form = new Form( $activeTab, 'continue' );
			$form->add( new DateRange( 'date', $defaults, TRUE ) );

			if( $values = $form->values() )
			{
				/* Determine start and end time */
				$startTime	= $values['date']['start']->getTimestamp();
				$endTime	= $values['date']['end']->getTimestamp();
			}
			else
			{
				/* Determine start and end time */
				$startTime	= $defaults['start']->getTimestamp();
				$endTime	= $defaults['end']->getTimestamp();
			}

			if( $activeTab === 'member' )
			{
				/* Create the table */
				$chart = new TableDb( 'core_points_log', Url::internal( 'app=core&module=stats&controller=points&tab=member' ), [ 'datetime BETWEEN ? AND ?', $startTime, $endTime ] );
				$chart->quickSearch = NULL;
				$chart->selects = [ 'count(*) as count' ];
				$chart->joins = [
					[ 'select' => 'member_id', 'from' => 'core_members', 'where' => 'core_members.member_id=core_points_log.member' ]
				];

				$chart->groupBy = 'member_id';
				$chart->langPrefix = 'stats_points_';
				$chart->include = [ 'member_id', 'count' ];
				$chart->mainColumn = 'member_id';
				$chart->baseUrl = $chart->baseUrl->setQueryString( array( 'pointsDateStart' => $startTime, 'pointsDateEnd' => $endTime, 'tab' => $activeTab ) );
				$chart->sortBy = 'count';

				/* Custom parsers */
				$chart->parsers = array(
					'member_id' => function( $val )
					{
						$member = Member::load( $val );
						return Theme::i()->getTemplate( 'global', 'core' )->userPhoto( $member, 'tiny' ) . ' ' . $member->link();
					}
				);
			}
			else
			{
				/* Create the table */
				$chart = new TableDb( 'core_points_log', Url::internal( 'app=core&module=stats&controller=points&tab=list' ), [ 'datetime BETWEEN ? AND ?', $startTime, $endTime ] );
				$chart->quickSearch = NULL;
				$chart->selects = [ 'count(*) as count' ];
				$chart->joins = [
					[ 'select' => 'member_group_id', 'from' => 'core_members', 'where' => 'core_members.member_id=core_points_log.member' ]
				];

				$chart->groupBy = 'member_group_id';
				$chart->langPrefix = 'stats_points_';
				$chart->include = [ 'member_group_id', 'count' ];
				$chart->mainColumn = 'member_group_id';
				$chart->baseUrl = $chart->baseUrl->setQueryString( array( 'pointsDateStart' => $startTime, 'pointsDateEnd' => $endTime, 'tab' => $activeTab ) );

				/* Custom parsers */
				$chart->parsers = array(
					'member_group_id' => function( $val )
					{
						try
						{
							return Group::load( $val )->formattedName;
						}
						catch ( Throwable )
						{
							return Member::loggedIn()->language()->addToStack( 'unavailable' );
						}
					}
				);
			}

			$formHtml = $form->customTemplate( array( Theme::i()->getTemplate( 'stats' ), 'filtersFormTemplate' ) );
			$chart = Theme::i()->getTemplate( 'stats', 'core' )->statsPointsWrapper( $formHtml, (string) $chart );
		}

		if ( Request::i()->isAjax() )
		{
			Output::i()->output = (string)$chart;
		}
		else
		{
			Output::i()->title = Member::loggedIn()->language()->addToStack('menu__core_stats_points');
			Output::i()->output = Theme::i()->getTemplate( 'global', 'core' )->tabs( $tabs, $activeTab, (string)$chart, Url::internal( "app=core&module=stats&controller=points" ), 'tab', '', '' );
		}
	}
}